import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Doc6Item {
  id_deduccion: string
  id_item: number
  nombre_item: string
  categoria: string
  cantidad: number
  id_nombre_operador: string
  created_at: string
}

interface UseDoc6DelTurnoResult {
  data: Doc6Item[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Lista los gastos de material (Doc-6) registrados durante una
 * activación concreta, haciendo join con catalogo_items para
 * obtener nombre y categoría del ítem.
 *
 * Gate: disabled si no se proporciona id_activacion.
 */
export function useDoc6DelTurno(idActivacion: string | null): UseDoc6DelTurnoResult {
  const query = useQuery({
    queryKey: ['doc6_del_turno', idActivacion] as const,
    enabled: !!idActivacion,
    staleTime: 30_000,
    queryFn: async (): Promise<Doc6Item[]> => {
      if (!idActivacion) return []

      const { data, error } = await supabase
        .from('doc6_deducciones')
        .select(
          `
          id_deduccion,
          id_item,
          cantidad,
          id_nombre_operador,
          created_at,
          catalogo_items!inner(nombre, categoria)
        `
        )
        .eq('id_activacion', idActivacion)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data ?? []).map((row) => {
        const cat = row.catalogo_items as unknown as { nombre: string; categoria: string }
        return {
          id_deduccion: row.id_deduccion,
          id_item: row.id_item,
          nombre_item: cat.nombre,
          categoria: cat.categoria,
          cantidad: row.cantidad,
          id_nombre_operador: row.id_nombre_operador,
          created_at: row.created_at,
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
