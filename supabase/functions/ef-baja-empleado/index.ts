// ef-baja-empleado — Desactiva empleado, revoca JWT y galletas
// Requiere step-up del actor (ADR-010).
// Solo gerencia o rrhh pueden ejecutar bajas.
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { resolveEmpleado, adminClient, verificarStepup } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const actor = await resolveEmpleado(req)
  if (!actor) return errorResponse('ERR_AUTH_001', 401)

  if (!['gerencia', 'rrhh'].includes(actor.ficha.rol)) {
    return errorResponse('ERR_RBAC_003', 403)
  }

  const body = await req.json()
  const { id_nombre_target, stepup_hash, id_terminal } = body

  if (!id_nombre_target || !stepup_hash) {
    return errorResponse('ERR_PARAM_001', 400, 'Faltan campos obligatorios')
  }

  const admin = adminClient()

  // Verificar step-up del actor
  const stepupError = await verificarStepup(
    admin,
    actor.ficha.id_nombre,
    id_terminal ?? actor.ficha.id_nombre,
    stepup_hash,
  )
  if (stepupError) return errorResponse(stepupError, 403)

  // Obtener ficha del target
  const { data: fichaTarget } = await admin
    .from('fichas_empleados')
    .select('id_nombre, auth_user_id, activo')
    .eq('id_nombre', id_nombre_target)
    .single()

  if (!fichaTarget) return errorResponse('ERR_EMPLEADO_003', 404)
  if (!fichaTarget.activo) return errorResponse('ERR_EMPLEADO_004', 409)

  // Desactivar en fichas_empleados
  await admin
    .from('fichas_empleados')
    .update({ activo: false, fecha_baja: new Date().toISOString() })
    .eq('id_nombre', id_nombre_target)

  // Revocar todas las sesiones Supabase Auth (global signout)
  await admin.auth.admin.signOut(fichaTarget.auth_user_id, 'global')

  // Revocar todas las galletas activas
  await admin
    .from('galletas_terminales')
    .update({ revocado_at: new Date().toISOString() })
    .eq('id_nombre', id_nombre_target)
    .is('revocado_at', null)

  // Auditar
  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'baja_empleado',
    id_nombre: id_nombre_target,
    metadata: { actor: actor.ficha.id_nombre },
  })

  return okResponse({ ok: true })
})
