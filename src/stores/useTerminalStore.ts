import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'
import type { Database } from '@/types/supabase'

type TipoGalleta = Database['public']['Enums']['tipo_galleta']

interface TerminalState {
  id_terminal: string | null
  tipoGalleta: TipoGalleta | null
  fingerprint: string | null
  setTerminal: (data: {
    id_terminal: string
    tipoGalleta: TipoGalleta
    fingerprint: string
  }) => void
  clearTerminal: () => void
}

// IndexedDB: sobrevive al cierre de pestaña — galleta permanente del dispositivo (ADR-001 enmienda)
export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      id_terminal: null,
      tipoGalleta: null,
      fingerprint: null,

      setTerminal(data) {
        set(data)
      },

      clearTerminal() {
        set({ id_terminal: null, tipoGalleta: null, fingerprint: null })
      },
    }),
    {
      name: 'u24-terminal',
      storage: createIdbStorage<TerminalState>(),
    }
  )
)
