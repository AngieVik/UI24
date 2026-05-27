import { Activity, ArrowRightLeft, RefreshCw, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

interface MovimientoRow {
  id_movimiento: string
  tipo_movimiento: string
  location_origen: string
  location_destino: string
  id_item: number
  cantidad: number
  id_nombre_responsable: string
  timestamp_movimiento: string
  nombre_item?: string
}

interface TransitoRow {
  id_envio: string
  location_origen: string
  location_destino: string
  estado: string
  timestamp_salida: string
  timestamp_llegada: string | null
  id_nombre_responsable: string
}

function useMovimientos() {
  return useQuery({
    queryKey: ['ultimos_movimientos'],
    queryFn: async (): Promise<MovimientoRow[]> => {
      // movimientos_inventario not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('movimientos_inventario')
        .select('id_movimiento, tipo_movimiento, location_origen, location_destino, id_item, cantidad, id_nombre_responsable, timestamp_movimiento, catalogo_items(nombre)')
        .order('timestamp_movimiento', { ascending: false })
        .limit(50)
      if (error) throw error
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id_movimiento:       r['id_movimiento'] as string,
        tipo_movimiento:     r['tipo_movimiento'] as string,
        location_origen:     r['location_origen'] as string,
        location_destino:    r['location_destino'] as string,
        id_item:             r['id_item'] as number,
        cantidad:            r['cantidad'] as number,
        id_nombre_responsable: r['id_nombre_responsable'] as string,
        timestamp_movimiento: r['timestamp_movimiento'] as string,
        nombre_item: ((r['catalogo_items'] as Record<string, unknown> | null)?.['nombre'] as string) ?? undefined,
      }))
    },
  })
}

function useTransito() {
  return useQuery({
    queryKey: ['inventario_transito'],
    queryFn: async (): Promise<TransitoRow[]> => {
      // envios_material not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('envios_material')
        .select('id_envio, location_origen, location_destino, estado, timestamp_salida, timestamp_llegada, id_nombre_responsable')
        .not('estado', 'eq', 'Recibido')
        .order('timestamp_salida', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as TransitoRow[]
    },
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TIPO_VARIANT: Record<string, 'ok' | 'info' | 'warn' | 'secondary' | 'destructive'> = {
  entrada:     'ok',
  salida:      'warn',
  ajuste:      'info',
  transferencia: 'secondary',
  deduccion:   'destructive',
}

const ESTADO_TRANSITO_VARIANT: Record<string, 'ok' | 'warn' | 'secondary'> = {
  En_Transito: 'warn',
  Entregado:   'ok',
  Recibido:    'secondary',
}

export function MovimientosScreen({ vista }: { vista?: 'ultimos' | 'transito' }) {
  const [tab, setTab] = useState<string>(vista ?? 'ultimos')
  const movQ = useMovimientos()
  const transQ = useTransito()

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Movimientos</h2>
          {transQ.data && transQ.data.length > 0 && (
            <Badge variant="warn">{transQ.data.length} en tránsito</Badge>
          )}
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => { movQ.refetch(); transQ.refetch() }}
          aria-label="Recargar movimientos"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="ultimos">
            <Activity className="size-3.5 mr-1" />Últimos
          </TabsTrigger>
          <TabsTrigger value="transito">
            <Truck className="size-3.5 mr-1" />
            En tránsito
            {(transQ.data?.length ?? 0) > 0 && (
              <Badge variant="warn" className="ml-1 text-xs">{transQ.data!.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ultimos" className="mt-3">
          {movQ.isLoading ? <Skeleton className="h-40 w-full" /> : (movQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay movimientos registrados.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Ítem</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Cant.</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Origen → Destino</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movQ.data ?? []).map((m) => (
                      <TableRow key={m.id_movimiento}>
                        <TableCell>
                          <Badge variant={TIPO_VARIANT[m.tipo_movimiento] ?? 'info'} className="text-xs">
                            {m.tipo_movimiento}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{m.nombre_item ?? `#${m.id_item}`}</TableCell>
                        <TableCell className="text-sm">{m.cantidad}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.location_origen} → {m.location_destino}
                        </TableCell>
                        <TableCell className="text-xs">{fmtDateTime(m.timestamp_movimiento)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transito" className="mt-3">
          {transQ.isLoading ? <Skeleton className="h-40 w-full" /> : (transQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay envíos en tránsito.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Origen → Destino</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Salida</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Llegada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transQ.data ?? []).map((t) => (
                      <TableRow key={t.id_envio}>
                        <TableCell className="text-sm">
                          {t.location_origen} → {t.location_destino}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ESTADO_TRANSITO_VARIANT[t.estado] ?? 'info'} className="text-xs">
                            {t.estado.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{fmtDateTime(t.timestamp_salida)}</TableCell>
                        <TableCell className="text-xs">{fmtDateTime(t.timestamp_llegada)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
