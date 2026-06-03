import { useState } from 'react'
import {
  RefreshCw,
  Tag,
  Save,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

interface StockRow {
  location_id: string
  id_item: number
  stock_real: number
  stock_min: number | null
  stock_max: number | null
  updated_at: string
  nombre?: string
}

interface PlantillaRow {
  id_plantilla: string
  nombre: string
  tipo: string
  activa: boolean
}

interface AlertaRow {
  location_id: string
  id_item: number
  stock_real: number
  stock_min: number
  diferencia: number
  nombre?: string
}

interface PlantillaLineaRow {
  plantilla_id: string
  subgrupo: string
  id_item: number
  stock_objetivo: number
  umbral_alerta: number | null
  nombre?: string
}

// ── Queries ──────────────────────────────────────────────────────────

function useStockHistorial() {
  return useQuery({
    queryKey: ['stock_historial'],
    queryFn: async (): Promise<StockRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('inventario_stock_actual')
        .select(
          'location_id, id_item, stock_real, stock_min, stock_max, updated_at, catalogo_items(nombre)'
        )
        .order('updated_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        location_id: r['location_id'] as string,
        id_item: r['id_item'] as number,
        stock_real: r['stock_real'] as number,
        stock_min: r['stock_min'] as number | null,
        stock_max: r['stock_max'] as number | null,
        updated_at: r['updated_at'] as string,
        nombre:
          ((r['catalogo_items'] as Record<string, unknown> | null)?.['nombre'] as string) ??
          undefined,
      }))
    },
  })
}

function usePlantillas() {
  return useQuery({
    queryKey: ['plantillas_stock'],
    queryFn: async (): Promise<PlantillaRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('plantillas_stock')
        .select('id_plantilla, nombre, tipo, activa')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as PlantillaRow[]
    },
  })
}

function useAlertas() {
  return useQuery({
    queryKey: ['stock_alertas'],
    queryFn: async (): Promise<AlertaRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('inventario_stock_actual')
        .select('location_id, id_item, stock_real, stock_min, catalogo_items(nombre)')
        .not('stock_min', 'is', null)
      if (error) throw error
      return ((data ?? []) as Record<string, unknown>[])
        .map((r) => ({
          location_id: r['location_id'] as string,
          id_item: r['id_item'] as number,
          stock_real: r['stock_real'] as number,
          stock_min: r['stock_min'] as number,
          diferencia: (r['stock_min'] as number) - (r['stock_real'] as number),
          nombre:
            ((r['catalogo_items'] as Record<string, unknown> | null)?.['nombre'] as string) ??
            undefined,
        }))
        .filter((r) => r.stock_real < r.stock_min)
    },
  })
}

