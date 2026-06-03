import { Fragment, useState } from 'react'
import { RefreshCw, Save, ShieldCheck, Users } from 'lucide-react'

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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Rol } from '@/lib/auth-roles'

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const ROLES: Rol[] = [
  'tes', 'due', 'medico', 'flota', 'responsable_flota',
  'coordinacion', 'logistica', 'responsable_logistica',
  'personal_externo', 'gerencia', 'rrhh', 'invitado',
]

const ROL_ABREV: Record<string, string> = {
  tes: 'TES', due: 'DUE', medico: 'MED', flota: 'FL',
  responsable_flota: 'R.FL', coordinacion: 'COO', logistica: 'LOG',
  responsable_logistica: 'R.LOG', personal_externo: 'EXT',
  gerencia: 'GER', rrhh: 'RRHH', invitado: 'INV',
}

const ROL_VARIANT: Partial<Record<Rol, 'ok' | 'warn' | 'destructive' | 'info' | 'secondary'>> = {
  gerencia: 'destructive', coordinacion: 'warn',
  responsable_flota: 'warn', responsable_logistica: 'warn',
  tes: 'ok', due: 'ok', medico: 'ok',
  flota: 'info', logistica: 'info', rrhh: 'info',
  personal_externo: 'secondary', invitado: 'secondary',
}

