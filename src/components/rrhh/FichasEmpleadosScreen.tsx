import { useState } from 'react'
import { RefreshCw, Search, UserCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Rol } from '@/lib/auth-roles'

interface FichaEmpleado {
  id_nombre:        string
  nombre_real:  string | null
  rol:              Rol
  telefono:         string | null
  email:            string | null
  activo:           boolean
  fecha_alta:       string | null
}

function useFichas() {
  return useQuery({
    queryKey: ['fichas_empleados_rrhh'],
    queryFn: async (): Promise<FichaEmpleado[]> => {
      // fichas_empleados.email not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('fichas_empleados')
        .select('id_nombre, nombre_real, rol, telefono, email, activo, fecha_alta')
        .order('activo', { ascending: false })
        .order('id_nombre')
      if (error) throw error
      return (data ?? []) as FichaEmpleado[]
    },
  })
}

const ROL_VARIANT: Partial<Record<Rol, 'ok' | 'warn' | 'destructive' | 'info' | 'secondary'>> = {
  gerencia: 'destructive', coordinacion: 'warn', responsable_flota: 'warn',
  responsable_logistica: 'warn', tes: 'ok', due: 'ok', medico: 'ok',
  flota: 'info', logistica: 'info', rrhh: 'info', personal_externo: 'secondary', invitado: 'secondary',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function FichasEmpleadosScreen() {
  const query = useFichas()
  const [search, setSearch] = useState('')
  const [detalleId, setDetalleId] = useState<string | null>(null)

  const empleados = (query.data ?? []).filter((e) => {
    const q = search.toLowerCase()
    return e.id_nombre.toLowerCase().includes(q) ||
      (e.nombre_real ?? '').toLowerCase().includes(q) ||
      e.rol.toLowerCase().includes(q)
  })

  const detalle = detalleId ? (query.data ?? []).find((e) => e.id_nombre === detalleId) : null

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCircle aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Fichas de empleados</h2>
          {query.data && (
            <Badge variant="secondary">{query.data.filter((e) => e.activo).length} activos</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isLoading} aria-label="Recargar fichas">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Buscar por nombre, identificador o rol…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar empleados"
        />
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : empleados.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? 'Sin resultados.' : 'No hay empleados registrados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Identificador</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Rol</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  <TableHead className="sr-only">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map((e) => (
                  <TableRow key={e.id_nombre}>
                    <TableCell className="font-medium">{e.id_nombre}</TableCell>
                    <TableCell className="text-sm">{e.nombre_real ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ROL_VARIANT[e.rol] ?? 'info'} className="text-xs">{e.rol}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.activo ? 'ok' : 'secondary'} className="text-xs">
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setDetalleId(detalleId === e.id_nombre ? null : e.id_nombre)}
                        aria-label={`Ver ficha de ${e.id_nombre}`}
                      >
                        {detalleId === e.id_nombre ? 'Cerrar' : 'Ficha'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {detalle && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <UserCircle aria-hidden="true" className="size-4" />
              {detalle.nombre_real ?? detalle.id_nombre}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Identificador</p>
              <p className="text-sm font-medium">{detalle.id_nombre}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Rol</p>
              <Badge variant={ROL_VARIANT[detalle.rol] ?? 'info'}>{detalle.rol}</Badge>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Teléfono</p>
              <p className="text-sm">{detalle.telefono ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Email</p>
              <p className="text-sm">{detalle.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Alta</p>
              <p className="text-sm">{fmtDate(detalle.fecha_alta)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
