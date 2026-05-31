import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'
import type { Database } from '@/types/supabase'

type MensajeRow = Database['public']['Tables']['mensajes_bandeja']['Row']

interface BandejasState {
  mensajes: MensajeRow[]
  lastSyncedAt: string | null
  // Caché offline como fallback de Realtime
  setMensajes: (mensajes: MensajeRow[]) => void
  upsertMensaje: (mensaje: MensajeRow) => void
  marcarLeido: (id_mensaje: string) => void
  clearCache: () => void
}

export const useBandejasStore = create<BandejasState>()(
  persist(
    (set) => ({
      mensajes: [],
      lastSyncedAt: null,

      setMensajes(mensajes) {
        set({ mensajes, lastSyncedAt: new Date().toISOString() })
      },

      upsertMensaje(mensaje) {
        set((s) => {
          const exists = s.mensajes.some((m) => m.id_mensaje === mensaje.id_mensaje)
          return {
            mensajes: exists
              ? s.mensajes.map((m) => (m.id_mensaje === mensaje.id_mensaje ? mensaje : m))
              : [...s.mensajes, mensaje],
          }
        })
      },

      marcarLeido(id_mensaje) {
        set((s) => ({
          mensajes: s.mensajes.map((m) =>
            m.id_mensaje === id_mensaje
              ? {
                  ...m,
                  estado: 'leido',
                  timestamp_lectura: new Date().toISOString(),
                }
              : m
          ),
        }))
      },

      clearCache() {
        set({ mensajes: [], lastSyncedAt: null })
      },
    }),
    {
      name: 'u24-bandejas',
      storage: createIdbStorage<BandejasState>(),
    }
  )
)
