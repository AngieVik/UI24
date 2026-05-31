import { useState } from 'react'
import { AlertCircle, Clock, Pin, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface Incidencia {
  id_incidencia: string
  matricula: string
  tipo: string
  nivel_criticidad: string
  descripcion: string
  estado: string
  id_nombre_responsable: string | null
  timestamp_registro: string
  timestamp_cierre: string | null
}

function useIncidencias(filtro: 'abiertas' | 'ancladas' | 'ultimas') {
  return useQuery({
    queryKey: ['incidencias', filtro],
    queryFn: async (): Promise<Incidencia[]> => {
      // incidencias_vehiculo not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('incidencias_vehiculo')
        .select(
          'id_incidencia, matricula, tipo, nivel_criticidad, descripcion, estado, id_nombre_responsable, timestamp_registro, timestamp_cierre'
        )
        .order('timestamp_registro', { ascending: false })

      if (filtro === 'abiertas') {
        q = q.eq('estado', 'Abierta')
      } else if (filtro === 'ancladas') {
        q = q.eq('estado', 'Anclada')
      } else {
        q = q.in('estado', ['Resuelta', 'Cerrada']).limit(50)
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Incidencia[]
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

const NIVEL_VARIANT: Record<string, 'destructive' | 'warn' | 'info' | 'secondary'> = {
  critico: 'destructive',
  grave: 'warn',
  leve: 'info',
  mantenimiento: 'secondary',
}

const ESTADO_VARIANT: Record<string, 'destructive' | 'warn' | 'ok' | 'secondary'> = {
  Abierta: 'destructive',
  Anclada: 'warn',
  Resuelta: 'ok',
  Cerrada: 'secondary',
}

function IncidenciaCard({ inc }: { inc: Incidencia }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{inc.matricula}</span>
              <Badge variant="info" className="text-xs">
                {inc.tipo}
              </Badge>
              <Badge variant={NIVEL_VARIANT[inc.nivel_criticidad] ?? 'info'} className="text-xs">
                {inc.nivel_criticidad}
              </Badge>
            </div>
            <p className="font-body text-sm text-muted-foreground line-clamp-2">
              {inc.descripcion}
            </p>
            <div className="text-xs text-muted-foreground">
              {fmtDateTime(inc.timestamp_registro)}
              {inc.id_nombre_responsable && ` · ${inc.id_nombre_responsable}`}
            </div>
          </div>
          <Badge variant={ESTADO_VARIANT[inc.estado] ?? 'info'}>{inc.estado}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function IncidenciasScreen({ vista }: { vista?: 'abiertas' | 'ancladas' | 'ultimas' }) {
  const [tab, setTab] = useState<string>(vista ?? 'abiertas')

  const abQ = useIncidencias('abiertas')
  const anQ = useIncidencias('ancladas')
  const ulQ = useIncidencias('ultimas')

  function reload() {
    abQ.refetch()
    anQ.refetch()
    ulQ.refetch()
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Incidencias de flota</h2>
          {(abQ.data?.length ?? 0) > 0 && (
            <Badge variant="destructive">{abQ.data!.length} abiertas</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={reload} aria-label="Recargar incidencias">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="abiertas">
            <AlertCircle className="size-3.5 mr-1" />
            Abiertas
            {(abQ.data?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {abQ.data!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ancladas">
            <Pin className="size-3.5 mr-1" />
            Ancladas
            {(anQ.data?.length ?? 0) > 0 && (
              <Badge variant="warn" className="ml-1 text-xs">
                {anQ.data!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ultimas">
            <Clock className="size-3.5 mr-1" />
            Últimas
          </TabsTrigger>
        </TabsList>

        {[
          { value: 'abiertas', q: abQ },
          { value: 'ancladas', q: anQ },
          { value: 'ultimas', q: ulQ },
        ].map(({ value, q }) => (
          <TabsContent key={value} value={value} className="mt-3">
            {q.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (q.data?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay incidencias en esta categoría.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {(q.data ?? []).map((inc) => (
                  <IncidenciaCard key={inc.id_incidencia} inc={inc} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
