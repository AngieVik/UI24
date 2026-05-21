// ef-cron-cleanup-orphans — Purga entradas expiradas de tablas TTL (Tarea 4.4)
// Debe invocarse únicamente desde el scheduler de Supabase (pg_cron o Edge Cron).
// NO expone endpoint público — valida el Authorization del cron secret.
//
// Tablas purgadas:
//   - idempotency_keys WHERE expires_at < NOW()
//   - sesiones_emergencia WHERE expires_at < NOW() AND consumido_at IS NULL
//   - solicitudes_desbloqueo WHERE expires_at < NOW() AND estado = 'pendiente'
//   - pin_intentos_fallidos: limpiar ventanas antiguas (> 1 hora)
import { okResponse, errorResponse } from '../_shared/errors.ts'
import { adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  // Proteger el endpoint con el cron secret
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('ERR_AUTH_001', 401)
  }

  const admin = adminClient()
  const now = new Date().toISOString()
  const results: Record<string, number> = {}

  // Purgar idempotency_keys expiradas (ADR-012)
  const { count: keysCount } = await admin
    .from('idempotency_keys')
    .delete({ count: 'exact' })
    .lt('expires_at', now)
  results.idempotency_keys = keysCount ?? 0

  // Purgar PINs de emergencia no consumidos y expirados
  const { count: sesCount } = await admin
    .from('sesiones_emergencia')
    .delete({ count: 'exact' })
    .lt('expires_at', now)
    .is('consumido_at', null)
  results.sesiones_emergencia = sesCount ?? 0

  // Expirar solicitudes de desbloqueo pendientes que han caducado
  const { count: desbCount } = await admin
    .from('solicitudes_desbloqueo')
    .update({ estado: 'expirada' }, { count: 'exact' })
    .lt('expires_at', now)
    .eq('estado', 'pendiente')
  results.solicitudes_desbloqueo_expiradas = desbCount ?? 0

  // Limpiar ventanas de intentos fallidos antiguas (> 1 hora)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString()
  const { count: pinCount } = await admin
    .from('pin_intentos_fallidos')
    .delete({ count: 'exact' })
    .lt('ventana_inicio', oneHourAgo)
  results.pin_intentos_fallidos = pinCount ?? 0

  return okResponse({ purged: results, ran_at: now })
})
