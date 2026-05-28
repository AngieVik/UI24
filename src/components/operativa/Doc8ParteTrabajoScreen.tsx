import { useEffect, useState } from 'react'
import { Car, CheckSquare, ClipboardList, Package, Save, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { useTurnoStore } from '@/stores/useTurnoStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useDoc8Activo } from '@/hooks/useDoc8Activo'
import { useDoc6DelTurno } from '@/hooks/useDoc6DelTurno'
import { useAnotarParte } from '@/hooks/useAnotarParte'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { formatRol } from '@/lib/formatRol'

// ── Helpers ───────────────────────────────────────────────────

const TIPO_SERVICIO_LABELS: Record<string, string> = {
  programado: 'Programado',
  dispositivo: 'Dispositivo',
  traslado: 'Traslado',
  guardia_urgencias: 'Guardia urgencias',
  drp: 'DRP',
  privado: 'Privado',
  simulacro: 'Simulacro',
  formacion: 'Formación',
  sin_asignar: 'Sin asignar',
}

function formatTipoServicio(tipo: string | null): string {
  if (!tipo) return '—'
  return TIPO_SERVICIO_LABELS[tipo] ?? tipo
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Componente principal ──────────────────────────────────────

export function Doc8ParteTrabajoScreen() {
  const idParte = useTurnoStore((s) => s.id_parte)
  const turnoActivo = useTurnoStore((s) => s.turnoActivo)

  // Gate: sin turno activo
  if (!idParte || !turnoActivo) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <ClipboardList aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">Doc-8 — Parte de trabajo</h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay turno activo. Haz check-in desde la pantalla de presencia.
        </p>
      </div>
    )
  }

  return <Doc8Content idParte={idParte} />
}

// ── Contenido del parte ───────────────────────────────────────

interface Doc8ContentProps {
  idParte: string
}

