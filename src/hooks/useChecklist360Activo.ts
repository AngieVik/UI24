import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Checklist360Data {
  id_checklist: string
  matricula: string
  id_activacion: string
  id_nombre_redactor: string
  timestamp_inicio: string
  timestamp_cierre: string | null
  items_revisados: Record<string, unknown>
  cerrado: boolean
}

interface UseChecklist360ActivoResult {
  data: Checklist360Data | null
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Lee el Checklist360 activo del turno usando el id_checklist
 * persistido en useActivacionStore (IndexedDB).
 *
 * Gate: disabled si idChecklist está vacío.
 */
export function useChecklist360Activo(idChecklist: string | null): UseChecklist360ActivoResult {
  const queryKey = ['checklist360_activo', idChecklist] as const

  const query = useQuery({
    queryKey,
    enabled: !!idChecklist,
    staleTime: 60_000,
    queryFn: async (): Promise<Checklist360Data | null> => {
      if (!idChecklist) return null

      const { data, error } = await supabase
        .from('doc_checklist360')
        .select(
          `
          id_checklist,
          matricula,
          id_activacion,
          id_nombre_redactor,
          timestamp_inicio,
          timestamp_cierre,
          items_revisados,
          cerrado
        `
        )
        .eq('id_checklist', idChecklist)
        .single()

      if (error) throw error
      if (!data) return null

      return {
        id_checklist: data.id_checklist,
        matricula: data.matricula,
        id_activacion: data.id_activacion,
        id_nombre_redactor: data.id_nombre_redactor,
        timestamp_inicio: data.timestamp_inicio,
        timestamp_cierre: data.timestamp_cierre ?? null,
        items_revisados: (data.items_revisados as Record<string, unknown>) ?? {},
        cerrado: data.cerrado,
      }
    },
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  }
}
