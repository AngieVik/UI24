import { useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useAuthStore } from '@/stores/useAuthStore'

/* ─────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────── */

interface FranjaHoraria {
  hora_inicio: string
  hora_fin: string
  hora_origen: string
  hora_destino: string
}

interface ServicioRow {
  id: string
  fecha: string
  turno: string
  id_nombre: string
  tipo_servicio: string
  matricula: string | null
  estado: 'Planificado' | 'Confirmado' | 'Cancelado'
  titulo: string | null
  nombre: string | null
  telefono: string | null
  direccion: string | null
  localidad: string | null
  coordenadas: string | null
  origen: string | null
  destino: string | null
  franjas_horarias: FranjaHoraria[]
  vehiculos_asignados: string[]
  personal_asignado: string[]
  notas: string | null
}

type FormData = Omit<ServicioRow, 'id' | 'id_nombre' | 'estado'>

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const TURNO_LABEL: Record<string, string> = { M: 'Mañana', T: 'Tarde', N: 'Noche' }
const TURNO_VARIANT: Record<string, 'ok' | 'info' | 'warn'> = { M: 'ok', T: 'info', N: 'warn' }
const TIPO_OPTIONS = [
  'SVB emergencia',
  'SVA emergencia',
  'Traslado programado',
  'Traslado urgente',
  'Guardia base',
  'Apoyo DRP',
]
const ROLES_EDICION = ['coordinacion', 'rrhh', 'gerencia']

