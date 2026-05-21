// ef-renovar-offline-session — Renueva el snapshot de sesión offline (ADR-009)
// El cliente llama a esta función tras un login online exitoso.
// Devuelve el perfil del empleado para que el cliente lo almacene
// en IndexedDB como u24_offline_session (TTL = 7 días, alineado con
// el refresh token de Supabase Auth).
//
// El hash PBKDF2 para verificación offline del password se deriva
// en el cliente — nunca viaja al servidor (ADR-009 §5).
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { resolveEmpleado, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const actor = await resolveEmpleado(req)
  if (!actor) return errorResponse('ERR_AUTH_001', 401)

  const body = await req.json().catch(() => ({}))
  const { id_terminal } = body

  const admin = adminClient()

  // Actualizar ultima_activacion_at de la galleta del terminal
  if (id_terminal) {
    await admin
      .from('galletas_terminales')
      .update({ ultima_activacion_at: new Date().toISOString() })
      .eq('id_terminal', id_terminal)
      .eq('id_nombre', actor.ficha.id_nombre)
      .is('revocado_at', null)
  }

  // TTL alineado con el refresh token (7 días, ADR-009)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString()

  // Snapshot de sesión que el cliente almacena en IndexedDB
  return okResponse({
    id_nombre: actor.ficha.id_nombre,
    rol: actor.ficha.rol,
    activo: actor.ficha.activo,
    cached_at: new Date().toISOString(),
    expires_at: expiresAt,
  })
})
