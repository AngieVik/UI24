/**
 * DescuadresScreen — leafId: log_descuadres
 *
 * descuadres_inventario schema (actual):
 *   id_descuadre, id_item, location_origen, location_destino,
 *   cantidad_diferencia, estado, entidad_imputable_id, entidad_imputable_tipo,
 *   id_doc10, id_nombre_resolutor, mutation_uuid,
 *   timestamp_generacion, timestamp_resolucion
 * No `notas` column, no `created_at` — use timestamp_generacion.
 */
import { useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface DescuadreRow {
  id_descuadre: string
  id_item: number
  location_origen: string
  location_destino: string
  cantidad_diferencia: number
  estado: string
  timestamp_generacion: string
}

function useDescuadres() {
  return useQuery({
    queryKey: ['descuadres_inventario'],
    queryFn: async (): Promise<DescuadreRow[]> => {
      const { data, error } = await supabase
        .from('descuadres_inventario')
        .select(
          'id_descuadre, id_item, location_origen, location_destino, cantidad_diferencia, estado, timestamp_generacion'
        )
        .order('timestamp_generacion', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as DescuadreRow[]
    },
  })
}

const ESTADO_VARIANT: Record<string, 'warn' | 'ok' | 'secondary' | 'destructive'> = {
  Pendiente_Revision: 'warn',
  Resuelto: 'ok',
  Archivado: 'secondary',
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface GestionPanelProps {
  desc: DescuadreRow
  onClose: () => void
}

function GestionPanel({ desc, onClose }: GestionPanelProps) {
  const qc = useQueryClient()
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resolver(resolucion: 'Resuelto' | 'Archivado') {
    setSubmitting(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_resolver_descuadre', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_descuadre: desc.id_descuadre,
        p_resolucion: resolucion,
        ...(notas.trim() ? { p_notas: notas.trim() } : {}),
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['descuadres_inventario'] })
      onClose()
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2 pt-2">
      <Field>
        <FieldLabel htmlFor={`nota-${desc.id_descuadre}`}>
          Notas <span className="font-light text-muted-foreground">— opcional</span>
        </FieldLabel>
        <Textarea
          id={`nota-${desc.id_descuadre}`}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Justificación del ajuste manual…"
          disabled={submitting}
          className="resize-none"
        />
      </Field>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting} onClick={() => resolver('Resuelto')}>
          Resolver
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={submitting}
          onClick={() => resolver('Archivado')}
        >
          Archivar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function DescuadresScreen() {
  const query = useDescuadres()
  const [gestionando, setGestionando] = useState<string | null>(null)

  const pendientes = (query.data ?? []).filter((d) => d.estado === 'Pendiente_Revision').length

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Descuadres y ajuste manual</h2>
          {pendientes > 0 && <Badge variant="warn">{pendientes} pendientes</Badge>}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isLoading}
          aria-label="Recargar descuadres"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {(query.error as Error)?.message}
        </p>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay descuadres registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).map((d) => (
            <Card key={d.id_descuadre}>
              <CardContent className="space-y-1 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-body text-sm font-medium">
                      Ítem #{d.id_item} —{' '}
                      <span
                        className={
                          d.cantidad_diferencia < 0 ? 'text-destructive' : 'text-green-600'
                        }
                      >
                        {d.cantidad_diferencia > 0
                          ? `+${d.cantidad_diferencia}`
                          : d.cantidad_diferencia}{' '}
                        uds
                      </span>
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {d.location_origen} → {d.location_destino} ·{' '}
                      {fmtDateTime(d.timestamp_generacion)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ESTADO_VARIANT[d.estado] ?? 'secondary'}>
                      {d.estado.replace('_', ' ')}
                    </Badge>
                    {d.estado === 'Pendiente_Revision' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setGestionando(gestionando === d.id_descuadre ? null : d.id_descuadre)
                        }
                        aria-label={`Gestionar descuadre ítem ${d.id_item}`}
                      >
                        {gestionando === d.id_descuadre ? 'Cerrar' : 'Gestionar'}
                      </Button>
                    )}
                  </div>
                </div>
                {gestionando === d.id_descuadre && (
                  <GestionPanel desc={d} onClose={() => setGestionando(null)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
