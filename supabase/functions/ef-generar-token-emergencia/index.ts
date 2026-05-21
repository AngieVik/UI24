// ef-generar-token-emergencia — Genera PIN de emergencia de 6 dígitos (logic.md §4.1)
// Solo coordinacion/gerencia pueden generar tokens.
// El PIN se muestra UNA sola vez; solo el hash se almacena en DB.
// La generación requiere reautenticación (el JWT activo es suficiente
// como evidencia de que el usuario acaba de autenticarse).
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { resolveEmpleado, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const actor = await resolveEmpleado(req)
  if (!actor) return errorResponse('ERR_AUTH_001', 401)

  if (!['coordinacion', 'gerencia'].includes(actor.ficha.rol)) {
    return errorResponse('ERR_RBAC_003', 403)
  }

  const body = await req.json()
  const { tipo } = body  // 'permanente' | 'temporal'

  if (!tipo || !['permanente', 'temporal'].includes(tipo)) {
    return errorResponse('ERR_PARAM_001', 400, 'tipo debe ser permanente o temporal')
  }

  const admin = adminClient()

  // Generar PIN de 6 dígitos (criptográficamente seguro)
  const pinArray = new Uint8Array(4)
  crypto.getRandomValues(pinArray)
  // Convertir a número de 6 dígitos: tomar los primeros 6 dígitos del valor uint32
  const pinView = new DataView(pinArray.buffer)
  const pinNum = pinView.getUint32(0, false) % 1_000_000
  const pin = pinNum.toString().padStart(6, '0')

  // Hash SHA-256 del PIN (el cliente lo almacena para verificación offline si es necesario)
  const pinHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(pin),
  )
  const pinHashHex = Array.from(new Uint8Array(pinHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Expiración: 10 minutos (logic.md §4.3)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1_000).toISOString()

  const { data: sesion, error } = await admin
    .from('sesiones_emergencia')
    .insert({
      pin_hash: pinHashHex,
      tipo,
      id_nombre_emisor: actor.ficha.id_nombre,
      expires_at: expiresAt,
    })
    .select('id_sesion')
    .single()

  if (error || !sesion) return errorResponse('ERR_EMERGENCIA_001', 500, error?.message)

  // Auditar
  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'sesion_emergencia_generada',
    id_nombre: actor.ficha.id_nombre,
    metadata: { id_sesion: sesion.id_sesion, tipo, expires_at: expiresAt },
  })

  // El PIN se devuelve en claro UNA SOLA VEZ — no se puede recuperar después
  return okResponse({ pin, id_sesion: sesion.id_sesion, expires_at: expiresAt }, 201)
})
