import { useState } from 'react'
import { ToggleLeft, RefreshCw, WifiOff, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrp, type DrpRecord } from '@/hooks/useDrp'
import { useGlobalStore } from '@/stores/useGlobalStore'

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

const ACCIONES: Record<
  string,
  {
    accion: 'preparar' | 'iniciar' | 'finalizar' | 'archivar'
    label: string
    variant: 'default' | 'outline' | 'destructive' | 'secondary'
  }[]
> = {
  En_espera: [{ accion: 'preparar', label: 'Preparar DRP', variant: 'default' }],
  En_preparacion: [{ accion: 'iniciar', label: 'Activar DRP', variant: 'default' }],
  En_curso: [{ accion: 'finalizar', label: 'Finalizar DRP', variant: 'outline' }],
  Finalizado: [{ accion: 'archivar', label: 'Archivar DRP', variant: 'secondary' }],
  Finalizado_Retenido: [{ accion: 'archivar', label: 'Archivar DRP', variant: 'secondary' }],
  Cancelado: [],
  Archivado: [],
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface DrpEstadoCardProps {
  drp: DrpRecord
  onTransicion: (
    idDrp: string,
    accion: 'preparar' | 'iniciar' | 'finalizar' | 'archivar'
  ) => Promise<void>
  onCancelar: (idDrp: string) => Promise<void>
  isActing: boolean
}

function DrpEstadoCard({ drp, onTransicion, onCancelar, isActing }: DrpEstadoCardProps) {
  const cfg = ESTADO_CONFIG[drp.estado] ?? { label: drp.estado, variant: 'info' as const }
  const acciones = ACCIONES[drp.estado] ?? []
  const puedeCancelar = drp.estado === 'En_preparacion' || drp.estado === 'En_curso'

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-body text-sm font-medium">
              #{drp.id_drp.slice(0, 8).toUpperCase()}
            </span>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Coord: {drp.id_coordinacion}</span>
              <span>Preparación: {fmtDateTime(drp.timestamp_preparacion)}</span>
              {drp.timestamp_inicio && <span>Inicio: {fmtDateTime(drp.timestamp_inicio)}</span>}
              {drp.timestamp_fin && <span>Fin: {fmtDateTime(drp.timestamp_fin)}</span>}
            </div>
          </div>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>

        {(acciones.length > 0 || puedeCancelar) && (
          <div className="flex flex-wrap gap-2">
            {acciones.map((a) => (
              <Button
                key={a.accion}
                size="sm"
                variant={a.variant}
                disabled={isActing}
                onClick={() => onTransicion(drp.id_drp, a.accion)}
              >
                {a.label}
              </Button>
            ))}
            {puedeCancelar && (
              <Button
                size="sm"
                variant="destructive"
                disabled={isActing}
                onClick={() => onCancelar(drp.id_drp)}
                aria-label={`Cancelar DRP ${drp.id_drp.slice(0, 8)}`}
              >
                <XCircle className="size-4" aria-hidden="true" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EstadosDrpScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const { drps, loading, error, cargarDrps, transicionarDrp, cancelarDrp } = useDrp()
  const [actingId, setActingId] = useState<string | null>(null)

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          Los estados DRP requieren conexión en tiempo real.
        </p>
      </div>
    )
  }

  async function handleTransicion(
    idDrp: string,
    accion: 'preparar' | 'iniciar' | 'finalizar' | 'archivar'
  ) {
    setActingId(idDrp)
    await transicionarDrp(idDrp, accion)
    setActingId(null)
  }

  async function handleCancelar(idDrp: string) {
    setActingId(idDrp)
    await cancelarDrp(idDrp)
    setActingId(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ToggleLeft aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Estados DRP</h2>
          <Badge variant="secondary">{drps.length}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={cargarDrps}
          disabled={loading}
          aria-label="Recargar"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div role="status" aria-label="Cargando DRPs" className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : drps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay DRPs activos. Usa «Crear DRP» para iniciar uno.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {drps.map((d) => (
            <DrpEstadoCard
              key={d.id_drp}
              drp={d}
              onTransicion={handleTransicion}
              onCancelar={handleCancelar}
              isActing={actingId === d.id_drp}
            />
          ))}
        </div>
      )}
    </div>
  )
}
