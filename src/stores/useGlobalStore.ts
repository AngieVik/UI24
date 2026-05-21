import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'

interface GlobalState {
  isOnline: boolean
  degradedMode: boolean
  appVersion: string | null
  forceUpdateRequired: boolean
  minVersion: string | null
  pendingQueueCount: number
  setOnline: (isOnline: boolean) => void
  setDegradedMode: (degraded: boolean) => void
  setForceUpdate: (required: boolean, minVersion?: string) => void
  setPendingQueueCount: (count: number) => void
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      // Runtime: se inicializa correctamente al montar (no crítico si persiste)
      isOnline: true,
      degradedMode: false,
      pendingQueueCount: 0,
      // Config persistida
      appVersion: null,
      forceUpdateRequired: false,
      minVersion: null,

      setOnline: (isOnline) => set({ isOnline }),
      setDegradedMode: (degraded) => set({ degradedMode: degraded }),
      setForceUpdate: (required, minVersion) =>
        set({ forceUpdateRequired: required, minVersion: minVersion ?? null }),
      setPendingQueueCount: (count) => set({ pendingQueueCount: count }),
    }),
    {
      name: 'u24-global',
      storage: createIdbStorage<GlobalState>(),
    },
  ),
)