function Doc8Content({ idParte }: Doc8ContentProps) {
  const { data: doc8, isLoading, isError } = useDoc8Activo()
  const checklistCerrado = useActivacionStore((s) => s.checklistCerrado)
  const idActivacion = useActivacionStore((s) => s.id_activacion)

  const { data: gastos, isLoading: gastosLoading } = useDoc6DelTurno(
    doc8?.id_activacion ?? idActivacion ?? null
  )
  const personal = usePersonalEnTurno()
  const { anotar, isSubmitting, error: anotarError } = useAnotarParte()

  const [localNotas, setLocalNotas] = useState('')
  const [notasInit, setNotasInit] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (doc8 && !notasInit) {
      setLocalNotas(doc8.notas ?? '')
      setNotasInit(true)
    }
  }, [doc8, notasInit])

  const notasSinCambios = localNotas === (doc8?.notas ?? '')
  const parteAbierto = doc8?.estado === 'Abierto_En_Turno'
  const tieneVehiculo = !!doc8?.id_activacion

  async function handleGuardarNotas() {
    if (!doc8 || notasSinCambios || isSubmitting) return
    setFeedback(null)
    const res = await anotar({ id_parte: idParte, notas: localNotas })
    if (!res) return
    setFeedback(
      res.online ? 'Anotación guardada.' : 'Anotación encolada offline. Se guardará al reconectar.'
    )
  }

  if (isLoading) {
    return (
      <div
        className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3"
        role="status"
        aria-label="Cargando parte de trabajo"
      >
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (isError || !doc8) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-destructive">
          No se pudo cargar el parte de trabajo. Comprueba la conexión.
        </p>
      </div>
    )
  }

  const idParteCorto = idParte.slice(0, 8).toUpperCase()

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* ── Card 1: Encabezado del parte ─────────────────── */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <ClipboardList aria-hidden="true" className="size-5" />
            Doc-8 — Parte de trabajo
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={parteAbierto ? 'ok' : 'secondary'}
              aria-label={`Estado: ${parteAbierto ? 'Abierto en turno' : 'Cerrado'}`}
            >
              {parteAbierto ? 'Abierto en turno' : 'Cerrado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <DataCell label="ID parte" value={`#${idParteCorto}`} />
            <DataCell label="Trabajador" value={doc8.id_nombre || '—'} />
            <DataCell label="Inicio" value={fmtDateTime(doc8.timestamp_inicio)} />
            <DataCell label="Fin" value={fmtDateTime(doc8.timestamp_fin)} />
          </dl>
        </CardContent>
      </Card>

      {/* ── Card 2: Vehículo (solo si hay activación) ────── */}
      {tieneVehiculo ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Car aria-hidden="true" className="size-4" />
              Vehículo activo
            </CardTitle>
            <Badge variant="outline" aria-label={`Matrícula ${doc8.matricula}`}>
              {doc8.matricula}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <DataCell label="Pilot" value={doc8.pilot ?? '—'} />
              <DataCell label="Carry" value={doc8.carry ?? '—'} />
              <DataCell label="Tipo servicio" value={formatTipoServicio(doc8.tipo_servicio)} />
              <DataCell
                label="Km inicio"
                value={doc8.km_inicio != null ? String(doc8.km_inicio) : '—'}
              />
              <DataCell label="Km fin" value={doc8.km_fin != null ? String(doc8.km_fin) : '—'} />
            </dl>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-3">
            <Car aria-hidden="true" className="size-5 text-muted-foreground/60" />
            <p className="font-body text-sm font-light text-muted-foreground">
              Sin vehículo activo. Ve a Operativa → Vehículos para activar uno.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Card 3: Personal en turno ────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Users aria-hidden="true" className="size-4" />
            Personal en turno
          </CardTitle>
          {!personal.isLoading && (
            <Badge variant="secondary" aria-label={`${personal.data.length} personas en turno`}>
              {personal.data.length}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {personal.isLoading && (
            <div role="status" aria-label="Cargando personal">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="mt-1 h-8 w-3/4" />
            </div>
          )}
          {!personal.isLoading && personal.isError && (
            <p className="text-sm text-destructive">No se pudo cargar el personal.</p>
          )}
          {!personal.isLoading && !personal.isError && personal.data.length === 0 && (
            <p className="text-sm font-light text-muted-foreground">
              Nadie ha hecho check-in en este terminal todavía.
            </p>
          )}
          {!personal.isLoading && !personal.isError && personal.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wide">
                    Nombre
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide">
                    Función
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wide">
                    Check-in
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personal.data.map((p) => (
                  <TableRow key={p.id_nombre}>
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold">{p.nombre_real}</span>
                        <span className="text-xs font-light text-muted-foreground">
                          {p.id_nombre}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatRol(p.rol)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-light text-muted-foreground">
                      {fmtTime(p.checkin_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Card 4: Checklist360 (solo si hay vehículo activo) ── */}
      {tieneVehiculo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <CheckSquare aria-hidden="true" className="size-4" />
              Checklist360
            </CardTitle>
            <Badge
              variant={checklistCerrado ? 'ok' : 'warn'}
              aria-label={`Checklist ${checklistCerrado ? 'completado' : 'pendiente'}`}
            >
              {checklistCerrado ? 'Completado' : 'Pendiente'}
            </Badge>
          </CardHeader>
          {!checklistCerrado && (
            <CardContent>
              <p className="text-sm font-light text-muted-foreground">
                La revisión 360° de inicio de turno no está completada. Ve a Operativa →
                Doc-Checklist360 para completarla.
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Card 5: Gastos de material del turno ─────────── */}
      {tieneVehiculo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Package aria-hidden="true" className="size-4" />
              Gastos de material
            </CardTitle>
            {!gastosLoading && (
              <Badge variant="secondary" aria-label={`${gastos.length} gastos registrados`}>
                {gastos.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {gastosLoading && (
              <div role="status" aria-label="Cargando gastos">
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            {!gastosLoading && gastos.length === 0 && (
              <p className="text-sm font-light text-muted-foreground">
                Sin gastos de material registrados en este turno.
              </p>
            )}
            {!gastosLoading && gastos.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase tracking-wide">
                      Ítem
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide">
                      Categoría
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wide">
                      Cant.
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wide">
                      Hora
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos.map((g) => (
                    <TableRow key={g.id_deduccion}>
                      <TableCell className="font-bold">{g.nombre_item}</TableCell>
                      <TableCell className="text-sm font-light text-muted-foreground">
                        {g.categoria}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" aria-label={`Cantidad ${g.cantidad}`}>
                          {g.cantidad}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-light text-muted-foreground">
                        {fmtTime(g.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Card 6: Anotaciones ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Anotaciones del turno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            aria-label="Anotaciones del turno"
            placeholder={
              parteAbierto
                ? 'Escribe aquí incidencias, anomalías u observaciones del turno…'
                : 'El parte está cerrado. Solo lectura.'
            }
            value={localNotas}
            onChange={(e) => {
              setLocalNotas(e.target.value)
              setFeedback(null)
            }}
            disabled={isSubmitting || !parteAbierto}
            className="min-h-[100px] resize-y font-body"
            rows={4}
          />

          <div role="alert" aria-live="polite" className="min-h-4 text-sm">
            {anotarError && <span className="text-destructive">{anotarError}</span>}
            {!anotarError && feedback && <span className="text-muted-foreground">{feedback}</span>}
          </div>

          {parteAbierto && (
            <Button
              className="w-full sm:w-auto"
              onClick={handleGuardarNotas}
              disabled={isSubmitting || notasSinCambios}
              aria-label="Guardar anotación"
            >
              <Save aria-hidden="true" className="size-4" />
              {isSubmitting ? 'Guardando…' : 'Guardar anotación'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Celda de datos (readonly) ─────────────────────────────────

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  )
}
