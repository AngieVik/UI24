import { ChartBar, Car, RefreshCw, Users, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDrp } from '@/hooks/useDrp'
import { useGlobalStore } from '@/stores/useGlobalStore'

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function duracion(inicio: string | null, fin: string | null): string {
  if (!inicio) return '—'
  const end = fin ? new Date(fin) : new Date()
  const ms = end.getTime() - new Date(inicio).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}min`
}

const ESTADO_VARIANT: Record<string, 'ok' | 'warn' | 'destructive' | 'secondary' | 'info'> = {
  En_espera:           'secondary',
  En_preparacion:      'warn',
  En_curso:            'ok',
  Cancelado:           'destructive',
  Finalizado:          'secondary',
  Finalizado_Retenido: 'warn',
  Archivado:           'secondary',
}

export function ResumenDrpScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const {
    drps, drpActivo, dotaciones, personal, descuadresPendientes,
    loading, error, cargarDrps, cargarDetalle,
  } = useDrp()

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">El resumen DRP requiere conexión en tiempo real.</p>
      </div>
    )
  }

  const activos = drps.filter((d) => d.estado === 'En_curso')
  const enPrep  = drps.filter((d) => d.estado === 'En_preparacion' || d.estado === 'En_espera')
  const finales = drps.filter((d) => d.estado === 'Finalizado' || d.estado === 'Finalizado_Retenido' || d.estado === 'Cancelado')

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChartBar aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Resumen DRP</h2>
        </div>
        <Button size="sm" variant="outline" onClick={cargarDrps} disabled={loading} aria-label="Recargar resumen">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {/* Métricas globales */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Activos',      value: activos.length,  variant: 'ok' as const },
            { label: 'En preparación', value: enPrep.length, variant: 'warn' as const },
            { label: 'Finalizados',  value: finales.length,  variant: 'secondary' as const },
            { label: 'Descuadres',   value: descuadresPendientes.length, variant: descuadresPendientes.length > 0 ? 'warn' as const : 'secondary' as const },
          ].map((m) => (
            <Card key={m.label}>
              <CardContent className="flex flex-col items-center gap-1 py-4">
                <span className="font-display text-2xl font-bold">{m.value}</span>
                <Badge variant={m.variant} className="text-xs">{m.label}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla de DRPs */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : drps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay DRPs registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Todos los DRPs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Coordinación</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Inicio</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Duración</TableHead>
                  <TableHead className="sr-only">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drps.map((d) => (
                  <TableRow
                    key={d.id_drp}
                    className={drpActivo?.id_drp === d.id_drp ? 'bg-muted/30' : ''}
                  >
                    <TableCell className="font-mono text-xs font-bold">
                      #{d.id_drp.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANT[d.estado] ?? 'info'}>
                        {d.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{d.id_coordinacion}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(d.timestamp_inicio)}</TableCell>
                    <TableCell className="text-xs">
                      {duracion(d.timestamp_inicio, d.timestamp_fin)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cargarDetalle(d.id_drp)}
                        aria-label={`Ver detalle DRP ${d.id_drp.slice(0, 8)}`}
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

      {/* Detalle del DRP seleccionado */}
      {drpActivo && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Dotación */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-sm">
                <Car aria-hidden="true" className="size-4" />
                Dotación vehicular
                <Badge variant="secondary">{dotaciones.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dotaciones.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin dotación asignada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dotaciones.map((d) => (
                    <Badge key={d.matricula} variant="outline">{d.matricula}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Personal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-sm">
                <Users aria-hidden="true" className="size-4" />
                Personal a pie
                <Badge variant="secondary">{personal.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personal.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin personal asignado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {personal.map((p) => (
                    <Badge key={p.id_nombre} variant="secondary">
                      {p.id_nombre}{p.zona_asignada ? ` — ${p.zona_asignada}` : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
