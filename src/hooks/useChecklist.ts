import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { offlineQueueActions } from '@/hooks/useOfflineQueue'
import { resolveRpcError } from '@/lib/resolveRpcError'

export type NivelCriticidad = 'Leve' | 'Moderada' | 'Grave'

export interface ChecklistItemData {
  ok: boolean
  criticidad?: NivelCriticidad
  descripcion?: string
}

interface ChecklistState {
  isSubmitting: boolean
  error: string | null
}

export function useChecklist() {
  const [state, setState] = useState<ChecklistState>({
    isSubmitting: false,
    error: null,
  })

  const isOnline = useGlobalStore((s) => s.isOnline)
  const idChecklist = useActivacionStore((s) => s.id_checklist)
  const marcarChecklistCerrado = useActivacionStore((s) => s.marcarChecklistCerrado)

  async function cerrarChecklist(items: Record<string, ChecklistItemData>): Promise<boolean> {
    if (!idChecklist) {
      setState((s) => ({ ...s, error: 'Sin checklist activo.' }))
      return false
    }

    for (const [sistema, item] of Object.entries(items)) {
      if (!item.ok && !item.criticidad) {
        setState((s) => ({
          ...s,
          error: `Sistema "${sistema}" marcado como fallido sin criticidad.`,
        }))
        return false
      }
    }

    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    const mutationUuid = crypto.randomUUID()
    const payload = {
      mutation_uuid: mutationUuid,
      p_id_checklist: idChecklist,
      p_items_revisados: items,
    }

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('rpc_cerrar_checklist', payload)
        if (error) throw error
      } else {
        offlineQueueActions.enqueue('rpc_cerrar_checklist', payload, mutationUuid)
      }

      marcarChecklistCerrado()
      setState((s) => ({ ...s, isSubmitting: false }))
      return true
    } catch (err) {
      setState((s) => ({
        ...s,
        isSubmitting: false,
        error: resolveRpcError(err),
      }))
      return false
    }
  }

  return { ...state, cerrarChecklist }
}
