/**
 * ef-push-avisos — envía Web Push a suscriptores de un aviso crítico (Doc-11).
 *
 * Invocada por un trigger de base de datos vía pg_net o desde la app cuando
 * se crea un aviso con nivel = 'critico'.
 *
 * Body esperado:
 *   { id_aviso: string; id_nombre_destino?: string }
 *   Si id_nombre_destino está presente, solo se notifica a ese empleado.
 *   Si no, se notifica a todos los empleados suscritos.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY= Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_CONTACT    = Deno.env.get('VAPID_CONTACT') ?? 'mailto:ops@u24.es'

webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { id_aviso, id_nombre_destino } = await req.json()
    if (!id_aviso) {
      return new Response(JSON.stringify({ error: 'ERR_MISSING_ID_AVISO' }), { status: 400 })
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Cargar el aviso para construir el payload
    const { data: aviso, error: avisoErr } = await sb
      .from('doc11_avisos')
      .select('texto, nivel, id_nombre_emisor')
      .eq('id_aviso', id_aviso)
      .single()
    if (avisoErr || !aviso) {
      return new Response(JSON.stringify({ error: 'ERR_AVISO_NOT_FOUND' }), { status: 404 })
    }

    // Cargar suscripciones
    let query = sb
      .rpc('rpc_push_subs_para', { p_id_nombre: id_nombre_destino ?? '' })

    // Si no hay destino específico, traer todas las suscripciones activas
    let subs: Array<{ endpoint: string; p256dh: string; auth: string }> = []
    if (id_nombre_destino) {
      const { data, error } = await sb
        .rpc('rpc_push_subs_para', { p_id_nombre: id_nombre_destino })
      if (error) throw error
      subs = (data ?? []) as typeof subs
    } else {
      const { data, error } = await sb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
      if (error) throw error
      subs = (data ?? []) as typeof subs
    }

    const payload = JSON.stringify({
      title: `U24 — Aviso ${aviso.nivel === 'critico' ? '🚨' : 'ℹ️'}`,
      body:  aviso.texto.slice(0, 200),
      icon:  '/icon-192.png',
      badge: '/icon-72.png',
      data:  { id_aviso, nivel: aviso.nivel },
    })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    )

    const sent   = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ef-push-avisos error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
