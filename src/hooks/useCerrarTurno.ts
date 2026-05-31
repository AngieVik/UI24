import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTurnoStore } from '@/stores/useTurnoStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface CerrarTurnoResult {
  closed: boolean
  noop: boolean
}

/**
 * Cierra el turno de trabajo (Doc-8) al hacer checkout del trabajador.
 *
 * Limpia useTurnoStore Y useActivacionStore (el turno se cierra,
 * y con él cualquier activación de vehículo asociada también debería
 * haberse cerrado previamente vía rpc_actualizar_vehiculo 'desactivado').
 *
 * Idempotente vía mutation_uuid.
 */
export function useCerrarTurno() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function cerrar(params: { id_parte: string }): Promise<CerrarTurnoResult | null> {
    if (!params.id_parte) return { closed: false, noop: true }

    setError(null)
    setIsSubmitting(true)
    try {
      const mutationUuid = crypto.randomUUID()

      // rpc_cerrar_turno not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcErr } = await (supabase as any).rpc('rpc_cerrar_turno', {
        p_mutation_uuid: mutationUuid,
        p_id_parte: params.id_parte,
      })

      if (rpcErr) throw rpcErr

      // Clear both stores on successful close
      useTurnoStore.getState().clearTurno()
      useActivacionStore.getState().clearActivacion()

      return data as unknown as CerrarTurnoResult
    } catch (err) {
      setError(resolveRpcError(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { cerrar, isSubmitting, error }
}
