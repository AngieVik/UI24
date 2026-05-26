import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface VehiculoDisponible {
  matricula: string
  tipo: string
  condicion_tecnica: string
}

/**
 * Devuelve los vehículos con `estado_operativo='inactivo'` y condición
 * técnica que no impide activación (`operativo`/`averiado_leve`, no
 * `dado_de_baja` ni `en_taller`). Lista que muestra `CheckinScreen`.
 */
export function useVehiculosDisponibles() {
  const queryKey = ['vehiculos_disponibles'] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: 'vehiculos-disponibles',
    table: 'vehiculos',
    queryKey,
  })

  const query = useQuery({
    queryKey,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<VehiculoDisponible[]> => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('matricula, tipo, condicion_tecnica')
        .eq('estado_operativo', 'inactivo')
        .neq('condicion_tecnica', 'dado_de_baja')
        .neq('condicion_tecnica', 'en_taller')
        .order('matricula')
      if (error) throw error
      return data ?? []
    },
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  }
}
