import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface TurnoItem {
  id: number
  id_nombre: string
  fecha: string
  tipo_turno: 'T' | 'L' | 'V' | 'B' | 'C'
  es_excepcion_absoluta: boolean
}

export const TURNO_LABEL: Record<string, string> = {
  T: 'Trabajo',
  L: 'Libre',
  V: 'Vacaciones',
  B: 'Baja',
  C: 'Compensatorio',
}

function isoWeekDates(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1 + offsetWeeks * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(monday), end: fmt(sunday) }
}

export function useCuadrante(idNombre?: string) {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const target = idNombre ?? ejecutorId ?? ''

  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarSemana = useCallback(async (offset: number) => {
    if (!target) return
    setLoading(true)
    setError(null)
    const { start, end } = isoWeekDates(offset)
    try {
      const { data, error: err } = await supabase
        .from('cuadrante_turnos')
        .select('id, id_nombre, fecha, tipo_turno, es_excepcion_absoluta')
        .eq('id_nombre', target)
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha')
      if (err) throw err
      setTurnos((data ?? []) as TurnoItem[])
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [target])

  useEffect(() => { cargarSemana(semanaOffset) }, [cargarSemana, semanaOffset])

  const semanaActual = isoWeekDates(semanaOffset)

  return {
    turnos,
    semanaOffset,
    semanaActual,
    setSemanaOffset,
    loading,
    error,
    setError,
    cargarSemana,
  }
}
