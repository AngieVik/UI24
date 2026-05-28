import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface CerrarPorNombreResult {
  id_parte: string | null
  noop:     boolean
}

/**
 * Cierra el turno activo de un trabajador buscándolo por id_nombre.
 *
 * Idempotente: si el trabajador no tiene turno abierto devuelve
 * `{ noop: true }` sin lanzar error.
 *
 * Usado por useMiPresencia al hacer check-out de cualquier trabajador.
 */
export function useCerrarTurnoPorNombre() {
  const [error, setError]           = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function cerrarPorNombre(params: {
    id_nombre: string
    km_fin?:   number | null
    notas?:    string | null
  }): Promise<CerrarPorNombreResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const mutationUuid = crypto.randomUUID()

      // rpc_cerrar_turno_por_nombre not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcErr } = await (supabase as any)
        .rpc('rpc_cerrar_turno_por_nombre', {
          p_mutation_uuid: mutationUuid,
          p_id_nombre:     params.id_nombre,
          p_km_fin:        params.km_fin  ?? null,
          p_notas:         params.notas   ?? null,
        })

      if (rpcErr) throw rpcErr
      return data as unknown as CerrarPorNombreResult
    } catch (err) {
      setError(resolveRpcError(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { cerrarPorNombre, isSubmitting, error }
}
