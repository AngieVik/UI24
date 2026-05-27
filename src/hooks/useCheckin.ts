import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { offlineQueueActions } from '@/hooks/useOfflineQueue'
import { resolveRpcError } from '@/lib/resolveRpcError'
import type { Database } from '@/types/supabase'

type Vehiculo = Database['public']['Tables']['vehiculos']['Row']

export interface CheckinState {
  vehiculos: Vehiculo[]
  isLoadingList: boolean
  isSubmitting: boolean
  error: string | null
}

export function useCheckin() {
  const [state, setState] = useState<CheckinState>({
    vehiculos: [],
    isLoadingList: false,
    isSubmitting: false,
    error: null,
  })

  const isOnline = useGlobalStore((s) => s.isOnline)
  const ejecutorId = useAuthStore((s) => s.ejecutorId)

  async function cargarVehiculos() {
    setState((s) => ({ ...s, isLoadingList: true, error: null }))
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .neq('condicion_tecnica', 'critico')
        .in('estado_operativo', ['desactivado', 'inactivo'])
        .order('matricula')

      if (error) throw error
      setState((s) => ({ ...s, vehiculos: data ?? [], isLoadingList: false }))
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoadingList: false,
        error: resolveRpcError(err),
      }))
    }
  }

  async function checkin(matricula: string, kmInicio: number, carry?: string): Promise<boolean> {
    if (!ejecutorId) {
      setState((s) => ({ ...s, error: 'Sesión no reconocida.' }))
      return false
    }

    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    const mutationUuid = crypto.randomUUID()
    const payload = {
      mutation_uuid: mutationUuid,
      p_matricula: matricula,
      p_km_inicio: kmInicio,
      ...(carry ? { p_carry: carry } : {}),
    }

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('rpc_checkin_vehiculo', payload)
        if (error) throw error
        useActivacionStore.getState().setActivacion({
          id_activacion: data.id_activacion,
          id_checklist:  data.id_checklist,
          matricula,
        })
      } else {
        // Encolar para procesar al reconectar
        offlineQueueActions.enqueue('rpc_checkin_vehiculo', payload, mutationUuid)
        // Activación optimista en local — ids temporales hasta sincronizar
        useActivacionStore.getState().setActivacion({
          id_activacion: mutationUuid,
          id_checklist:  crypto.randomUUID(),
          matricula,
        })
      }

      setState((s) => ({ ...s, isSubmitting: false }))
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

  return { ...state, cargarVehiculos, checkin }
}
