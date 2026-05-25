import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useVehiculoActivo } from '@/hooks/useVehiculoActivo'

const CONDICION_LABEL: Record<string, string> = {
  operativo:           'Operativo',
  averiado:            'Averiado',
  averiado_leve:       'Avería leve',
  averiado_grave:      'Avería grave',
  taller:              'En taller',
}

const ESTADO_LABEL: Record<string, string> = {
  inactivo:       'Inactivo',
  activo:         'Activo',
  en_ruta:        'En ruta',
  en_base:        'En base',
  fuera_servicio: 'Fuera de servicio',
}

const SERVICIO_LABEL: Record<string, string> = {
  urgente:    'Urgente',
  programado: 'Programado',
  evento:     'Evento',
  traslado:   'Traslado',
}

function fmt(label: string | null | undefined): string {
  return label && label.length > 0 ? label : '—'
}

function condicionToBadgeVariant(cond: string): 'outline' | 'destructive' | 'secondary' {
  if (cond.startsWith('averiado')) return 'destructive'
  if (cond === 'operativo') return 'secondary'
  return 'outline'
}

interface CellProps {
  label: string
  value: string
}

function Cell({ label, value }: CellProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-light uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-bold">{fmt(value)}</span>
    </div>
  )
}

export function PanelVehiculo() {
  const { data, isLoading, isError } = useVehiculoActivo()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle>Vehículo del terminal</CardTitle>
        {data
          ? <Badge variant={condicionToBadgeVariant(data.condicion_tecnica)}>
              {CONDICION_LABEL[data.condicion_tecnica] ?? data.condicion_tecnica}
            </Badge>
          : <Badge variant="outline">{isLoading ? '…' : 'Sin asignar'}</Badge>
        }
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Cargando vehículo activo">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        )}

        {!isLoading && isError && (
          <p className="text-sm text-destructive">
            No se pudo cargar el vehículo activo. Reintentando…
          </p>
        )}

        {!isLoading && !isError && !data && (
          <p className="text-sm font-light text-muted-foreground">
            El terminal no tiene vehículo asignado.
          </p>
        )}

        {!isLoading && !isError && data && (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold leading-none">{data.matricula}</span>
              <span className="text-sm font-light text-muted-foreground">{data.tipo}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Cell label="Pilot"    value={fmt(data.pilot)} />
              <Cell label="Carry"    value={fmt(data.carry)} />
              <Cell label="Servicio" value={data.tipo_servicio ? (SERVICIO_LABEL[data.tipo_servicio] ?? data.tipo_servicio) : '—'} />
              <Cell label="Estado"   value={ESTADO_LABEL[data.estado_operativo] ?? data.estado_operativo} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
