// (useEffect removed — not used in this component)
import { Eye, MapPin, RefreshCw, Users, Car, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useDrp, type DrpRecord } from '@/hooks/useDrp'
import { useVisorGps } from '@/hooks/useVisorGps'

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ESTADO_CONFIG: Record<
  string,
  { label: string; variant: 'ok' | 'warn' | 'destructive' | 'info' | 'secondary' }
> = {
  En_espera: { label: 'En espera', variant: 'secondary' },
  En_preparacion: { label: 'Preparación', variant: 'warn' },
  En_curso: { label: 'Activo', variant: 'ok' },
  Cancelado: { label: 'Cancelado', variant: 'destructive' },
  Finalizado: { label: 'Finalizado', variant: 'secondary' },
  Finalizado_Retenido: { label: 'Retenido', variant: 'warn' },
  Archivado: { label: 'Archivado', variant: 'secondary' },
}

function DrpCard({ drp, onDetalle }: { drp: DrpRecord; onDetalle: (id: string) => void }) {
  const cfg = ESTADO_CONFIG[drp.estado] ?? { label: drp.estado, variant: 'info' as const }
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`DRP ${drp.id_drp.slice(0, 8)} — ${cfg.label}`}
      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onDetalle(drp.id_drp)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onDetalle(drp.id_drp)
      }}
    >
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-sm font-medium">
            #{drp.id_drp.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">
            Coordinado por: {drp.id_coordinacion}
          </span>
          <span className="text-xs text-muted-foreground">
            Preparación: {fmtDateTime(drp.timestamp_preparacion)}
          </span>
        </div>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </CardContent>
    </Card>
  )
}

export function VisorDrpScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const { drps, drpActivo, dotaciones, personal, loading, error, cargarDrps, cargarDetalle } =
    useDrp()
  const { vehiculos: gpsVisor } = useVisorGps()

  const drpActivoActual =
    drps.find((d) => d.estado === 'En_curso' || d.estado === 'En_preparacion') ?? null

  function handleDetalle(idDrp: string) {
    cargarDetalle(idDrp)
  }

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          El Visor DRP requiere conexión en tiempo real.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Visor DRP</h2>
          <Badge variant="secondary">{drps.length}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={cargarDrps}
          disabled={loading}
          aria-label="Recargar lista DRP"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* GPS visor — unidades activas */}
      {gpsVisor.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <MapPin aria-hidden="true" className="size-4" />
              Unidades en campo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Matrícula</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gpsVisor.map((v) => (
                  <TableRow key={v.matricula}>
                    <TableCell className="font-bold">{v.matricula}</TableCell>
                    <TableCell>
                      <Badge variant={v.estado_operativo === 'en_drp' ? 'warn' : 'ok'}>
                        {v.estado_operativo}
                      </Badge>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <MapPin aria-hidden="true" className="size-4" />
              Detalle DRP #{drpActivo.id_drp.slice(0, 8).toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Inicio</p>
                <p className="text-sm font-medium">{fmtDateTime(drpActivo.timestamp_inicio)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Coordinación</p>
                <p className="text-sm font-medium">{drpActivo.id_coordinacion}</p>
              </div>
            </div>

            {/* Dotación vehicular */}
            {dotaciones.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Car aria-hidden="true" className="size-3.5" />
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Dotación vehicular ({dotaciones.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dotaciones.map((d) => (
                    <Badge key={d.matricula} variant="outline">
                      {d.matricula}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Personal a pie */}
            {personal.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Users aria-hidden="true" className="size-3.5" />
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Personal a pie ({personal.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {personal.map((p) => (
                    <Badge key={p.id_nombre} variant="secondary">
                      {p.id_nombre}
                      {p.zona_asignada ? ` — ${p.zona_asignada}` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de DRPs */}
      {loading ? (
        <div role="status" aria-label="Cargando DRPs" className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : drps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay DRPs activos en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {drps.map((d) => (
            <DrpCard key={d.id_drp} drp={d} onDetalle={handleDetalle} />
          ))}
        </div>
      )}

      {drpActivoActual && !drpActivo && (
        <p className="text-xs text-muted-foreground">
          Pulsa un DRP para ver su detalle (dotación, personal, descuadres).
        </p>
      )}
    </div>
  )
}
