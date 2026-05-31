import { useState } from 'react'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'

interface AnotarVars {
  id_parte: string
  notas: string
}

interface AnotarResult {
  online: boolean
  id_parte: string
}

/**
 * Mutación para guardar anotaciones en el Doc-8 activo.
 * Idempotente via useOfflineMutation (ADR-012).
 * Invalida doc8_activo para que la query refleje las notas guardadas.
 */
export function useAnotarParte() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mut = useOfflineMutation<{
    p_id_parte: string
    p_notas: string
  }>({
    rpcName: 'rpc_anotar_parte',
    invalidates: [['doc8_activo']],
  })

  async function anotar(vars: AnotarVars): Promise<AnotarResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await mut.mutateAsync({
        p_id_parte: vars.id_parte,
        p_notas: vars.notas,
      })

      return {
        online: !res.queued,
        id_parte: vars.id_parte,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { anotar, isSubmitting, error }
}
