import { ArrowRightLeft, CheckCircle2, RefreshCw } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useAuthStore } from '@/stores/useAuthStore'
import { useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────

interface MovimientoRow {
  id_movimiento: string
  tipo_movimiento: string
  location_origen: string
  location_destino: string
  id_item: number
  cantidad: number
  id_nombre_responsable: string
  timestamp_movimiento: string
  nombre_item?: string
}

interface TransitoRow {
  id_envio: string
  location_origen: string
  location_destino: string
  estado: string
  timestamp_salida: string
  timestamp_llegada: string | null
  id_nombre_responsable: string
}

// ── Queries ──────────────────────────────────────────────────────────

function useMovimientos() {
  return useQuery({
    queryKey: ['ultimos_movimientos'],
    queryFn: async (): Promise<MovimientoRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('movimientos_inventario')
        .select(
          'id_movimiento, tipo_movimiento, location_origen, location_destino, id_item, cantidad, id_nombre_responsable, timestamp_movimiento, catalogo_items(nombre)'
        )
        .order('timestamp_movimiento', { ascending: false })
        .limit(50)
      if (error) throw error
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id_movimiento: r['id_movimiento'] as string,
        tipo_movimiento: r['tipo_movimiento'] as string,
        location_origen: r['location_origen'] as string,
        location_destino: r['location_destino'] as string,
        id_item: r['id_item'] as number,
        cantidad: r['cantidad'] as number,
        id_nombre_responsable: r['id_nombre_responsable'] as string,
        timestamp_movimiento: r['timestamp_movimiento'] as string,
        nombre_item:
          ((r['catalogo_items'] as Record<string, unknown> | null)?.['nombre'] as string) ??
          undefined,
      }))
    },
  })
}

function useTransito() {
  return useQuery({
    queryKey: ['inventario_transito'],
    queryFn: async (): Promise<TransitoRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('envios_material')
        .select(
          'id_envio, location_origen, location_destino, estado, timestamp_salida, timestamp_llegada, id_nombre_responsable'
        )
        .not('estado', 'eq', 'Recibido')
        .order('timestamp_salida', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as TransitoRow[]
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TIPO_VARIANT: Record<string, 'ok' | 'info' | 'warn' | 'secondary' | 'destructive'> = {
  entrada: 'ok',
  salida: 'warn',
  ajuste: 'info',
  transferencia: 'secondary',
  deduccion: 'destructive',
}

const ESTADO_TRANSITO_VARIANT: Record<string, 'ok' | 'warn' | 'secondary'> = {
  En_Transito: 'warn',
  Entregado: 'ok',
  Recibido: 'secondary',
}

// ── ConfirmarEnvioButton ─────────────────────────────────────────────

function ConfirmarEnvioButton({ envio }: { envio: TransitoRow }) {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setSaving(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_confirmar_envio', {
        p_id_envio: envio.id_envio,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['inventario_transito'] })
    } catch (e) {
      setError(resolveRpcError(e))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={saving} className="h-7">
            <CheckCircle2 className="size-3.5 mr-1" aria-hidden="true" />
            {saving ? 'Confirmando…' : 'Confirmar recepción'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar recepción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará el envío de «{envio.location_origen}» → «{envio.location_destino}» como
              recibido. Esta acción actualiza el stock del destino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function MovimientosScreen({ vista }: { vista?: 'ultimos' | 'transito' }) {
  const rol = useAuthStore((s) => s.rol)
  const movQ = useMovimientos()
  const transQ = useTransito()

  const canConfirm =
    rol === 'logistica' ||
    rol === 'responsable_logistica' ||
    rol === 'gerencia' ||
    rol === 'coordinacion'

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Movimientos</h2>
          {transQ.data && transQ.data.length > 0 && (
            <Badge variant="warn">{transQ.data.length} en tránsito</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            movQ.refetch()
            transQ.refetch()
          }}
          aria-label="Recargar movimientos"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {vista === 'transito' ? (
        <div className="mt-0">
          {transQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (transQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay envíos en tránsito.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(transQ.data ?? []).map((t) => (
                <Card key={t.id_envio}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        {t.location_origen} → {t.location_destino}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ESTADO_TRANSITO_VARIANT[t.estado] ?? 'info'}
                          className="text-xs"
                        >
                          {t.estado.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Salida: {fmtDateTime(t.timestamp_salida)}
                        </span>
                        {t.timestamp_llegada && (
                          <span className="text-xs text-muted-foreground">
                            Llegada: {fmtDateTime(t.timestamp_llegada)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Responsable: {t.id_nombre_responsable}
                      </div>
                    </div>

                    {canConfirm && t.estado === 'En_Transito' && (
                      <ConfirmarEnvioButton envio={t} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-0">
          {movQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (movQ.data?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay movimientos registrados.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Ítem</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Cant.</TableHead>
                      <TableHead className="text-xs font-bold uppercase">
                        Origen → Destino
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movQ.data ?? []).map((m) => (
                      <TableRow key={m.id_movimiento}>
                        <TableCell>
                          <Badge
                            variant={TIPO_VARIANT[m.tipo_movimiento] ?? 'info'}
                            className="text-xs"
                          >
                            {m.tipo_movimiento}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {m.nombre_item ?? `#${m.id_item}`}
                        </TableCell>
                        <TableCell className="text-sm">{m.cantidad}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.location_origen} → {m.location_destino}
                        </TableCell>
                        <TableCell className="text-xs">
                          {fmtDateTime(m.timestamp_movimiento)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
