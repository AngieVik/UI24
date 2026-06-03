import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface VehiculoFila {
  matricula: string
  tipo: string
  condicion_tecnica: string
  estado_operativo: string
  subestado_operativo: string | null
  vehiculo_id: string | null
  nombre_display: string | null
}

/**
 * Lista de TODA la flota (no filtra por estado). Para la zona
 * superior de `VehiculosScreen` (selector de flota).
 *
 * Realtime: canal sobre `vehiculos` (sin filtro de matrícula —
 * cualquier cambio invalida).
 */
export function useFlotaCompleta() {
  const queryKey = ['flota_completa'] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: 'flota-completa',
    table: 'vehiculos',
    queryKey,
  })

  const query = useQuery({
    queryKey,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<VehiculoFila[]> => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('matricula, tipo, condicion_tecnica, estado_operativo, subestado_operativo, vehiculo_id, nombre_display')
        .order('matricula')
      if (error) throw error
      return (data ?? []) as VehiculoFila[]
    },
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  }
}
