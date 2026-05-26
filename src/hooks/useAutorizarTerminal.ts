import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { computeFingerprint } from '@/lib/fingerprint'

interface AutorizarVars {
  id_nombre_gerencia: string
  password: string
}

interface AutorizarResult {
  fingerprint: string
  auth_user_id: string
}

/**
 * Autoriza el terminal por primera vez (estado_0a → estado_0b).
 *
 * Llama a `ef-autorizar-terminal`:
 *   - Verifica que el actor es gerencia.
 *   - Crea (o reutiliza) el usuario máquina `terminal_<fp>@u24.local`.
 *   - Devuelve una sesión Supabase del usuario máquina.
 *
 * El cliente:
 *   - Hace `setSession()` con la sesión del usuario máquina.
 *   - Guarda el fingerprint como `id_terminal` en `useTerminalStore`.
 *
 * A partir de aquí la sesión Supabase pertenece al TERMINAL, no al
 * trabajador. Los trabajadores entran/salen vía PresenciaScreen y
 * CheckinInicialScreen sin tocar esta sesión.
 */
export function useAutorizarTerminal() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function autorizar(vars: AutorizarVars): Promise<AutorizarResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const fingerprint = await computeFingerprint()
      const { data, error: efErr } = await supabase.functions.invoke('ef-autorizar-terminal', {
        body: {
          id_nombre_gerencia: vars.id_nombre_gerencia,
          password:           vars.password,
          fingerprint,
        },
      })
      if (efErr) {
        setError(extractEdgeError(efErr) ?? 'No se pudo autorizar el terminal')
        return null
      }
      const payload = data as { session: Session; fingerprint: string; auth_user_id: string }
      if (!payload?.session?.access_token) {
        setError('Respuesta inválida del servidor')
        return null
      }

      // Set session del USUARIO MÁQUINA del terminal.
      await supabase.auth.setSession({
        access_token:  payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      })
      useAuthStore.getState().setSession(payload.session)
      useTerminalStore.getState().setTerminal({
        id_terminal: payload.fingerprint,
        tipoGalleta: 'permanente',
        fingerprint: payload.fingerprint,
      })

      return { fingerprint: payload.fingerprint, auth_user_id: payload.auth_user_id }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { autorizar, isSubmitting, error, setError }
}

function extractEdgeError(err: unknown): string | null {
  if (typeof err === 'object' && err !== null) {
    const e = err as { message?: string; context?: { body?: string } }
    if (e.context?.body) {
      try {
        const parsed = JSON.parse(e.context.body) as { detail?: string; error?: string }
        return parsed.detail ?? parsed.error ?? null
      } catch { /* swallow */ }
    }
    return e.message ?? null
  }
  return null
}
