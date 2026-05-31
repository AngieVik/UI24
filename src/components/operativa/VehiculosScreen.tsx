import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  Disc3,
  Navigation,
  Pause,
  Power,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFlotaCompleta, type VehiculoFila } from '@/hooks/useFlotaCompleta'
import { useActualizarVehiculo, type TipoServicio } from '@/hooks/useActualizarVehiculo'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { formatRol } from '@/lib/formatRol'

const NO_CARRY = '__none__'

/** Orden canónico de los grupos en el desplegable */
const TIPO_ORDER = ['A1', 'A2', 'B', 'C', 'VIR', 'Quad', 'Unidad Movil', 'Logistica'] as const

const ESTADO_LABELS: Record<string, string> = {
  desactivado: 'Desactivado',
  activado: 'Activado',
  en_drp: 'En DRP',
  // legado
  inactivo: 'Desactivado',
  activo: 'Activado',
}

const SUBESTADO_LABELS: Record<string, string> = {
  en_espera: 'En espera',
  ruta: 'En ruta',
  estacionado: 'Estacionado',
  alerta: 'Alerta',
}

const TIPO_SERVICIO_LABELS: Record<TipoServicio, string> = {
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

const CONDICION_LABEL: Record<string, string> = {
  operativo: 'Operativo',
  averiado_leve: 'Avería leve',
  critico: 'Crítico',
  // legado
  averiado_grave: 'Avería grave',
  en_taller: 'En taller',
  dado_de_baja: 'Dado de baja',
}

function estadoVariant(estado: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (estado === 'activado' || estado === 'activo') return 'default'
  if (estado === 'en_drp') return 'destructive'
  return 'outline'
}

function subestadoVariant(s: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (s === 'alerta') return 'destructive'
  if (s === 'ruta') return 'default'
  return 'secondary'
}

function condicionVariant(c: string): 'secondary' | 'destructive' | 'outline' {
  if (c === 'operativo') return 'secondary'
  if (c === 'critico' || c === 'dado_de_baja' || c === 'en_taller' || c === 'averiado_grave')
    return 'destructive'
  return 'outline'
}

function SubestadoIcon({ subestado }: { subestado: string }) {
  const icons: Record<string, typeof Power> = {
    en_espera: Pause,
    ruta: Navigation,
    estacionado: Clock,
    alerta: AlertTriangle,
  }
  const Icon = icons[subestado] ?? Disc3
  return <Icon aria-hidden="true" className="size-4" />
}

// ──────────────────────────────────────────────────────────────────────────────

export function VehiculosScreen() {
  const { data: flota, isLoading: flotaLoading, isError: flotaError } = useFlotaCompleta()
  const personal = usePersonalEnTurno()
  const { run, isSubmitting, error } = useActualizarVehiculo()

  const [selectedMatricula, setSelectedMatricula] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'iniciar' | 'finalizar'>('view')
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>('sin_asignar')
  const [pilot, setPilot] = useState('')
  const [carry, setCarry] = useState(NO_CARRY)
  const [kmInicio, setKmInicio] = useState<number | ''>('')
  const [kmFin, setKmFin] = useState<number | ''>('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const selectedVehiculo = useMemo<VehiculoFila | null>(
    () => flota.find((v) => v.matricula === selectedMatricula) ?? null,
    [flota, selectedMatricula]
  )

  // Resetear formulario cuando cambia el vehículo seleccionado
  useEffect(() => {
    setMode('view')
    setPilot('')
    setCarry(NO_CARRY)
    setKmInicio('')
    setKmFin('')
    setFeedback(null)
  }, [selectedMatricula])

  // Auto-seleccionar pilot si solo hay 1 disponible al abrir el formulario
  useEffect(() => {
    if (mode === 'iniciar' && !pilot && personal.data.length === 1) {
      setPilot(personal.data[0].id_nombre)
    }
  }, [mode, personal.data, pilot])

  const carryOptions = useMemo(
    () => personal.data.filter((p) => p.id_nombre !== pilot),
    [personal.data, pilot]
  )

  // Flota agrupada por tipo para el desplegable
  const flotaByTipo = useMemo(() => {
    const groups: Record<string, VehiculoFila[]> = {}
    for (const v of flota) {
      const key = v.tipo
      if (!groups[key]) groups[key] = []
      groups[key].push(v)
    }
    // Ordenar los tipos según TIPO_ORDER; los desconocidos al final
    const ordered: Record<string, VehiculoFila[]> = {}
    for (const t of TIPO_ORDER) {
      if (groups[t]?.length) ordered[t] = groups[t]
    }
    for (const [t, vs] of Object.entries(groups)) {
      if (!ordered[t]) ordered[t] = vs
    }
    return ordered
  }, [flota])

  const isDesactivado =
    selectedVehiculo?.estado_operativo === 'desactivado' ||
    selectedVehiculo?.estado_operativo === 'inactivo'
  const isActivado =
    selectedVehiculo?.estado_operativo === 'activado' ||
    selectedVehiculo?.estado_operativo === 'activo'
  const isEnDrp = selectedVehiculo?.estado_operativo === 'en_drp'

  const submitIniciarDisabled = isSubmitting || !pilot || kmInicio === '' || Number(kmInicio) < 0

  const submitFinalizarDisabled = isSubmitting

  // ── HANDLERS ──────────────────────────────────────────────────────────────

  async function onIniciarTurno() {
    if (!selectedVehiculo) return
    setFeedback(null)
    const result = await run({
      matricula: selectedVehiculo.matricula,
      estado_destino: 'activado',
      tipo_servicio: tipoServicio,
      pilot: pilot || null,
      carry: carry === NO_CARRY ? null : carry,
      km_inicio: kmInicio !== '' ? Number(kmInicio) : null,
    })
    if (result) {
      setMode('view')
      setFeedback(
        result.online
          ? `Turno iniciado — ${result.matricula} activado.`
          : 'Turno encolado (offline). Se aplicará al reconectar.'
      )
    }
  }

  async function onCambiarSubestado(subestado: 'en_espera' | 'ruta' | 'estacionado' | 'alerta') {
    if (!selectedVehiculo) return
    setFeedback(null)
    const result = await run({
      matricula: selectedVehiculo.matricula,
      estado_destino: subestado,
    })
    if (result) {
      setFeedback(
        result.online ? `Estado → ${SUBESTADO_LABELS[subestado]}.` : 'Cambio encolado (offline).'
      )
    }
  }

  async function onFinalizarTurno() {
    if (!selectedVehiculo) return
    setFeedback(null)
    const result = await run({
      matricula: selectedVehiculo.matricula,
      estado_destino: 'desactivado',
      km_fin: kmFin !== '' ? Number(kmFin) : null,
    })
    if (result) {
      setSelectedMatricula(null)
      setMode('view')
      setFeedback('Turno finalizado.')
    }
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* ─── Selector de flota ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Car aria-hidden="true" className="size-5" />
            Selector de flota
            <Badge variant="outline">{flota.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {flotaLoading && (
            <div className="space-y-2" role="status" aria-label="Cargando flota">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}
          {!flotaLoading && flotaError && (
            <p className="py-4 text-sm text-destructive">No se pudo cargar la flota.</p>
          )}
          {!flotaLoading && !flotaError && flota.length === 0 && (
            <p className="py-4 text-sm font-light text-muted-foreground">
              No hay vehículos en la flota.
            </p>
          )}
          {!flotaLoading && !flotaError && flota.length > 0 && (
            <Select
              value={selectedMatricula ?? ''}
              onValueChange={(v) => setSelectedMatricula(v || null)}
            >
              <SelectTrigger aria-label="Selecciona un vehículo" className="w-full">
                <SelectValue placeholder="Selecciona un vehículo…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(flotaByTipo).map(([tipo, vehiculos]) => (
                  <SelectGroup key={tipo}>
                    <SelectLabel>{tipo}</SelectLabel>
                    {vehiculos.map((v) => (
                      <SelectItem key={v.matricula} value={v.matricula}>
                        <span className="font-mono font-semibold">{v.matricula}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          — {ESTADO_LABELS[v.estado_operativo] ?? v.estado_operativo}
                          {v.subestado_operativo &&
                            ` (${SUBESTADO_LABELS[v.subestado_operativo] ?? v.subestado_operativo})`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* ─── Panel del vehículo seleccionado ───────────────────────── */}
      {selectedVehiculo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {selectedVehiculo.matricula}
              <span className="font-light text-muted-foreground">· {selectedVehiculo.tipo}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Estado operativo */}
              <Badge variant={estadoVariant(selectedVehiculo.estado_operativo)}>
                {ESTADO_LABELS[selectedVehiculo.estado_operativo] ??
                  selectedVehiculo.estado_operativo}
              </Badge>
              {/* Subestado (solo cuando activado) */}
              {isActivado && selectedVehiculo.subestado_operativo && (
                <Badge variant={subestadoVariant(selectedVehiculo.subestado_operativo)}>
                  <SubestadoIcon subestado={selectedVehiculo.subestado_operativo} />
                  <span className="ml-1">
                    {SUBESTADO_LABELS[selectedVehiculo.subestado_operativo] ??
                      selectedVehiculo.subestado_operativo}
                  </span>
                </Badge>
              )}
              {/* Condición técnica */}
              <Badge variant={condicionVariant(selectedVehiculo.condicion_tecnica)}>
                <ShieldAlert aria-hidden="true" className="mr-1 size-3" />
                {CONDICION_LABEL[selectedVehiculo.condicion_tecnica] ??
                  selectedVehiculo.condicion_tecnica}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── Vehículo desactivado: formulario de inicio de turno ── */}
            {isDesactivado && mode === 'view' && (
              <Button
                className="w-full"
                onClick={() => setMode('iniciar')}
                disabled={selectedVehiculo.condicion_tecnica === 'critico'}
                aria-label="Iniciar turno"
              >
                <Power aria-hidden="true" className="mr-2 size-4" />
                Iniciar turno
              </Button>
            )}

            {isDesactivado && mode === 'iniciar' && (
              <div className="space-y-3" aria-label="Formulario iniciar turno">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Iniciar turno
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Pilot */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Pilot
                    </span>
                    <Select value={pilot} onValueChange={setPilot} disabled={isSubmitting}>
                      <SelectTrigger aria-label="Pilot">
                        <SelectValue placeholder="Selecciona pilot" />
                      </SelectTrigger>
                      <SelectContent>
                        {personal.data.map((p) => (
                          <SelectItem key={p.id_nombre} value={p.id_nombre}>
                            <span className="font-bold">{p.nombre_real}</span>
                            <span className="ml-2 text-xs font-light text-muted-foreground">
                              {formatRol(p.rol)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  {/* Carry */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Carry (opcional)
                    </span>
                    <Select value={carry} onValueChange={setCarry} disabled={isSubmitting}>
                      <SelectTrigger aria-label="Carry">
                        <SelectValue placeholder="Sin carry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CARRY}>
                          <span className="font-light text-muted-foreground">Sin carry</span>
                        </SelectItem>
                        {carryOptions.map((p) => (
                          <SelectItem key={p.id_nombre} value={p.id_nombre}>
                            {p.nombre_real}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  {/* Kilómetros inicio */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Kilómetros inicio
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={kmInicio}
                      onChange={(e) => setKmInicio(e.target.valueAsNumber)}
                      disabled={isSubmitting}
                      aria-label="Kilómetros inicio"
                    />
                  </label>

                  {/* Tipo de servicio */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Tipo de servicio
                    </span>
                    <Select
                      value={tipoServicio}
                      onValueChange={(v) => setTipoServicio(v as TipoServicio)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger aria-label="Tipo de servicio">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TIPO_SERVICIO_LABELS) as TipoServicio[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIPO_SERVICIO_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={onIniciarTurno}
                    disabled={submitIniciarDisabled}
                    aria-label="Confirmar inicio de turno"
                  >
                    {isSubmitting ? 'Iniciando…' : 'Confirmar inicio de turno'}
                  </Button>
                  <Button variant="outline" onClick={() => setMode('view')} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* ── Vehículo activado: subestados + finalizar ─────────── */}
            {isActivado && (
              <div className="space-y-3">
                {/* Botones de subestado */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Estado del vehículo
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(['en_espera', 'ruta', 'estacionado', 'alerta'] as const).map((s) => {
                      const isCurrentSubestado = selectedVehiculo.subestado_operativo === s
                      return (
                        <Button
                          key={s}
                          variant={isCurrentSubestado ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onCambiarSubestado(s)}
                          disabled={isSubmitting || isCurrentSubestado}
                          aria-label={SUBESTADO_LABELS[s]}
                          aria-pressed={isCurrentSubestado}
                        >
                          <SubestadoIcon subestado={s} />
                          <span className="ml-1">{SUBESTADO_LABELS[s]}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Finalizar turno */}
                {mode !== 'finalizar' && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setMode('finalizar')}
                    aria-label="Finalizar turno"
                  >
                    Finalizar turno
                  </Button>
                )}

                {mode === 'finalizar' && (
                  <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                    <h3 className="text-sm font-bold text-destructive">Finalizar turno</h3>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Kilómetros fin (opcional)
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={kmFin}
                        onChange={(e) => setKmFin(e.target.valueAsNumber)}
                        disabled={isSubmitting}
                        aria-label="Kilómetros fin"
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={onFinalizarTurno}
                        disabled={submitFinalizarDisabled}
                        aria-label="Confirmar finalización de turno"
                      >
                        {isSubmitting ? 'Finalizando…' : 'Confirmar finalización'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMode('view')}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Vehículo en DRP ──────────────────────────────────── */}
            {isEnDrp && (
              <p className="text-sm text-muted-foreground">
                Este vehículo está desplegado en un DRP activo. La gestión se realiza desde el
                módulo DRP.
              </p>
            )}

            {/* ── Feedback / error ─────────────────────────────────── */}
            <div role="alert" aria-live="polite" className="min-h-5 text-sm">
              {error && <span className="text-destructive">{error}</span>}
              {!error && feedback && <span className="text-muted-foreground">{feedback}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
