import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface VehiculoActivo {
  matricula: string
  tipo: string
  condicion_tecnica: string
  estado_operativo: string
  pilot: string | null
  carry: string | null
  tipo_servicio: string | null
}

interface UseVehiculoActivoResult {
  data: VehiculoActivo | null
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Devuelve el vehículo activo del terminal: combinación de `vehiculos`
 * (datos técnicos: tipo, condición técnica, estado operativo) +
 * `activaciones_vehiculo` (la activación abierta más reciente para esa
 * matrícula, de la que sacamos pilot y carry).
 *
 * Gate: solo se ejecuta cuando `useActivacionStore.matricula` está
 * presente (hay check-in completado).
 *
 * Realtime: dos canales — uno sobre `vehiculos` filtrado por matrícula
 * (cambios técnicos), otro sobre `activaciones_vehiculo` filtrado por
 * matrícula (cambios de pilot/carry, apertura/cierre). Ambos invalidan
 * la misma query.
 */
export function useVehiculoActivo(): UseVehiculoActivoResult {
  const matricula = useActivacionStore((s) => s.matricula)
  const enabled = !!matricula && matricula.length > 0

  const queryKey = ['vehiculo_activo', matricula] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: `vehiculo-activo-veh-${matricula || 'none'}`,
    table: 'vehiculos',
    filter: enabled ? `matricula=eq.${matricula}` : undefined,
    queryKey,
  })

  useRealtimeInvalidator({
    channelName: `vehiculo-activo-act-${matricula || 'none'}`,
    table: 'activaciones_vehiculo',
    filter: enabled ? `matricula=eq.${matricula}` : undefined,
    queryKey,
  })

  const query = useQuery({
    queryKey,
    enabled,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<VehiculoActivo | null> => {
      if (!matricula) return null

      const [vehRes, actRes] = await Promise.all([
        supabase
          .from('vehiculos')
          .select('matricula, tipo, condicion_tecnica, estado_operativo')
          .eq('matricula', matricula)
          .maybeSingle(),
        supabase
          .from('activaciones_vehiculo')
          .select('pilot, carry, timestamp_apertura, tipo_servicio')
          .eq('matricula', matricula)
          .is('timestamp_cierre', null)
          .order('timestamp_apertura', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (vehRes.error) throw vehRes.error
      if (actRes.error) throw actRes.error
      if (!vehRes.data) return null

      return {
        matricula: vehRes.data.matricula,
        tipo: vehRes.data.tipo,
        condicion_tecnica: vehRes.data.condicion_tecnica,
        estado_operativo: vehRes.data.estado_operativo,
        pilot: actRes.data?.pilot ?? null,
        carry: actRes.data?.carry ?? null,
        tipo_servicio: actRes.data?.tipo_servicio ?? null,
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
