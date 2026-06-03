import { useState } from 'react'
import {
  AlertCircle,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Trash2,
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

interface Incidencia {
  id_incidencia: string
  matricula: string
  descripcion: string | null
  origen_tipo: 'checklist' | 'doc7' | 'doc11' | 'manual'
  origen_id: string | null
  prioridad: 'baja' | 'normal' | 'alta' | 'critica'
  notas_taller: string | null
  anclada: boolean
  archivada: boolean
  id_nombre_registrador: string
  created_at: string
  updated_at: string
}

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const PRIORIDAD_VARIANT: Record<string, 'destructive' | 'warn' | 'info' | 'secondary'> = {
  critica: 'destructive',
  alta: 'warn',
  normal: 'info',
  baja: 'secondary',
}

const ORIGEN_LABEL: Record<string, string> = {
  checklist: 'Checklist',
  doc7: 'Doc-7',
  doc11: 'Doc-11',
  manual: 'Manual',
}

const ROLES_GESTION = ['flota', 'responsable_flota', 'gerencia']
const ROLES_ANCLAR = ['flota', 'responsable_flota', 'gerencia']

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hooks
 * ───────────────────────────────────────────────────────────────────────── */

function useIncidencias(tab: 'ancladas' | 'ultimas') {
  return useQuery({
    queryKey: ['incidencias', tab],
    staleTime: 30_000,
    queryFn: async (): Promise<Incidencia[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('incidencias')
        .select('*')
        .eq('archivada', false)
        .order('updated_at', { ascending: false })

      if (tab === 'ancladas') {
        q = q.eq('anclada', true)
      } else {
        q = q.limit(50)
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Incidencia[]
    },
  })
}

function useVehiculos() {
  return useQuery({
    queryKey: ['vehiculos_lista_incidencias'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehiculos')
        .select('matricula')
        .order('matricula')
      if (error) throw error
      return (data ?? []).map((v: { matricula: string }) => v.matricula)
    },
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Form modal
 * ───────────────────────────────────────────────────────────────────────── */

interface FormState {
  id?: string
  matricula: string
  descripcion: string
  prioridad: string
  origen_tipo: string
  notas_taller: string
}

function IncidenciaForm({
  open,
  inicial,
  vehiculos,
  onClose,
  onSave,
}: {
  open: boolean
  inicial: FormState
  vehiculos: string[]
  onClose: () => void
  onSave: (f: FormState) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(inicial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.matricula) {
      setError('Selecciona un vehículo.')
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {form.id ? 'Editar incidencia' : 'Nueva incidencia'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Field>
            <FieldLabel htmlFor="inc-veh">Vehículo</FieldLabel>
            <Select
              value={form.matricula}
              onValueChange={(v) => set('matricula', v)}
              disabled={saving || !!form.id}
            >
              <SelectTrigger id="inc-veh">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                {vehiculos.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="inc-desc">Descripción</FieldLabel>
            <Textarea
              id="inc-desc"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={3}
              placeholder="Detalla la incidencia detectada…"
              disabled={saving}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="inc-prio">Prioridad</FieldLabel>
              <Select
                value={form.prioridad}
                onValueChange={(v) => set('prioridad', v)}
                disabled={saving}
              >
                <SelectTrigger id="inc-prio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="inc-origen">Origen</FieldLabel>
              <Select
                value={form.origen_tipo}
                onValueChange={(v) => set('origen_tipo', v)}
                disabled={saving}
              >
                <SelectTrigger id="inc-origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="doc7">Doc-7 avería</SelectItem>
                  <SelectItem value="doc11">Doc-11 urgente</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="inc-notas">Notas de taller</FieldLabel>
            <Textarea
              id="inc-notas"
              value={form.notas_taller}
              onChange={(e) => set('notas_taller', e.target.value)}
              rows={2}
              placeholder="Diagnóstico, piezas pendientes…"
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
 * Card
 * ───────────────────────────────────────────────────────────────────────── */

function IncidenciaCard({
  inc,
  puedeGestionar,
  puedeAnclar,
  onEdit,
  onAnclar,
  onEliminar,
}: {
  inc: Incidencia
  puedeGestionar: boolean
  puedeAnclar: boolean
  onEdit: (i: Incidencia) => void
  onAnclar: (id: string, anclada: boolean) => void
  onEliminar: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          {/* Main info */}
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {inc.matricula}
              </Badge>
              <Badge variant={PRIORIDAD_VARIANT[inc.prioridad] ?? 'secondary'} className="text-xs">
                {inc.prioridad}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {ORIGEN_LABEL[inc.origen_tipo] ?? inc.origen_tipo}
              </Badge>
              {inc.anclada && (
                <Badge variant="warn" className="text-xs gap-1">
                  <Pin className="size-3" aria-hidden="true" />
                  Anclada
                </Badge>
              )}
            </div>

            {inc.descripcion && (
              <p className="text-sm leading-snug line-clamp-3">{inc.descripcion}</p>
            )}

            {inc.notas_taller && (
              <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 line-clamp-2">
                Taller: {inc.notas_taller}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {fmtDateTime(inc.created_at)} · {inc.id_nombre_registrador}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {puedeAnclar && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAnclar(inc.id_incidencia, !inc.anclada)}
                aria-label={inc.anclada ? 'Desanclar' : 'Anclar'}
                title={inc.anclada ? 'Desanclar' : 'Anclar'}
              >
                {inc.anclada ? (
                  <PinOff className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Pin className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </Button>
            )}

            {puedeGestionar && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(inc)}
                  aria-label="Editar incidencia"
                >
                  <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" aria-label="Eliminar incidencia">
                      <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar incidencia</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Eliminar esta incidencia del vehículo{' '}
                        <strong>{inc.matricula}</strong>? Úsalo solo si es un duplicado. Esta
                        acción es irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onEliminar(inc.id_incidencia)}
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
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main
 * ───────────────────────────────────────────────────────────────────────── */

export function IncidenciasScreen({ vista }: { vista?: 'ancladas' | 'ultimas' }) {
  const rol = useAuthStore((s) => s.rol)
  const puedeGestionar = ROLES_GESTION.includes(rol ?? '')
  const puedeAnclar = ROLES_ANCLAR.includes(rol ?? '')

  const qc = useQueryClient()
  const vistaActual = vista ?? 'ancladas'
  const ancQ = useIncidencias('ancladas')
  const ultQ = useIncidencias('ultimas')
  const vehQuery = useVehiculos()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Incidencia | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function reload() {
    ancQ.refetch()
    ultQ.refetch()
  }

  function openNew() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(inc: Incidencia) {
    setEditTarget(inc)
    setFormOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: async (f: FormState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('rpc_crear_incidencia', {
        p_matricula: f.matricula,
        p_descripcion: f.descripcion || null,
        p_origen_tipo: f.origen_tipo,
        p_prioridad: f.prioridad,
        p_notas_taller: f.notas_taller || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidencias'] })
      setFormOpen(false)
    },
    onError: (e) => setGlobalError(resolveRpcError(e)),
  })

  const editMutation = useMutation({
    mutationFn: async (f: FormState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('rpc_editar_incidencia', {
        p_id_incidencia: f.id,
        p_descripcion: f.descripcion || null,
        p_prioridad: f.prioridad,
        p_notas_taller: f.notas_taller || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidencias'] })
      setFormOpen(false)
      setEditTarget(null)
    },
    onError: (e) => setGlobalError(resolveRpcError(e)),
  })

  const anclarMutation = useMutation({
    mutationFn: async ({ id, anclada }: { id: string; anclada: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('rpc_anclar_incidencia', {
        p_id_incidencia: id,
        p_anclada: anclada,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
    onError: (e) => setGlobalError(resolveRpcError(e)),
  })

  const eliminarMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('rpc_eliminar_incidencia', {
        p_id_incidencia: id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
    onError: (e) => setGlobalError(resolveRpcError(e)),
  })

  async function handleSave(f: FormState) {
    if (f.id) {
      await editMutation.mutateAsync(f)
    } else {
      await createMutation.mutateAsync(f)
    }
  }

  const inicialForm = (inc: Incidencia | null): FormState => ({
    id: inc?.id_incidencia,
    matricula: inc?.matricula ?? '',
    descripcion: inc?.descripcion ?? '',
    prioridad: inc?.prioridad ?? 'normal',
    origen_tipo: inc?.origen_tipo ?? 'manual',
    notas_taller: inc?.notas_taller ?? '',
  })

  const q = vistaActual === 'ancladas' ? ancQ : ultQ

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">
            {vistaActual === 'ancladas' ? 'Incidencias ancladas' : 'Últimas incidencias'}
          </h2>
          {(ancQ.data?.length ?? 0) > 0 && (
            <Badge variant="warn">{ancQ.data!.length} ancladas</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reload} aria-label="Recargar">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
          {puedeGestionar && (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              Nueva incidencia
            </Button>
          )}
        </div>
      </div>

      {globalError && (
        <p role="alert" className="text-sm text-destructive">
          {globalError}
        </p>
      )}

      <div className="mt-0">
        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : q.isError ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-destructive">
                No se pudieron cargar las incidencias.
              </p>
            </CardContent>
          </Card>
        ) : (q.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {vistaActual === 'ancladas'
                  ? 'No hay incidencias ancladas.'
                  : 'No hay incidencias recientes.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(q.data ?? []).map((inc) => (
              <IncidenciaCard
                key={inc.id_incidencia}
                inc={inc}
                puedeGestionar={puedeGestionar}
                puedeAnclar={puedeAnclar}
                onEdit={openEdit}
                onAnclar={(id, anclada) => anclarMutation.mutate({ id, anclada })}
                onEliminar={(id) => eliminarMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <IncidenciaForm
          open={formOpen}
          inicial={inicialForm(editTarget)}
          vehiculos={vehQuery.data ?? []}
          onClose={() => {
            setFormOpen(false)
            setEditTarget(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
