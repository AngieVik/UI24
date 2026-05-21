// ef-cron-revoke-stale-terminals — Revoca galletas de terminales inactivos (Tarea 4.4)
// Criterios de revocación:
//   - Galletas temporales caducadas (expires_at < NOW())
//   - Galletas permanentes sin activación en los últimos 30 días
//     (ultima_activacion_at < NOW() - 30d)
// Solo invocable por el scheduler — valida cron secret.
import { okResponse, errorResponse } from '../_shared/errors.ts'
import { adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('ERR_AUTH_001', 401)
  }

  const admin = adminClient()
  const now = new Date().toISOString()
  const staleDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString()

  // Revocar galletas temporales caducadas
  const { count: tempCount } = await admin
    .from('galletas_terminales')
    .update({ revocado_at: now }, { count: 'exact' })
    .eq('tipo', 'temporal')
    .lt('expires_at', now)
    .is('revocado_at', null)

  // Revocar galletas permanentes sin uso en 30 días
  const { count: permCount } = await admin
    .from('galletas_terminales')
    .update({ revocado_at: now }, { count: 'exact' })
    .eq('tipo', 'permanente')
    .is('revocado_at', null)
    .or(`ultima_activacion_at.lt.${staleDate},ultima_activacion_at.is.null`)

  return okResponse({
    revocadas_temporales: tempCount ?? 0,
    revocadas_permanentes_stale: permCount ?? 0,
    ran_at: now,
  })
})
