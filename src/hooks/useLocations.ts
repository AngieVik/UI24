import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Location {
  location_id: string
  nombre:      string
  tipo:        string
}

/**
 * Lista de todas las locations (almacenes + vehículos como location).
 * Sirve para el selector de destino en Doc-10 envío de material.
 */
export function useLocations() {
  const query = useQuery({
    queryKey: ['locations'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('location_id, nombre, tipo')
        .order('tipo')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as Location[]
    },
  })

  return {
    data:      query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     (query.error as Error | null) ?? null,
  }
}
