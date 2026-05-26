import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator'

export interface InventarioItem {
  id_item: number
  subgrupo: string
  stock_real: number
  nombre: string
  categoria: string
  especificacion: string | null
}

/**
 * Inventario del vehículo activo (matrícula de useActivacionStore).
 *
 * Filtra por `matricula`, hace join con `catalogo_items` para nombre +
 * categoría + especificación.
 *
 * Realtime: canal sobre `inventario_vehiculo` filtrado por matrícula.
 * Las deducciones via `rpc_deducir_material` mutan esta tabla → el
 * canal invalida y la lista refresca.
 */
export function useInventarioVehiculo() {
  const matricula = useActivacionStore((s) => s.matricula)
  const enabled = matricula.length > 0
  const queryKey = ['inventario_vehiculo', matricula] as const

  const realtimeActive = useRealtimeInvalidator({
    channelName: `inventario-vehiculo-${matricula || 'none'}`,
    table: 'inventario_vehiculo',
    filter: enabled ? `matricula=eq.${matricula}` : undefined,
    queryKey,
  })

  const query = useQuery({
    queryKey,
    enabled,
    refetchInterval: realtimeActive ? false : 30_000,
    queryFn: async (): Promise<InventarioItem[]> => {
      if (!matricula) return []
      const { data, error } = await supabase
        .from('inventario_vehiculo')
        .select('id_item, subgrupo, stock_real, catalogo_items(nombre, categoria, especificacion)')
        .eq('matricula', matricula)
        .order('subgrupo')
        .order('id_item')
      if (error) throw error
      return (data ?? []).map((row) => {
        const cat = row.catalogo_items as unknown as { nombre: string; categoria: string; especificacion: string | null } | null
        return {
          id_item:    row.id_item,
          subgrupo:   row.subgrupo,
          stock_real: row.stock_real,
          nombre:     cat?.nombre ?? '—',
          categoria:  cat?.categoria ?? 'Sin categoría',
          especificacion: cat?.especificacion ?? null,
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
