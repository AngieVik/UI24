import { useState } from 'react'
import { BriefcaseMedical, RefreshCw, UserPlus, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface PsaSesion {
  id_sesion: string
  estado: string
  id_nombre_responsable: string
  timestamp_apertura: string
  timestamp_cierre: string | null
  num_pacientes?: number
}

function usePsaSesiones() {
  return useQuery({
    queryKey: ['psa_sesiones'],
    queryFn: async (): Promise<PsaSesion[]> => {
      // psa_sesiones not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('psa_sesiones')
        .select('id_sesion, estado, id_nombre_responsable, timestamp_apertura, timestamp_cierre')
        .order('timestamp_apertura', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as PsaSesion[]
    },
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_VARIANT: Record<string, 'ok' | 'warn' | 'secondary'> = {
  Abierta:   'ok',
  Cerrada:   'secondary',
  Archivada: 'secondary',
}

export function ModuloPsaScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const query = usePsaSesiones()
  const [actingOpen, setActingOpen] = useState(false)
  const [idDrpInput, setIdDrpInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          El módulo PSA requiere conexión en tiempo real.
        </p>
      </div>
    )
  }

  async function handleAbrirSesion() {
    setActingOpen(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = { p_mutation_uuid: crypto.randomUUID() }
      if (idDrpInput.trim()) payload['p_id_drp'] = idDrpInput.trim()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.rpc as any)('rpc_abrir_sesion_psa', payload)
      if (err) throw err
      await query.refetch()
      setIdDrpInput('')
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setActingOpen(false)
    }
  }

  async function handleCerrarSesion(idSesion: string) {
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase.rpc as any)('rpc_cerrar_sesion_psa', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_sesion: idSesion,
      })
      if (err) throw err
      await query.refetch()
    } catch (e) {
      setError(resolveRpcError(e))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BriefcaseMedical aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Módulo PSA</h2>
          <span className="font-body text-sm text-muted-foreground">Puesto de soporte avanzado</span>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isLoading}
          aria-label="Recargar sesiones PSA"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {(error || query.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? (query.error as Error)?.message}
        </p>
      )}

      {/* Abrir nueva sesión */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-sm">
            <UserPlus aria-hidden="true" className="size-4" />
            Nueva sesión PSA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field>
            <FieldLabel htmlFor="psa-drp">
              ID DRP asociado <span className="font-light text-muted-foreground">— opcional</span>
            </FieldLabel>
            <Input
              id="psa-drp"
              placeholder="UUID del DRP activo"
              value={idDrpInput}
              onChange={(e) => setIdDrpInput(e.target.value)}
              disabled={actingOpen}
            />
          </Field>
          <Button
            size="sm"
            onClick={handleAbrirSesion}
            disabled={actingOpen}
            className="w-full"
          >
            {actingOpen ? 'Abriendo…' : 'Abrir sesión PSA'}
          </Button>
        </CardContent>
      </Card>

      {/* Listado de sesiones */}
      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay sesiones PSA registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!.map((s) => (
            <Card key={s.id_sesion}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="space-y-0.5">
                  <span className="font-mono text-xs font-bold">
                    #{s.id_sesion.slice(0, 8).toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Responsable: {s.id_nombre_responsable}</span>
                    <span>Apertura: {fmtDateTime(s.timestamp_apertura)}</span>
                    {s.timestamp_cierre && <span>Cierre: {fmtDateTime(s.timestamp_cierre)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ESTADO_VARIANT[s.estado] ?? 'info'}>{s.estado}</Badge>
                  {s.estado === 'Abierta' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCerrarSesion(s.id_sesion)}
                      aria-label={`Cerrar sesión PSA ${s.id_sesion.slice(0, 8)}`}
                    >
                      Cerrar
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
