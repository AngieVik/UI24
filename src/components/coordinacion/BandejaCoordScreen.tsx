import { Inbox, Check, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBandeja } from '@/hooks/useBandeja'
import type { Database } from '@/types/supabase'

type MensajeRow = Database['public']['Tables']['mensajes_bandeja']['Row']

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function MensajeCard({ m, onMarcar }: { m: MensajeRow; onMarcar: (id: string) => void }) {
  const leido   = m.estado !== 'no_leido'
  const urgente = m.contenido.toLowerCase().includes('urgente')
  return (
    <Card className={leido ? 'opacity-60' : ''}>
      <CardContent className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {!leido   && <Badge variant="warn" className="text-xs">Nuevo</Badge>}
            {urgente  && <Badge variant="destructive" className="text-xs">Urgente</Badge>}
          </div>
          <p className="font-body text-sm text-muted-foreground line-clamp-2">{m.contenido}</p>
          <div className="text-xs text-muted-foreground">{fmtDateTime(m.created_at)}</div>
        </div>
        <Button
          size="sm"
          variant={leido ? 'ghost' : 'outline'}
          disabled={leido}
          onClick={() => onMarcar(m.id_mensaje)}
          aria-label={leido ? 'Mensaje leído' : 'Marcar como leído'}
        >
          <Check className="size-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}

export function BandejaCoordScreen() {
  const { mensajes, noLeidos, loading, error, cargarMensajes, marcarLeido } = useBandeja()

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Bandeja coordinación</h2>
          {noLeidos > 0 && <Badge variant="warn">{noLeidos} sin leer</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={cargarMensajes} disabled={loading} aria-label="Recargar bandeja">
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
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-body text-sm text-muted-foreground">No hay mensajes en la bandeja de coordinación.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {mensajes.filter((m) => m.estado === 'no_leido').map((m) => (
            <MensajeCard key={m.id_mensaje} m={m} onMarcar={marcarLeido} />
          ))}
          {mensajes.filter((m) => m.estado !== 'no_leido').map((m) => (
            <MensajeCard key={m.id_mensaje} m={m} onMarcar={marcarLeido} />
          ))}
        </div>
      )}
    </div>
  )
}
