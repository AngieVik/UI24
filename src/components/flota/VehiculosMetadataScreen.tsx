import { useState } from 'react'
import { FileBadge, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'

interface VehiculoDoc {
  matricula: string
  itv_fecha_vencimiento: string | null
  its_fecha_vencimiento: string | null
  seguro_fecha_vencimiento: string | null
  id_terminal_asociado: string | null
  pin_sim: string | null
  puk_sim: string | null
}

interface KmRow {
  matricula: string
  km_actual: number
  updated_at: string
}

interface EventoFisico {
  id_evento: string
  matricula: string
  tipo: string
  descripcion: string
  timestamp_evento: string
  id_nombre_responsable: string
}

function useVehiculosDocs() {
  return useQuery({
    queryKey: ['vehiculos_docs'],
    queryFn: async (): Promise<VehiculoDoc[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehiculos')
        .select(
          'matricula, itv_fecha_vencimiento, its_fecha_vencimiento, seguro_fecha_vencimiento, id_terminal_asociado, pin_sim, puk_sim'
        )
        .order('matricula')
      if (error) throw error
      return (data ?? []) as VehiculoDoc[]
    },
  })
}

function useVehiculosKm() {
  return useQuery({
    queryKey: ['vehiculos_km'],
    queryFn: async (): Promise<KmRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehiculos_km_actual')
        .select('matricula, km_actual, updated_at')
        .order('matricula')
      if (error) throw error
      return (data ?? []) as KmRow[]
    },
  })
}

function useEventosFisicos(matricula: string | null) {
  return useQuery({
    queryKey: ['eventos_fisicos', matricula],
    enabled: !!matricula,
    queryFn: async (): Promise<EventoFisico[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('eventos_fisicos_vehiculo')
        .select('id_evento, matricula, tipo, descripcion, timestamp_evento, id_nombre_responsable')
        .eq('matricula', matricula!)
        .order('timestamp_evento', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as EventoFisico[]
    },
  })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function docVencimientoVariant(fecha: string | null): 'ok' | 'warn' | 'destructive' | 'secondary' {
  if (!fecha) return 'secondary'
  const dias = (new Date(fecha).getTime() - Date.now()) / 86_400_000
  if (dias < 0) return 'destructive'
  if (dias < 30) return 'warn'
  return 'ok'
}

export function VehiculosMetadataScreen({ vista }: { vista?: 'unified' | 'docs' | 'km' | 'eventos' }) {
  const [selMatricula, setSelMatricula] = useState<string | null>(null)
  const { data: vehiculos } = useFlotaCompleta()
  const docsQ = useVehiculosDocs()
  const kmQ = useVehiculosKm()
  const evQ = useEventosFisicos(selMatricula)

  // Unificar vista docs y km en la vista unificada (también mantiene compatibilidad con vistas antiguas)
  const showUnified = !vista || vista === 'unified' || vista === 'docs' || vista === 'km'

  // Mapa de km por matrícula para join rápido
  const kmMap = new Map<string, KmRow>()
  for (const r of kmQ.data ?? []) {
    kmMap.set(r.matricula, r)
  }

  const isLoading = docsQ.isLoading || kmQ.isLoading

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileBadge aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Vehículos — metadata</h2>
        </div>
        {showUnified && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              docsQ.refetch()
              kmQ.refetch()
            }}
            aria-label="Recargar metadata"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        )}
        {vista === 'eventos' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => evQ.refetch()}
            disabled={!selMatricula}
            aria-label="Recargar eventos"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Vista unificada docs + km */}
      {showUnified && (
        isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase">Matrícula</TableHead>
                      <TableHead className="text-xs font-bold uppercase">ITV</TableHead>
                      <TableHead className="text-xs font-bold uppercase">ITS</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Seguro</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Terminal</TableHead>
                      <TableHead className="text-xs font-bold uppercase">PIN</TableHead>
                      <TableHead className="text-xs font-bold uppercase">PUK</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Km actual</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Actualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(docsQ.data ?? []).map((v) => {
                      const km = kmMap.get(v.matricula)
                      return (
                        <TableRow key={v.matricula}>
                          <TableCell className="font-bold">{v.matricula}</TableCell>
                          <TableCell>
                            <Badge
                              variant={docVencimientoVariant(v.itv_fecha_vencimiento)}
                              className="text-xs"
                            >
                              {fmtDate(v.itv_fecha_vencimiento)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={docVencimientoVariant(v.its_fecha_vencimiento)}
                              className="text-xs"
                            >
                              {fmtDate(v.its_fecha_vencimiento)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={docVencimientoVariant(v.seguro_fecha_vencimiento)}
                              className="text-xs"
                            >
                              {fmtDate(v.seguro_fecha_vencimiento)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {v.id_terminal_asociado ?? '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {v.pin_sim ?? '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {v.puk_sim ?? '—'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {km ? km.km_actual.toLocaleString('es-ES') : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {km ? fmtDate(km.updated_at) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Eventos físicos */}
      {vista === 'eventos' && (
        <div className="mt-0">
          <div className="space-y-3">
            <Select value={selMatricula ?? ''} onValueChange={(v) => setSelMatricula(v || null)}>
              <SelectTrigger aria-label="Seleccionar vehículo">
                <SelectValue placeholder="Seleccionar vehículo…" />
              </SelectTrigger>
              <SelectContent>
                {vehiculos.map((v) => (
                  <SelectItem key={v.matricula} value={v.matricula}>
                    {v.vehiculo_id ? `${v.vehiculo_id} (${v.matricula})` : v.matricula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selMatricula &&
              (evQ.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (evQ.data?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay eventos para {selMatricula}.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold uppercase">Tipo</TableHead>
                          <TableHead className="text-xs font-bold uppercase">Descripción</TableHead>
                          <TableHead className="text-xs font-bold uppercase">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(evQ.data ?? []).map((e) => (
                          <TableRow key={e.id_evento}>
                            <TableCell>
                              <Badge variant="info" className="text-xs">
                                {e.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{e.descripcion}</TableCell>
                            <TableCell className="text-xs">{fmtDate(e.timestamp_evento)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
