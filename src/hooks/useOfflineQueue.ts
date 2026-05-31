/**
 * @deprecated Motor v1 — usar `useOfflineMutation` (Fase D+) en código
 * nuevo. Los hooks viejos (useInformes, useInventario, useChecklist,
 * useDoc7, useCheckin) siguen aquí hasta que sus respectivos Screens
 * se reescriban en sub-fases D.X y migren al nuevo motor.
 *
 * No añadir nuevas dependencias a este archivo.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { loadBlob, deleteBlob } from '@/lib/blobStorage'

export type MutationStatus = 'pending' | 'failed'

export interface QueuedMutation {
  mutation_uuid: string
  rpc_name: string
  // payload incluye mutation_uuid para el patrón ADR-012
  payload: Record<string, unknown>
  // Quién encoló — id_nombre, NUNCA el JWT
  ejecutorId: string
  enqueuedAt: string
  status: MutationStatus
  attempts: number
  lastError?: string
  // Soporte para Blobs offline (ADR-002): blob en IDB, subido a Storage antes del RPC
  blobKey?: string // UUID clave en blobStorage.ts
  blobStoragePath?: string // ruta destino en Storage (ej: 'averias/uuid.webp')
  blobUrlField?: string // campo del payload donde inyectar la URL resultante
}

export interface ProcessResult {
  synced: number
  failed: number
}

const MAX_ATTEMPTS = 3

export interface BlobMeta {
  blobKey: string
  blobStoragePath: string
  blobUrlField: string
}

interface OfflineQueueState {
  queue: QueuedMutation[]
  isProcessing: boolean
  enqueue: (
    rpc_name: string,
    payload: Record<string, unknown>,
    mutation_uuid?: string,
    blobMeta?: BlobMeta
  ) => string
  processQueue: () => Promise<ProcessResult>
  retryFailed: () => void
  clearFailed: () => void
  _resetProcessing: () => void
}

// Cola persistida en IndexedDB — sobrevive a cierres de pestaña y recargas
const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,

      enqueue(rpc_name, payload, mutation_uuid, blobMeta) {
        const uuid = mutation_uuid ?? crypto.randomUUID()
        const ejecutorId = useAuthStore.getState().ejecutorId ?? ''
        const mutation: QueuedMutation = {
          mutation_uuid: uuid,
          rpc_name,
          payload: { ...payload, mutation_uuid: uuid },
          ejecutorId,
          enqueuedAt: new Date().toISOString(),
          status: 'pending',
          attempts: 0,
          ...blobMeta,
        }
        set((s) => ({ queue: [...s.queue, mutation] }))
        useGlobalStore.getState().setPendingQueueCount(get().queue.length)
        return uuid
      },

      async processQueue() {
        const state = get()
        if (state.isProcessing) return { synced: 0, failed: 0 }

        const candidates = state.queue.filter(
          (m) => m.status === 'pending' || (m.status === 'failed' && m.attempts < MAX_ATTEMPTS)
        )
        if (candidates.length === 0) return { synced: 0, failed: 0 }

        set({ isProcessing: true })

        // Refrescar sesión antes del primer batch al reconectar (ADR-009)
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          set({ isProcessing: false })
          // El caller debe mostrar el modal de sesión expirada
          throw new Error('SESSION_REFRESH_FAILED')
        }

        let synced = 0
        let failed = 0
        const done: string[] = []

        for (const mutation of candidates) {
          try {
            // Subir Blob pendiente a Storage antes de llamar al RPC (ADR-002)
            let resolvedPayload = mutation.payload
            if (mutation.blobKey && mutation.blobStoragePath && mutation.blobUrlField) {
              const blob = await loadBlob(mutation.blobKey)
              if (blob) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: uploadData, error: uploadError } = await (supabase.storage as any)
                  .from('averias')
                  .upload(mutation.blobStoragePath, blob, {
                    contentType: 'image/webp',
                    upsert: true,
                  })
                if (!uploadError && uploadData) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { data: urlData } = (supabase.storage as any)
                    .from('averias')
                    .getPublicUrl(uploadData.path)
                  resolvedPayload = {
                    ...mutation.payload,
                    [mutation.blobUrlField]: urlData.publicUrl,
                  }
                  await deleteBlob(mutation.blobKey)
                }
              }
            }

            // Cast necesario: el payload genérico no coincide con los tipos
            // estáticos de cada RPC individual — la validación ocurre en el servidor
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.rpc as any)(mutation.rpc_name, resolvedPayload)
            if (error) throw error
            done.push(mutation.mutation_uuid)
            synced++
          } catch (err) {
            const attempts = mutation.attempts + 1
            set((s) => ({
              queue: s.queue.map((m) =>
                m.mutation_uuid === mutation.mutation_uuid
                  ? {
                      ...m,
                      status: 'failed' as MutationStatus,
                      attempts,
                      lastError: err instanceof Error ? err.message : String(err),
                    }
                  : m
              ),
            }))
            failed++
          }
        }

        // Eliminar mutaciones confirmadas por el servidor
        set((s) => ({
          queue: s.queue.filter((m) => !done.includes(m.mutation_uuid)),
          isProcessing: false,
        }))

        useGlobalStore.getState().setPendingQueueCount(get().queue.length)
        return { synced, failed }
      },

      retryFailed() {
        set((s) => ({
          queue: s.queue.map((m) =>
            m.status === 'failed'
              ? {
                  ...m,
                  status: 'pending' as MutationStatus,
                  attempts: 0,
                  lastError: undefined,
                }
              : m
          ),
        }))
      },

      clearFailed() {
        set((s) => ({
          queue: s.queue.filter((m) => m.status !== 'failed'),
        }))
        useGlobalStore.getState().setPendingQueueCount(get().queue.length)
      },

      // Llamar en startup: si la app se cerró mientras procesaba, volver a false
      _resetProcessing() {
        set({ isProcessing: false })
      },
    }),
    {
      name: 'u24-offline-queue',
      storage: createIdbStorage<OfflineQueueState>(),
      onRehydrateStorage: () => (state) => {
        // Garantizar isProcessing=false tras hidratar desde IndexedDB
        state?._resetProcessing()
      },
    }
  )
)

// Hook con soporte para selectors — se puede usar como useOfflineQueue(s => s.isProcessing)
export const useOfflineQueue = useOfflineQueueStore

// Acceso sin hook para uso fuera de componentes (e.g., reconexión de red)
export const offlineQueueActions = {
  enqueue: (...args: Parameters<OfflineQueueState['enqueue']>) =>
    useOfflineQueueStore.getState().enqueue(...args),
  processQueue: () => useOfflineQueueStore.getState().processQueue(),
  retryFailed: () => useOfflineQueueStore.getState().retryFailed(),
}
