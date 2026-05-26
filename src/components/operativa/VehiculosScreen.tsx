import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Car, CheckCircle2, Clock, Disc3, MapPin, Pause, Power, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFlotaCompleta, type VehiculoFila } from '@/hooks/useFlotaCompleta'
import { useActualizarVehiculo, type EstadoOperativo, type TipoServicio } from '@/hooks/useActualizarVehiculo'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { formatRol } from '@/lib/formatRol'

const NO_CARRY = '__none__'

const ESTADO_LABELS: Record<EstadoOperativo, string> = {
  desactivado: 'Desactivado',
  en_espera:   'En espera',
  activado:    'Activado',
  ruta:        'En ruta',
  estacionado: 'Estacionado',
  alerta:      'Alerta',
}

const ESTADO_ICON: Record<EstadoOperativo, typeof Power> = {
  desactivado: Power,
  en_espera:   Pause,
  activado:    CheckCircle2,
  ruta:        MapPin,
  estacionado: Clock,
  alerta:      AlertTriangle,
}

function estadoVariant(estado: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (estado === 'activado' || estado === 'ruta') return 'default'
  if (estado === 'alerta') return 'destructive'
  if (estado === 'estacionado' || estado === 'en_espera') return 'secondary'
  return 'outline'
}

function condicionVariant(c: string): 'secondary' | 'destructive' | 'outline' {
  if (c === 'operativo') return 'secondary'
  if (c === 'dado_de_baja' || c === 'en_taller' || c === 'inoperativo_critico') return 'destructive'
  return 'outline'
}

const CONDICION_LABEL: Record<string, string> = {
  operativo:            'Operativo',
  averiado_leve:        'Avería leve',
  averiado_grave:       'Avería grave',
  inoperativo_critico:  'Inoperativo crítico',
  en_taller:            'En taller',
  dado_de_baja:         'Dado de baja',
}

const TIPO_SERVICIO_LABELS: Record<TipoServicio, string> = {
  programado:        'Programado',
  dispositivo:       'Dispositivo',
  traslado:          'Traslado',
  guardia_urgencias: 'Guardia urgencias',
  drp:               'DRP',
  privado:           'Privado',
  simulacro:         'Simulacro',
  formacion:         'Formación',
  sin_asignar:       'Sin asignar',
}

