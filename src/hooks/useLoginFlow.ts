import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { computeFingerprint } from '@/lib/fingerprint'
import { saveOfflineSession, verifyOfflineLogin } from '@/lib/offlineSession'

export interface LoginFlowState {
  isLoading: boolean
  error: string | null
  attempts: number
  isBlocked: boolean
}

const MAX_ATTEMPTS = 3

export function useLoginFlow() {
  const [state, setState] = useState<LoginFlowState>({
    isLoading: false,
    error: null,
    attempts: 0,
    isBlocked: false,
  })

  const isOnline = useGlobalStore((s) => s.isOnline)

  function handleFailure(message: string): boolean {
    setState((prev) => {
      const attempts = prev.attempts + 1
      const isBlocked = attempts >= MAX_ATTEMPTS
      return {
        ...prev,
        isLoading: false,
        error: isBlocked
          ? 'Demasiados intentos fallidos. Contacta con RRHH para recuperar el acceso.'
          : message,
        attempts,
        isBlocked,
      }
    })
    return false
  }

  async function resolveGalleta(fingerprint: string) {
    if (!isOnline) return
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
    if (state.isBlocked) return false
    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      if (isOnline) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: `${id_nombre}@u24.com`,
          password,
        })
        if (error || !data.session) {
          return handleFailure('Credenciales incorrectas. Verifica tu identificador y contraseña.')
        }
        // Cachear sesión offline tras login exitoso
        await saveOfflineSession(id_nombre, password)
        useAuthStore.getState().setSession(data.session)
      } else {
        const ok = await verifyOfflineLogin(id_nombre, password)
        if (!ok) {
          return handleFailure('Credenciales incorrectas o sesión sin conexión expirada.')
        }
        // Sesión cacheada en useAuthStore desde el último login online
      }

      const fingerprint = await computeFingerprint()
      await resolveGalleta(fingerprint)

      setState((s) => ({ ...s, isLoading: false }))
      return true
    } catch {
      return handleFailure('Error de red. Inténtalo de nuevo.')
    }
  }

  async function loginEmergencia(id_nombre: string, pin: string): Promise<boolean> {
    if (!isOnline) {
      setState((s) => ({
        ...s,
        error: 'El acceso de emergencia requiere conexión a internet.',
      }))
      return false
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
      setState((s) => ({ ...s, isLoading: false }))
      return true
    } catch {
      return handleFailure('Error al procesar el acceso de emergencia.')
    }
  }

  function reset() {
    setState({ isLoading: false, error: null, attempts: 0, isBlocked: false })
  }

  return { ...state, loginNormal, loginEmergencia, reset }
}
