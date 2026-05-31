import { useState } from 'react'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useActivacionStore } from '@/stores/useActivacionStore'
import type { ItemRespuesta } from '@/components/operativa/Checklist360Screen'

interface CerrarVars {
  id_checklist: string
  respuestas: Record<string, ItemRespuesta>
}

interface CerrarResult {
  online: boolean
  id_checklist: string
}

/**
 * Mutación para cerrar el Checklist360.
 * Llama a rpc_cerrar_checklist (idempotente, ADR-012).
 * En éxito: marca checklistCerrado = true en useActivacionStore.
 * Invalida checklist360_activo.
 */
export function useCerrarChecklist360() {
  const marcarChecklistCerrado = useActivacionStore((s) => s.marcarChecklistCerrado)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mut = useOfflineMutation<{
    p_id_checklist: string
    p_items_revisados: Record<string, ItemRespuesta>
  }>({
    rpcName: 'rpc_cerrar_checklist',
    invalidates: [['checklist360_activo']],
  })

  async function cerrar(vars: CerrarVars): Promise<CerrarResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await mut.mutateAsync({
        p_id_checklist: vars.id_checklist,
        p_items_revisados: vars.respuestas,
      })

      marcarChecklistCerrado()

      return {
        online: !res.queued,
        id_checklist: vars.id_checklist,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { cerrar, isSubmitting, error }
}
