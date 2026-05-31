import { useState } from 'react'
import { Cookie, KeyRound, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

interface GalletaRow {
  id_galleta: string
  tipo: 'pq' | 'normal'
  token: string
  estado: 'activa' | 'usada' | 'expirada'
  timestamp_emision: string
  timestamp_uso: string | null
  timestamp_expiracion: string | null
}

function useGalletas(tipo: 'pq' | 'normal') {
  return useQuery({
    queryKey: ['galletas', tipo],
    queryFn: async (): Promise<GalletaRow[]> => {
      // galletas_emergencia not in generated types yet → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('galletas_emergencia')
        .select(
          'id_galleta, tipo, token, estado, timestamp_emision, timestamp_uso, timestamp_expiracion'
        )
        .eq('tipo', tipo)
        .order('timestamp_emision', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as GalletaRow[]
    },
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function GalletaPanel({ tipo }: { tipo: 'pq' | 'normal' }) {
  const qc = useQueryClient()
  const query = useGalletas(tipo)
  const [idNombre, setIdNombre] = useState('')
  const [emitida, setEmitida] = useState<GalletaRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEmitir() {
    if (!idNombre.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      // rpc_emitir_galleta_emergencia not in generated types yet → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any).rpc('rpc_emitir_galleta_emergencia', {
        p_mutation_uuid: crypto.randomUUID(),
        p_tipo: tipo,
        p_id_nombre: idNombre.trim(),
      })
      if (err) throw err
      const g = data as GalletaRow
      setEmitida(g)
      await qc.invalidateQueries({ queryKey: ['galletas', tipo] })
      setIdNombre('')
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Emisión */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">
            Emitir {tipo === 'pq' ? 'galleta pequeña' : 'galleta de emergencia'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-body text-xs text-muted-foreground">
            {tipo === 'pq'
              ? 'Token de corta duración (30 min) para acceso urgente puntual.'
              : 'Token de duración extendida para acceso prolongado en emergencia declarada.'}
          </p>
          <Field>
            <FieldLabel htmlFor={`galleta-${tipo}-nombre`}>Identificador del receptor</FieldLabel>
            <Input
              id={`galleta-${tipo}-nombre`}
              placeholder="Ej. jjmartinez"
              value={idNombre}
              onChange={(e) => setIdNombre(e.target.value)}
              disabled={submitting}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={handleEmitir}
            disabled={submitting || !idNombre.trim()}
          >
            {submitting ? 'Emitiendo…' : 'Emitir token'}
          </Button>
        </CardContent>
      </Card>

      {/* Token emitido */}
      {emitida && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="space-y-2 py-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              <span className="font-body text-sm font-bold text-primary">Token generado</span>
            </div>
            <code className="block rounded bg-background p-2 font-mono text-lg font-bold tracking-widest text-foreground">
              {emitida.token}
            </code>
            <p className="text-xs text-muted-foreground">
              Expira: {fmtDateTime(emitida.timestamp_expiracion)}
            </p>
            <Button size="sm" variant="ghost" onClick={() => setEmitida(null)}>
              Cerrar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            Historial reciente
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => query.refetch()}
            aria-label="Recargar historial"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
          </Button>
        </div>
        {query.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (query.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No hay tokens emitidos.</p>
        ) : (
          <div className="space-y-2">
            {(query.data ?? []).map((g) => (
              <div
                key={g.id_galleta}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <code className="font-mono text-sm">{g.token}</code>
                <Badge variant={g.estado === 'activa' ? 'ok' : 'secondary'} className="text-xs">
                  {g.estado}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {fmtDateTime(g.timestamp_emision)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ModuloEmergenciasScreen({ vista }: { vista?: 'pq' | 'normal' }) {
  const [tab, setTab] = useState<string>(vista === 'pq' ? 'pq' : 'normal')

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Cookie aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Módulo de emergencias</h2>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pq">
            <Cookie className="size-3.5 mr-1" />
            Galleta pequeña
          </TabsTrigger>
          <TabsTrigger value="normal">
            <Cookie className="size-3.5 mr-1" />
            Galleta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pq" className="mt-3">
          <GalletaPanel tipo="pq" />
        </TabsContent>
        <TabsContent value="normal" className="mt-3">
          <GalletaPanel tipo="normal" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
