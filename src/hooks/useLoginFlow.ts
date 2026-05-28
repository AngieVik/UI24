import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { computeFingerprint } from '@/lib/fingerprint'
import { saveOfflineSession } from '@/lib/offlineSession'

/**
 * Flujo de login del terminal — ÚNICO entry point al estado_1.
 *
 * Reglas duras (rules.md §1 + §3, decisión 2026-05-22):
 *   - Login normal: ONLINE OBLIGATORIO. Sin red → bloqueado.
 *   - Login emergencia: ONLINE OBLIGATORIO. Sin red → bloqueado.
 *   - La sesión offline (PBKDF2) NO sirve para el primer login. Solo se usa
 *     para `checkin_interno` (re-autenticación dentro de la sesión activa),
 *     que vive en otro hook.
 */
export interface LoginFlowState {
  isLoading: boolean
  error: string | null
  attempts: number
}

export function useLoginFlow() {
  const [state, setState] = useState<LoginFlowState>({
    isLoading: false,
    error: null,
    attempts: 0,
  })

  const isOnline = useGlobalStore((s) => s.isOnline)

  function handleFailure(message: string): boolean {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: message,
      attempts: prev.attempts + 1,
    }))
    return false
  }

  async function resolveGalleta(fingerprint: string) {
    const { data: galleta } = await supabase
      .from('galletas_terminales')
      .select('id_terminal, tipo')
      .eq('id_terminal', fingerprint)
      .is('revocado_at', null)
      .maybeSingle()

    useTerminalStore.getState().setTerminal({
      id_terminal: fingerprint,
      tipoGalleta: galleta?.tipo ?? 'temporal',
      fingerprint,
    })
  }

  async function loginNormal(id_nombre: string, password: string): Promise<boolean> {
    if (!isOnline) {
      return handleFailure('Sin conexión. El acceso al terminal requiere red.')
    }
    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${id_nombre}@u24.com`,
        password,
      })
      if (error || !data.session) {
        return handleFailure('Credenciales incorrectas. Verifica tu identificador y contraseña.')
      }

      // Cacheamos la sesión offline (PBKDF2) solo para futuros checkin_interno
      await saveOfflineSession(id_nombre, password)
      useAuthStore.getState().setSession(data.session)

      const fingerprint = await computeFingerprint()
      await resolveGalleta(fingerprint)

      // Auto-marca presencia del trabajador en este terminal (Fase D.1.1c).
      // Login = entrar al terminal = presencia activa.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)('rpc_marcar_presencia', {
          p_mutation_uuid: crypto.randomUUID(),
          p_id_terminal:   fingerprint,
        })
      } catch {
        // Si falla la presencia, NO bloqueamos el login. La pantalla
        // de check-in mostrará al trabajador la opción manual.
      }

      setState((s) => ({ ...s, isLoading: false }))
      return true
    } catch {
      return handleFailure('Error de red. Inténtalo de nuevo.')
    }
  }

  async function loginEmergencia(id_nombre: string, pin: string): Promise<boolean> {
    if (!isOnline) {
      return handleFailure('El acceso de emergencia requiere conexión a internet.')
    }
    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const fingerprint = await computeFingerprint()
      const { data, error } = await supabase.functions.invoke('ef_consumir_pin', {
        body: { id_nombre, pin, id_terminal: fingerprint },
      })
      if (error || !data?.session) {
        return handleFailure('PIN de emergencia inválido o expirado.')
      }
      useAuthStore.getState().setSession(data.session)
      useTerminalStore.getState().setTerminal({
        id_terminal: fingerprint,
        tipoGalleta: data.tipo_galleta ?? 'temporal',
        fingerprint,
      })
      // Fallback RBAC: acceso por PIN de emergencia sin rol explícito en BD
      // → invitado (puede ver Check-in | Check-out, nada más).
      if (useAuthStore.getState().rol === 'sin_rol') {
        useAuthStore.getState().overrideRol('invitado')
      }
      setState((s) => ({ ...s, isLoading: false }))
      return true
    } catch {
      return handleFailure('Error al procesar el acceso de emergencia.')
    }
  }

  function reset() {
    setState({ isLoading: false, error: null, attempts: 0 })
  }

  return { ...state, loginNormal, loginEmergencia, reset }
}
