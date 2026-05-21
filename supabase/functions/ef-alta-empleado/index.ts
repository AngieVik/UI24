// ef-alta-empleado — Crea auth.users + fichas_empleados
// Solo service_role puede crear usuarios en Supabase Auth.
// Requiere rol gerencia o rrhh del actor.
import { handleCors, corsHeaders } from '../_shared/cors.ts'
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
  const { email, password, id_nombre, nombre_real, rol, dni } = body

  if (!email || !password || !id_nombre || !nombre_real || !rol) {
    return errorResponse('ERR_PARAM_001', 400, 'Faltan campos obligatorios')
  }

  const admin = adminClient()

  // Crear usuario en Supabase Auth
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    return errorResponse('ERR_EMPLEADO_001', 400, authError?.message)
  }

  // Crear ficha de empleado
  const { error: fichaError } = await admin.from('fichas_empleados').insert({
    auth_user_id: authUser.user.id,
    id_nombre,
    nombre_real,
    rol,
    dni: dni ?? null,
    activo: true,
  })

  if (fichaError) {
    // Rollback: eliminar el usuario de auth si la ficha falla
    await admin.auth.admin.deleteUser(authUser.user.id)
    return errorResponse('ERR_EMPLEADO_002', 400, fichaError.message)
  }

  // Auditar
  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'alta_empleado',
    id_nombre: actor.ficha.id_nombre,
    metadata: { nuevo_id_nombre: id_nombre, rol },
  })

  return okResponse({ id_nombre, auth_user_id: authUser.user.id }, 201)
})
