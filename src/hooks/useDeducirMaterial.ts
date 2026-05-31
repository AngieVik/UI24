import { useState } from 'react'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useActivacionStore } from '@/stores/useActivacionStore'

export interface DeduccionItem {
  id_item: number
  subgrupo: string
  cantidad: number
}

interface DeducirArgs {
  items: DeduccionItem[]
  motivo?: string | null
}

interface DeducirResult {
  ok: number
  failed: number
  queued: number
}

/**
 * Deduce N items del inventario del vehículo activo en un solo "carrito".
 *
 * Llama `rpc_deducir_material` una vez por item. Si offline, cada llamada
 * se encola individualmente — el processor las drena en orden al reconectar.
 * Cada item lleva su propio mutation_uuid (idempotencia ADR-012).
 *
 * Invalida `inventario_vehiculo` para que la lista refresque tras éxito.
 */
export function useDeducirMaterial() {
  const matricula = useActivacionStore((s) => s.matricula)
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deducirMut = useOfflineMutation<{
    p_matricula: string
    p_id_item: number
    p_cantidad: number
    p_subgrupo: string
    p_id_activacion: string | null
    p_motivo: string | null
  }>({
    rpcName: 'rpc_deducir_material',
    invalidates: [['inventario_vehiculo', matricula]],
  })

  async function deducir({ items, motivo }: DeducirArgs): Promise<DeducirResult | null> {
    setError(null)
    setIsSubmitting(true)
    let ok = 0
    let failed = 0
    let queued = 0
    try {
      if (!matricula) {
        setError('Debes activar un vehículo antes de registrar gasto')
        return null
      }
      // Lanzamos las mutaciones en serie para preservar el orden de
      // gasto en el log (doc6_deducciones es append-only). Si volume
      // de items se vuelve alto, evaluar Promise.all.
      for (const it of items) {
        try {
          const res = await deducirMut.mutateAsync({
            p_matricula: matricula,
            p_id_item: it.id_item,
            p_cantidad: it.cantidad,
            p_subgrupo: it.subgrupo,
            p_id_activacion: idActivacion || null,
            p_motivo: motivo ?? null,
          })
          if (res.queued) queued++
          else ok++
        } catch {
          failed++
        }
      }
      return { ok, failed, queued }
    } finally {
      setIsSubmitting(false)
    }
  }

  return { deducir, isSubmitting, error, setError }
}
