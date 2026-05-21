// ef-consumir-pin — Valida y consume un PIN de sesión de emergencia (logic.md §4.2)
// Endpoint público (no requiere JWT activo — el terminal está en estado_0).
// Tras consumir el PIN emite una galleta del tipo correspondiente.
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const body = await req.json()
  const { pin, id_terminal } = body

  if (!pin || !id_terminal) {
    return errorResponse('ERR_PARAM_001', 400, 'Faltan campos obligatorios')
  }

  // Hash SHA-256 del PIN introducido
  const pinHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(pin)),
  )
  const pinHashHex = Array.from(new Uint8Array(pinHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const admin = adminClient()

  // Buscar sesión válida con ese hash
  const { data: sesion } = await admin
    .from('sesiones_emergencia')
    .select('id_sesion, tipo, id_nombre_emisor, expires_at, consumido_at')
    .eq('pin_hash', pinHashHex)
    .is('consumido_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  // Mensaje genérico para no revelar si el PIN existe (logic.md §3.1)
  if (!sesion) return errorResponse('ERR_EMERGENCIA_002', 401, 'PIN no válido o expirado')

  // Marcar como consumido
  await admin
    .from('sesiones_emergencia')
    .update({ consumido_at: new Date().toISOString(), id_terminal })
    .eq('id_sesion', sesion.id_sesion)

  // Emitir galleta para el terminal — el id_nombre_emisor actúa como propietario temporal
  const expiresAt = sesion.tipo === 'temporal'
    ? new Date(Date.now() + 8 * 60 * 60 * 1_000).toISOString()  // 8h para temporal
    : null  // permanente no expira

  const { data: galleta } = await admin
    .from('galletas_terminales')
    .insert({
      id_terminal,
      tipo: sesion.tipo,
      id_nombre: sesion.id_nombre_emisor,
      expires_at: expiresAt,
      ultima_activacion_at: new Date().toISOString(),
    })
    .select('id_galleta')
    .single()

  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'sesion_emergencia_consumida',
    id_nombre: sesion.id_nombre_emisor,
    id_terminal,
    metadata: { id_sesion: sesion.id_sesion, tipo: sesion.tipo },
  })

  return okResponse({
    id_galleta: galleta?.id_galleta,
    tipo: sesion.tipo,
    id_nombre: sesion.id_nombre_emisor,
  })
})
