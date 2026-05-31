import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

export type EstadoPaciente = 'en_espera' | 'en_consulta' | 'alta'

export interface Paciente {
  id_paciente: string
  id_sesion: string
  estado: EstadoPaciente
  timestamp_admision: string
  timestamp_inicio_consulta: string | null
  timestamp_fin_consulta: string | null
}

interface FiliacionState {
  idSesion: string | null
  pacientes: Paciente[]
  isLoadingSesion: boolean
  isLoadingPacientes: boolean
  isSubmitting: boolean
  error: string | null
}

export function useFiliacion() {
  const [state, setState] = useState<FiliacionState>({
    idSesion: null,
    pacientes: [],
    isLoadingSesion: false,
    isLoadingPacientes: false,
    isSubmitting: false,
    error: null,
  })

  const isOnline = useGlobalStore((s) => s.isOnline)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const cargarPacientes = useCallback(async (idSesion: string) => {
    setState((s) => ({ ...s, isLoadingPacientes: true }))
    try {
      const { data, error } = await supabase
        .from('filiacion_pacientes')
        .select('*')
        .eq('id_sesion', idSesion)
        .order('timestamp_admision', { ascending: true })

      if (error) throw error
      setState((s) => ({
        ...s,
        pacientes: (data ?? []) as Paciente[],
        isLoadingPacientes: false,
      }))
    } catch (err) {
      setState((s) => ({ ...s, isLoadingPacientes: false, error: resolveRpcError(err) }))
    }
  }, [])

  // Subscribe to Realtime when a session is active and online
  useEffect(() => {
    if (!state.idSesion || !isOnline) return

    const channel = supabase
      .channel(`filiacion:${state.idSesion}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'filiacion_pacientes',
          filter: `id_sesion=eq.${state.idSesion}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setState((s) => ({
              ...s,
              pacientes: [...s.pacientes, payload.new as Paciente],
            }))
          } else if (payload.eventType === 'UPDATE') {
            setState((s) => ({
              ...s,
              pacientes: s.pacientes.map((p) =>
                p.id_paciente === (payload.new as Paciente).id_paciente
                  ? (payload.new as Paciente)
                  : p
              ),
            }))
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.idSesion, isOnline])

  async function abrirSesion(idDrp?: string): Promise<boolean> {
    setState((s) => ({ ...s, isLoadingSesion: true, error: null }))
    const mutationUuid = crypto.randomUUID()
    try {
      const payload: Record<string, unknown> = { mutation_uuid: mutationUuid }
      if (idDrp) payload['p_id_drp'] = idDrp

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('rpc_abrir_sesion_filiacion', payload)
      if (error) throw error

      const idSesion = (data as { id_sesion: string }).id_sesion
      setState((s) => ({ ...s, isLoadingSesion: false, idSesion }))
      await cargarPacientes(idSesion)
      return true
    } catch (err) {
      setState((s) => ({ ...s, isLoadingSesion: false, error: resolveRpcError(err) }))
      return false
    }
  }

  async function admitirPaciente(): Promise<boolean> {
    if (!state.idSesion) return false
    setState((s) => ({ ...s, isSubmitting: true, error: null }))
    const mutationUuid = crypto.randomUUID()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('rpc_admitir_paciente', {
        mutation_uuid: mutationUuid,
        p_id_sesion: state.idSesion,
      })
      if (error) throw error
      setState((s) => ({ ...s, isSubmitting: false }))
      return true
    } catch (err) {
      setState((s) => ({ ...s, isSubmitting: false, error: resolveRpcError(err) }))
      return false
    }
  }

  async function actualizarEstado(
    idPaciente: string,
    nuevoEstado: EstadoPaciente
  ): Promise<boolean> {
    setState((s) => ({ ...s, isSubmitting: true, error: null }))
    const mutationUuid = crypto.randomUUID()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('rpc_actualizar_estado_paciente', {
        mutation_uuid: mutationUuid,
        p_id_paciente: idPaciente,
        p_nuevo_estado: nuevoEstado,
      })
      if (error) throw error
      setState((s) => ({ ...s, isSubmitting: false }))
      return true
    } catch (err) {
      setState((s) => ({ ...s, isSubmitting: false, error: resolveRpcError(err) }))
      return false
    }
  }

  function cerrarSesionLocal() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setState((s) => ({ ...s, idSesion: null, pacientes: [] }))
  }

  return {
    ...state,
    abrirSesion,
    admitirPaciente,
    actualizarEstado,
    cerrarSesionLocal,
    cargarPacientes,
  }
}
