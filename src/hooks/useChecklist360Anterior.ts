import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EstadoEvaluacion } from '@/data/checklist360Catalog'

export interface ItemRespuestaAnterior {
  estado: EstadoEvaluacion
  campos_extra: Record<string, string | string[]>
  es_incidencia_heredada: boolean
}

export type RespuestasAnteriores = Record<string, ItemRespuestaAnterior>

/**
 * Carga las respuestas del último Checklist360 cerrado para un vehículo.
 * Usa rpc_obtener_checklist_anterior (SECURITY DEFINER).
 *
 * Fail-safe: si la RPC falla (timeout, sin cobertura), devuelve {}
 * y no bloquea la UI — per principio de no-obstrucción (Doc-Checklist360 spec).
 */
export function useChecklist360Anterior(matricula: string | null) {
  const queryKey = ['checklist360_anterior', matricula] as const

  const query = useQuery({
    queryKey,
    enabled: !!matricula,
    staleTime: 5 * 60_000, // 5 min — no cambia durante el turno
    retry: 1,
    queryFn: async (): Promise<RespuestasAnteriores> => {
      if (!matricula) return {}

      const { data, error } = await supabase.rpc('rpc_obtener_checklist_anterior', {
        p_matricula: matricula,
      })

      if (error) {
        // Fail-safe: log silencioso, devolver vacío
        console.warn('[Checklist360] herencia no disponible:', error.message)
        return {}
      }

      // La RPC devuelve JSONB — puede ser {} si no hay historial
      return (data as unknown as RespuestasAnteriores) ?? {}
    },
  })

  return {
    /** Respuestas del checklist anterior (vacío si no hay historial o error) */
    anterior: (query.data ?? {}) as RespuestasAnteriores,
    isLoading: query.isLoading,
  }
}
