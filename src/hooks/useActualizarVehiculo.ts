import { useState } from 'react'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useTurnoStore } from '@/stores/useTurnoStore'

/** Estado general del vehículo ('activado'/'desactivado') o subestado operativo. */
export type EstadoOperativo =
  | 'desactivado'
  | 'activado'
  | 'en_espera'
  | 'ruta'
  | 'estacionado'
  | 'alerta'

export type TipoServicio =
  | 'programado'
  | 'dispositivo'
  | 'traslado'
  | 'guardia_urgencias'
  | 'drp'
  | 'privado'
  | 'simulacro'
  | 'formacion'
  | 'sin_asignar'

interface ActualizarVars {
  matricula: string
  estado_destino: EstadoOperativo
  tipo_servicio?: TipoServicio | null
  pilot?: string | null
  carry?: string | null
  km_inicio?: number | null
  km_fin?: number | null
}

interface ActualizarRpcData {
  matricula: string
  estado_operativo: EstadoOperativo
  id_activacion?: string | null
  id_checklist?: string | null
}

interface ActualizarResult {
  online: boolean
  estado_operativo: EstadoOperativo
  matricula: string
}

/**
 * Hook único para D.1.8: cambia el estado de un vehículo (y, según
 * la transición, crea/cierra activación, actualiza tipo_servicio o
 * dotación).
 *
 * Reemplaza `useActivarVehiculo` (que solo cubría "activar").
 */
export function useActualizarVehiculo() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mut = useOfflineMutation<{
    p_matricula: string
    p_estado_destino: EstadoOperativo
    p_tipo_servicio: TipoServicio | null
    p_pilot: string | null
    p_carry: string | null
    p_km_inicio: number | null
    p_km_fin: number | null
    p_id_parte: string | null
  }>({
    rpcName: 'rpc_actualizar_vehiculo',
    invalidates: [['flota_completa'], ['vehiculo_activo']],
  })

  async function run(vars: ActualizarVars): Promise<ActualizarResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      // Pass the current turno id_parte so the RPC can link the shift doc
      // to the vehicle activation (updates doc8.id_activacion + km).
      const idParte = useTurnoStore.getState().id_parte || null

      const res = await mut.mutateAsync({
        p_matricula: vars.matricula,
        p_estado_destino: vars.estado_destino,
        p_tipo_servicio: vars.tipo_servicio ?? null,
        p_pilot: vars.pilot ?? null,
        p_carry: vars.carry ?? null,
        p_km_inicio: vars.km_inicio ?? null,
        p_km_fin: vars.km_fin ?? null,
        p_id_parte: idParte,
      })

      if (!res.queued && res.data) {
        const data = res.data as ActualizarRpcData
        // Si la activación se creó/sigue activa, refrescar useActivacionStore.
        if (data.id_activacion && vars.estado_destino === 'activado') {
          useActivacionStore.getState().setActivacion({
            id_activacion: data.id_activacion,
            id_checklist: data.id_checklist ?? '',
            matricula: data.matricula,
          })
        }
        // Al desactivar, limpiar useActivacionStore.
        if (vars.estado_destino === 'desactivado') {
          const current = useActivacionStore.getState().matricula
          if (current === vars.matricula) {
            useActivacionStore.getState().clearActivacion()
          }
        }
      }

      return {
        online: !res.queued,
        estado_operativo: vars.estado_destino,
        matricula: vars.matricula,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { run, isSubmitting, error }
}
