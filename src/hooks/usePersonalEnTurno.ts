import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface PersonaEnTurno {
  id_nombre: string
  nombre_real: string
  rol: string
  telefono: string | null
  checkin_at: string
}

interface UsePersonalEnTurnoResult {
  data: PersonaEnTurno[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Devuelve el personal con check-in activo en el terminal actual.
 *
 * Fuente: `presencias_activas_terminal` join `fichas_empleados`.
 * Filtro: `id_terminal = useTerminalStore.id_terminal`.
 *
 * Realtime: canal sobre `presencias_activas_terminal` filtrado por
 * id_terminal — invalida la query en cualquier INSERT/UPDATE/DELETE.
 * Si el kill-switch está activo, polling cada 30 s.
 */
export function usePersonalEnTurno(): UsePersonalEnTurnoResult {
  const idTerminal = useTerminalStore((s) => s.id_terminal)

  const queryKey = ['personal_en_turno', idTerminal] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: `personal-en-turno-${idTerminal ?? 'none'}`,
    table: 'presencias_activas_terminal',
    filter: idTerminal ? `id_terminal=eq.${idTerminal}` : undefined,
    queryKey,
  })

  const query = useQuery({
    queryKey,
    enabled: !!idTerminal,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<PersonaEnTurno[]> => {
      if (!idTerminal) return []
      const { data, error } = await supabase
        .from('presencias_activas_terminal')
        .select('id_nombre, checkin_at, fichas_empleados!inner(nombre_real, rol, telefono)')
        .eq('id_terminal', idTerminal)
        .order('checkin_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map((row) => {
        // El join `!inner` garantiza ficha existente.
        const ficha = row.fichas_empleados as unknown as { nombre_real: string; rol: string; telefono: string | null }
        return {
          id_nombre:  row.id_nombre,
          checkin_at: row.checkin_at,
          nombre_real: ficha.nombre_real,
          rol:        ficha.rol,
          telefono:   ficha.telefono ?? null,
        }
      })
    },
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  }
}
