import { useState } from 'react'
import { LogOut, RefreshCw, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface Presencia {
  id_nombre: string
  id_terminal: string
  checkin_at: string
}

function usePresencias() {
  return useQuery({
    queryKey: ['presencias_forzar'],
    queryFn: async (): Promise<Presencia[]> => {
      const { data, error } = await supabase
        .from('presencias_activas_terminal')
        .select('id_nombre, id_terminal, checkin_at')
        .order('checkin_at')
      if (error) throw error
      return (data ?? []) as Presencia[]
    },
  })
}

function duracion(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}min`
}

export function ForzarCheckoutScreen() {
  const qc = useQueryClient()
  const query = usePresencias()
  const [forzandoId, setForzandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleForzar(idNombre: string, idTerminal: string) {
    if (
      !confirm(
        `¿Seguro que quieres forzar el checkout de ${idNombre}? Se cerrará su turno inmediatamente.`
      )
    )
      return
    setForzandoId(idNombre)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_forzar_checkout', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_nombre_target: idNombre,
        p_id_terminal: idTerminal,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['presencias_forzar'] })
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setForzandoId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogOut aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Forzar checkout</h2>
          {query.data && <Badge variant="secondary">{query.data.length} presencias</Badge>}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isLoading}
          aria-label="Recargar presencias"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex gap-2 py-3">
          <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
          <p className="font-body text-sm text-destructive">
            Forzar checkout cierra el turno del trabajador inmediatamente. Usar solo en caso de
            emergencia o cuando el trabajador no pueda hacer checkout por sí mismo.
          </p>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay trabajadores activos en este momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).map((p) => (
            <Card key={`${p.id_nombre}-${p.id_terminal}`}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <span className="font-medium">{p.id_nombre}</span>
                  <div className="text-xs text-muted-foreground">
                    Terminal: {p.id_terminal.slice(0, 8)} · Tiempo: {duracion(p.checkin_at)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={forzandoId === p.id_nombre}
                  onClick={() => handleForzar(p.id_nombre, p.id_terminal)}
                  aria-label={`Forzar checkout de ${p.id_nombre}`}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {forzandoId === p.id_nombre ? 'Procesando…' : 'Forzar checkout'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
