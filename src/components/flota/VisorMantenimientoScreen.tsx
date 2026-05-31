import { useState } from 'react'
import { Eye, Filter, Gauge, RefreshCw, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'

const CONDICION_VARIANT: Record<string, 'ok' | 'warn' | 'destructive' | 'secondary'> = {
  operativo: 'ok',
  revision_pendiente: 'warn',
  averia_leve: 'warn',
  averia_grave: 'destructive',
  fuera_de_servicio: 'destructive',
  en_taller: 'secondary',
}

const ESTADO_VARIANT: Record<string, 'ok' | 'warn' | 'destructive' | 'secondary'> = {
  disponible: 'ok',
  en_servicio: 'ok',
  en_drp: 'warn',
  inoperativo: 'destructive',
  en_mantenimiento: 'secondary',
}

export function VisorMantenimientoScreen({
  vista,
}: {
  vista?: 'tabla' | 'badges' | 'filtros' | 'detalle'
}) {
  const [tab, setTab] = useState<string>(vista ?? 'tabla')
  const { data: vehiculos, isLoading, error } = useFlotaCompleta()
  const [search, setSearch] = useState('')
  const [detalleId, setDetalleId] = useState<string | null>(null)

  const filtrados = vehiculos.filter(
    (v) =>
      v.matricula.toLowerCase().includes(search.toLowerCase()) ||
      v.tipo.toLowerCase().includes(search.toLowerCase())
  )

  const criticos = vehiculos.filter(
    (v) => v.condicion_tecnica === 'fuera_de_servicio' || v.condicion_tecnica === 'averia_grave'
  )

  const revisar = vehiculos.filter(
    (v) => v.condicion_tecnica === 'revision_pendiente' || v.condicion_tecnica === 'averia_leve'
  )

  const detalleVehiculo = detalleId ? vehiculos.find((v) => v.matricula === detalleId) : null

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Visor mantenimiento</h2>
          {criticos.length > 0 && <Badge variant="destructive">{criticos.length} críticos</Badge>}
          {revisar.length > 0 && <Badge variant="warn">{revisar.length} a revisar</Badge>}
        </div>
        <Button size="sm" variant="outline" aria-label="Recargar visor">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}

      <Tabs
        value={tab}
        onValueChange={(t) => {
          setTab(t)
          if (t !== 'detalle') setDetalleId(null)
        }}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="tabla">
            <Gauge className="size-3.5 mr-1" />
            Tabla
          </TabsTrigger>
          <TabsTrigger value="badges">
            <Tag className="size-3.5 mr-1" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="filtros">
            <Filter className="size-3.5 mr-1" />
            Filtros
          </TabsTrigger>
          <TabsTrigger value="detalle">
            <Eye className="size-3.5 mr-1" />
            Detalle
          </TabsTrigger>
        </TabsList>

        {/* Tabla principal */}
        <TabsContent value="tabla" className="mt-3">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Matrícula</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Condición</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                      <TableHead className="sr-only">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiculos.map((v) => (
                      <TableRow key={v.matricula}>
                        <TableCell className="font-bold">{v.matricula}</TableCell>
                        <TableCell className="text-sm">{v.tipo}</TableCell>
                        <TableCell>
                          <Badge
                            variant={CONDICION_VARIANT[v.condicion_tecnica] ?? 'info'}
                            className="text-xs"
                          >
                            {v.condicion_tecnica.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={ESTADO_VARIANT[v.estado_operativo] ?? 'info'}
                            className="text-xs"
                          >
                            {v.subestado_operativo ?? v.estado_operativo.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDetalleId(v.matricula)
                              setTab('detalle')
                            }}
                            aria-label={`Ver detalle ${v.matricula}`}
                          >
                            Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Badges de estado */}
        <TabsContent value="badges" className="mt-3">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {criticos.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-destructive">
                      Críticos — fuera de servicio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {criticos.map((v) => (
                      <Badge key={v.matricula} variant="destructive">
                        {v.matricula}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
              {revisar.length > 0 && (
                <Card className="border-yellow-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-yellow-700 dark:text-yellow-400">
                      Revisión pendiente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {revisar.map((v) => (
                      <Badge key={v.matricula} variant="warn">
                        {v.matricula}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Operativos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {vehiculos
                    .filter((v) => v.condicion_tecnica === 'operativo')
                    .map((v) => (
                      <Badge key={v.matricula} variant="ok">
                        {v.matricula}
                      </Badge>
                    ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Filtros */}
        <TabsContent value="filtros" className="mt-3">
          <div className="space-y-3">
            <Input
              type="search"
              placeholder="Filtrar por matrícula o tipo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filtrar vehículos"
            />
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : filtrados.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Sin resultados.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtrados.map((v) => (
                  <Card
                    key={v.matricula}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => {
                      setDetalleId(v.matricula)
                      setTab('detalle')
                    }}
                  >
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-bold">{v.matricula}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{v.tipo}</span>
                      </div>
                      <Badge
                        variant={CONDICION_VARIANT[v.condicion_tecnica] ?? 'info'}
                        className="text-xs"
                      >
                        {v.condicion_tecnica.replace(/_/g, ' ')}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Detalle */}
        <TabsContent value="detalle" className="mt-3">
          {!detalleVehiculo ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Selecciona un vehículo desde la tabla o la vista de filtros.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg">{detalleVehiculo.matricula}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Tipo</p>
                    <p className="text-sm font-medium">{detalleVehiculo.tipo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">
                      Condición técnica
                    </p>
                    <Badge variant={CONDICION_VARIANT[detalleVehiculo.condicion_tecnica] ?? 'info'}>
                      {detalleVehiculo.condicion_tecnica.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">
                      Estado operativo
                    </p>
                    <Badge variant={ESTADO_VARIANT[detalleVehiculo.estado_operativo] ?? 'info'}>
                      {detalleVehiculo.subestado_operativo ??
                        detalleVehiculo.estado_operativo.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
