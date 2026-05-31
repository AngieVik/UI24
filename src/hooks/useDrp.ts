import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { resolveRpcError } from '@/lib/resolveRpcError'
import type { Database } from '@/types/supabase'

type EstadoDrp = Database['public']['Enums']['estado_drp']

export interface DrpRecord {
  id_drp: string
  estado: EstadoDrp
  id_coordinacion: string
  timestamp_preparacion: string | null
  timestamp_inicio: string | null
  timestamp_fin: string | null
  timestamp_cancelacion: string | null
}

export interface DotacionDrp {
  matricula: string
  timestamp_entrada: string
  timestamp_salida: string | null
}

export interface PersonalPieDrp {
  id_nombre: string
  zona_asignada: string | null
  timestamp_entrada: string
  timestamp_salida: string | null
}

export interface DescuadrePendiente {
  id_descuadre: string
  id_item: number
  location_origen: string
  location_destino: string
  cantidad_diferencia: number
  estado: string
}

export function useDrp() {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const isOnline = useGlobalStore((s) => s.isOnline)

  const [drps, setDrps] = useState<DrpRecord[]>([])
  const [drpActivo, setDrpActivo] = useState<DrpRecord | null>(null)
  const [dotaciones, setDotaciones] = useState<DotacionDrp[]>([])
  const [personal, setPersonal] = useState<PersonalPieDrp[]>([])
  const [descuadresPendientes, setDescuadresPendientes] = useState<DescuadrePendiente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarDrps = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('drps')
        .select(
          'id_drp, estado, id_coordinacion, timestamp_preparacion, timestamp_inicio, timestamp_fin, timestamp_cancelacion'
        )
        .not('estado', 'in', '("Archivado")')
        .order('timestamp_preparacion', { ascending: false })

      if (err) throw err
      setDrps((data ?? []) as DrpRecord[])
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarDetalle = useCallback(
    async (idDrp: string) => {
      const [dotRes, persRes, descRes] = await Promise.all([
        supabase
          .from('dotaciones_drp')
          .select('matricula, timestamp_entrada, timestamp_salida')
          .eq('id_drp', idDrp),
        supabase
          .from('drp_personal_a_pie')
          .select('id_nombre, zona_asignada, timestamp_entrada, timestamp_salida')
          .eq('id_drp', idDrp),
        supabase
          .from('descuadres_inventario')
          .select(
            'id_descuadre, id_item, location_origen, location_destino, cantidad_diferencia, estado'
          )
          .eq('estado', 'Pendiente_Revision'),
      ])
      setDotaciones((dotRes.data ?? []) as DotacionDrp[])
      setPersonal((persRes.data ?? []) as PersonalPieDrp[])
      // Solo descuadres relacionados con dotaciones de este DRP
      const matriculas = new Set((dotRes.data ?? []).map((d) => d.matricula))
      const filtrados = ((descRes.data ?? []) as unknown as DescuadrePendiente[]).filter(
        (d) => matriculas.has(d.location_origen) || matriculas.has(d.location_destino)
      )
      setDescuadresPendientes(filtrados)
      setDrpActivo(drps.find((d) => d.id_drp === idDrp) ?? null)
    },
    [drps]
  )

  const crearDrp = useCallback(async (): Promise<string | null> => {
    if (!isOnline) {
      setError('El módulo DRP requiere conexión a red.')
      return null
    }
    if (!ejecutorId) {
      setError('Sesión no identificada.')
      return null
    }
    try {
      const mutationUuid = crypto.randomUUID()
      const { data, error: err } = await supabase.rpc('rpc_crear_drp', {
        p_mutation_uuid: mutationUuid,
      })
      if (err) throw err
      await cargarDrps()
      return data as string
    } catch (e) {
      setError(resolveRpcError(e))
      return null
    }
  }, [isOnline, ejecutorId, cargarDrps])

  const transicionarDrp = useCallback(
    async (
      idDrp: string,
      accion: 'preparar' | 'iniciar' | 'finalizar' | 'archivar'
    ): Promise<boolean> => {
      if (!isOnline) {
        setError('El módulo DRP requiere conexión a red.')
        return false
      }
      try {
        const { error: err } = await supabase.rpc('rpc_transicionar_drp', {
          p_id_drp: idDrp,
          p_accion: accion,
        })
        if (err) throw err
        await cargarDrps()
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [isOnline, cargarDrps]
  )

  const cancelarDrp = useCallback(
    async (idDrp: string, motivo?: string): Promise<boolean> => {
      if (!isOnline) {
        setError('El módulo DRP requiere conexión a red.')
        return false
      }
      try {
        const { error: err } = await supabase.rpc('rpc_cancelar_drp', {
          p_id_drp: idDrp,
          p_motivo: motivo || undefined,
        })
        if (err) throw err
        await cargarDrps()
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [isOnline, cargarDrps]
  )

  const agregarDotacion = useCallback(
    async (idDrp: string, matricula: string): Promise<boolean> => {
      if (!isOnline) {
        setError('El módulo DRP requiere conexión a red.')
        return false
      }
      try {
        const { error: err } = await supabase.rpc('rpc_agregar_dotacion_drp', {
          p_mutation_uuid: crypto.randomUUID(),
          p_id_drp: idDrp,
          p_matricula: matricula,
        })
        if (err) throw err
        await cargarDetalle(idDrp)
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [isOnline, cargarDetalle]
  )

  const agregarPersonal = useCallback(
    async (idDrp: string, idNombre: string, zona?: string): Promise<boolean> => {
      if (!isOnline) {
        setError('El módulo DRP requiere conexión a red.')
        return false
      }
      try {
        const { error: err } = await supabase.rpc('rpc_agregar_personal_pie_drp', {
          p_mutation_uuid: crypto.randomUUID(),
          p_id_drp: idDrp,
          p_id_nombre: idNombre,
          p_zona: zona || undefined,
        })
        if (err) throw err
        await cargarDetalle(idDrp)
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [isOnline, cargarDetalle]
  )

  const asignarMochila = useCallback(
    async (idDrp: string, idMochila: string): Promise<boolean> => {
      if (!isOnline) {
        setError('El módulo DRP requiere conexión a red.')
        return false
      }
      try {
        const { error: err } = await supabase.rpc('rpc_asignar_mochila_a_drp', {
          p_id_mochila: idMochila,
          p_id_drp: idDrp,
        })
        if (err) throw err
        await cargarDetalle(idDrp)
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [isOnline, cargarDetalle]
  )

  const resolverDescuadre = useCallback(
    async (
      idDescuadre: string,
      resolucion: 'Resuelto' | 'Archivado',
      notas?: string
    ): Promise<boolean> => {
      if (!isOnline) {
        setError('Requiere conexión a red.')
        return false
      }
      try {
        const { error: err } = await supabase.rpc('rpc_resolver_descuadre', {
          p_mutation_uuid: crypto.randomUUID(),
          p_id_descuadre: idDescuadre,
          p_resolucion: resolucion,
          p_notas: notas || undefined,
        })
        if (err) throw err
        if (drpActivo) await cargarDetalle(drpActivo.id_drp)
        await cargarDrps()
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [isOnline, drpActivo, cargarDetalle, cargarDrps]
  )

  useEffect(() => {
    if (isOnline) cargarDrps()
  }, [isOnline, cargarDrps])

  return {
    drps,
    drpActivo,
    dotaciones,
    personal,
    descuadresPendientes,
    loading,
    error,
    setError,
    cargarDrps,
    cargarDetalle,
    crearDrp,
    transicionarDrp,
    cancelarDrp,
    agregarDotacion,
    agregarPersonal,
    asignarMochila,
    resolverDescuadre,
  }
}
