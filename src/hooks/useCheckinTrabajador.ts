import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTerminalStore } from '@/stores/useTerminalStore'

interface CheckinVars {
  id_nombre: string
  password: string
}

interface CheckinResult {
  id_nombre: string
  id_terminal: string
  nombre_real: string
  rol: string
}

/**
 * Check-in de un trabajador en el terminal actual.
 *
 * Llama a `ef-checkin-trabajador` con el JWT del usuario máquina del
 * terminal en el header Authorization. La EF verifica credenciales del
 * trabajador con un cliente Anon aislado (no toca la sesión Supabase
 * del terminal) y hace UPSERT en `presencias_activas_terminal`.
 *
 * Tras éxito, invalida la query `personal_en_turno` para que el panel
 * se actualice en cuanto la presencia llegue por Realtime o refetch.
 */
export function useCheckinTrabajador() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  async function checkin(vars: CheckinVars): Promise<CheckinResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const idTerminal = useTerminalStore.getState().id_terminal
      if (!idTerminal) {
        setError('El terminal no está autorizado')
        return null
      }
      const { data, error: efErr } = await supabase.functions.invoke('ef-checkin-trabajador', {
        body: {
          id_nombre: vars.id_nombre,
          password: vars.password,
          id_terminal: idTerminal,
        },
      })
      if (efErr) {
        setError((await extractEdgeError(efErr)) ?? 'No se pudo completar el check-in')
        return null
      }
      const payload = data as CheckinResult
      queryClient.invalidateQueries({ queryKey: ['personal_en_turno', idTerminal] })
      return payload
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { checkin, isSubmitting, error, setError }
}

async function extractEdgeError(err: unknown): Promise<string | null> {
  if (typeof err === 'object' && err !== null) {
    const e = err as { message?: string; context?: unknown }
    const ctx = e.context
    if (ctx && typeof (ctx as Response).json === 'function') {
      try {
        const body = (await (ctx as Response).clone().json()) as { detail?: string; error?: string }
        return body.detail ?? body.error ?? null
      } catch {
        /* swallow */
      }
    }
    return e.message ?? null
  }
  return null
}
