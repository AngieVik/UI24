import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface FichaEmpleado {
  id_nombre: string
  id_persona: string
  rol: string
  activo: boolean
  pin_stepup_hash: string | null
  pin_stepup_salt: string | null
}

/** Crea el cliente con el JWT del request (permisos del usuario). */
export function userClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  )
}

/** Crea el cliente admin (service_role — bypasa RLS). */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

/**
 * Extrae el auth.uid() del JWT y carga la ficha del empleado.
 * Devuelve null si el JWT no es válido o el empleado no está activo.
 */
export async function resolveEmpleado(
  req: Request,
): Promise<{ uid: string; ficha: FichaEmpleado } | null> {
  const client = userClient(req)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null

  const admin = adminClient()
  const { data: ficha } = await admin
    .from('fichas_empleados')
    .select('id_nombre, id_persona, rol, activo, pin_stepup_hash, pin_stepup_salt')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .single()

  if (!ficha) return null
  return { uid: user.id, ficha }
}

/**
 * Verifica el PIN step-up contra el hash almacenado.
 * Registra intentos en pin_intentos_fallidos y bloquea tras 3 fallos.
 * Lanza un string de error si falla; devuelve void si es correcto.
 */
export async function verificarStepup(
  admin: SupabaseClient,
  idNombre: string,
  idTerminal: string,
  stepupHash: string,
): Promise<string | null> {
  const lockKey = idTerminal || idNombre

  // Comprobar bloqueo activo
  const { data: bloqueo } = await admin
    .from('pin_intentos_fallidos')
    .select('bloqueado_hasta')
    .eq('id_terminal', lockKey)
    .gt('bloqueado_hasta', new Date().toISOString())
    .order('bloqueado_hasta', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (bloqueo?.bloqueado_hasta) return 'ERR_STEPUP_001'

  // Obtener hash almacenado
  const { data: ficha } = await admin
    .from('fichas_empleados')
    .select('pin_stepup_hash')
    .eq('id_nombre', idNombre)
    .eq('activo', true)
    .single()

  if (!ficha) return 'ERR_STEPUP_002'
  if (!ficha.pin_stepup_hash) return 'ERR_STEPUP_003'

  if (ficha.pin_stepup_hash !== stepupHash) {
    // Ventana de 10 minutos — calculada en el cliente del minuto actual - (minuto % 10)
    const now = new Date()
    const minuteOffset = now.getMinutes() % 10
    const ventana = new Date(now.getTime() - minuteOffset * 60_000)
    ventana.setSeconds(0, 0)

    const { data: existing } = await admin
      .from('pin_intentos_fallidos')
      .select('intentos')
      .eq('id_terminal', lockKey)
      .eq('ventana_inicio', ventana.toISOString())
      .maybeSingle()

    const intentos = (existing?.intentos ?? 0) + 1

    if (existing) {
      await admin
        .from('pin_intentos_fallidos')
        .update({ intentos, bloqueado_hasta: intentos >= 3 ? new Date(now.getTime() + 15 * 60_000).toISOString() : null })
        .eq('id_terminal', lockKey)
        .eq('ventana_inicio', ventana.toISOString())
    } else {
      await admin
        .from('pin_intentos_fallidos')
        .insert({ id_terminal: lockKey, ventana_inicio: ventana.toISOString(), intentos })
    }

    await admin.from('auditoria_rbac').insert({
      tipo_evento: 'step_up_fallido',
      id_nombre: idNombre,
      id_terminal: idTerminal,
      metadata: { intentos_ventana: intentos },
    })

    return intentos >= 3 ? 'ERR_STEPUP_004' : 'ERR_STEPUP_005'
  }

  // Hash correcto — limpiar intentos y registrar éxito
  await admin
    .from('pin_intentos_fallidos')
    .delete()
    .eq('id_terminal', lockKey)
    .is('bloqueado_hasta', null)

  await admin.from('auditoria_rbac').insert({
    tipo_evento: 'step_up_exitoso',
    id_nombre: idNombre,
    id_terminal: idTerminal,
  })

  return null
}
