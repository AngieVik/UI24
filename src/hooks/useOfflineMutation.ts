import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOfflineMutationQueue, type BlobMeta } from '@/lib/offlineMutationQueue'

export interface OfflineMutationResult {
  /** Idempotency key generado para esta mutación. */
  mutation_uuid: string
  /** `true` si se encoló porque el cliente estaba offline. */
  queued: boolean
  /** Datos devueltos por el RPC cuando se ejecutó online. */
  data?: unknown
}

interface OfflineMutationOptions<TVars> {
  /** Nombre del RPC Supabase. */
  rpcName: string
  /** queryKeys a invalidar tras éxito (online) o tras drain (offline). */
  invalidates?: ReadonlyArray<QueryKey>
  /** Si la mutación necesita subir un blob antes del RPC, este callback
   *  produce el descriptor del blob a partir de las variables. Devuelve
   *  `null` cuando esta invocación no requiere blob. */
  blob?: (vars: TVars) => Promise<BlobMeta | null>
  /** Callback opcional tras éxito online. NO se invoca para offline. */
  onSuccess?: (data: unknown, vars: TVars) => void
  /** Callback opcional tras error en ejecución online. */
  onError?: (error: Error, vars: TVars) => void
}

/**
 * Hook canónico para mutaciones del proyecto U24 (Fase D+).
 *
 * Comportamiento:
 *  - Genera `mutation_uuid` (idempotencia ADR-012) y lo inyecta en el
 *    payload del RPC.
 *  - Si el cliente está **online**, llama a `supabase.rpc(rpcName, payload)`
 *    directamente y, al éxito, invalida las queryKeys indicadas.
 *  - Si el cliente está **offline**, encola la mutación en IDB
 *    (`useOfflineMutationQueue`) y resuelve la promesa con
 *    `{ queued: true }`. El processor drena la cola al volver online.
 *
 * Reemplaza al patrón v1 `useOfflineQueue.enqueue + processQueue` para
 * Screens nuevos. Los hooks viejos siguen con v1 hasta que se migren
 * progresivamente en sus respectivas sub-fases D.
 */
export function useOfflineMutation<TVars extends Record<string, unknown>>(
  options: OfflineMutationOptions<TVars>
): UseMutationResult<OfflineMutationResult, Error, TVars> {
  const queryClient = useQueryClient()
  const enqueue = useOfflineMutationQueue((s) => s.enqueue)
  const isOnline = useGlobalStore((s) => s.isOnline)

  return useMutation<OfflineMutationResult, Error, TVars>({
    mutationKey: [options.rpcName],
    mutationFn: async (vars: TVars) => {
      const uuid = crypto.randomUUID()
      // Los RPCs del proyecto usan prefix `p_` en sus parámetros
      // (convención plpgsql). Inyectamos `p_mutation_uuid` para
      // idempotencia (ADR-012).
      const payload = { ...vars, p_mutation_uuid: uuid }

      if (!isOnline) {
        const blob = options.blob ? await options.blob(vars) : null
        enqueue({
          uuid,
          rpcName: options.rpcName,
          payload,
          ejecutorId: useAuthStore.getState().ejecutorId,
          blob: blob ?? undefined,
          invalidates: options.invalidates?.map((k) => k.map(String)),
        })
        return { mutation_uuid: uuid, queued: true }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(options.rpcName, payload)
      if (error) {
        // PostgrestError es un objeto plano `{ message, details, hint, code }`.
        // Lo envolvemos en un Error real para que `err.message` y
        // `String(err)` funcionen correctamente en los catches.
        const err = new Error(
          (error as { message?: string })?.message ?? 'Error al ejecutar el RPC'
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(err as any).cause = error
        throw err
      }
      return { mutation_uuid: uuid, queued: false, data }
    },
    onSuccess: (result, vars) => {
      // Solo invalidamos tras éxito online — para mutaciones encoladas
      // la invalidación la dispara el processor al confirmar el server.
      if (!result.queued) {
        for (const key of options.invalidates ?? []) {
          queryClient.invalidateQueries({ queryKey: key })
        }
        options.onSuccess?.(result.data, vars)
      }
    },
    onError: (error, vars) => {
      options.onError?.(error, vars)
    },
  })
}
