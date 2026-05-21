// ef-reset-password — RRHH/Gerencia resetea la contraseña de un empleado (ADR-004)
// El empleado recibe la contraseña temporal en mano, no por email.
// No hay flujo self-service (ADR-004, logic.md §3.1).
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { resolveEmpleado, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const actor = await resolveEmpleado(req)
  if (!actor) return errorResponse('ERR_AUTH_001', 401)

  if (!['gerencia', 'rrhh'].includes(actor.ficha.rol)) {
    return errorResponse('ERR_RBAC_003', 403)
  }

  const body = await req.json()
  const { id_nombre, nueva_password } = body

  if (!id_nombre || !nueva_password) {
    return errorResponse('ERR_PARAM_001', 400, 'Faltan campos obligatorios')
  }

  if (nueva_password.length < 8) {
    return errorResponse('ERR_AUTH_005', 400, 'La contraseña debe tener al menos 8 caracteres')
  }

  const admin = adminClient()

  // Obtener auth_user_id del empleado
  const { data: ficha } = await admin
    .from('fichas_empleados')
    .select('auth_user_id, activo')
    .eq('id_nombre', id_nombre)
    .single()

  if (!ficha) return errorResponse('ERR_EMPLEADO_003', 404)
  if (!ficha.activo) return errorResponse('ERR_EMPLEADO_004', 409)

  // Resetear contraseña en Supabase Auth
  const { error } = await admin.auth.admin.updateUserById(ficha.auth_user_id, {
    password: nueva_password,
  })

  if (error) return errorResponse('ERR_AUTH_006', 500, error.message)

  // Auditar cambio de contraseña
  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'cambio_password',
    id_nombre,
    metadata: { actor: actor.ficha.id_nombre, via: 'ef-reset-password' },
  })

  return okResponse({ ok: true })
})