function emptyForm(): FormData {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    turno: 'M',
    tipo_servicio: '',
    titulo: '',
    nombre: '',
    telefono: '',
    direccion: '',
    localidad: '',
    coordenadas: '',
    origen: '',
    destino: '',
    franjas_horarias: [],
    vehiculos_asignados: [],
    personal_asignado: [],
    notas: '',
    matricula: null,
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Week helpers
 * ───────────────────────────────────────────────────────────────────────── */

function getWeekBounds(offset: number): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Multi-select component
 * ───────────────────────────────────────────────────────────────────────── */

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  disabled,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value])

  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-xs">
              {s}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(s)}
                  aria-label={`Quitar ${s}`}
                  className="hover:text-destructive"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={selected.includes(o.value)}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  onClick={() => toggle(o.value)}
                >
                  <div
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      selected.includes(o.value)
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}
                  >
                    {selected.includes(o.value) && (
                      <Check className="size-3 text-primary-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <span className="truncate">{o.label}</span>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hooks
 * ───────────────────────────────────────────────────────────────────────── */

function useServicios(start: string, end: string) {
  return useQuery({
    queryKey: ['servicios_planificados', start, end],
    staleTime: 60_000,
    queryFn: async (): Promise<ServicioRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('servicios_planificados')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .neq('estado', 'Cancelado')
        .order('fecha')
        .order('turno')
      if (error) throw error
      return (data ?? []) as ServicioRow[]
    },
  })
}

function useEmpleados() {
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

function useVehiculos() {
  return useQuery({
    queryKey: ['vehiculos_lista_servicios'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehiculos')
        .select('vehiculo_id')
        .not('vehiculo_id', 'is', null)
        .order('vehiculo_id')
      if (error) throw error
      return (data ?? []).map((v: { vehiculo_id: string }) => v.vehiculo_id)
    },
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Service form (modal)
 * ───────────────────────────────────────────────────────────────────────── */

function ServicioForm({
  open,
  inicial,
  empleados,
  vehiculos,
  onClose,
  onSave,
}: {
  open: boolean
  inicial: FormData & { id?: string }
  empleados: string[]
  vehiculos: string[]
  onClose: () => void
  onSave: (data: FormData & { id?: string }) => Promise<void>
}) {
  const [form, setForm] = useState<FormData & { id?: string }>(inicial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync when inicial changes (edit mode)
  const set = (field: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }))

  // Franja horaria helpers
  const emptyFranja = (): FranjaHoraria => ({
    hora_inicio: '',
    hora_fin: '',
    hora_origen: '',
    hora_destino: '',
  })
  const [nuevaFranja, setNuevaFranja] = useState<FranjaHoraria>(emptyFranja())

  function addFranja() {
    set('franjas_horarias', [...form.franjas_horarias, { ...nuevaFranja }])
    setNuevaFranja(emptyFranja())
  }
  function removeFranja(i: number) {
    set(
      'franjas_horarias',
      form.franjas_horarias.filter((_, idx) => idx !== i)
    )
  }

  async function handleSave() {
    if (!form.tipo_servicio || !form.fecha || !form.turno) {
      setError('Fecha, turno y tipo de servicio son necesarios.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSaving(false)
    }
  }

  const empOpts = empleados.map((e) => ({ value: e, label: e }))
  const vehOpts = vehiculos.map((v) => ({ value: v, label: v }))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {form.id ? 'Editar servicio' : 'Nuevo servicio planificado'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Sección básica ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="srv-fecha">Fecha</FieldLabel>
              <Input
                id="srv-fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="srv-turno">Turno</FieldLabel>
              <Select value={form.turno} onValueChange={(v) => set('turno', v)} disabled={saving}>
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
              <FieldLabel htmlFor="srv-tipo">Tipo de servicio</FieldLabel>
              <Select
                value={form.tipo_servicio}
                onValueChange={(v) => set('tipo_servicio', v)}
                disabled={saving}
              >
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
          </div>

          <Field>
            <FieldLabel htmlFor="srv-titulo">Título</FieldLabel>
            <Input
              id="srv-titulo"
              value={form.titulo ?? ''}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="Descripción breve del servicio"
              disabled={saving}
            />
          </Field>

          {/* ── Paciente / Contacto ── */}
          <p className="text-xs font-bold uppercase text-muted-foreground">Paciente / Contacto</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="srv-nombre">Nombre</FieldLabel>
              <Input
                id="srv-nombre"
                value={form.nombre ?? ''}
                onChange={(e) => set('nombre', e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="srv-tel">Teléfono</FieldLabel>
              <Input
                id="srv-tel"
                type="tel"
                value={form.telefono ?? ''}
                onChange={(e) => set('telefono', e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="srv-dir">Dirección</FieldLabel>
              <Input
                id="srv-dir"
                value={form.direccion ?? ''}
                onChange={(e) => set('direccion', e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="srv-loc">Localidad</FieldLabel>
              <Input
                id="srv-loc"
                value={form.localidad ?? ''}
                onChange={(e) => set('localidad', e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="srv-coord">
                Coordenadas{' '}
                <span className="font-light text-muted-foreground">— lat,lon (abre Maps)</span>
              </FieldLabel>
              <Input
                id="srv-coord"
                value={form.coordenadas ?? ''}
                onChange={(e) => set('coordenadas', e.target.value)}
                placeholder="Ej. 37.3861,-5.9845"
                disabled={saving}
              />
            </Field>
          </div>

          {/* ── Traslado ── */}
          <p className="text-xs font-bold uppercase text-muted-foreground">Traslado</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="srv-origen">Origen</FieldLabel>
              <Input
                id="srv-origen"
                value={form.origen ?? ''}
                onChange={(e) => set('origen', e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="srv-destino">Destino</FieldLabel>
              <Input
                id="srv-destino"
                value={form.destino ?? ''}
                onChange={(e) => set('destino', e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>

          {/* ── Franjas horarias ── */}
          <p className="text-xs font-bold uppercase text-muted-foreground">Franjas horarias</p>
          {form.franjas_horarias.length > 0 && (
            <div className="space-y-2">
              {form.franjas_horarias.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs">
                    {f.hora_inicio || '—'}→{f.hora_fin || '—'} · Or:{f.hora_origen || '—'} ·
                    Dst:{f.hora_destino || '—'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => removeFranja(i)}
                    aria-label={`Eliminar franja ${i + 1}`}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ['hora_inicio', 'Hora inicio'],
                ['hora_fin', 'Hora fin'],
                ['hora_origen', 'H. origen'],
                ['hora_destino', 'H. destino'],
              ] as [keyof FranjaHoraria, string][]
            ).map(([field, label]) => (
              <Field key={field}>
                <FieldLabel className="text-xs">{label}</FieldLabel>
                <Input
                  type="time"
                  value={nuevaFranja[field]}
                  onChange={(e) => setNuevaFranja((f) => ({ ...f, [field]: e.target.value }))}
                  className="text-sm"
                  disabled={saving}
                />
              </Field>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addFranja}
            disabled={saving}
            className="w-full"
          >
            <Plus className="mr-1 size-3.5" aria-hidden="true" />
            Añadir franja
          </Button>

          {/* ── Asignación ── */}
          <p className="text-xs font-bold uppercase text-muted-foreground">Asignación</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Vehículos asignados</FieldLabel>
              <MultiSelect
                options={vehOpts}
                selected={form.vehiculos_asignados}
                onChange={(v) => set('vehiculos_asignados', v)}
                placeholder="Añadir vehículo…"
                disabled={saving}
              />
            </Field>
            <Field>
              <FieldLabel>Personal asignado</FieldLabel>
              <MultiSelect
                options={empOpts}
                selected={form.personal_asignado}
                onChange={(v) => set('personal_asignado', v)}
                placeholder="Añadir persona…"
                disabled={saving}
              />
            </Field>
          </div>

          {/* ── Notas ── */}
          <Field>
            <FieldLabel htmlFor="srv-notas">Notas</FieldLabel>
            <Textarea
              id="srv-notas"
              value={form.notas ?? ''}
              onChange={(e) => set('notas', e.target.value)}
              rows={2}
              disabled={saving}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ───────────────────────────────────────────────────────────────────────── */

export function ServiciosScreen() {
  const qc = useQueryClient()
  const rol = useAuthStore((s) => s.rol)
  const puedeEditar = ROLES_EDICION.includes(rol ?? '')

  const [weekOffset, setWeekOffset] = useState(0)
  const { start, end } = getWeekBounds(weekOffset)
  const query = useServicios(start, end)
  const empQuery = useEmpleados()
  const vehQuery = useVehiculos()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<(FormData & { id?: string }) | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('rpc_guardar_servicio_planificado', {
        p_mutation_uuid: crypto.randomUUID(),
        p_fecha: data.fecha,
        p_turno: data.turno,
        p_tipo_servicio: data.tipo_servicio,
        p_id_servicio: data.id ?? null,
        p_titulo: data.titulo || null,
        p_nombre: data.nombre || null,
        p_telefono: data.telefono || null,
        p_direccion: data.direccion || null,
        p_localidad: data.localidad || null,
        p_coordenadas: data.coordenadas || null,
        p_origen: data.origen || null,
        p_destino: data.destino || null,
        p_franjas_horarias: data.franjas_horarias,
        p_vehiculos_asignados: data.vehiculos_asignados,
        p_personal_asignado: data.personal_asignado,
        p_notas: data.notas || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicios_planificados'] })
      setFormOpen(false)
      setEditTarget(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('rpc_eliminar_servicio_planificado', {
        p_id_servicio: id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servicios_planificados'] }),
    onError: (e) => setGlobalError(resolveRpcError(e)),
  })

  function openNew() {
    setEditTarget({ ...emptyForm() })
    setFormOpen(true)
  }

  function openEdit(s: ServicioRow) {
    setEditTarget({
      id: s.id,
      fecha: s.fecha,
      turno: s.turno,
      tipo_servicio: s.tipo_servicio,
      titulo: s.titulo,
      nombre: s.nombre,
      telefono: s.telefono,
      direccion: s.direccion,
      localidad: s.localidad,
      coordenadas: s.coordenadas,
      origen: s.origen,
      destino: s.destino,
      franjas_horarias: s.franjas_horarias ?? [],
      vehiculos_asignados: s.vehiculos_asignados ?? [],
      personal_asignado: s.personal_asignado ?? [],
      notas: s.notas,
      matricula: s.matricula,
    })
    setFormOpen(true)
  }

  const byFecha = (query.data ?? []).reduce<Record<string, ServicioRow[]>>((acc, s) => {
    ;(acc[s.fecha] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings2 aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Planificación de servicios</h2>
          {query.data && (
            <Badge variant="secondary">{query.data.length} servicios</Badge>
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
          {puedeEditar && (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo servicio
            </Button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Semana anterior">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="font-body text-sm">
          <CalendarDays className="mr-1 inline size-4 text-muted-foreground" aria-hidden="true" />
          {start} — {end}
        </span>
        <Button size="sm" variant="outline" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Semana siguiente">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        {weekOffset !== 0 && (
          <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)}>
            Esta semana
          </Button>
        )}
      </div>

      {globalError && (
        <p role="alert" className="text-sm text-destructive">
          {globalError}
        </p>
      )}

      {/* List */}
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : Object.keys(byFecha).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No hay servicios planificados para esta semana.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(byFecha).map(([fecha, servicios]) => (
            <div key={fecha}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {fmtDate(fecha)}
              </p>
              <div className="space-y-2">
                {servicios.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        {/* Left: info */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={TURNO_VARIANT[s.turno] ?? 'secondary'} className="text-xs shrink-0">
                              {TURNO_LABEL[s.turno] ?? s.turno}
                            </Badge>
                            <span className="font-medium text-sm truncate">
                              {s.titulo || s.tipo_servicio}
                            </span>
                            {s.titulo && (
                              <span className="text-xs text-muted-foreground">{s.tipo_servicio}</span>
                            )}
                          </div>

                          {/* Location / contact */}
                          {(s.nombre || s.localidad || s.origen) && (
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {s.nombre && <span>{s.nombre}</span>}
                              {s.localidad && <span>{s.localidad}</span>}
                              {s.origen && s.destino && <span>{s.origen} → {s.destino}</span>}
                            </div>
                          )}

                          {/* Vehicles + personal */}
                          {(s.vehiculos_asignados?.length > 0 || s.personal_asignado?.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {(s.vehiculos_asignados ?? []).map((v) => (
                                <Badge key={v} variant="outline" className="text-xs font-mono">
                                  {v}
                                </Badge>
                              ))}
                              {(s.personal_asignado ?? []).map((p) => (
                                <Badge key={p} variant="secondary" className="text-xs">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Franjas */}
                          {s.franjas_horarias?.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {s.franjas_horarias.map((f, i) => (
                                <span key={i} className="font-mono">
                                  {f.hora_inicio}–{f.hora_fin}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {s.coordenadas && (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              aria-label="Ver en Maps"
                            >
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.coordenadas)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                              </a>
                            </Button>
                          )}
                          {puedeEditar && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(s)}
                                aria-label={`Editar ${s.titulo || s.tipo_servicio}`}
                              >
                                <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Eliminar ${s.titulo || s.tipo_servicio}`}
                                  >
                                    <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      ¿Eliminar el servicio{' '}
                                      <strong>{s.titulo || s.tipo_servicio}</strong> del{' '}
                                      {fmtDate(s.fecha)}? Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(s.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {formOpen && editTarget && (
        <ServicioForm
          open={formOpen}
          inicial={editTarget}
          empleados={empQuery.data ?? []}
          vehiculos={vehQuery.data ?? []}
          onClose={() => {
            setFormOpen(false)
            setEditTarget(null)
          }}
          onSave={async (data) => {
            await saveMutation.mutateAsync(data)
          }}
        />
      )}
    </div>
  )
}
