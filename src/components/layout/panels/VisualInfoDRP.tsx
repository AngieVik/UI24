import { Ambulance, CirclePlus, DoorOpen, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrpActivo, type DrpActivo, type DrpEntradaVia } from '@/hooks/useDrpActivo'

const ESTADO_LABEL: Record<DrpActivo['estado'], string> = {
  En_espera:      'En espera',
  En_preparacion: 'En preparación',
  En_curso:       'En curso',
}

const VIA_LABEL: Record<DrpEntradaVia, string> = {
  vehiculo:        'Por vehículo',
  personal_a_pie:  'A pie',
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day:   '2-digit',
      month: '2-digit',
      hour:  '2-digit',
      minute:'2-digit',
    })
  } catch {
    return '—'
  }
}

function estadoBadgeVariant(estado: DrpActivo['estado']): 'default' | 'secondary' | 'outline' {
  if (estado === 'En_curso') return 'default'
  if (estado === 'En_preparacion') return 'secondary'
  return 'outline'
}

export function VisualInfoDRP() {
  const { data, isLoading, isError } = useDrpActivo()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4" />
          {data ? `DRP ${data.id_drp.slice(0, 8)}` : 'DRP activo'}
        </CardTitle>
        <div className="flex items-center gap-1">
          {data && (
            <Badge variant={estadoBadgeVariant(data.estado)}>
              {ESTADO_LABEL[data.estado]}
            </Badge>
          )}
          <Button size="icon" variant="ghost" aria-label="Añadir asistencia Doc-1" disabled={!data}>
            <CirclePlus className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Entrar a filiación" disabled={!data}>
            <DoorOpen className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Toggle DRP activo"
            disabled={!data}
            className={data?.estado === 'En_curso' ? 'text-u24-yellow' : ''}
          >
            <Ambulance className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="space-y-2" role="status" aria-label="Cargando DRP activo">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}

        {!isLoading && isError && (
          <p className="text-sm text-destructive">
            No se pudo cargar el DRP activo. Reintentando…
          </p>
        )}

        {!isLoading && !isError && !data && (
          <p className="text-sm font-light text-muted-foreground">
            No hay ningún DRP activo asignado al terminal.
          </p>
        )}

        {!isLoading && !isError && data && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-light text-muted-foreground">
            <span>Coord.: <span className="font-medium text-foreground">{data.id_coordinacion}</span></span>
            <span>Inicio: <span className="font-medium text-foreground">{formatFecha(data.timestamp_inicio)}</span></span>
            <span>Preparación: <span className="font-medium text-foreground">{formatFecha(data.timestamp_preparacion)}</span></span>
            <Badge variant="outline" className="ml-auto">{VIA_LABEL[data.via]}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
