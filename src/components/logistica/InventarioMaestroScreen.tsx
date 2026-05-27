import { useState } from 'react'
import { Boxes, RefreshCw, Warehouse, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface LocationRow {
  location_id: string
  nombre: string
  tipo: string
  activa: boolean
}

interface AuditoriaRow {
  id_auditoria: string
  location_id: string
  id_nombre_responsable: string
  timestamp_inicio: string
  timestamp_fin: string | null
  estado: string
}

interface InventarioDinamico {
  id_subinventario: string
  nombre: string
  location_id: string
  tipo_plantilla: string
  activo: boolean
}

function useLocationsData() {
  return useQuery({
    queryKey: ['locations_todas'],
    queryFn: async (): Promise<LocationRow[]> => {
      // locations.activa not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('locations')
        .select('location_id, nombre, tipo, activa')
        .order('tipo').order('nombre')
      if (error) throw error
      return (data ?? []) as LocationRow[]
    },
  })
}

function useAuditorias() {
  return useQuery({
    queryKey: ['auditorias_inventario'],
    queryFn: async (): Promise<AuditoriaRow[]> => {
      // auditorias_inventario not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('auditorias_inventario')
        .select('id_auditoria, location_id, id_nombre_responsable, timestamp_inicio, timestamp_fin, estado')
        .order('timestamp_inicio', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as AuditoriaRow[]
    },
  })
}

function useInventariosDinamicos() {
  return useQuery({
    queryKey: ['subinventarios'],
    queryFn: async (): Promise<InventarioDinamico[]> => {
      // subinventarios not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('subinventarios')
        .select('id_subinventario, nombre, location_id, tipo_plantilla, activo')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as InventarioDinamico[]
    },
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const TIPO_VARIANT: Record<string, 'ok' | 'info' | 'warn' | 'secondary'> = {
  almacen:  'info',
  vehiculo: 'ok',
  mochila:  'warn',
  externo:  'secondary',
}

export function InventarioMaestroScreen({ vista }: { vista?: 'locations' | 'auditorias' | 'dinamicos' }) {
  const [tab, setTab] = useState<string>(vista ?? 'locations')
  const locationsQ = useLocationsData()
  const auditoriasQ = useAuditorias()
  const dinamicosQ = useInventariosDinamicos()

  function reload() {
    locationsQ.refetch()
    auditoriasQ.refetch()
    dinamicosQ.refetch()
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="locations">
            <Warehouse className="size-3.5 mr-1" aria-hidden="true" />
            Almacenes
          </TabsTrigger>
          <TabsTrigger value="auditorias">
            <ClipboardCheck className="size-3.5 mr-1" aria-hidden="true" />
            Auditorías
          </TabsTrigger>
          <TabsTrigger value="dinamicos">
            <Boxes className="size-3.5 mr-1" aria-hidden="true" />
            Dinámicos
          </TabsTrigger>
        </TabsList>

        {/* Locations */}
        <TabsContent value="locations" className="mt-3">
          {locationsQ.isLoading ? (
            <div className="space-y-2"><Skeleton className="h-40 w-full" /></div>
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
                    {(locationsQ.data ?? []).map((l) => (
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Auditorías */}
        <TabsContent value="auditorias" className="mt-3">
          {auditoriasQ.isLoading ? (
            <div className="space-y-2"><Skeleton className="h-40 w-full" /></div>
          ) : (auditoriasQ.data?.length ?? 0) === 0 ? (
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
                    {(auditoriasQ.data ?? []).map((a) => (
                      <TableRow key={a.id_auditoria}>
                        <TableCell className="font-medium">{a.location_id}</TableCell>
                        <TableCell className="text-sm">{a.id_nombre_responsable}</TableCell>
                        <TableCell className="text-xs">{fmtDateTime(a.timestamp_inicio)}</TableCell>
                        <TableCell>
                          <Badge variant={a.estado === 'Cerrada' ? 'ok' : 'warn'}>{a.estado}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Inventarios dinámicos */}
        <TabsContent value="dinamicos" className="mt-3">
          {dinamicosQ.isLoading ? (
            <div className="space-y-2"><Skeleton className="h-40 w-full" /></div>
          ) : (dinamicosQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay subinventarios dinámicos configurados.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Location</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Plantilla</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Activo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dinamicosQ.data ?? []).map((d) => (
                      <TableRow key={d.id_subinventario}>
                        <TableCell className="font-medium">{d.nombre}</TableCell>
                        <TableCell className="text-sm">{d.location_id}</TableCell>
                        <TableCell className="text-xs">{d.tipo_plantilla}</TableCell>
                        <TableCell>
                          <Badge variant={d.activo ? 'ok' : 'secondary'}>
                            {d.activo ? 'Sí' : 'No'}
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
      </Tabs>
    </div>
  )
}
