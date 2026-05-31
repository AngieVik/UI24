import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'

/**
 * Cola de mutaciones offline — diseño v2 alineado con TanStack Query.
 *
 * Esta cola sobrevive a cierres de pestaña (persist + IDB) y solo
 * contiene mutaciones encoladas mientras el cliente estaba sin red.
 * El hook `useOfflineMutation` decide si ejecutar directo (online) o
 * encolar (offline). El processor (`offlineMutationProcessor.ts`)
 * detecta `window.online` y drena la cola.
 *
 * Diferencia con el motor v1 (`useOfflineQueue.ts`, ahora deprecated):
 *   - Esta versión NO ejecuta nada por su cuenta — solo persiste.
 *   - El procesamiento se delega al processor + TanStack Query.
 *   - Sin mezcla con autenticación, blobs o RPCs concretos.
 */

export interface BlobMeta {
  /** UUID del Blob en `blobStorage.ts` (IDB binario). */
  key: string
  /** Ruta destino en Supabase Storage (ej. `averias/uuid.webp`). */
  storagePath: string
  /** Bucket de Storage donde subir el Blob (ej. `averias`). */
  bucket: string
  /** Nombre del campo del payload donde inyectar la URL pública resultante. */
  urlField: string
}

export interface PendingMutation {
  /** Idempotency key. Inyectado en el payload como `p_mutation_uuid`. */
  uuid: string
  /** Nombre del RPC Supabase a invocar. */
  rpcName: string
  /** Payload completo (ya incluye `mutation_uuid`). */
  payload: Record<string, unknown>
  /** id_nombre del ejecutor que encoló — para auditoría, NO se envía al RPC. */
  ejecutorId: string | null
  /** ISO timestamp del encolado. */
  enqueuedAt: string
  /** Intentos consumidos. Máximo MAX_ATTEMPTS antes de marcar como failed. */
  attempts: number
  /** Mensaje del último fallo, si lo hay. */
  lastError?: string
  /** Estado terminal failed (consumió todos los intentos). */
  failed?: boolean
  /** Si la mutación necesita subir un Blob antes del RPC. */
  blob?: BlobMeta
  /** queryKeys serializadas a invalidar tras éxito. */
  invalidates?: ReadonlyArray<ReadonlyArray<string>>
}

export const MAX_ATTEMPTS = 3

interface OfflineMutationQueueState {
  pending: PendingMutation[]
  isProcessing: boolean

  enqueue: (m: Omit<PendingMutation, 'enqueuedAt' | 'attempts'>) => void
  remove: (uuid: string) => void
  markAttempt: (uuid: string, error: string) => void
  retryFailed: () => void
  clearFailed: () => void
  setProcessing: (b: boolean) => void
  _reset: () => void
}

export const useOfflineMutationQueue = create<OfflineMutationQueueState>()(
  persist(
    (set) => ({
      pending: [],
      isProcessing: false,

      enqueue(m) {
        set((s) => ({
          pending: [...s.pending, { ...m, enqueuedAt: new Date().toISOString(), attempts: 0 }],
        }))
      },

      remove(uuid) {
        set((s) => ({ pending: s.pending.filter((p) => p.uuid !== uuid) }))
      },

      markAttempt(uuid, error) {
        set((s) => ({
          pending: s.pending.map((p) => {
            if (p.uuid !== uuid) return p
            const attempts = p.attempts + 1
            return {
              ...p,
              attempts,
              lastError: error,
              failed: attempts >= MAX_ATTEMPTS,
            }
          }),
        }))
      },

      retryFailed() {
        set((s) => ({
          pending: s.pending.map((p) =>
            p.failed ? { ...p, failed: false, attempts: 0, lastError: undefined } : p
          ),
        }))
      },

      clearFailed() {
        set((s) => ({ pending: s.pending.filter((p) => !p.failed) }))
      },

      setProcessing(b) {
        set({ isProcessing: b })
      },

      _reset() {
        set({ isProcessing: false })
      },
    }),
    {
      name: 'u24-mutation-queue-v2',
      storage: createIdbStorage<OfflineMutationQueueState>(),
      onRehydrateStorage: () => (state) => {
        // Si la app se cerró durante un drain, isProcessing podría haber
        // quedado en true. Reset al hidratar.
        state?._reset()
      },
    }
  )
)
