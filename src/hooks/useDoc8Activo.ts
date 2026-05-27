import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface Doc8Data {
  id_parte:         string
  id_activacion:    string
  km_inicio:        number | null
  km_fin:           number | null
  timestamp_inicio: string
  timestamp_fin:    string | null
  estado:           'Abierto_En_Turno' | 'Enviado_Cerrado'
  notas:            string | null
  // De activaciones_vehiculo
  matricula:        string
  pilot:            string
  carry:            string | null
  tipo_servicio:    string
}

interface UseDoc8ActivoResult {
  data:      Doc8Data | null
  isLoading: boolean
  isError:   boolean
  error:     Error | null
}

/**
 * Lee el Doc-8 activo del turno usando el id_parte persistido en
 * useActivacionStore (IndexedDB). Hace el join con activaciones_vehiculo
 * para obtener pilot/carry/tipo_servicio/matricula en una sola query.
 *
 * Realtime: invalida en cualquier cambio al Doc-8 propio.
 * Gate: disabled si no hay id_parte en el store.
 */
export function useDoc8Activo(): UseDoc8ActivoResult {
  const idParte = useActivacionStore((s) => s.id_parte)

  const queryKey = ['doc8_activo', idParte] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: `doc8-activo-${idParte || 'none'}`,
    table:       'doc8_partes_trabajo',
    filter:      idParte ? `id_parte=eq.${idParte}` : undefined,
    queryKey,
  })

  const query = useQuery({
    queryKey,
    enabled: !!idParte,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<Doc8Data | null> => {
      if (!idParte) return null

      const { data, error } = await supabase
        .from('doc8_partes_trabajo')
        .select(`
          id_parte,
          id_activacion,
          km_inicio,
          km_fin,
          timestamp_inicio,
          timestamp_fin,
          estado,
          notas,
          activaciones_vehiculo!inner(
            matricula,
            pilot,
            carry,
            tipo_servicio
          )
        `)
        .eq('id_parte', idParte)
        .single()

      if (error) throw error
      if (!data) return null

      const av = data.activaciones_vehiculo as unknown as {
        matricula:     string
        pilot:         string
        carry:         string | null
        tipo_servicio: string
      }

      return {
        id_parte:         data.id_parte,
        id_activacion:    data.id_activacion,
        km_inicio:        data.km_inicio,
        km_fin:           data.km_fin,
        timestamp_inicio: data.timestamp_inicio,
        timestamp_fin:    data.timestamp_fin,
        estado:           data.estado as 'Abierto_En_Turno' | 'Enviado_Cerrado',
        notas:            data.notas ?? null,
        matricula:        av.matricula,
        pilot:            av.pilot,
        carry:            av.carry ?? null,
        tipo_servicio:    av.tipo_servicio,
      }
    },
  })

  return {
    data:      query.data ?? null,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     (query.error as Error | null) ?? null,
  }
}
