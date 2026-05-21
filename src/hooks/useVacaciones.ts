import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface SolicitudVacaciones {
  id: string
  id_nombre: string
  periodo_anual: string
  fecha_inicio: string
  fecha_fin: string
  preferencia_seleccion: string
  observaciones: string | null
  estado: 'Borrador' | 'Pendiente_Aprobacion' | 'Aprobada' | 'Denegada'
  resolucion_rrhh: string | null
  id_nombre_resolutor: string | null
  created_at: string
  timestamp_resolucion: string | null
}

export function useVacaciones() {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const [solicitudes, setSolicitudes] = useState<SolicitudVacaciones[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('doc_solicitudes_vacaciones')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setSolicitudes((data ?? []) as SolicitudVacaciones[])
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const enviarSolicitud = useCallback(async (params: {
    periodo_anual: string
    fecha_inicio: string
    fecha_fin: string
    preferencia?: 'opcion_1' | 'opcion_2' | 'opcion_3'
    observaciones?: string
  }): Promise<string | null> => {
    if (!ejecutorId) return null
    setSubmitting(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('rpc_enviar_solicitud_vacaciones', {
        p_mutation_uuid:  crypto.randomUUID(),
        p_periodo_anual:  params.periodo_anual,
        p_fecha_inicio:   params.fecha_inicio,
        p_fecha_fin:      params.fecha_fin,
        p_preferencia:    params.preferencia ?? 'opcion_1',
        p_observaciones:  params.observaciones || undefined,
      })
      if (err) throw err
      await cargarSolicitudes()
      return data as string
    } catch (e) {
      setError(resolveRpcError(e))
      return null
    } finally {
      setSubmitting(false)
    }
  }, [ejecutorId, cargarSolicitudes])

  const resolverSolicitud = useCallback(async (
    idSolicitud: string,
    decision: 'Aprobada' | 'Denegada',
    notas?: string,
  ): Promise<boolean> => {
    setSubmitting(true)
    setError(null)
    try {
      const { error: err } = await supabase.rpc('rpc_resolver_solicitud_vacaciones', {
        p_mutation_uuid:  crypto.randomUUID(),
        p_id_solicitud:   idSolicitud,
        p_decision:       decision,
        p_notas:          notas || undefined,
      })
      if (err) throw err
      await cargarSolicitudes()
      return true
    } catch (e) {
      setError(resolveRpcError(e))
      return false
    } finally {
      setSubmitting(false)
    }
  }, [cargarSolicitudes])

  useEffect(() => { cargarSolicitudes() }, [cargarSolicitudes])

  const pendientes = solicitudes.filter((s) => s.estado === 'Pendiente_Aprobacion')
  const propias = solicitudes.filter((s) => s.id_nombre === ejecutorId)

  return {
    solicitudes,
    pendientes,
    propias,
    loading,
    submitting,
    error,
    setError,
    cargarSolicitudes,
    enviarSolicitud,
    resolverSolicitud,
  }
}
