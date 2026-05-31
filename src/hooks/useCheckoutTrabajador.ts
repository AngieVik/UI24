import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTerminalStore } from '@/stores/useTerminalStore'

interface CheckoutVars {
  id_nombre_target: string
}

interface CheckoutResult {
  id_nombre: string
  ausente: true
  noop?: boolean
}

/**
 * Check-out de un trabajador del terminal actual.
 *
 * Llama a `ef-checkout-trabajador`. Modelo de confianza: con la sesión
 * del terminal cualquiera puede sacar a otro presente del MISMO
 * terminal. Idempotente (devuelve `noop: true` si el target ya no
 * estaba).
 *
 * IMPORTANTE — la sesión Supabase del terminal NO se cierra. Cuando
 * el último presente sale, App.tsx detecta `personal.length === 0` y
 * muestra `CheckinInicialScreen` (estado_0b), no `LoginScreen`.
 */
export function useCheckoutTrabajador() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  async function checkout(vars: CheckoutVars): Promise<CheckoutResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const idTerminal = useTerminalStore.getState().id_terminal
      if (!idTerminal) {
        setError('El terminal no está autorizado')
        return null
      }
      const { data, error: efErr } = await supabase.functions.invoke('ef-checkout-trabajador', {
        body: {
          id_nombre_target: vars.id_nombre_target,
          id_terminal: idTerminal,
        },
      })
      if (efErr) {
        setError(extractEdgeError(efErr) ?? 'No se pudo completar el check-out')
        return null
      }
      queryClient.invalidateQueries({ queryKey: ['personal_en_turno', idTerminal] })
      return data as CheckoutResult
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { checkout, isSubmitting, error, setError }
}

function extractEdgeError(err: unknown): string | null {
  if (typeof err === 'object' && err !== null) {
    const e = err as { message?: string; context?: { body?: string } }
    if (e.context?.body) {
      try {
        const parsed = JSON.parse(e.context.body) as { detail?: string; error?: string }
        return parsed.detail ?? parsed.error ?? null
      } catch {
        /* swallow */
      }
    }
    return e.message ?? null
  }
  return null
}
