// ef-cron-transito-ttl — Cancela tránsitos de inventario expirados (Tarea 4.4)
// Un tránsito que lleva más de 48 horas en estado 'en_transito' sin
// confirmación se marca como 'cancelado' y se notifica a logística.
// Solo invocable por el scheduler — valida cron secret.
import { okResponse, errorResponse } from '../_shared/errors.ts'
import { adminClient } from '../_shared/auth.ts'

const TRANSITO_TTL_HOURS = 48

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('ERR_AUTH_001', 401)
  }

  const admin = adminClient()
  const cutoff = new Date(Date.now() - TRANSITO_TTL_HOURS * 60 * 60 * 1_000).toISOString()

  // Obtener tránsitos expirados para notificar antes de cancelar
  const { data: expirados } = await admin
    .from('inventario_en_transito')
    .select('id_transito, id_transferencia, id_item, cantidad')
    .eq('estado', 'en_transito')
    .lt('timestamp_envio', cutoff)

  if (!expirados || expirados.length === 0) {
    return okResponse({ cancelados: 0, ran_at: new Date().toISOString() })
  }

  const ids = expirados.map(t => t.id_transito)

  // Cancelar tránsitos expirados
  await admin
    .from('inventario_en_transito')
    .update({ estado: 'cancelado' })
    .in('id_transito', ids)

  // Notificar a logística por cada tránsito cancelado
  const mensajes = expirados.map(t => ({
    id_nombre_destino: 'SISTEMA',  // se reemplaza con la búsqueda real en Sprint 10
    contenido: `Tránsito expirado cancelado — ítem ${t.id_item}, cantidad: ${t.cantidad}. Transferencia: ${t.id_transferencia}`,
  }))

  // Buscar responsables de logística para la notificación
  const { data: logisticos } = await admin
    .from('fichas_empleados')
    .select('id_nombre')
    .in('rol', ['logistica', 'responsable_logistica'])
    .eq('activo', true)

  if (logisticos && logisticos.length > 0) {
    const notificaciones = expirados.flatMap(t =>
      logisticos.map(l => ({
        id_nombre_destino: l.id_nombre,
        contenido: `Tránsito expirado (>${TRANSITO_TTL_HOURS}h) cancelado automáticamente — ítem ${t.id_item}, cantidad: ${t.cantidad}.`,
      }))
    )
    await admin.from('mensajes_bandeja').insert(notificaciones)
  }

  return okResponse({ cancelados: ids.length, ran_at: new Date().toISOString() })
})
