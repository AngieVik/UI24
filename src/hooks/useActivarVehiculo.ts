import { useState } from 'react'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useActivacionStore } from '@/stores/useActivacionStore'

interface ActivarResult {
  online: boolean
  matricula: string
}

interface ActivarVehiculoVars {
  /** id_nombre del pilot — debe estar presente en el terminal. */
  pilot:    string
  matricula: string
  km_inicio: number
  /** id_nombre del carry (opcional). */
  carry?:   string | null
}

interface CheckinRpcData {
  id_activacion: string
  id_parte:      string
  id_checklist:  string
  matricula:     string
  pilot:         string
}

/**
 * Activación de vehículo en el modelo "sesión del terminal".
 *
 * Llama `rpc_checkin_vehiculo_v2` con `p_id_nombre_pilot` EXPLÍCITO,
 * en vez de derivarlo de `auth.uid()` (que en este modelo es el
 * usuario máquina del terminal, no un trabajador).
 *
 * El cliente debe pasar el pilot seleccionado en VehiculosScreen
 * desde la lista de presentes. El RPC verifica que el pilot tiene
 * presencia activa en algún terminal antes de crear la activación.
 */
export function useActivarVehiculo() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkin = useOfflineMutation<{
    p_id_nombre_pilot: string
    p_matricula:       string
    p_km_inicio:       number
    p_carry:           string | null
  }>({
    rpcName: 'rpc_checkin_vehiculo_v2',
    invalidates: [
      ['vehiculo_activo'],
      ['vehiculos_disponibles'],
    ],
  })

  async function run(vars: ActivarVehiculoVars): Promise<ActivarResult | null> {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await checkin.mutateAsync({
        p_id_nombre_pilot: vars.pilot,
        p_matricula:       vars.matricula,
        p_km_inicio:       vars.km_inicio,
        p_carry:           vars.carry ?? null,
      })

      if (!result.queued && result.data) {
        const data = result.data as CheckinRpcData
        useActivacionStore.getState().setActivacion({
          id_activacion: data.id_activacion,
          id_checklist:  data.id_checklist,
          matricula:     data.matricula,
        })
      } else {
        // Offline: ids placeholder hasta drenar.
        useActivacionStore.getState().setActivacion({
          id_activacion: result.mutation_uuid,
          id_checklist:  crypto.randomUUID(),
          matricula:     vars.matricula,
        })
      }

      return { online: !result.queued, matricula: vars.matricula }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { run, isSubmitting, error }
}
