// ef-revocar-sesion-usuario — Revoca todas las sesiones activas de un usuario
// Solo coordinacion/gerencia/rrhh pueden revocar sesiones ajenas.
// Revoca: JWT (global signout) + todas las galletas del usuario.
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { resolveEmpleado, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const actor = await resolveEmpleado(req)
  if (!actor) return errorResponse('ERR_AUTH_001', 401)

  if (!['coordinacion', 'gerencia', 'rrhh'].includes(actor.ficha.rol)) {
    return errorResponse('ERR_RBAC_003', 403)
  }

  const body = await req.json()
  const { id_nombre_target } = body

  if (!id_nombre_target) {
    return errorResponse('ERR_PARAM_001', 400, 'Falta id_nombre_target')
  }

  const admin = adminClient()

  const { data: ficha } = await admin
    .from('fichas_empleados')
    .select('auth_user_id, activo')
    .eq('id_nombre', id_nombre_target)
    .single()

  if (!ficha) return errorResponse('ERR_EMPLEADO_003', 404)

  // Revocar JWT (todas las sesiones de Supabase Auth)
  await admin.auth.admin.signOut(ficha.auth_user_id, 'global')

  // Revocar todas las galletas activas
  await admin
    .from('galletas_terminales')
    .update({ revocado_at: new Date().toISOString() })
    .eq('id_nombre', id_nombre_target)
    .is('revocado_at', null)

  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'logout_forzado',
    id_nombre: id_nombre_target,
    metadata: { actor: actor.ficha.id_nombre },
  })

  return okResponse({ ok: true })
})
