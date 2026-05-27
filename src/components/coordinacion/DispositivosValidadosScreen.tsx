/**
 * DispositivosValidadosScreen — leafId: coord_dispositivos
 *
 * galletas_terminales schema: id_galleta, id_nombre, id_terminal,
 * tipo, expires_at, revocado_at, ultima_activacion_at, created_at.
 * No fingerprint_hash, nombre_dispositivo, activo — revocado_at distingue activo/revocado.
 */
import { ShieldCheck, RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useState } from 'react'
import type { Database } from '@/types/supabase'

type GalletaRow = Database['public']['Tables']['galletas_terminales']['Row']

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function useTerminales() {
  return useQuery({
    queryKey: ['galletas_terminales'],
    queryFn: async (): Promise<GalletaRow[]> => {
      const { data, error } = await supabase
        .from('galletas_terminales')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as GalletaRow[]
    },
  })
}

export function DispositivosValidadosScreen() {
  const qc = useQueryClient()
  const query = useTerminales()
  const [revocandoId, setRevocandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activos = (query.data ?? []).filter((t) => !t.revocado_at).length

  async function handleRevocar(idGalleta: string) {
    setRevocandoId(idGalleta)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_revocar_terminal', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_galleta:    idGalleta,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['galletas_terminales'] })
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setRevocandoId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Dispositivos validados</h2>
          {query.data && (
            <Badge variant="secondary">{activos} activos</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isLoading} aria-label="Recargar dispositivos">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay dispositivos registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Empleado</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Terminal ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Creada</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Última activación</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  <TableHead className="sr-only">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data ?? []).map((t) => {
                  const activo = !t.revocado_at
                  return (
                    <TableRow key={t.id_galleta}>
                      <TableCell className="font-medium">{t.id_nombre}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {t.id_terminal.slice(0, 12)}…
                      </TableCell>
                      <TableCell className="text-xs">{t.tipo}</TableCell>
                      <TableCell className="text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell className="text-xs">{fmtDateTime(t.ultima_activacion_at)}</TableCell>
                      <TableCell>
                        <Badge variant={activo ? 'ok' : 'secondary'}>
                          {activo ? 'Activa' : 'Revocada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activo && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={revocandoId === t.id_galleta}
                            onClick={() => handleRevocar(t.id_galleta)}
                            aria-label={`Revocar galleta de ${t.id_nombre}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            {revocandoId === t.id_galleta ? 'Revocando…' : 'Revocar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
