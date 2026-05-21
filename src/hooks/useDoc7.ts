import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { offlineQueueActions } from '@/hooks/useOfflineQueue'
import { compressImage } from '@/lib/imageCompressor'
import { saveBlob } from '@/lib/blobStorage'
import { resolveRpcError } from '@/lib/resolveRpcError'
import type { Database } from '@/types/supabase'

type NivelCriticidad = Database['public']['Enums']['nivel_criticidad']

export interface Doc7FormData {
  sistemaAfectado: string
  nivelCriticidad: NivelCriticidad
  descripcion: string
  imagen?: File | null
}

interface Doc7State {
  isSubmitting: boolean
  error: string | null
  success: boolean
}

export function useDoc7(matricula: string) {
  const [state, setState] = useState<Doc7State>({
    isSubmitting: false,
    error: null,
    success: false,
  })

  const isOnline = useGlobalStore((s) => s.isOnline)
  const ejecutorId = useAuthStore((s) => s.ejecutorId)

  async function registrarAveria(form: Doc7FormData): Promise<boolean> {
    if (!ejecutorId || !matricula) {
      setState((s) => ({ ...s, error: 'Sesión o vehículo no válidos.' }))
      return false
    }

    setState((s) => ({ ...s, isSubmitting: true, error: null, success: false }))

    const mutationUuid = crypto.randomUUID()

    try {
      let imagenUrl: string | undefined
      let blobKey: string | undefined
      let blobStoragePath: string | undefined

      // Comprimir imagen si existe
      if (form.imagen) {
        const compressed = await compressImage(form.imagen)

        if (isOnline) {
          // Subir directamente a Storage
          const path = `${ejecutorId}/${mutationUuid}.webp`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: uploadData, error: uploadError } = await (supabase.storage as any)
            .from('averias')
            .upload(path, compressed, { contentType: 'image/webp' })

          if (!uploadError && uploadData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: urlData } = (supabase.storage as any)
              .from('averias')
              .getPublicUrl(uploadData.path)
            imagenUrl = urlData.publicUrl
          }
        } else {
          // Guardar Blob en IndexedDB para subir al reconectar (ADR-002)
          blobKey = mutationUuid
          blobStoragePath = `${ejecutorId}/${mutationUuid}.webp`
          await saveBlob(blobKey, compressed)
        }
      }

      const payload: Record<string, unknown> = {
        mutation_uuid:     mutationUuid,
        p_matricula:       matricula,
        p_sistema_afectado: form.sistemaAfectado,
        p_nivel_criticidad: form.nivelCriticidad,
        p_descripcion:     form.descripcion || null,
        p_imagen_url:      imagenUrl ?? null,
      }

      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('rpc_registrar_averia', payload)
        if (error) throw error
      } else {
        offlineQueueActions.enqueue(
          'rpc_registrar_averia',
          payload,
          mutationUuid,
          blobKey
            ? { blobKey, blobStoragePath: blobStoragePath!, blobUrlField: 'p_imagen_url' }
            : undefined,
        )
      }

      setState((s) => ({ ...s, isSubmitting: false, success: true }))
      return true
    } catch (err) {
      setState((s) => ({
        ...s,
        isSubmitting: false,
        error: resolveRpcError(err),
      }))
      return false
    }
  }

  function reset() {
    setState({ isSubmitting: false, error: null, success: false })
  }

  return { ...state, registrarAveria, reset }
}
