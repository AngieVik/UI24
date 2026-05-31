import { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  useOfflineMutationQueue,
  MAX_ATTEMPTS,
  type PendingMutation,
} from '@/lib/offlineMutationQueue'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { loadBlob, deleteBlob } from '@/lib/blobStorage'

let listenerRegistered = false

/**
 * Registra los listeners globales que drenan la cola offline cuando
 * vuelve la red. Debe llamarse UNA vez al arrancar la app (desde
 * `main.tsx`, tras montar `QueryClientProvider`).
 *
 * El processor:
 *   1. Escucha el evento `window 'online'`.
 *   2. Al volver online, refresca la sesión Supabase y procesa todas
 *      las mutaciones pendientes en orden.
 *   3. Por cada mutación: sube blob si aplica, llama RPC, en éxito
 *      retira de cola e invalida queryKeys; en fallo incrementa
 *      attempts y la marca failed si alcanza MAX_ATTEMPTS.
 *   4. También se ejecuta una vez al arrancar si `navigator.onLine`.
 */
export function registerOfflineMutationProcessor(queryClient: QueryClient): void {
  if (listenerRegistered) return
  listenerRegistered = true

  const handler = () => {
    void drainQueue(queryClient)
  }
  window.addEventListener('online', handler)

  // Drain inicial si arrancamos online y hay cola pendiente.
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    // Pequeño retraso para no penalizar el FCP.
    setTimeout(() => {
      void drainQueue(queryClient)
    }, 1500)
  }
}

export async function drainQueue(
  queryClient: QueryClient
): Promise<{ synced: number; failed: number }> {
  const state = useOfflineMutationQueue.getState()
  if (state.isProcessing) return { synced: 0, failed: 0 }

  const candidates = state.pending.filter((p) => !p.failed)
  if (candidates.length === 0) return { synced: 0, failed: 0 }

  state.setProcessing(true)
  try {
    // Intentamos refrescar la sesión antes del primer batch. Si falla,
    // no procesamos — el usuario verá el modal de sesión expirada en
    // su próximo login.
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      return { synced: 0, failed: 0 }
    }

    let synced = 0
    let failed = 0
    for (const mutation of candidates) {
      const ok = await processOne(mutation, queryClient)
      if (ok) synced++
      else failed++
    }

    useGlobalStore
      .getState()
      .setPendingQueueCount(useOfflineMutationQueue.getState().pending.length)
    return { synced, failed }
  } finally {
    state.setProcessing(false)
  }
}

async function processOne(mutation: PendingMutation, queryClient: QueryClient): Promise<boolean> {
  const queue = useOfflineMutationQueue.getState()
  try {
    let payload = mutation.payload

    // Upload de blob (si aplica) — la URL pública se inyecta en el payload.
    if (mutation.blob) {
      const blob = await loadBlob(mutation.blob.key)
      if (blob) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = supabase.storage as any
        const { data: up, error: upErr } = await storage
          .from(mutation.blob.bucket)
          .upload(mutation.blob.storagePath, blob, { contentType: 'image/webp', upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = storage.from(mutation.blob.bucket).getPublicUrl(up.path)
        payload = { ...payload, [mutation.blob.urlField]: urlData.publicUrl }
        await deleteBlob(mutation.blob.key)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)(mutation.rpcName, payload)
    if (error) throw error

    // Éxito: retiramos de la cola e invalidamos lo declarado.
    queue.remove(mutation.uuid)
    for (const key of mutation.invalidates ?? []) {
      queryClient.invalidateQueries({ queryKey: [...key] })
    }
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    queue.markAttempt(mutation.uuid, message)
    return mutation.attempts + 1 < MAX_ATTEMPTS
  }
}
