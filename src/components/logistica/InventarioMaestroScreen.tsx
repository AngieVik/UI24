import { useState } from 'react'
import { Boxes, RefreshCw, Plus, Pencil, Trash2, Truck } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useAuthStore } from '@/stores/useAuthStore'

// ── Types ────────────────────────────────────────────────────────────

interface LocationRow {
  location_id: string
  nombre: string
  tipo: string
  activa: boolean
}

interface VehiculoRow {
  matricula: string
  vehiculo_id: string | null
  nombre_display: string | null
  tipo: string
  estado_operativo: string
  condicion_tecnica: string
}

interface AuditoriaRow {
  id_auditoria: string
  location_id: string
  id_nombre_responsable: string
  timestamp_inicio: string
  timestamp_fin: string | null
  estado: string
}

interface SubinventarioRow {
  id_subinventario: string
  nombre: string
  tipo_plantilla: string
  location_id: string | null
  activo: boolean
}

// ── Queries ──────────────────────────────────────────────────────────

function useLocations() {
  return useQuery({
    queryKey: ['locations_fijas'],
    queryFn: async (): Promise<LocationRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('locations')
        .select('location_id, nombre, tipo, activa')
        .not('tipo', 'eq', 'vehiculo')
        .order('tipo')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as LocationRow[]
    },
  })
}

function useVehiculosFlota() {
  return useQuery({
    queryKey: ['vehiculos_flota_almacenes'],
    queryFn: async (): Promise<VehiculoRow[]> => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('matricula, vehiculo_id, nombre_display, tipo, estado_operativo, condicion_tecnica')
        .order('vehiculo_id')
      if (error) throw error
      return (data ?? []) as VehiculoRow[]
    },
  })
}

function useAuditorias() {
  return useQuery({
    queryKey: ['auditorias_inventario'],
    queryFn: async (): Promise<AuditoriaRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('auditorias_inventario')
        .select(
          'id_auditoria, location_id, id_nombre_responsable, timestamp_inicio, timestamp_fin, estado'
        )
        .order('timestamp_inicio', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as AuditoriaRow[]
    },
  })
}

