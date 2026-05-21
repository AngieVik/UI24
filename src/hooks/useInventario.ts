import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { offlineQueueActions } from '@/hooks/useOfflineQueue'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface InventarioItem {
  id_item: number
  subgrupo: string
  stock_real: number
  nombre: string
  categoria: string
  especificacion: string | null
}

interface InventarioState {
  items: InventarioItem[]
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
}

export function useInventario() {
  const [state, setState] = useState<InventarioState>({
    items: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
  })

  const matricula    = useActivacionStore((s) => s.matricula)
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const isOnline     = useGlobalStore((s) => s.isOnline)

  const cargarInventario = useCallback(async () => {
    if (!matricula) return
    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const { data, error } = await supabase
        .from('inventario_vehiculo')
        .select('id_item, subgrupo, stock_real, catalogo_items(nombre, categoria, especificacion)')
        .eq('matricula', matricula)
        .order('subgrupo')
        .order('id_item')

      if (error) throw error

      const items: InventarioItem[] = (data ?? []).map((row: Record<string, unknown>) => {
        const cat = row['catalogo_items'] as Record<string, unknown> | null
        return {
          id_item:       row['id_item']   as number,
          subgrupo:      row['subgrupo']  as string,
          stock_real:    row['stock_real'] as number,
          nombre:        (cat?.['nombre']       ?? '') as string,
          categoria:     (cat?.['categoria']    ?? '') as string,
          especificacion:(cat?.['especificacion'] ?? null) as string | null,
        }
      })

      setState((s) => ({ ...s, items, isLoading: false }))
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: resolveRpcError(err) }))
    }
  }, [matricula])

  async function deducirMaterial(
    idItem: number,
    subgrupo: string,
    cantidad: number,
    motivo?: string,
  ): Promise<boolean> {
    if (!matricula || cantidad <= 0) return false

    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    // Optimistic update
    setState((s) => ({
      ...s,
      items: s.items.map((item) =>
        item.id_item === idItem && item.subgrupo === subgrupo
          ? { ...item, stock_real: Math.max(0, item.stock_real - cantidad) }
          : item,
      ),
    }))

    const mutationUuid = crypto.randomUUID()
    const payload = {
      mutation_uuid:  mutationUuid,
      p_matricula:    matricula,
      p_id_item:      idItem,
      p_cantidad:     cantidad,
      p_subgrupo:     subgrupo,
      p_id_activacion: idActivacion || null,
      p_motivo:       motivo ?? null,
    }

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('rpc_deducir_material', payload)
        if (error) throw error
      } else {
        offlineQueueActions.enqueue('rpc_deducir_material', payload, mutationUuid)
      }
      setState((s) => ({ ...s, isSubmitting: false }))
      return true
    } catch (err) {
      // Roll back optimistic update
      setState((s) => ({
        ...s,
        isSubmitting: false,
        error: resolveRpcError(err),
        items: s.items.map((item) =>
          item.id_item === idItem && item.subgrupo === subgrupo
            ? { ...item, stock_real: item.stock_real + cantidad }
            : item,
        ),
      }))
      return false
    }
  }

  return { ...state, cargarInventario, deducirMaterial }
}
