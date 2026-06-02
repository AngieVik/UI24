// ef-autorizar-terminal — Primera autorización de un dispositivo físico.
//
// Recibe: { id_nombre_gerencia, password, fingerprint }
// Solo gerencia puede ejecutar esta operación (verificado en el servidor).
//
// Flujo:
//   1. Verifica credenciales de gerencia via signInWithPassword.
//   2. Confirma rol = 'gerencia' en fichas_empleados.
//   3. Crea (o reutiliza) usuario máquina terminal_<fp>@u24.local.
//   4. Crea fichas_empleados para el usuario máquina con rol 'gerencia'
//      → el custom_access_token_hook inyecta ese rol en el JWT del terminal.
//   5. Crea o renueva la galleta permanente del terminal.
//   6. Devuelve la sesión del usuario máquina.
//
// La sesión del terminal persiste indefinidamente (refresh automático JWT).
// Los check-ins de trabajadores usan ef-checkin-trabajador y NO tocan esta sesión.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, okResponse } from '../_shared/errors.ts'
import { adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return errorResponse('ERR_METHOD', 405)

  let body: { id_nombre_gerencia?: string; password?: string; fingerprint?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('ERR_BODY', 400)
  }

  const { id_nombre_gerencia, password, fingerprint } = body ?? {}
  if (!id_nombre_gerencia || !password || !fingerprint) {
    return errorResponse('ERR_PARAMS', 400, 'id_nombre_gerencia, password y fingerprint son obligatorios')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const admin = adminClient()

  // 1. Verificar credenciales de gerencia
  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: `${id_nombre_gerencia}@u24.com`,
    password,
  })
  if (signInErr || !signIn?.session) {
    return errorResponse('ERR_AUTORIZAR_001', 401, 'Credenciales incorrectas')
  }

  // 2. Verificar rol gerencia
  const { data: ficha } = await admin
    .from('fichas_empleados')
    .select('id_nombre, rol, activo')
    .eq('auth_user_id', signIn.session.user.id)
    .single()

  if (!ficha || !ficha.activo || ficha.rol !== 'gerencia') {
    return errorResponse('ERR_AUTORIZAR_002', 403, 'Se requiere rol gerencia')
  }

  // 3. Crear o reutilizar usuario máquina del terminal
  const machineEmail = `terminal_${fingerprint}@u24.local`
  // bcrypt en GoTrue tiene límite estricto de 72 bytes. El fingerprint SHA-256
  // tiene 64 chars hex; añadir prefijo/sufijo lo supera. Usar solo el fingerprint.
  const machinePassword = fingerprint.slice(0, 64)
  const machineIdNombre = `terminal_${fingerprint.slice(0, 16)}`

  const { data: fichaExistente } = await admin
    .from('fichas_empleados')
    .select('auth_user_id')
    .eq('id_nombre', machineIdNombre)
    .maybeSingle()

  let machineUserId: string

  if (fichaExistente) {
    machineUserId = fichaExistente.auth_user_id
    // Restablecer contraseña para garantizar acceso (idempotente)
    await admin.auth.admin.updateUserById(machineUserId, { password: machinePassword })
  } else {
    // Intentar crear usuario máquina nuevo
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: machineEmail,
      password: machinePassword,
      email_confirm: true,
      user_metadata: { tipo: 'terminal', fingerprint },
    })

    if (!createErr && newUser?.user) {
      machineUserId = newUser.user.id
    } else if (createErr?.message?.includes('already been registered')) {
      // Recuperación: el auth user existe pero fichas_empleados se perdió por un fallo previo.
      // Localizar el usuario existente para restaurar la consistencia.
      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = userList?.users?.find(
        (u: { email?: string; id: string }) => u.email === machineEmail,
      )
      if (!existing) {
        return errorResponse('ERR_AUTORIZAR_003', 500, 'No se pudo recuperar el usuario del terminal')
      }
      machineUserId = existing.id
      await admin.auth.admin.updateUserById(machineUserId, { password: machinePassword })
    } else {
      return errorResponse('ERR_AUTORIZAR_003', 500, 'No se pudo crear el usuario del terminal')
    }

    // Upsert en fichas_empleados (seguro ante doble ejecución o recuperación)
    const { error: fichaErr } = await admin.from('fichas_empleados').upsert(
      {
        auth_user_id: machineUserId,
        id_nombre: machineIdNombre,
        nombre_real: `Terminal ${fingerprint.slice(0, 8)}`,
        rol: 'gerencia',
        activo: true,
      },
      { onConflict: 'auth_user_id' },
    )
    if (fichaErr) {
      return errorResponse('ERR_AUTORIZAR_003', 500, 'No se pudo registrar la ficha del terminal')
    }
  }

  // 4. Sign in como usuario máquina (el custom_access_token_hook inyecta rol=gerencia)
  const machineClient = createClient(supabaseUrl, anonKey)
  const { data: machineSignIn, error: machineErr } = await machineClient.auth.signInWithPassword({
    email: machineEmail,
    password: machinePassword,
  })
  if (machineErr || !machineSignIn?.session) {
    return errorResponse('ERR_AUTORIZAR_004', 500, 'No se pudo iniciar sesión del terminal')
  }

  // 5. Crear o renovar galleta permanente
  const { data: galletaActiva } = await admin
    .from('galletas_terminales')
    .select('id_galleta')
    .eq('id_terminal', fingerprint)
    .is('revocado_at', null)
    .limit(1)
    .maybeSingle()

  if (galletaActiva) {
    await admin
      .from('galletas_terminales')
      .update({ ultima_activacion_at: new Date().toISOString() })
      .eq('id_galleta', galletaActiva.id_galleta)
  } else {
    await admin.from('galletas_terminales').insert({
      id_terminal: fingerprint,
      tipo: 'permanente',
      id_nombre: ficha.id_nombre,
      ultima_activacion_at: new Date().toISOString(),
    })
  }

  // 6. Auditar
  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'autorizar_terminal',
    id_nombre: ficha.id_nombre,
    id_terminal: fingerprint,
    metadata: { machine_id_nombre: machineIdNombre },
  })

  return okResponse({
    session: machineSignIn.session,
    fingerprint,
    auth_user_id: machineUserId,
  })
})
