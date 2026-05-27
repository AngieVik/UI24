import { useState } from 'react'
import { AlertTriangle, Bell, BellRing, Check, Eye, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useAvisos, type AvisoItem } from '@/hooks/useAvisos'
import { useAuthStore } from '@/stores/useAuthStore'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const NIVEL_CONFIG: Record<AvisoItem['nivel'], { label: string; variant: 'destructive' | 'warn' | 'info' }> = {
  critico:     { label: 'Crítico',     variant: 'destructive' },
  aviso:       { label: 'Aviso',       variant: 'warn' },
  informativo: { label: 'Informativo', variant: 'info' },
}

interface AvisoRowProps {
  aviso:        AvisoItem
  ejecutorId:   string | null
  onMarcarLeido: (id: string) => void
}

function AvisoRow({ aviso, ejecutorId, onMarcarLeido }: AvisoRowProps) {
  const yaLeido     = ejecutorId ? aviso.leido_por.includes(ejecutorId) : false
  const cfg         = NIVEL_CONFIG[aviso.nivel] ?? NIVEL_CONFIG.informativo

  return (
    <Card
      aria-label={`Aviso: ${aviso.tipo_aviso}`}
      className={yaLeido ? 'opacity-60' : ''}
    >
      <CardContent className="flex items-start justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            <span className="font-body text-sm font-medium">{aviso.tipo_aviso}</span>
            <span className="text-xs text-muted-foreground">
              {fmtDateTime(aviso.timestamp_publicacion)}
            </span>
          </div>
          <p className="font-body text-sm text-muted-foreground">{aviso.texto}</p>
          <p className="text-xs text-muted-foreground">
            Emitido por: <span className="font-medium text-foreground">{aviso.id_nombre_emisor}</span>
          </p>
        </div>
        <Button
          size="sm"
          variant={yaLeido ? 'ghost' : 'outline'}
          onClick={() => onMarcarLeido(aviso.id_aviso)}
          disabled={yaLeido}
          aria-label={yaLeido ? 'Aviso ya leído' : `Marcar aviso como leído`}
        >
          {yaLeido
            ? <Check className="size-4 text-muted-foreground" aria-hidden="true" />
            : <Eye className="size-4" aria-hidden="true" />}
        </Button>
      </CardContent>
    </Card>
  )
}

export function Doc11AvisoUrgenteScreen() {
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const ejecutorId   = useAuthStore((s) => s.ejecutorId)
  const { avisos, loading, error, cargarAvisos, marcarLeido } = useAvisos()
  const [markingId, setMarkingId] = useState<string | null>(null)

  // Gate: sin turno activo
  if (!idActivacion) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">
          Doc-11 — Avisos urgentes
        </h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay turno activo. Inicia un turno desde Operativa → Vehículos.
        </p>
      </div>
    )
  }

  const noCriticos    = avisos.filter((a) => a.nivel === 'critico').length
  const noLeidos      = avisos.filter((a) => ejecutorId && !a.leido_por.includes(ejecutorId)).length

  async function handleMarcarLeido(idAviso: string) {
    setMarkingId(idAviso)
    await marcarLeido(idAviso)
    setMarkingId(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold leading-tight">
            Doc-11 — Avisos urgentes
          </h2>
          {noLeidos > 0 && (
            <Badge variant="destructive" aria-label={`${noLeidos} avisos sin leer`}>
              {noLeidos} sin leer
            </Badge>
          )}
          {noCriticos > 0 && (
            <Badge variant="warn" aria-label={`${noCriticos} avisos críticos`}>
              {noCriticos} críticos
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={cargarAvisos}
          disabled={loading}
          aria-label="Recargar avisos"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      {/* Lista */}
      {loading ? (
        <div role="status" aria-label="Cargando avisos" className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-3/4" />
        </div>
      ) : avisos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BellRing className="size-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-body text-sm text-muted-foreground">
              No hay avisos urgentes en este momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Críticos primero */}
          {avisos.filter((a) => a.nivel === 'critico').map((a) => (
            <AvisoRow
              key={a.id_aviso}
              aviso={a}
              ejecutorId={ejecutorId}
              onMarcarLeido={handleMarcarLeido}
            />
          ))}
          {/* Resto */}
          {avisos.filter((a) => a.nivel !== 'critico').map((a) => (
            <AvisoRow
              key={a.id_aviso}
              aviso={a}
              ejecutorId={ejecutorId}
              onMarcarLeido={handleMarcarLeido}
            />
          ))}
        </>
      )}

      {markingId && (
        <p role="status" aria-live="polite" className="sr-only">
          Marcando aviso como leído…
        </p>
      )}
    </div>
  )
}