function useSubinventarios() {
  return useQuery({
    queryKey: ['subinventarios'],
    queryFn: async (): Promise<SubinventarioRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('subinventarios')
        .select('id_subinventario, nombre, tipo_plantilla, location_id, activo')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as SubinventarioRow[]
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TIPO_VARIANT: Record<string, 'ok' | 'info' | 'warn' | 'secondary'> = {
  almacen: 'info',
  vehiculo: 'ok',
  mochila: 'warn',
  externo: 'secondary',
}

const TIPO_SUBINV_LABEL: Record<string, string> = {
  box: 'Caja / Box',
  sub_drp: 'Sub-DRP',
  event_backpack: 'Mochila evento',
}

const TIPO_VEHICULO_LABEL: Record<string, string> = {
  A1: 'A1',
  A2: 'A2',
  B: 'B',
  C: 'C',
  VIR: 'VIR',
  Quad: 'Quad',
  Unidad_movil: 'Unidad móvil',
  Logistica: 'Logística',
}

// ── SubDialog — crear / editar subinventario ─────────────────────────

interface SubDialogProps {
  open: boolean
  editing: SubinventarioRow | null
  onClose: () => void
  onSaved: () => void
}

function SubDialog({ open, editing, onClose, onSaved }: SubDialogProps) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState(editing?.nombre ?? '')
  const [tipo, setTipo] = useState(editing?.tipo_plantilla ?? 'box')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = editing !== null

  async function handleSave() {
    if (!nombre.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any).rpc('rpc_editar_subinventario', {
          p_id_subinventario: editing.id_subinventario,
          p_nombre: nombre.trim(),
          p_tipo_plantilla: tipo,
          p_activo: editing.activo,
        })
        if (err) throw err
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any).rpc('rpc_crear_subinventario', {
          p_nombre: nombre.trim(),
          p_tipo_plantilla: tipo,
        })
        if (err) throw err
      }
      await qc.invalidateQueries({ queryKey: ['subinventarios'] })
      onSaved()
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar subinventario' : 'Nuevo subinventario dinámico'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Field>
            <FieldLabel htmlFor="sub-nombre">Nombre</FieldLabel>
            <Input
              id="sub-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Box material DRP norte"
              disabled={saving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="sub-tipo">Tipo</FieldLabel>
            <Select value={tipo} onValueChange={setTipo} disabled={saving}>
              <SelectTrigger id="sub-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="box">Caja / Box</SelectItem>
                <SelectItem value="sub_drp">Sub-DRP</SelectItem>
                <SelectItem value="event_backpack">Mochila evento</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function InventarioMaestroScreen({
  vista,
}: {
  vista?: 'locations' | 'auditorias' | 'dinamicos'
}) {
  const rol = useAuthStore((s) => s.rol)
  const qc = useQueryClient()

  const locQ = useLocations()
  const flotaQ = useVehiculosFlota()
  const audQ = useAuditorias()
  const subQ = useSubinventarios()

  // Sub-dialog state
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [editingSubinv, setEditingSubinv] = useState<SubinventarioRow | null>(null)

  const canManageLogistica =
    rol === 'logistica' || rol === 'responsable_logistica' || rol === 'gerencia'

  function reload() {
    locQ.refetch()
    flotaQ.refetch()
    audQ.refetch()
    subQ.refetch()
  }

  function openCreateSub() {
    setEditingSubinv(null)
    setSubDialogOpen(true)
  }

  function openEditSub(item: SubinventarioRow) {
    setEditingSubinv(item)
    setSubDialogOpen(true)
  }

  async function desactivarSub(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('rpc_desactivar_subinventario', {
        p_id_subinventario: id,
      })
      await qc.invalidateQueries({ queryKey: ['subinventarios'] })
    } catch {
      // error silenciado — el AlertDialog ya confirma la acción
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Boxes aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Inventario maestro</h2>
        </div>
        <Button size="sm" variant="outline" onClick={reload} aria-label="Recargar inventario">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* ── Almacenes (A4.1) ───────────────────────────────── */}
      {(vista ?? 'locations') === 'locations' && (
        <div className="mt-0 space-y-3">
          {/* Almacenes fijos */}
          {locQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="border-b px-4 py-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Almacenes fijos
                  </span>
                </div>
                {(locQ.data?.length ?? 0) === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No hay almacenes configurados.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(locQ.data ?? []).map((l) => (
                        <TableRow key={l.location_id}>
                          <TableCell className="font-medium">{l.nombre}</TableCell>
                          <TableCell>
                            <Badge variant={TIPO_VARIANT[l.tipo] ?? 'info'}>{l.tipo}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={l.activa ? 'ok' : 'secondary'}>
                              {l.activa ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Flota (vehiculos) */}
          {flotaQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b px-4 py-2">
                  <Truck className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Flota ({flotaQ.data?.length ?? 0} vehículos)
                  </span>
                </div>
                {(flotaQ.data?.length ?? 0) === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No hay vehículos registrados.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-bold uppercase">ID</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Matrícula</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                        <TableHead className="text-xs font-bold uppercase">Condición</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(flotaQ.data ?? []).map((v) => (
                        <TableRow key={v.matricula}>
                          <TableCell className="font-medium">
                            {v.vehiculo_id ?? v.matricula}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {v.matricula}
                          </TableCell>
                          <TableCell>
                            <Badge variant="info">
                              {TIPO_VEHICULO_LABEL[v.tipo] ?? v.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                v.estado_operativo === 'Disponible'
                                  ? 'ok'
                                  : v.estado_operativo === 'En_Servicio'
                                    ? 'warn'
                                    : 'secondary'
                              }
                            >
                              {v.estado_operativo.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                v.condicion_tecnica === 'Operativo'
                                  ? 'ok'
                                  : v.condicion_tecnica === 'Averiado'
                                    ? 'destructive'
                                    : 'warn'
                              }
                            >
                              {v.condicion_tecnica}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Auditorías ──────────────────────────────────────── */}
      {(vista ?? 'locations') === 'auditorias' && (
        <div className="mt-0">
          {audQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (audQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay auditorías registradas.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Location</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Responsable</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Inicio</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(audQ.data ?? []).map((a) => (
                      <TableRow key={a.id_auditoria}>
                        <TableCell className="font-medium">{a.location_id}</TableCell>
                        <TableCell className="text-sm">{a.id_nombre_responsable}</TableCell>
                        <TableCell className="text-xs">{fmtDateTime(a.timestamp_inicio)}</TableCell>
                        <TableCell>
                          <Badge variant={a.estado === 'Cerrada' ? 'ok' : 'warn'}>
                            {a.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Inventarios dinámicos (A4.2) ────────────────────── */}
      {(vista ?? 'locations') === 'dinamicos' && (
        <div className="mt-0 space-y-3">
          {canManageLogistica && (
            <div className="flex justify-end">
              <Button size="sm" onClick={openCreateSub}>
                <Plus className="size-4 mr-1" aria-hidden="true" />
                Nuevo subinventario
              </Button>
            </div>
          )}

          {subQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (subQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay subinventarios dinámicos configurados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Activo</TableHead>
                      {canManageLogistica && (
                        <TableHead className="text-xs font-bold uppercase">Acciones</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subQ.data ?? []).map((d) => (
                      <TableRow key={d.id_subinventario}>
                        <TableCell className="font-medium">{d.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="info">
                            {TIPO_SUBINV_LABEL[d.tipo_plantilla] ?? d.tipo_plantilla}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.activo ? 'ok' : 'secondary'}>
                            {d.activo ? 'Sí' : 'No'}
                          </Badge>
                        </TableCell>
                        {canManageLogistica && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => openEditSub(d)}
                                aria-label={`Editar ${d.nombre}`}
                              >
                                <Pencil className="size-3.5" aria-hidden="true" />
                              </Button>
                              {d.activo && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="size-7 text-destructive hover:text-destructive"
                                      aria-label={`Desactivar ${d.nombre}`}
                                    >
                                      <Trash2 className="size-3.5" aria-hidden="true" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        ¿Desactivar subinventario?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Se desactivará «{d.nombre}». El inventario asociado se
                                        conserva. Puedes reactivarlo más adelante.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => desactivarSub(d.id_subinventario)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Desactivar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog crear / editar subinventario */}
      <SubDialog
        open={subDialogOpen}
        editing={editingSubinv}
        onClose={() => setSubDialogOpen(false)}
        onSaved={() => setSubDialogOpen(false)}
      />
    </div>
  )
}
