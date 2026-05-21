import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { offlineQueueActions } from '@/hooks/useOfflineQueue'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface DatosPaciente {
  nombre?: string
  edad?: number
  motivo?: string
  tratamiento?: string
  destino?: string
  constantes?: {
    fc?: number
    tas?: number
    tad?: number
    spo2?: number
    glc?: number
    temp?: number
  }
  observaciones?: string
}

export interface InformeSVB {
  id_doc: string
  id_activacion: string
  id_nombre_redactor: string
  timestamp_asistencia: string
  datos_paciente: DatosPaciente
  estado: 'borrador' | 'cerrado'
}

interface InformesState {
  informes: InformeSVB[]
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
}

export function useInformes() {
  const [state, setState] = useState<InformesState>({
    informes: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
  })

  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const isOnline = useGlobalStore((s) => s.isOnline)

  const cargarInformes = useCallback(async () => {
    if (!idActivacion) return
    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const { data, error } = await supabase
        .from('doc2_informes_svb')
        .select('id_doc, id_activacion, id_nombre_redactor, timestamp_asistencia, datos_paciente, estado')
        .eq('id_activacion', idActivacion)
        .order('timestamp_asistencia', { ascending: false })

      if (error) throw error
      setState((s) => ({ ...s, informes: (data ?? []) as InformeSVB[], isLoading: false }))
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: resolveRpcError(err) }))
    }
  }, [idActivacion])

  async function crearInforme(datos: DatosPaciente = {}): Promise<string | null> {
    if (!idActivacion) return null
    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    const mutationUuid = crypto.randomUUID()
    const payload = {
      mutation_uuid:    mutationUuid,
      p_id_activacion:  idActivacion,
      p_datos_paciente: datos,
    }

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('rpc_crear_informe_svb', payload)
        if (error) throw error
        const idDoc = (data as { id_doc: string }).id_doc
        // Prepend to local list optimistically
        setState((s) => ({
          ...s,
          isSubmitting: false,
          informes: [
            {
              id_doc:               idDoc,
              id_activacion:        idActivacion,
              id_nombre_redactor:   '',
              timestamp_asistencia: new Date().toISOString(),
              datos_paciente:       datos,
              estado:               'borrador',
            },
            ...s.informes,
          ],
        }))
        return idDoc
      } else {
        offlineQueueActions.enqueue('rpc_crear_informe_svb', payload, mutationUuid)
        setState((s) => ({ ...s, isSubmitting: false }))
        return mutationUuid
      }
    } catch (err) {
      setState((s) => ({ ...s, isSubmitting: false, error: resolveRpcError(err) }))
      return null
    }
  }

  async function cerrarInforme(idDoc: string, datos?: DatosPaciente): Promise<boolean> {
    setState((s) => ({ ...s, isSubmitting: true, error: null }))

    const mutationUuid = crypto.randomUUID()
    const payload = {
      mutation_uuid:    mutationUuid,
      p_id_doc:         idDoc,
      p_datos_paciente: datos ?? null,
    }

    try {
      if (isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('rpc_cerrar_informe_svb', payload)
        if (error) throw error
      } else {
        offlineQueueActions.enqueue('rpc_cerrar_informe_svb', payload, mutationUuid)
      }

      setState((s) => ({
        ...s,
        isSubmitting: false,
        informes: s.informes.map((inf) =>
          inf.id_doc === idDoc ? { ...inf, estado: 'cerrado' } : inf,
        ),
      }))
      return true
    } catch (err) {
      setState((s) => ({ ...s, isSubmitting: false, error: resolveRpcError(err) }))
      return false
    }
  }

  return { ...state, cargarInformes, crearInforme, cerrarInforme }
}
