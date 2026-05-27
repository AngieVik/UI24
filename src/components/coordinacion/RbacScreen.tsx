import { useState } from 'react'
import { RefreshCw, Save, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import type { Rol } from '@/lib/auth-roles'

const ROLES: Rol[] = [
  'tes', 'due', 'medico',
  'flota', 'responsable_flota',
  'coordinacion',
  'logistica', 'responsable_logistica',
  'personal_externo',
  'gerencia', 'rrhh',
  'invitado',
]

interface FichaEmpleado {
  id_nombre: string
  rol: Rol
  nombre_real: string | null
  activo: boolean
}

function useFichas() {
  return useQuery({
    queryKey: ['fichas_empleados_rbac'],
    queryFn: async (): Promise<FichaEmpleado[]> => {
      const { data, error } = await supabase
        .from('fichas_empleados')
        .select('id_nombre, rol, nombre_real, activo')
        .eq('activo', true)
        .order('id_nombre')
      if (error) throw error
      return (data ?? []) as FichaEmpleado[]
    },
  })
}

const ROL_VARIANT: Partial<Record<Rol, 'ok' | 'warn' | 'destructive' | 'info' | 'secondary'>> = {
  gerencia:             'destructive',
  coordinacion:         'warn',
  responsable_flota:    'warn',
  responsable_logistica:'warn',
  tes:                  'ok',
  due:                  'ok',
  medico:               'ok',
  flota:                'info',
  logistica:            'info',
  rrhh:                 'info',
  personal_externo:     'secondary',
  invitado:             'secondary',
}

export function RbacScreen() {
  const qc = useQueryClient()
  const query = useFichas()
  const [editando, setEditando] = useState<string | null>(null)
  const [nuevoRol, setNuevoRol] = useState<Rol | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGuardar(idNombre: string) {
    if (!nuevoRol) return
    setSubmitting(true)
    setError(null)
    try {
      // rpc_actualizar_rol_empleado not in generated types yet → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_actualizar_rol_empleado', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_nombre:     idNombre,
        p_nuevo_rol:     nuevoRol,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['fichas_empleados_rbac'] })
      setEditando(null)
      setNuevoRol('')
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">RBAC — Gestión de roles</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isLoading} aria-label="Recargar empleados">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">Empleado</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Rol actual</TableHead>
                  <TableHead className="sr-only">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data ?? []).map((f) => (
                  <TableRow key={f.id_nombre}>
                    <TableCell className="font-medium">{f.id_nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.nombre_real ?? '—'}</TableCell>
                    <TableCell>
                      {editando === f.id_nombre ? (
                        <div className="flex items-center gap-2">
                          <Select value={nuevoRol} onValueChange={(v) => setNuevoRol(v as Rol)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Seleccionar rol…" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleGuardar(f.id_nombre)} disabled={submitting || !nuevoRol}>
                            <Save className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditando(null); setNuevoRol('') }} disabled={submitting}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Badge variant={ROL_VARIANT[f.rol] ?? 'info'}>{f.rol}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editando !== f.id_nombre && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => { setEditando(f.id_nombre); setNuevoRol(f.rol) }}
                          aria-label={`Editar rol de ${f.id_nombre}`}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
