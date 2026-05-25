import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Devuelve `true` si el flag `realtime_kill_switch` está activado en
 * `system_config`. Cuando está activo, los hooks de datos del home
 * (ver `useRealtimeInvalidator`) NO abren canales Realtime y caen en
 * polling de respaldo (refetchInterval de 30 s a nivel de useQuery).
 *
 * Política de cache: `staleTime` largo (5 min) porque el flag lo cambia
 * solo gerencia desde SystemConfigScreen — no necesita refresco agresivo.
 */
export function useRealtimeKillSwitch(): boolean {
  const { data } = useQuery({
    queryKey: ['system_config', 'realtime_kill_switch'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('system_config')
        .select('valor')
        .eq('clave', 'realtime_kill_switch')
        .maybeSingle()
      if (error) throw error
      return data?.valor === true
    },
    staleTime: 5 * 60_000,
  })
  return data ?? false
}
