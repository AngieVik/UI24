/**
 * BuzonInternoScreen — Doc-13
 * Buzón interno. mensajes_bandeja solo tiene `contenido` (no asunto/cuerpo/origen).
 */
import { Check, MessageSquareWarning, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBandeja } from '@/hooks/useBandeja'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function BuzonInternoScreen() {
  const { mensajes, noLeidos, loading, error, cargarMensajes, marcarLeido } = useBandeja()

  const noLeidos_ = mensajes.filter((m) => m.estado === 'no_leido')
  const leidos_   = mensajes.filter((m) => m.estado !== 'no_leido')

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquareWarning aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Buzón interno</h2>
          {noLeidos > 0 && <Badge variant="warn">{noLeidos} sin leer</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={cargarMensajes} disabled={loading} aria-label="Recargar buzón">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : mensajes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">El buzón está vacío.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" role="main" aria-label="Buzón interno">

          {noLeidos_.length > 0 && (
            <section aria-label="Mensajes sin leer">
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                Sin leer ({noLeidos_.length})
              </p>
              <div className="space-y-2">
                {noLeidos_.map((m) => (
                  <Card key={m.id_mensaje} className="border-primary/40 bg-primary/5">
                    <CardContent className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <Badge variant="warn" className="mb-1 text-xs">Nuevo</Badge>
                        <p className="text-sm text-muted-foreground">{m.contenido}</p>
                        <p className="text-xs text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => marcarLeido(m.id_mensaje)}
                        aria-label="Marcar como leído"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {leidos_.length > 0 && (
            <section aria-label="Mensajes leídos">
              {noLeidos_.length > 0 && (
                <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                  Leídos ({leidos_.length})
                </p>
              )}
              <div className="space-y-2">
                {leidos_.map((m) => (
                  <Card key={m.id_mensaje} className="opacity-80">
                    <CardContent className="py-3 space-y-0.5">
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.contenido}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
