import { useAuthStore } from '@/stores/useAuthStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useTurnoStore } from '@/stores/useTurnoStore'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useCheckoutTrabajador } from '@/hooks/useCheckoutTrabajador'
import { useCerrarTurnoPorNombre } from '@/hooks/useCerrarTurnoPorNombre'

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
 * Hook compuesto para `PresenciaScreen`.
 *
 * Regla de turno (D.1 refactor):
 *   – El turno empieza al hacer check-in (rpc_abrir_turno en CheckinInicialScreen
 *     o en PresenciaScreen.onSubmitSumar).
 *   – El turno acaba al hacer check-out, independientemente del vehículo.
 *
 * Por tanto, checkout siempre llama a rpc_cerrar_turno_por_nombre para
 * cualquier trabajador que sale, no solo el último.
 *
 * Si el trabajador que sale es el ejecutor del terminal, además se limpian
 * useTurnoStore y useActivacionStore.
 *
 * La sesión Supabase del terminal NO se toca.
 */
export function useMiPresencia(): UseMiPresenciaResult {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const personal = usePersonalEnTurno()
  const { checkout: doCheckout, isSubmitting, error } = useCheckoutTrabajador()
  const { cerrarPorNombre, isSubmitting: cerrando } = useCerrarTurnoPorNombre()

  async function checkout(id_nombre: string) {
    // 1. Check-out de presencia (edge function)
    const res = await doCheckout({ id_nombre_target: id_nombre })
    if (!res) return null

    // 2. Cerrar el turno del trabajador (siempre, sin importar si es el último)
    await cerrarPorNombre({ id_nombre })

    // 3. Si el que sale es el ejecutor del terminal, limpiar stores locales
    if (id_nombre === ejecutorId) {
      useTurnoStore.getState().clearTurno()
      useActivacionStore.getState().clearActivacion()
    }

    return { noop: !!res.noop }
  }

  return {
    ejecutorId,
    personal: personal.data,
    isLoading: personal.isLoading,
    checkout,
    isSubmitting: isSubmitting || cerrando,
    error: error ? new Error(error) : null,
  }
}
