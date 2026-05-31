import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'

export interface TurnoData {
  id_parte: string
  id_nombre: string
  turnoActivo: boolean
}

interface TurnoState extends TurnoData {
  setTurno: (data: Pick<TurnoData, 'id_parte' | 'id_nombre'>) => void
  clearTurno: () => void
}

const EMPTY: TurnoData = {
  id_parte: '',
  id_nombre: '',
  turnoActivo: false,
}

/**
 * Turno store — IndexedDB persisted.
 *
 * El "turno" es el Doc-8 asociado a la presencia de un trabajador en
 * el terminal. Se abre al hacer checkin (rpc_abrir_turno) y se cierra
 * al hacer checkout del último trabajador (rpc_cerrar_turno).
 *
 * NO está ligado a un vehículo — un turno puede existir sin activar
 * ningún vehículo. La activación de vehículo es independiente
 * y se gestiona en useActivacionStore.
 */
export const useTurnoStore = create<TurnoState>()(
  persist(
    (set) => ({
      ...EMPTY,

      setTurno({ id_parte, id_nombre }) {
        set({ id_parte, id_nombre, turnoActivo: true })
      },

      clearTurno() {
        set({ ...EMPTY })
      },
    }),
    {
      name: 'u24-turno',
      storage: createIdbStorage<TurnoState>(),
    }
  )
)
