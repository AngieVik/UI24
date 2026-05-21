// ef-logout — Cierra sesión limpiamente (invalida JWT en Supabase Auth)
// El cliente también debe limpiar sessionStorage y useAuthStore.
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { resolveEmpleado, userClient, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const actor = await resolveEmpleado(req)
  if (!actor) return errorResponse('ERR_AUTH_001', 401)

  const body = await req.json().catch(() => ({}))
  const { id_terminal } = body

  const client = userClient(req)
  const admin = adminClient()

  // Cerrar sesión en Supabase Auth (invalida el refresh token)
  await client.auth.signOut()

  // Auditar
  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'logout',
    id_nombre: actor.ficha.id_nombre,
    id_terminal: id_terminal ?? null,
  })

  return okResponse({ ok: true })
})
