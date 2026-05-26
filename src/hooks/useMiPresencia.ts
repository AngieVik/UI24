import { useAuthStore } from '@/stores/useAuthStore'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useCheckoutTrabajador } from '@/hooks/useCheckoutTrabajador'

interface UseMiPresenciaResult {
  ejecutorId: string | null
  /** id_nombres del personal presente en el terminal. */
  personal: ReturnType<typeof usePersonalEnTurno>['data']
  isLoading: boolean
  /** Acción de check-out de un trabajador (cualquier presente del terminal). */
  checkout: (id_nombre: string) => Promise<{ noop: boolean } | null>
  isSubmitting: boolean
  error: Error | null
}

/**
 * Hook compuesto para `PresenciaScreen` v4 (D.1.1d.2).
 *
 * El check-out llama a `ef-checkout-trabajador` (modelo "sesión del
 * terminal"): la sesión Supabase NO se toca. Cuando el último
 * trabajador sale, `App.tsx` detecta `personal.length === 0` y
 * cambia automáticamente a `CheckinInicialScreen` (estado_0b).
 */
export function useMiPresencia(): UseMiPresenciaResult {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const personal = usePersonalEnTurno()
  const { checkout: doCheckout, isSubmitting, error } = useCheckoutTrabajador()

  async function checkout(id_nombre: string) {
    const res = await doCheckout({ id_nombre_target: id_nombre })
    if (!res) return null
    return { noop: !!res.noop }
  }

  return {
    ejecutorId,
    personal: personal.data,
    isLoading: personal.isLoading,
    checkout,
    isSubmitting,
    error: error ? new Error(error) : null,
  }
}