// Acciones agrupadas por módulo para la tabla de permisos
const GRUPOS: { grupo: string; acciones: { accion: string; label: string }[] }[] = [
  {
    grupo: 'Flota',
    acciones: [
      { accion: 'ver_incidencias',             label: 'Ver incidencias' },
      { accion: 'editar_incidencias',          label: 'Editar / eliminar incidencias' },
      { accion: 'anclar_incidencias',          label: 'Anclar incidencias' },
      { accion: 'editar_prioridad_incidencia', label: 'Cambiar prioridad' },
      { accion: 'gestionar_vehiculos',         label: 'Gestionar vehículos' },
    ],
  },
  {
    grupo: 'Logística',
    acciones: [
      { accion: 'ver_logistica',    label: 'Ver logística' },
      { accion: 'editar_logistica', label: 'Editar logística' },
    ],
  },
  {
    grupo: 'Operativa',
    acciones: [
      { accion: 'ver_servicios',    label: 'Ver servicios' },
      { accion: 'editar_servicios', label: 'Editar servicios' },
    ],
  },
  {
    grupo: 'RRHH',
    acciones: [
      { accion: 'ver_cuadrantes',      label: 'Ver cuadrantes' },
      { accion: 'editar_cuadrantes',   label: 'Editar cuadrantes' },
      { accion: 'ver_fichas',          label: 'Ver fichas de empleados' },
      { accion: 'gestionar_empleados', label: 'Alta / baja empleados' },
    ],
  },
  {
    grupo: 'Comunicación',
    acciones: [
      { accion: 'ver_tablon',          label: 'Ver tablón' },
      { accion: 'gestionar_tablon',    label: 'Gestionar tablón' },
      { accion: 'gestionar_marquesina',label: 'Gestionar marquesina' },
      { accion: 'ver_repositorio',     label: 'Ver repositorio' },
    ],
  },
  {
    grupo: 'Coordinación',
    acciones: [
      { accion: 'ver_drp',           label: 'Ver DRP' },
      { accion: 'gestionar_drp',     label: 'Gestionar DRP' },
      { accion: 'forzar_checkout',   label: 'Forzar checkout' },
      { accion: 'ver_system_config', label: 'Ver config. sistema' },
      { accion: 'editar_system_config', label: 'Editar config. sistema' },
    ],
  },
  {
    grupo: 'Seguridad / Acceso',
    acciones: [
      { accion: 'ver_rbac',      label: 'Ver RBAC' },
      { accion: 'editar_roles',  label: 'Editar roles' },
      { accion: 'editar_permisos', label: 'Editar permisos' },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────── */

interface FichaEmpleado {
  id_nombre: string
  rol: Rol
  nombre_real: string | null
  activo: boolean
}

interface PermisoRow {
  rol: string
  accion: string
  permitido: boolean
}

type PermisoMatrix = Record<string, Record<string, boolean>> // {rol: {accion: boolean}}

/* ─────────────────────────────────────────────────────────────────────────
 * Hooks
 * ───────────────────────────────────────────────────────────────────────── */

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

function usePermisos() {
  return useQuery({
    queryKey: ['permisos_rol_matrix'],
    staleTime: 60_000,
    queryFn: async (): Promise<PermisoMatrix> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('rpc_obtener_permisos_rol')
      if (error) throw error
      const rows = (data ?? []) as PermisoRow[]
      const matrix: PermisoMatrix = {}
      for (const row of rows) {
        if (!matrix[row.rol]) matrix[row.rol] = {}
        matrix[row.rol][row.accion] = row.permitido
      }
      return matrix
    },
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Tab 1 — Empleados (existing logic, enhanced)
 * ───────────────────────────────────────────────────────────────────────── */

function TabEmpleados() {
  const qc = useQueryClient()
  const query = useFichas()
  const [editando, setEditando] = useState<string | null>(null)
  const [nuevoRol, setNuevoRol] = useState<Rol | ''>('')
  const [error, setError] = useState<string | null>(null)

  const guardarMutation = useMutation({
    mutationFn: async ({ idNombre, rol }: { idNombre: string; rol: Rol }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_actualizar_rol_empleado', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_nombre: idNombre,
        p_nuevo_rol: rol,
      })
      if (err) throw err
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fichas_empleados_rbac'] })
      setEditando(null)
      setNuevoRol('')
    },
    onError: (e) => setError(resolveRpcError(e)),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm text-muted-foreground">
          {query.data?.length ?? 0} empleados activos
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isLoading}
          aria-label="Recargar empleados"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
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
                    <TableCell className="text-sm text-muted-foreground">
                      {f.nombre_real ?? '—'}
                    </TableCell>
                    <TableCell>
                      {editando === f.id_nombre ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={nuevoRol}
                            onValueChange={(v) => setNuevoRol(v as Rol)}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Seleccionar rol…" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() =>
                              guardarMutation.mutate({
                                idNombre: f.id_nombre,
                                rol: nuevoRol as Rol,
                              })
                            }
                            disabled={guardarMutation.isPending || !nuevoRol}
                          >
                            <Save className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditando(null); setNuevoRol('') }}
                            disabled={guardarMutation.isPending}
                          >
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
                          size="sm"
                          variant="ghost"
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
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Tab 2 — Permisos por rol
 * ───────────────────────────────────────────────────────────────────────── */

function TabPermisos() {
  const qc = useQueryClient()
  const query = usePermisos()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null) // "rol|accion" key

  const ROLES_EDITABLES = ROLES.filter((r) => r !== 'gerencia')

  async function handleToggle(rol: string, accion: string, permitido: boolean) {
    const key = `${rol}|${accion}`
    setSaving(key)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_actualizar_permiso_rol', {
        p_rol: rol,
        p_accion: accion,
        p_permitido: permitido,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['permisos_rol_matrix'] })
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSaving(null)
    }
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">No se pudo cargar la matriz de permisos.</p>
        </CardContent>
      </Card>
    )
  }

  const matrix = query.data ?? {}

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Gerencia siempre tiene todos los permisos. Los toggles solo afectan a los demás roles.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => query.refetch()}
          aria-label="Recargar permisos"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2 text-left font-bold uppercase text-muted-foreground min-w-[180px]">
                Acción
              </th>
              {/* Gerencia column - always true */}
              <th className="px-2 py-2 text-center font-bold uppercase text-muted-foreground min-w-[52px]">
                <span title="Gerencia">GER</span>
              </th>
              {ROLES_EDITABLES.map((r) => (
                <th
                  key={r}
                  className="px-2 py-2 text-center font-bold uppercase text-muted-foreground min-w-[52px]"
                  title={r}
                >
                  {ROL_ABREV[r] ?? r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map(({ grupo, acciones }) => (
              <Fragment key={grupo}>
                <tr className="bg-muted/20">
                  <td
                    colSpan={ROLES_EDITABLES.length + 2}
                    className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {grupo}
                  </td>
                </tr>
                {acciones.map(({ accion, label }) => (
                  <tr key={accion} className="border-t border-border/50 hover:bg-muted/10">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2 font-medium">
                      {label}
                    </td>
                    {/* Gerencia always on */}
                    <td className="px-2 py-2 text-center">
                      <Switch checked disabled aria-label="Gerencia siempre activo" />
                    </td>
                    {ROLES_EDITABLES.map((r) => {
                      const key = `${r}|${accion}`
                      const checked = matrix[r]?.[accion] ?? false
                      return (
                        <td key={r} className="px-2 py-2 text-center">
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) => handleToggle(r, accion, v)}
                            disabled={saving === key}
                            aria-label={`${label} para ${r}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main
 * ───────────────────────────────────────────────────────────────────────── */

export function RbacScreen() {
  const rol = useAuthStore((s) => s.rol)
  const puedeVerPermisos = rol === 'gerencia' || rol === 'coordinacion'

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4 p-3">
      <div className="flex items-center gap-2">
        <Users aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">RBAC — Roles y permisos</h2>
      </div>

      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          Empleados
        </h3>
        <TabEmpleados />
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Permisos por rol
        </h3>
        {puedeVerPermisos ? (
          <TabPermisos />
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Solo gerencia y coordinación pueden ver la matriz de permisos.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
