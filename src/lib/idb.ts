import { get, set, del } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

// Zustand persist storage adapter backed by idb-keyval (ADR-001).
// Almacena objetos estructurados directamente (sin JSON) usando el
// structured-clone algorithm de IndexedDB.
export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name): Promise<StorageValue<T> | null> => {
      const value = await get<StorageValue<T>>(name)
      return value ?? null
    },
    setItem: (name, value: StorageValue<T>) => set(name, value),
    removeItem: (name) => del(name),
  }
}
