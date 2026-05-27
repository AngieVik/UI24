import { useAuthStore } from '@/stores/useAuthStore'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useCheckoutTrabajador } from '@/hooks/useCheckoutTrabajador'
import { useCerrarTurno } from '@/hooks/useCerrarTurno'
import { useTurnoStore } from '@/stores/useTurnoStore'

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
 * Hook compuesto para `PresenciaScreen` v5 (D.1.1d.2, turno-aware).
 *
 * El check-out llama a `ef-checkout-trabajador`. Cuando el ÚLTIMO
 * trabajador sale, también cierra el turno (rpc_cerrar_turno), lo que
 * cierra el Doc-8 activo y limpia los stores.
 *
 * La sesión Supabase del terminal NO se toca.
 */
export function useMiPresencia(): UseMiPresenciaResult {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const personal   = usePersonalEnTurno()
  const { checkout: doCheckout, isSubmitting, error } = useCheckoutTrabajador()
  const { cerrar, isSubmitting: cerrando } = useCerrarTurno()

  async function checkout(id_nombre: string) {
    const isLastWorker = personal.data.length === 1 &&
      personal.data.some((p) => p.id_nombre === id_nombre)

    const res = await doCheckout({ id_nombre_target: id_nombre })
    if (!res) return null

    if (isLastWorker) {
      // Last worker leaving — close the shift doc
      const idParte = useTurnoStore.getState().id_parte
      if (idParte) {
        await cerrar({ id_parte: idParte })
      }
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
