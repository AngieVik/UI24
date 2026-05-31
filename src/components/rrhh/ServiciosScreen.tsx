import { useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

/* ─────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────── */

interface ServicioRow {
  id: string
  fecha: string // ISO date YYYY-MM-DD
  turno: 'M' | 'T' | 'N' // Mañana / Tarde / Noche
  id_nombre: string
  tipo_servicio: string
  matricula: string | null
  estado: 'Planificado' | 'Confirmado' | 'Cancelado'
}

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const TURNO_LABEL: Record<string, string> = { M: 'Mañana', T: 'Tarde', N: 'Noche' }
const TURNO_VARIANT: Record<string, 'ok' | 'info' | 'warn'> = { M: 'ok', T: 'info', N: 'warn' }

const ESTADO_VARIANT: Record<string, 'ok' | 'info' | 'secondary' | 'destructive'> = {
  Planificado: 'info',
  Confirmado: 'ok',
  Cancelado: 'destructive',
}

const TIPO_OPTIONS = [
  'SVB emergencia',
  'SVA emergencia',
  'Traslado programado',
  'Traslado urgente',
  'Guardia base',
  'Apoyo DRP',
]

/* ─────────────────────────────────────────────────────────────────────────
 * Week helpers
 * ───────────────────────────────────────────────────────────────────────── */

function getWeekBounds(offset: number): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hook
 * ───────────────────────────────────────────────────────────────────────── */

function useServicios(start: string, end: string) {
  return useQuery({
    queryKey: ['servicios_planificados', start, end],
    staleTime: 60_000,
    queryFn: async (): Promise<ServicioRow[]> => {
      // servicios_planificados not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('servicios_planificados')
        .select('id, fecha, turno, id_nombre, tipo_servicio, matricula, estado')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha')
        .order('turno')
      if (error) throw error
      return (data ?? []) as ServicioRow[]
    },
  })
}

function useEmpleadosLista() {
  return useQuery({
    queryKey: ['empleados_nombres_lista'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('fichas_empleados')
        .select('id_nombre')
        .eq('activo', true)
        .order('id_nombre')
      if (error) throw error
      return (data ?? []).map((e: { id_nombre: string }) => e.id_nombre)
    },
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ───────────────────────────────────────────────────────────────────────── */

export function ServiciosScreen() {
  const qc = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const { start, end } = getWeekBounds(weekOffset)
  const query = useServicios(start, end)
  const empQuery = useEmpleadosLista()

  const [showForm, setShowForm] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [turno, setTurno] = useState<string>('M')
  const [idNombre, setIdNombre] = useState('')
  const [tipoServicio, setTipoServicio] = useState('')
  const [matricula, setMatricula] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAgregar() {
    if (!idNombre || !tipoServicio || !fecha) {
      setError('Completa empleado, tipo y fecha.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_planificar_servicio', {
        p_mutation_uuid: crypto.randomUUID(),
        p_fecha: fecha,
        p_turno: turno,
        p_id_nombre: idNombre,
        p_tipo_servicio: tipoServicio,
        p_matricula: matricula.trim() || null,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['servicios_planificados'] })
      setShowForm(false)
      setMatricula('')
      setIdNombre('')
      setTipoServicio('')
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEliminar(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_cancelar_servicio', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_servicio: id,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['servicios_planificados'] })
    } catch (e) {
      setError(resolveRpcError(e))
    }
  }

  // Group by date
  const byFecha = (query.data ?? []).reduce<Record<string, ServicioRow[]>>((acc, s) => {
    ;(acc[s.fecha] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings2 aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Planificación de servicios</h2>
          {query.data && (
            <Badge variant="secondary">
              {query.data.filter((s) => s.estado !== 'Cancelado').length} servicios
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isLoading}
            aria-label="Recargar"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setShowForm(!showForm)
              setError(null)
            }}
          >
            {showForm ? (
              'Cancelar'
            ) : (
              <>
                <Plus className="size-4" />
                Nuevo servicio
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="font-body text-sm">
          <CalendarDays className="mr-1 inline size-4 text-muted-foreground" aria-hidden="true" />
          {start} — {end}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Semana siguiente"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        {weekOffset !== 0 && (
          <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)}>
            Esta semana
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* New service form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Nuevo servicio planificado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="srv-fecha">Fecha</FieldLabel>
                <Input
                  id="srv-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  disabled={submitting}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="srv-turno">Turno</FieldLabel>
                <Select value={turno} onValueChange={setTurno} disabled={submitting}>
                  <SelectTrigger id="srv-turno">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TURNO_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="srv-empleado">Empleado</FieldLabel>
                <Select
                  value={idNombre}
                  onValueChange={setIdNombre}
                  disabled={submitting || empQuery.isLoading}
                >
                  <SelectTrigger id="srv-empleado">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(empQuery.data ?? []).map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="srv-tipo">Tipo de servicio</FieldLabel>
                <Select value={tipoServicio} onValueChange={setTipoServicio} disabled={submitting}>
                  <SelectTrigger id="srv-tipo">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="srv-matricula">
                  Matrícula <span className="font-light text-muted-foreground">— opcional</span>
                </FieldLabel>
                <Input
                  id="srv-matricula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ej. 1234 ABC"
                  disabled={submitting}
                />
              </Field>
            </div>
            <Button size="sm" className="w-full" onClick={handleAgregar} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar servicio'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Services list */}
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : Object.keys(byFecha).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay servicios planificados para esta semana.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byFecha).map(([fecha, servicios]) => (
            <div key={fecha}>
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                {fmtDate(fecha)}
              </p>
              <div className="space-y-2">
                {servicios.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={TURNO_VARIANT[s.turno] ?? 'secondary'}
                          className="text-xs w-16 justify-center"
                        >
                          {TURNO_LABEL[s.turno] ?? s.turno}
                        </Badge>
                        <span className="font-medium text-sm">{s.id_nombre}</span>
                        <span className="text-xs text-muted-foreground">{s.tipo_servicio}</span>
                        {s.matricula && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {s.matricula}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ESTADO_VARIANT[s.estado] ?? 'secondary'}
                          className="text-xs"
                        >
                          {s.estado}
                        </Badge>
                        {s.estado !== 'Cancelado' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEliminar(s.id)}
                            aria-label={`Cancelar servicio de ${s.id_nombre}`}
                          >
                            <X className="size-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
