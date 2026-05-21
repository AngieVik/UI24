import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface VehiculoGps {
  matricula: string
  lat: number | null
  lng: number | null
  gps_timestamp: string | null
  estado_operativo: string
}

const GPS_INTERVAL_MS = 30_000

export function useVisorGps(idDrp?: string) {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const matricula = useActivacionStore((s) => s.matricula)

  const [vehiculos, setVehiculos] = useState<VehiculoGps[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [publicandoGps, setPublicandoGps] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cargarPosiciones = useCallback(async () => {
    if (!idDrp) return
    try {
      // Cargar posiciones de vehículos en el DRP
      const { data, error } = await supabase
        .from('dotaciones_drp')
        .select('matricula, vehiculos(lat, lng, gps_timestamp, estado_operativo)')
        .eq('id_drp', idDrp)
        .is('timestamp_salida', null)

      if (error) throw error

      const parsed: VehiculoGps[] = (data ?? []).map((d) => {
        const v = d.vehiculos as { lat: number | null; lng: number | null; gps_timestamp: string | null; estado_operativo: string } | null
        return {
          matricula: d.matricula,
          lat: v?.lat ?? null,
          lng: v?.lng ?? null,
          gps_timestamp: v?.gps_timestamp ?? null,
          estado_operativo: v?.estado_operativo ?? 'inactivo',
        }
      })
      setVehiculos(parsed)
    } catch (e) {
      // Errores de red en el visor son no críticos — silenciar
      console.warn('visorGps:', e)
    }
  }, [idDrp])

  const publicarPosicion = useCallback(async () => {
    if (!matricula || !ejecutorId) return
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPublicandoGps(true)
        try {
          const { error } = await supabase.rpc('rpc_actualizar_gps', {
            p_matricula: matricula,
            p_lat: pos.coords.latitude,
            p_lng: pos.coords.longitude,
          })
          if (error) throw error
        } catch (e) {
          setGpsError(resolveRpcError(e))
        } finally {
          setPublicandoGps(false)
        }
      },
      (err) => {
        setGpsError(`GPS no disponible: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }, [matricula, ejecutorId])

  // Publicar posición cada 30 s si hay activación activa
  useEffect(() => {
    if (!matricula) return
    publicarPosicion()
    intervalRef.current = setInterval(publicarPosicion, GPS_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [matricula, publicarPosicion])

  // Recargar posiciones del visor cada 30 s
  useEffect(() => {
    if (!idDrp) return
    cargarPosiciones()
    const id = setInterval(cargarPosiciones, GPS_INTERVAL_MS)
    return () => clearInterval(id)
  }, [idDrp, cargarPosiciones])

  return {
    vehiculos,
    gpsError,
    publicandoGps,
    setGpsError,
    cargarPosiciones,
    publicarPosicion,
  }
}
