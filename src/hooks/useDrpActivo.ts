import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

const ESTADOS_ACTIVOS = ['En_espera', 'En_preparacion', 'En_curso'] as const
type EstadoActivo = typeof ESTADOS_ACTIVOS[number]

export type DrpEntradaVia = 'vehiculo' | 'personal_a_pie'

export interface DrpActivo {
  id_drp: string
  estado: EstadoActivo
  id_coordinacion: string
  timestamp_preparacion: string | null
  timestamp_inicio: string | null
  via: DrpEntradaVia
}

interface UseDrpActivoResult {
  data: DrpActivo | null
  isLoading: boolean
  isError: boolean
  error: Error | null
}

interface DrpRow {
  id_drp: string
  estado: EstadoActivo
  id_coordinacion: string
  timestamp_preparacion: string | null
  timestamp_inicio: string | null
}

interface JoinRow {
  drps: DrpRow | DrpRow[]
}

/**
 * Devuelve el DRP activo del terminal — el primero que encuentre
 * cuando alguien con check-in en el terminal entró al DRP, sea por
 * vehículo (matrícula en `dotaciones_drp`) o a pie (id_nombre en
 * `drp_personal_a_pie`), y el DRP está en estado activo:
 * En_espera, En_preparacion o En_curso.
 *
 * Si hay varios, prioriza:
 *   1) En_curso > En_preparacion > En_espera
 *   2) Mayor timestamp_inicio (o timestamp_preparacion).
 *
 * Dependencia: `usePersonalEnTurno()` para obtener la lista de
 * id_nombres con check-in (que TanStack Query deduplica con el
 * `PanelPersonal`).
 */
export function useDrpActivo(): UseDrpActivoResult {
  const matricula = useActivacionStore((s) => s.matricula)
  const personal = usePersonalEnTurno()
  const idsNombres = personal.data.map((p) => p.id_nombre).sort()
  const idsKey = idsNombres.join(',')

  const hasMatricula = matricula.length > 0
  const hasPersonal  = idsNombres.length > 0
  const enabled = hasMatricula || hasPersonal

  const queryKey = ['drp_activo', matricula, idsKey] as const

  // Realtime: tres canales — dotaciones, personal_a_pie y la propia drps
  // (cambio de estado del DRP debe forzar refetch).
  const realtimeActive = useRealtimeInvalidator({
    channelName: `drp-dotaciones-${matricula || 'none'}`,
    table: 'dotaciones_drp',
    filter: hasMatricula ? `matricula=eq.${matricula}` : undefined,
    queryKey,
  })
  useRealtimeInvalidator({
    channelName: `drp-personal-a-pie-${idsKey || 'none'}`,
    table: 'drp_personal_a_pie',
    queryKey,
  })
  useRealtimeInvalidator({
    channelName: 'drp-drps-changes',
    table: 'drps',
    queryKey,
  })

  const query = useQuery({
    queryKey,
    enabled,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<DrpActivo | null> => {
      const all: DrpActivo[] = []

      if (hasMatricula) {
        const { data, error } = await supabase
          .from('dotaciones_drp')
          .select(
            'id_drp, drps!inner(id_drp, estado, id_coordinacion, timestamp_preparacion, timestamp_inicio)'
          )
          .eq('matricula', matricula)
          .is('timestamp_salida', null)
          .in('drps.estado', [...ESTADOS_ACTIVOS])
        if (error) throw error
        for (const row of data ?? []) {
          all.push(...extractDrp(row as unknown as JoinRow, 'vehiculo'))
        }
      }

      if (hasPersonal) {
        const { data, error } = await supabase
          .from('drp_personal_a_pie')
          .select(
            'id_drp, drps!inner(id_drp, estado, id_coordinacion, timestamp_preparacion, timestamp_inicio)'
          )
          .in('id_nombre', idsNombres)
          .is('timestamp_salida', null)
          .in('drps.estado', [...ESTADOS_ACTIVOS])
        if (error) throw error
        for (const row of data ?? []) {
          all.push(...extractDrp(row as unknown as JoinRow, 'personal_a_pie'))
        }
      }
      if (all.length === 0) return null

      // Dedupe por id_drp (priorizando entrada por vehículo si está duplicado)
      const byId = new Map<string, DrpActivo>()
      for (const d of all) {
        const prev = byId.get(d.id_drp)
        if (!prev || (prev.via === 'personal_a_pie' && d.via === 'vehiculo')) {
          byId.set(d.id_drp, d)
        }
      }

      return Array.from(byId.values()).sort(comparePriority)[0] ?? null
    },
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  }
}

function extractDrp(row: JoinRow, via: DrpEntradaVia): DrpActivo[] {
  const drp = Array.isArray(row.drps) ? row.drps[0] : row.drps
  if (!drp) return []
  return [{ ...drp, via }]
}

const ESTADO_PRIORIDAD: Record<EstadoActivo, number> = {
  En_curso:       0,
  En_preparacion: 1,
  En_espera:      2,
}

function comparePriority(a: DrpActivo, b: DrpActivo): number {
  const pa = ESTADO_PRIORIDAD[a.estado]
  const pb = ESTADO_PRIORIDAD[b.estado]
  if (pa !== pb) return pa - pb
  const ta = a.timestamp_inicio ?? a.timestamp_preparacion ?? ''
  const tb = b.timestamp_inicio ?? b.timestamp_preparacion ?? ''
  if (ta === tb) return 0
  return ta > tb ? -1 : 1
}
