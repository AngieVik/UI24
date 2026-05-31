import { useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCuadrante, TURNO_LABEL } from '@/hooks/useCuadrante'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function useEmpleadosSimple() {
  return useQuery({
    queryKey: ['empleados_nombres'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('fichas_empleados')
        .select('id_nombre')
        .eq('activo', true)
        .order('id_nombre')
      if (error) throw error
      return (data ?? []).map((e: { id_nombre: string }) => e.id_nombre)
    },
  })
}

const TURNO_VARIANT: Record<string, 'ok' | 'warn' | 'info' | 'destructive' | 'secondary'> = {
  T: 'ok',
  L: 'secondary',
  V: 'info',
  B: 'destructive',
  C: 'warn',
}

function getDayNames(): string[] {
  return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start)
  const fin = new Date(end)
  while (cur <= fin) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function CuadrantesScreen() {
  const { data: empleados } = useEmpleadosSimple()
  const [target, setTarget] = useState('')
  const { turnos, semanaOffset, semanaActual, setSemanaOffset, loading } = useCuadrante(
    target || undefined
  )

  const fechas = dateRange(semanaActual.start, semanaActual.end)
  const dayNames = getDayNames()

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <ClipboardList aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Cuadrantes</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-48" aria-label="Seleccionar empleado">
            <SelectValue placeholder="Seleccionar empleado…" />
          </SelectTrigger>
          <SelectContent>
            {(empleados ?? []).map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSemanaOffset((o) => o - 1)}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="font-body text-sm">
            {semanaActual.start} — {semanaActual.end}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSemanaOffset((o) => o + 1)}
            aria-label="Semana siguiente"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          {semanaOffset !== 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSemanaOffset(0)}>
              Hoy
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : !target ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Selecciona un empleado para ver su cuadrante.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Cuadrante de {target} — semana{' '}
              {semanaOffset === 0 ? 'actual' : `${semanaOffset > 0 ? '+' : ''}${semanaOffset}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((d, i) => (
                <div key={d} className="text-center">
                  <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">{d}</p>
                  <p className="mb-1 text-xs text-muted-foreground">{fechas[i]?.slice(5)}</p>
                  {(() => {
                    const turno = turnos.find((t) => t.fecha === fechas[i])
                    if (!turno)
                      return (
                        <div className="rounded border p-1 text-center text-xs text-muted-foreground/50">
                          —
                        </div>
                      )
                    return (
                      <div className="rounded border p-1 text-center">
                        <Badge
                          variant={TURNO_VARIANT[turno.tipo_turno] ?? 'secondary'}
                          className="text-xs w-full justify-center"
                        >
                          {TURNO_LABEL[turno.tipo_turno] ?? turno.tipo_turno}
                        </Badge>
                        {turno.es_excepcion_absoluta && (
                          <span className="text-xs text-muted-foreground">✎</span>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(TURNO_LABEL).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <Badge variant={TURNO_VARIANT[k] ?? 'secondary'} className="text-xs">
                    {k}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
