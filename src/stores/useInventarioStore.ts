import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'
import type { Database } from '@/types/supabase'

type InventarioBaseRow = Database['public']['Tables']['inventario_base']['Row']
type InventarioVehiculoRow =
  Database['public']['Tables']['inventario_vehiculo']['Row']

interface InventarioState {
  base: InventarioBaseRow[]
  vehiculo: InventarioVehiculoRow[]
  lastSyncedAt: string | null
  // Solo lectura: las escrituras van por la cola (ADR-001 §4)
  setBase: (items: InventarioBaseRow[]) => void
  setVehiculo: (items: InventarioVehiculoRow[]) => void
  clearCache: () => void
}

export const useInventarioStore = create<InventarioState>()(
  persist(
    (set) => ({
      base: [],
      vehiculo: [],
      lastSyncedAt: null,

      setBase(items) {
        set({ base: items, lastSyncedAt: new Date().toISOString() })
      },

      setVehiculo(items) {
        set({ vehiculo: items, lastSyncedAt: new Date().toISOString() })
      },

      clearCache() {
        set({ base: [], vehiculo: [], lastSyncedAt: null })
      },
    }),
    {
      name: 'u24-inventario',
      storage: createIdbStorage<InventarioState>(),
    },
  ),
)
