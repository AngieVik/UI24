import { useState } from 'react'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useActivacionStore } from '@/stores/useActivacionStore'

export interface EnvioItem {
  id_item:  number
  subgrupo: string
  cantidad: number
}

interface EnviarVars {
  /** id_nombre del trabajador que firma el envío (presente del terminal). */
  operador:         string
  /** Una de las dos opciones de destino debe ir presente. */
  location_destino?: string | null
  destino_externo?:  string | null
  items:            EnvioItem[]
}

interface EnviarResult {
  online: boolean
  id_transferencia?: string
}

/**
 * Envío de material desde el vehículo activo (Doc-10 instancia
 * operativa). Llama a `rpc_doc10_enviar_material`.
 *
 * El destino puede ser una location interna (otro vehículo, almacén)
 * o un destino externo (cliente/clínica externa) — exactamente uno.
 *
 * El RPC orquesta atomicamente: crea cabecera, descuenta inventario
 * del vehículo origen, registra tránsito si destino es interno.
 */
export function useEnviarMaterial() {
  const matricula = useActivacionStore((s) => s.matricula)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mut = useOfflineMutation<{
    p_id_nombre_operador: string
    p_matricula_origen:   string
    p_location_destino:   string | null
    p_destino_externo:    string | null
    p_items:              EnvioItem[]
  }>({
    rpcName: 'rpc_doc10_enviar_material',
    invalidates: [
      ['inventario_vehiculo', matricula],
    ],
  })

  async function enviar(vars: EnviarVars): Promise<EnviarResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      if (!matricula) {
        setError('No hay vehículo activo')
        return null
      }
      const hasLoc = !!vars.location_destino?.trim()
      const hasExt = !!vars.destino_externo?.trim()
      if (hasLoc === hasExt) {
        setError('Debes elegir destino interno O externo (no ambos)')
        return null
      }
      if (vars.items.length === 0) {
        setError('Añade al menos un item al envío')
        return null
      }

      const res = await mut.mutateAsync({
        p_id_nombre_operador: vars.operador,
        p_matricula_origen:   matricula,
        p_location_destino:   hasLoc ? vars.location_destino! : null,
        p_destino_externo:    hasExt ? vars.destino_externo!  : null,
        p_items:              vars.items,
      })

      const data = res.data as { id_transferencia?: string } | null
      return {
        online: !res.queued,
        id_transferencia: data?.id_transferencia,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { enviar, isSubmitting, error, setError }
}
