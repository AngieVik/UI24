import { UserCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useVehiculoActivo } from '@/hooks/useVehiculoActivo'
import { useDrpActivo } from '@/hooks/useDrpActivo'
import { formatRol, getInitials } from '@/lib/formatRol'

type EstadoTurno = 'En DRP' | 'En servicio' | 'En base'

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function estadoVariant(estado: EstadoTurno): 'default' | 'secondary' | 'outline' {
  if (estado === 'En DRP') return 'default'
  if (estado === 'En servicio') return 'secondary'
  return 'outline'
}

export function PanelPersonal() {
  const { data, isLoading, isError } = usePersonalEnTurno()
  // Contexto para derivar el estado de cada persona — TanStack Query
  // dedupe estos hooks con los de los otros paneles del home.
  const vehiculo = useVehiculoActivo()
  const drp = useDrpActivo()

  const deriveEstado = (): EstadoTurno => {
    if (drp.data) return 'En DRP'
    if (vehiculo.data) return 'En servicio'
    return 'En base'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle>Personal en turno</CardTitle>
        <Badge variant="secondary" className="gap-1">
          <UserCheck aria-hidden="true" className="size-3" />
          {isLoading ? '…' : `${data.length} con check-in`}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && (
          <div className="space-y-2 p-3" role="status" aria-label="Cargando personal en turno">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        )}

        {!isLoading && isError && (
          <p className="px-4 py-6 text-sm text-destructive">
            No se pudo cargar el personal en turno. Reintentando…
          </p>
        )}

        {!isLoading && !isError && data.length === 0 && (
          <p className="px-4 py-6 text-sm font-light text-muted-foreground">
            Nadie ha hecho check-in en este terminal todavía.
          </p>
        )}

        {!isLoading && !isError && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Función</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-right">Check-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => {
                const estado = deriveEstado()
                return (
                  <TableRow key={p.id_nombre}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px] font-bold">
                            {getInitials(p.nombre_real)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{p.nombre_real}</span>
                          <span className="text-xs font-light text-muted-foreground">
                            {p.id_nombre}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoVariant(estado)}>{estado}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRol(p.rol)}</Badge>
                    </TableCell>
                    <TableCell className="font-light text-muted-foreground">
                      {p.telefono ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-light text-muted-foreground">
                      {formatHora(p.checkin_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
