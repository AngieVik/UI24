import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'

export interface ActivacionData {
  id_activacion: string
  id_parte: string
  id_checklist: string
  matricula: string
  checklistCerrado: boolean
}

interface ActivacionState extends ActivacionData {
  setActivacion: (data: Omit<ActivacionData, 'checklistCerrado'>) => void
  marcarChecklistCerrado: () => void
  clearActivacion: () => void
}

const EMPTY: ActivacionData = {
  id_activacion: '',
  id_parte: '',
  id_checklist: '',
  matricula: '',
  checklistCerrado: false,
}

// IndexedDB: la activación activa sobrevive a recargas de página
export const useActivacionStore = create<ActivacionState>()(
  persist(
    (set) => ({
      ...EMPTY,

      setActivacion(data) {
        set({ ...data, checklistCerrado: false })
      },

      marcarChecklistCerrado() {
        set({ checklistCerrado: true })
      },

      clearActivacion() {
        set({ ...EMPTY })
      },
    }),
    {
      name: 'u24-activacion',
      storage: createIdbStorage<ActivacionState>(),
    },
  ),
)
