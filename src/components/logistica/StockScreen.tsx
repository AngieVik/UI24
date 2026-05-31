import { useState } from 'react'
import { Bell, Clock, RefreshCw, Settings2, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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
  num_items?: number
}

interface AlertaRow {
  location_id: string
  id_item: number
  stock_real: number
  stock_min: number
  diferencia: number
  nombre?: string
}

function useStockHistorial() {
  return useQuery({
    queryKey: ['stock_historial'],
    queryFn: async (): Promise<StockRow[]> => {
      // inventario_stock_actual is a view not yet in generated types → cast
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
      // plantillas_stock not yet in generated types → cast
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
      // inventario_stock_actual not yet in generated types → cast; filter client-side
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

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StockScreen({
  vista,
}: {
  vista?: 'historial' | 'plantillas' | 'alertas' | 'gestion'
}) {
  const [tab, setTab] = useState<string>(vista ?? 'historial')
  const histQ = useStockHistorial()
  const planQ = usePlantillas()
  const alertQ = useAlertas()

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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="historial">
            <Clock className="size-3.5 mr-1" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="plantillas">
            <Tag className="size-3.5 mr-1" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="alertas">
            <Bell className="size-3.5 mr-1" />
            Alertas
            {(alertQ.data?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {alertQ.data!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gestion">
            <Settings2 className="size-3.5 mr-1" />
            Gestión
          </TabsTrigger>
        </TabsList>

        {/* Historial */}
        <TabsContent value="historial" className="mt-3">
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
        </TabsContent>

        {/* Plantillas */}
        <TabsContent value="plantillas" className="mt-3">
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
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alertas" className="mt-3">
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
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <span className="font-medium">{a.nombre ?? `Ítem #${a.id_item}`}</span>
                      <div className="text-xs text-muted-foreground">{a.location_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-destructive">
                        {a.stock_real} / {a.stock_min} min
                      </div>
                      <div className="text-xs text-destructive">Faltan {a.diferencia} uds</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Gestión de plantillas */}
        <TabsContent value="gestion" className="mt-3">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                La gestión de plantillas de stock está disponible para responsables de logística.
                Contacta con tu responsable de almacén para crear o modificar plantillas.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