export function VehiculosScreen() {
  const { data: flota, isLoading: flotaLoading, isError: flotaError } = useFlotaCompleta()
  const personal = usePersonalEnTurno()
  const { run, isSubmitting, error } = useActualizarVehiculo()

  const [selectedMatricula, setSelectedMatricula] = useState<string | null>(null)
  const [estadoDestino, setEstadoDestino] = useState<EstadoOperativo | ''>('')
  const [tipoServicio, setTipoServicio]   = useState<TipoServicio>('sin_asignar')
  const [pilot, setPilot] = useState('')
  const [carry, setCarry] = useState(NO_CARRY)
  const [kmInicio, setKmInicio] = useState<number | ''>('')
  const [kmFin, setKmFin] = useState<number | ''>('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const selectedVehiculo = useMemo<VehiculoFila | null>(
    () => flota.find((v) => v.matricula === selectedMatricula) ?? null,
    [flota, selectedMatricula],
  )

  // Auto-seleccionar pilot si solo hay 1 presente
  useEffect(() => {
    if (!pilot && personal.data.length === 1) {
      setPilot(personal.data[0].id_nombre)
    }
  }, [personal.data, pilot])

  // Cuando cambia el vehículo seleccionado, resetear el form parcial
  useEffect(() => {
    if (!selectedVehiculo) return
    setEstadoDestino(selectedVehiculo.estado_operativo as EstadoOperativo)
    setFeedback(null)
  }, [selectedVehiculo])

  const carryOptions = useMemo(
    () => personal.data.filter((p) => p.id_nombre !== pilot),
    [personal.data, pilot],
  )

  // Decidir qué inputs requiere la transición
  const isActivarTransition = estadoDestino === 'activado' && selectedVehiculo?.estado_operativo !== 'activado'
  const isDesactivarTransition = selectedVehiculo?.estado_operativo === 'activado' && estadoDestino !== '' && estadoDestino !== 'activado'

  const submitDisabled =
    !selectedVehiculo ||
    !estadoDestino ||
    isSubmitting ||
    (isActivarTransition && (!pilot || kmInicio === '' || Number(kmInicio) < 0)) ||
    (isDesactivarTransition && (kmFin === '' || Number(kmFin) < 0))

  async function onSubmit() {
    if (!selectedVehiculo || !estadoDestino) return
    setFeedback(null)
    const result = await run({
      matricula:      selectedVehiculo.matricula,
      estado_destino: estadoDestino,
      tipo_servicio:  tipoServicio,
      pilot:          pilot || null,
      carry:          carry === NO_CARRY ? null : carry,
      km_inicio:      isActivarTransition && kmInicio !== '' ? Number(kmInicio) : null,
      km_fin:         isDesactivarTransition && kmFin !== '' ? Number(kmFin)    : null,
    })
    if (result) {
      setFeedback(
        result.online
          ? `Vehículo ${result.matricula} → ${ESTADO_LABELS[result.estado_operativo]}.`
          : `Cambio encolado (offline). Se aplicará al reconectar.`,
      )
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* ─── Zona superior: lista de la flota ───────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Car aria-hidden="true" className="size-5" />
            Selector de flota
            <Badge variant="outline">{flota.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {flotaLoading && (
            <div className="space-y-2 p-3" role="status" aria-label="Cargando flota">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}
          {!flotaLoading && flotaError && (
            <p className="px-4 py-6 text-sm text-destructive">No se pudo cargar la flota.</p>
          )}
          {!flotaLoading && !flotaError && flota.length === 0 && (
            <p className="px-4 py-6 text-sm font-light text-muted-foreground">
              No hay vehículos en la flota.
            </p>
          )}
          {!flotaLoading && !flotaError && flota.length > 0 && (
            <ul className="divide-y divide-border" role="listbox" aria-label="Flota de vehículos">
              {flota.map((v) => {
                const isSelected = v.matricula === selectedMatricula
                const Icon = ESTADO_ICON[v.estado_operativo as EstadoOperativo] ?? Disc3
                return (
                  <li key={v.matricula}>
                    <button
                      type="button"
                      onClick={() => setSelectedMatricula(v.matricula)}
                      aria-selected={isSelected}
                      role="option"
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                      <div className="flex flex-1 flex-col leading-tight">
                        <span className="font-bold">{v.matricula}</span>
                        <span className="text-xs font-light text-muted-foreground">{v.tipo}</span>
                      </div>
                      <Badge variant={estadoVariant(v.estado_operativo)}>
                        {ESTADO_LABELS[v.estado_operativo as EstadoOperativo] ?? v.estado_operativo}
                      </Badge>
                      <Badge variant={condicionVariant(v.condicion_tecnica)}>
                        {CONDICION_LABEL[v.condicion_tecnica] ?? v.condicion_tecnica}
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ─── Zona media: gestión del vehículo seleccionado ───────── */}
      {selectedVehiculo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ArrowLeftRight aria-hidden="true" className="size-4" />
              Estado de {selectedVehiculo.matricula}
            </CardTitle>
            <Badge variant={condicionVariant(selectedVehiculo.condicion_tecnica)}>
              <ShieldAlert aria-hidden="true" className="size-3" />
              {CONDICION_LABEL[selectedVehiculo.condicion_tecnica] ?? selectedVehiculo.condicion_tecnica}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Estado destino
                </span>
                <Select value={estadoDestino} onValueChange={(v) => setEstadoDestino(v as EstadoOperativo)} disabled={isSubmitting}>
                  <SelectTrigger aria-label="Estado destino">
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADO_LABELS) as EstadoOperativo[]).map((e) => (
                      <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {isActivarTransition && (
                <>
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
                          <SelectItem key={p.id_nombre} value={p.id_nombre}>{p.nombre_real}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

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
                </>
              )}

              {isDesactivarTransition && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Kilómetros fin
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
              )}
            </div>

            {/* ─── Zona inferior: tipo de servicio ───────────── */}
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Tipo de servicio
              </h3>
              <Select value={tipoServicio} onValueChange={(v) => setTipoServicio(v as TipoServicio)} disabled={isSubmitting}>
                <SelectTrigger aria-label="Tipo de servicio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_SERVICIO_LABELS) as TipoServicio[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_SERVICIO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div role="alert" aria-live="polite" className="min-h-5 text-sm">
              {error && <span className="text-destructive">{error}</span>}
              {feedback && <span className="text-muted-foreground">{feedback}</span>}
            </div>

            <Button className="w-full" onClick={onSubmit} disabled={submitDisabled}>
              {isSubmitting ? 'Aplicando…' : 'Aplicar cambios'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
