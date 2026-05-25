import { get, set, del } from 'idb-keyval'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * Zustand persist storage adapter backed by idb-keyval (ADR-001).
 *
 * Almacena objetos estructurados usando el structured-clone algorithm de
 * IndexedDB (sin pasar por JSON). Esto significa que objetos como `Date`,
 * `Blob`, `Map`/`Set` o `BigInt` sobreviven a la persistencia.
 *
 * IMPORTANTE: structured-clone **no acepta funciones** (lanza
 * `DataCloneError: ... could not be cloned`). Los stores Zustand que
 * implementan setters dentro del state — el patrón habitual — meterían
 * funciones en el objeto persistido. Para evitarlo, este adapter filtra
 * cualquier propiedad cuyo `typeof === 'function'` antes de escribir.
 * El resultado es que persistimos solo el state serializable y los
 * setters viven exclusivamente en memoria (que es lo correcto).
 *
 * Alternativa equivalente sería declarar `partialize` en cada store,
 * pero ese contrato es fácil de olvidar al añadir un setter nuevo —
 * defendemos a nivel de adapter para que sea imposible romperlo.
 */
function stripFunctions<T>(state: T): T {
  if (state === null || typeof state !== 'object') return state
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(state as Record<string, unknown>)) {
    if (typeof v === 'function') continue
    out[k] = v
  }
  return out as T
}

export function createIdbStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name): Promise<StorageValue<T> | null> => {
      const value = await get<StorageValue<T>>(name)
      return value ?? null
    },
    setItem: (name, value: StorageValue<T>) =>
      set(name, { ...value, state: stripFunctions(value.state) }),
    removeItem: (name) => del(name),
  }
}
