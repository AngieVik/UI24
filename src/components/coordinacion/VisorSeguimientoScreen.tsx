import { Map, RefreshCw, Users, Car } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface PersonalActivo {
  id_nombre:  string
  id_terminal: string
  checkin_at: string
}

function usePersonalActivo() {
  return useQuery({
    queryKey: ['personal_activo_global'],
    refetchInterval: 30_000,
    queryFn: async (): Promise<PersonalActivo[]> => {
      const { data, error } = await supabase
        .from('presencias_activas_terminal')
        .select('id_nombre, id_terminal, checkin_at')
        .order('checkin_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PersonalActivo[]
    },
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const ESTADO_VARIANT: Record<string, 'ok' | 'warn' | 'destructive' | 'secondary'> = {
  disponible:    'ok',
  en_servicio:   'ok',
  en_drp:        'warn',
  inoperativo:   'destructive',
  en_mantenimiento: 'secondary',
}

export function VisorSeguimientoScreen() {
  const personalQ = usePersonalActivo()
  const { data: vehiculos, isLoading: flotaLoading } = useFlotaCompleta()

  const activos = vehiculos.filter((v) => v.estado_operativo !== 'inoperativo')

  function reload() { personalQ.refetch() }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Map aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Visor seguimiento operativo</h2>
        </div>
        <Button size="sm" variant="outline" onClick={reload} aria-label="Actualizar visor">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Personal activo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Users aria-hidden="true" className="size-4" />
              Personal activo
              <Badge variant="secondary">{personalQ.data?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {personalQ.isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (personalQ.data?.length ?? 0) === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Sin personal activo.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase">Trabajador</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(personalQ.data ?? []).map((p) => (
                    <TableRow key={`${p.id_nombre}-${p.id_terminal}`}>
                      <TableCell className="font-medium">{p.id_nombre}</TableCell>
                      <TableCell className="text-xs">{fmtTime(p.checkin_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Flota activa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Car aria-hidden="true" className="size-4" />
              Flota operativa
              <Badge variant="secondary">{activos.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {flotaLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : activos.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Sin vehículos activos.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase">Matrícula</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activos.map((v) => (
                    <TableRow key={v.matricula}>
                      <TableCell className="font-bold">{v.matricula}</TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_VARIANT[v.estado_operativo] ?? 'info'} className="text-xs">
                          {v.subestado_operativo ?? v.estado_operativo.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Actualización automática cada 30 segundos. Datos en tiempo real.
      </p>
    </div>
  )
}
