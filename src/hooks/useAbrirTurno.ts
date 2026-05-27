import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTurnoStore } from '@/stores/useTurnoStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface AbrirTurnoResult {
  id_parte: string
  noop:     boolean
}

/**
 * Abre el turno de trabajo (crea Doc-8) para un trabajador.
 * Debe llamarse al hacer checkin en el terminal.
 *
 * Idempotente: si el mutation_uuid ya fue procesado, devuelve el
 * id_parte existente. Persiste en useTurnoStore (IndexedDB).
 */
export function useAbrirTurno() {
  const [error, setError]           = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function abrir(params: { id_nombre: string }): Promise<AbrirTurnoResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const mutationUuid = crypto.randomUUID()

      // rpc_abrir_turno not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcErr } = await (supabase as any)
        .rpc('rpc_abrir_turno', {
          p_mutation_uuid: mutationUuid,
          p_id_nombre:     params.id_nombre,
        })

      if (rpcErr) throw rpcErr

      const result = data as unknown as AbrirTurnoResult
      useTurnoStore.getState().setTurno({
        id_parte:  result.id_parte,
        id_nombre: params.id_nombre,
      })
      return result
    } catch (err) {
      setError(resolveRpcError(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { abrir, isSubmitting, error }
}
