import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface BandejaPersonal {
  id_nombre: string
  unreadCount: number
}

interface UseBandejasPersonalesResult {
  data: BandejaPersonal[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Devuelve la cuenta de mensajes sin leer (`estado = 'no_leido'`) de
 * `mensajes_bandeja` para cada id_nombre del personal en turno.
 *
 * Recibe la lista de ids como argumento (en vez de leer
 * `usePersonalEnTurno` internamente) para evitar refetches en cascada
 * cuando el padre ya conoce los ids. El caller pasa el array desde
 * `usePersonalEnTurno().data`.
 *
 * Cuando la lista está vacía, devuelve [] sin tocar BD.
 *
 * Realtime: canal sobre `mensajes_bandeja` filtrado por destino.
 */
export function useBandejasPersonales(idsNombres: readonly string[]): UseBandejasPersonalesResult {
  const idsKey = [...idsNombres].sort().join(',')
  const queryKey = ['bandejas_personales', idsKey] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: `bandejas-personales-${idsKey || 'none'}`,
    table: 'mensajes_bandeja',
    queryKey,
  })

  const query = useQuery({
    queryKey,
    enabled: idsNombres.length > 0,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<BandejaPersonal[]> => {
      if (idsNombres.length === 0) return []

      // Estrategia: traemos solo los mensajes no leídos para los
      // destinatarios relevantes y agrupamos en cliente. PostgREST no
      // soporta GROUP BY directo en select — mantenemos la query
      // simple y agregamos en JS (n suele ser <10).
      const { data, error } = await supabase
        .from('mensajes_bandeja')
        .select('id_nombre_destino')
        .in('id_nombre_destino', [...idsNombres])
        .eq('estado', 'no_leido')
      if (error) throw error

      const counts = new Map<string, number>()
      for (const id of idsNombres) counts.set(id, 0)
      for (const row of data ?? []) {
        counts.set(row.id_nombre_destino, (counts.get(row.id_nombre_destino) ?? 0) + 1)
      }

      return idsNombres.map((id) => ({
        id_nombre: id,
        unreadCount: counts.get(id) ?? 0,
      }))
    },
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  }
}
