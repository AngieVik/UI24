import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBandejasStore } from '@/stores/useBandejasStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { resolveRpcError } from '@/lib/resolveRpcError'
import type { Database } from '@/types/supabase'

type MensajeRow = Database['public']['Tables']['mensajes_bandeja']['Row']

export function useBandeja() {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const isOnline = useGlobalStore((s) => s.isOnline)
  const { mensajes, setMensajes, upsertMensaje, marcarLeido: marcarLeidoLocal } = useBandejasStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const cargarMensajes = useCallback(async () => {
    if (!ejecutorId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('mensajes_bandeja')
        .select('*')
        .eq('id_nombre_destino', ejecutorId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (err) throw err
      setMensajes((data ?? []) as MensajeRow[])
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [ejecutorId, setMensajes])

  const marcarLeido = useCallback(async (idMensaje: string): Promise<boolean> => {
    marcarLeidoLocal(idMensaje)
    if (!isOnline) return true
    try {
      const { error: err } = await supabase
        .rpc('rpc_marcar_mensaje_leido', {
          p_mutation_uuid: crypto.randomUUID(),
          p_id_mensaje: idMensaje,
        })
      if (err) throw err
      return true
    } catch (e) {
      setError(resolveRpcError(e))
      return false
    }
  }, [isOnline, marcarLeidoLocal])

  // Suscripción Realtime para mensajes nuevos
  useEffect(() => {
    if (!ejecutorId || !isOnline) return
    cargarMensajes()

    const ch = supabase
      .channel(`bandeja:${ejecutorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_bandeja',
          filter: `id_nombre_destino=eq.${ejecutorId}`,
        },
        (payload) => upsertMensaje(payload.new as MensajeRow),
      )
      .subscribe()

    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [ejecutorId, isOnline, cargarMensajes, upsertMensaje])

  const noLeidos = mensajes.filter((m) => m.estado === 'no_leido').length

  return { mensajes, noLeidos, loading, error, setError, cargarMensajes, marcarLeido }
}
