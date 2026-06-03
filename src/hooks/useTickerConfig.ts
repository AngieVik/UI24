import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TickerConfig {
  text: string
  speed: number
}

/**
 * Lee la configuración de la marquesina desde system_config (clave 'marquesina').
 * El valor almacenado es un objeto JSON: { texto: string, velocidad: number }.
 * La velocidad es la duración en segundos de la animación CSS marquee.
 */
export function useTickerConfig(): TickerConfig {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['ticker_config'],
    staleTime: 30_000,
    queryFn: async (): Promise<TickerConfig> => {
      const { data, error } = await supabase
        .from('system_config')
        .select('valor')
        .eq('clave', 'marquesina')
        .maybeSingle()
      if (error) throw error
      const val = data?.valor as { texto?: string; velocidad?: number } | null | undefined
      return {
        text: typeof val?.texto === 'string' ? val.texto : '',
        speed: typeof val?.velocidad === 'number' ? val.velocidad : 60,
      }
    },
  })

  // Realtime: invalida el caché cuando system_config cambia
  useEffect(() => {
    const channel = supabase
      .channel('ticker_config_rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_config' },
        () => {
          qc.invalidateQueries({ queryKey: ['ticker_config'] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])

  return {
    text: query.data?.text ?? '',
    speed: query.data?.speed ?? 60,
  }
}
