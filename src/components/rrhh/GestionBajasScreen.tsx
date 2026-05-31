import { useState } from 'react'
import { BadgeCheck, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface BajaRow {
  id_baja: string
  id_nombre: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string | null
  descripcion: string | null
  estado: string
}

function useBajas() {
  return useQuery({
    queryKey: ['bajas_laborales'],
    queryFn: async (): Promise<BajaRow[]> => {
      // bajas_laborales not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('bajas_laborales')
        .select('id_baja, id_nombre, tipo, fecha_inicio, fecha_fin, descripcion, estado')
        .order('fecha_inicio', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as BajaRow[]
    },
  })
}

const TIPO_OPTIONS = [
  'IT común',
  'IT accidente',
  'Maternidad/Paternidad',
  'Permiso retribuido',
  'Excedencia',
  'Permiso no retribuido',
]

const ESTADO_VARIANT: Record<string, 'ok' | 'warn' | 'secondary'> = {
  Activa: 'warn',
  Cerrada: 'ok',
  Pendiente: 'secondary',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function GestionBajasScreen() {
  const qc = useQueryClient()
  const query = useBajas()
  const [showForm, setShowForm] = useState(false)
  const [idNombre, setIdNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activas = (query.data ?? []).filter((b) => b.estado === 'Activa').length

  async function handleRegistrar() {
    if (!idNombre.trim() || !tipo || !fechaInicio) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_registrar_baja', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_nombre: idNombre.trim(),
        p_tipo: tipo,
        p_fecha_inicio: fechaInicio,
        p_descripcion: descripcion.trim() || undefined,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['bajas_laborales'] })
      setShowForm(false)
      setIdNombre('')
      setTipo('')
      setFechaInicio('')
      setDescripcion('')
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCerrar(idBaja: string) {
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_cerrar_baja', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_baja: idBaja,
      })
      if (err) throw err
      await qc.invalidateQueries({ queryKey: ['bajas_laborales'] })
    } catch (e) {
      setError(resolveRpcError(e))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BadgeCheck aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Gestión de bajas</h2>
          {activas > 0 && <Badge variant="warn">{activas} activas</Badge>}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isLoading}
            aria-label="Recargar"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nueva baja'}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Registrar baja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="baja-nombre">Empleado</FieldLabel>
                <Input
                  id="baja-nombre"
                  value={idNombre}
                  onChange={(e) => setIdNombre(e.target.value)}
                  placeholder="Identificador"
                  disabled={submitting}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="baja-tipo">Tipo de baja</FieldLabel>
                <Select value={tipo} onValueChange={setTipo} disabled={submitting}>
                  <SelectTrigger id="baja-tipo">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="baja-inicio">Fecha de inicio</FieldLabel>
                <Input
                  id="baja-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={submitting}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="baja-desc">
                Descripción <span className="font-light text-muted-foreground">— opcional</span>
              </FieldLabel>
              <Textarea
                id="baja-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="resize-none"
                disabled={submitting}
              />
            </Field>
            <Button size="sm" className="w-full" onClick={handleRegistrar} disabled={submitting}>
              {submitting ? 'Registrando…' : 'Registrar baja'}
            </Button>
          </CardContent>
        </Card>
      )}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay bajas registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).map((b) => (
            <Card key={b.id_baja}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{b.id_nombre}</span>
                    <Badge variant="info" className="text-xs">
                      {b.tipo}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(b.fecha_inicio)} — {fmtDate(b.fecha_fin)}
                  </div>
                  {b.descripcion && (
                    <p className="text-xs text-muted-foreground">{b.descripcion}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ESTADO_VARIANT[b.estado] ?? 'secondary'}>{b.estado}</Badge>
                  {b.estado === 'Activa' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCerrar(b.id_baja)}
                      aria-label={`Cerrar baja de ${b.id_nombre}`}
                    >
                      Cerrar baja
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