function usePlantillaLineas(plantillaId: string | null) {
  return useQuery({
    queryKey: ['plantilla_lineas', plantillaId],
    enabled: plantillaId !== null,
    queryFn: async (): Promise<PlantillaLineaRow[]> => {
      // umbral_alerta no está en tipos generados aún → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('plantilla_lineas')
        .select(
          'plantilla_id, subgrupo, id_item, stock_objetivo, umbral_alerta, catalogo_items(nombre)'
        )
        .eq('plantilla_id', plantillaId!)
        .order('subgrupo')
        .order('id_item')
      if (error) throw error
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        plantilla_id: r['plantilla_id'] as string,
        subgrupo: r['subgrupo'] as string,
        id_item: r['id_item'] as number,
        stock_objetivo: r['stock_objetivo'] as number,
        umbral_alerta: (r['umbral_alerta'] as number | null) ?? null,
        nombre:
          ((r['catalogo_items'] as Record<string, unknown> | null)?.['nombre'] as string) ??
          undefined,
      }))
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Gestión tab: editable plantilla lineas ───────────────────────────

interface GestionTabProps {
  plantillas: PlantillaRow[]
}

interface LineaEditState {
  stock_objetivo: string
  umbral_alerta: string
  saving: boolean
  error: string | null
  saved: boolean
}

function GestionTab({ plantillas }: GestionTabProps) {
  const qc = useQueryClient()
  const [selectedPlantilla, setSelectedPlantilla] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [editStates, setEditStates] = useState<Record<string, LineaEditState>>({})

  const lineasQ = usePlantillaLineas(selectedPlantilla)

  function lineaKey(l: PlantillaLineaRow) {
    return `${l.subgrupo}::${l.id_item}`
  }

  function getEditState(l: PlantillaLineaRow): LineaEditState {
    const key = lineaKey(l)
    return (
      editStates[key] ?? {
        stock_objetivo: String(l.stock_objetivo),
        umbral_alerta: l.umbral_alerta !== null ? String(l.umbral_alerta) : '',
        saving: false,
        error: null,
        saved: false,
      }
    )
  }

  function updateEditState(l: PlantillaLineaRow, patch: Partial<LineaEditState>) {
    const key = lineaKey(l)
    setEditStates((prev) => ({
      ...prev,
      [key]: { ...getEditState(l), ...patch },
    }))
  }

  function toggleGroup(subgrupo: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(subgrupo)) next.delete(subgrupo)
      else next.add(subgrupo)
      return next
    })
  }

  async function saveLinea(l: PlantillaLineaRow) {
    const state = getEditState(l)
    const stockObj = parseInt(state.stock_objetivo, 10)
    const umbral =
      state.umbral_alerta.trim() !== '' ? parseInt(state.umbral_alerta, 10) : null

    if (isNaN(stockObj) || stockObj < 0) {
      updateEditState(l, { error: 'El stock objetivo debe ser un número ≥ 0.' })
      return
    }

    updateEditState(l, { saving: true, error: null })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_actualizar_plantilla_linea', {
        p_plantilla_id: l.plantilla_id,
        p_subgrupo: l.subgrupo,
        p_id_item: l.id_item,
        p_stock_objetivo: stockObj,
        p_umbral_alerta: umbral,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['plantilla_lineas', l.plantilla_id] })
      updateEditState(l, { saving: false, saved: true })
      setTimeout(() => updateEditState(l, { saved: false }), 2000)
    } catch (e) {
      updateEditState(l, { saving: false, error: resolveRpcError(e) })
    }
  }

  const lineas = lineasQ.data ?? []
  const subgrupos = [...new Set(lineas.map((l) => l.subgrupo))]

  return (
    <div className="space-y-4">
      {/* Selector de plantilla */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Plantilla:</span>
        <Select
          value={selectedPlantilla ?? ''}
          onValueChange={(v) => {
            setSelectedPlantilla(v || null)
            setEditStates({})
            setCollapsedGroups(new Set())
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecciona una plantilla" />
          </SelectTrigger>
          <SelectContent>
            {plantillas.map((p) => (
              <SelectItem key={p.id_plantilla} value={p.id_plantilla}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPlantilla && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Selecciona una plantilla para ver y editar sus líneas de stock.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPlantilla && lineasQ.isLoading && <Skeleton className="h-48 w-full" />}

      {selectedPlantilla && !lineasQ.isLoading && lineas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Esta plantilla no tiene líneas configuradas.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPlantilla && !lineasQ.isLoading && lineas.length > 0 && (
        <div className="space-y-2">
          {subgrupos.map((sg) => {
            const sgLineas = lineas.filter((l) => l.subgrupo === sg)
            const collapsed = collapsedGroups.has(sg)
            return (
              <Card key={sg}>
                <CardContent className="p-0">
                  {/* Subgrupo header */}
                  <button
                    onClick={() => toggleGroup(sg)}
                    className="flex w-full items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
                    aria-expanded={!collapsed}
                  >
                    <span className="text-sm font-semibold">{sg}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{sgLineas.length} ítems</span>
                      {collapsed ? (
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {!collapsed && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold uppercase">Ítem</TableHead>
                          <TableHead className="w-28 text-xs font-bold uppercase">
                            Stock obj.
                          </TableHead>
                          <TableHead className="w-36 text-xs font-bold uppercase">
                            Umbral alerta
                          </TableHead>
                          <TableHead className="w-20 text-xs font-bold uppercase">
                            Guardar
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sgLineas.map((l) => {
                          const state = getEditState(l)
                          const placeholderUmbral = `${Math.ceil(l.stock_objetivo / 2)} (auto)`
                          const isDirty =
                            state.stock_objetivo !== String(l.stock_objetivo) ||
                            state.umbral_alerta !==
                              (l.umbral_alerta !== null ? String(l.umbral_alerta) : '')

                          return (
                            <TableRow key={lineaKey(l)}>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {l.nombre ?? `#${l.id_item}`}
                                </div>
                                {state.error && (
                                  <p className="text-xs text-destructive">{state.error}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-7 w-20 text-sm"
                                  value={state.stock_objetivo}
                                  onChange={(e) =>
                                    updateEditState(l, { stock_objetivo: e.target.value })
                                  }
                                  disabled={state.saving}
                                  aria-label={`Stock objetivo ${l.nombre ?? l.id_item}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-7 w-24 text-sm"
                                  value={state.umbral_alerta}
                                  onChange={(e) =>
                                    updateEditState(l, { umbral_alerta: e.target.value })
                                  }
                                  disabled={state.saving}
                                  placeholder={placeholderUmbral}
                                  aria-label={`Umbral de alerta ${l.nombre ?? l.id_item}`}
                                />
                              </TableCell>
                              <TableCell>
                                {state.saved ? (
                                  <Badge variant="ok" className="text-xs">
                                    Guardado
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant={isDirty ? 'default' : 'ghost'}
                                    className="h-7 px-2"
                                    onClick={() => saveLinea(l)}
                                    disabled={state.saving || !isDirty}
                                    aria-label={`Guardar cambios de ${l.nombre ?? l.id_item}`}
                                  >
                                    {state.saving ? (
                                      '…'
                                    ) : (
                                      <Save className="size-3.5" aria-hidden="true" />
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function StockScreen({
  vista,
}: {
  vista?: 'historial' | 'plantillas' | 'alertas' | 'gestion'
}) {
  const rol = useAuthStore((s) => s.rol)
  const histQ = useStockHistorial()
  const planQ = usePlantillas()
  const alertQ = useAlertas()

  const canGestion = rol === 'responsable_logistica' || rol === 'gerencia'

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Stock</h2>
          {alertQ.data && alertQ.data.length > 0 && (
            <Badge variant="destructive">{alertQ.data.length} alertas</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            histQ.refetch()
            planQ.refetch()
            alertQ.refetch()
          }}
          aria-label="Recargar stock"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Historial */}
      {(vista ?? 'historial') === 'historial' && (
        <div className="mt-0">
          {histQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Location</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Ítem</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Stock real</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Mín / Máx</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Actualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(histQ.data ?? []).map((r, i) => (
                      <TableRow key={`${r.location_id}-${r.id_item}-${i}`}>
                        <TableCell className="text-xs">{r.location_id}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{r.nombre ?? `#${r.id_item}`}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.stock_min != null && r.stock_real < r.stock_min
                                ? 'destructive'
                                : 'ok'
                            }
                          >
                            {r.stock_real}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.stock_min ?? '—'} / {r.stock_max ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">{fmtDateTime(r.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Plantillas */}
      {(vista ?? 'historial') === 'plantillas' && (
        <div className="mt-0">
          {planQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(planQ.data ?? []).map((p) => (
                      <TableRow key={p.id_plantilla}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="info">{p.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.activa ? 'ok' : 'secondary'}>
                            {p.activa ? 'Activa' : 'Inactiva'}
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

      {/* Alertas */}
      {(vista ?? 'historial') === 'alertas' && (
        <div className="mt-0">
          {alertQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (alertQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay alertas de stock activas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(alertQ.data ?? []).map((a, i) => (
                <Card key={`${a.location_id}-${a.id_item}-${i}`} className="border-destructive/50">
                  <CardContent className="flex items-center gap-3 py-3">
                    <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <div className="flex-1">
                      <span className="font-medium">{a.nombre ?? `Ítem #${a.id_item}`}</span>
                      <div className="text-xs text-muted-foreground">{a.location_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-destructive">
                        {a.stock_real} / {a.stock_min} mín
                      </div>
                      <div className="text-xs text-destructive">Faltan {a.diferencia} uds</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gestión de plantillas (A4.5) */}
      {canGestion && (vista ?? 'historial') === 'gestion' && (
        <div className="mt-0">
          {planQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <GestionTab plantillas={planQ.data ?? []} />
          )}
        </div>
      )}
    </div>
  )
}
