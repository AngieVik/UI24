/**
 * BandejaModal — modal flotante para bandejas de mensajes.
 * mensajes_bandeja solo tiene `contenido` (no asunto/cuerpo separados).
 */
import { Check, Inbox, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useBandeja } from '@/hooks/useBandeja'

export type BandejaCanal = 'logistica' | 'flota' | 'coordinacion' | 'rrhh' | 'general'

const CANAL_LABEL: Record<BandejaCanal, string> = {
  logistica: 'Bandeja logística',
  flota: 'Bandeja flota',
  coordinacion: 'Bandeja coordinación',
  rrhh: 'Bandeja RRHH',
  general: 'Bandeja',
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface BandejaModalProps {
  open: boolean
  onClose: () => void
  canal?: BandejaCanal
}

export function BandejaModal({ open, onClose, canal = 'general' }: BandejaModalProps) {
  const { mensajes, noLeidos, loading, error, cargarMensajes, marcarLeido } = useBandeja()

  const sorted = [...mensajes].sort((a, b) => {
    if (a.estado === 'no_leido' && b.estado !== 'no_leido') return -1
    if (a.estado !== 'no_leido' && b.estado === 'no_leido') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="flex max-h-[80dvh] w-full max-w-md flex-col gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Inbox aria-hidden="true" className="size-4 text-muted-foreground" />
            <DialogTitle className="font-display text-base">{CANAL_LABEL[canal]}</DialogTitle>
            {noLeidos > 0 && (
              <Badge variant="warn" className="text-xs">
                {noLeidos} sin leer
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={cargarMensajes}
            disabled={loading}
            aria-label="Recargar"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3">
          {error && (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay mensajes en la bandeja.
            </p>
          ) : (
            <div className="space-y-2" role="list">
              {sorted.map((m) => (
                <Card
                  key={m.id_mensaje}
                  role="listitem"
                  className={m.estado === 'no_leido' ? 'border-primary/40 bg-primary/5' : ''}
                >
                  <CardContent className="flex items-start justify-between gap-2 py-2.5">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {m.estado === 'no_leido' && (
                        <Badge variant="warn" className="mb-1 text-xs">
                          Nuevo
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.contenido}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                    </div>
                    {m.estado === 'no_leido' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => marcarLeido(m.id_mensaje)}
                        aria-label="Marcar como leído"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
