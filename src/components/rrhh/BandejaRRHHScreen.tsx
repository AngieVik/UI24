import { Check, Inbox, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBandeja } from '@/hooks/useBandeja'
import type { Database } from '@/types/supabase'

type MensajeRow = Database['public']['Tables']['mensajes_bandeja']['Row']

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function MensajeCard({ m, onMarcar }: { m: MensajeRow; onMarcar: (id: string) => void }) {
  const leido = m.estado !== 'no_leido'
  return (
    <Card
      role="listitem"
      className={m.estado === 'no_leido' ? 'border-primary/40 bg-primary/5' : ''}
    >
      <CardContent className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          {!leido && <Badge variant="warn" className="mb-1 text-xs">Nuevo</Badge>}
          <p className="text-sm text-muted-foreground line-clamp-2">{m.contenido}</p>
          <p className="text-xs text-muted-foreground">{fmtDateTime(m.created_at)}</p>
        </div>
        {!leido && (
          <Button
            size="sm" variant="ghost"
            onClick={() => onMarcar(m.id_mensaje)}
            aria-label="Marcar como leído"
          >
            <Check className="size-4" aria-hidden="true" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function BandejaRRHHScreen() {
  const { mensajes, noLeidos, loading, error, cargarMensajes, marcarLeido } = useBandeja()

  const sorted = [...mensajes].sort((a, b) => {
    if (a.estado === 'no_leido' && b.estado !== 'no_leido') return -1
    if (a.estado !== 'no_leido' && b.estado === 'no_leido') return  1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Bandeja RRHH</h2>
          {noLeidos > 0 && <Badge variant="warn">{noLeidos} sin leer</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={cargarMensajes} disabled={loading} aria-label="Recargar bandeja">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay mensajes en la bandeja.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" role="list" aria-label="Mensajes de la bandeja RRHH">
          {sorted.map((m) => (
            <MensajeCard key={m.id_mensaje} m={m} onMarcar={marcarLeido} />
          ))}
        </div>
      )}
    </div>
  )
}
