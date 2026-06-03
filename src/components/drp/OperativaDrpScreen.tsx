import { useState } from 'react'
import { Activity, Car, RefreshCw, Users, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
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
import { useDrp } from '@/hooks/useDrp'
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useAuthStore } from '@/stores/useAuthStore'

export function OperativaDrpScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const {
    drps,
    drpActivo,
    dotaciones,
    personal,
    loading,
    error,
    cargarDrps,
    cargarDetalle,
    agregarDotacion,
    agregarPersonal,
  } = useDrp()

  const { data: flota } = useFlotaCompleta()
  const [matriculaInput, setMatriculaInput] = useState('')
  const [matriculaError, setMatriculaError] = useState('')
  const [nombreInput, setNombreInput] = useState('')
  const [zonaInput, setZonaInput] = useState('')
  const [nombreError, setNombreError] = useState('')
  const [actingDot, setActingDot] = useState(false)
  const [actingPers, setActingPers] = useState(false)

  // Seleccionar el DRP activo/en preparación
  const drpSeleccionado =
    drpActivo ?? drps.find((d) => d.estado === 'En_curso' || d.estado === 'En_preparacion') ?? null

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          La operativa DRP requiere conexión en tiempo real.
        </p>
      </div>
    )
  }

  async function handleVerDetalle(idDrp: string) {
    await cargarDetalle(idDrp)
  }

  async function handleAgregarDotacion() {
    if (!drpSeleccionado) return
    if (!matriculaInput.trim()) {
      setMatriculaError('Introduce la matrícula')
      return
    }
    setMatriculaError('')
    setActingDot(true)
    const ok = await agregarDotacion(drpSeleccionado.id_drp, matriculaInput.trim().toUpperCase())
    if (ok) setMatriculaInput('')
    setActingDot(false)
  }

  async function handleAgregarPersonal() {
    if (!drpSeleccionado) return
    if (!nombreInput.trim()) {
      setNombreError('Introduce el identificador del trabajador')
      return
    }
    setNombreError('')
    setActingPers(true)
    const ok = await agregarPersonal(
      drpSeleccionado.id_drp,
      nombreInput.trim(),
      zonaInput.trim() || undefined
    )
    if (ok) {
      setNombreInput('')
      setZonaInput('')
    }
    setActingPers(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Operativa DRP</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={cargarDrps}
          disabled={loading}
          aria-label="Recargar"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Selector de DRP */}
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : drps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay DRPs activos. Créalo desde «Crear DRP».
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Seleccionar DRP</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {drps
              .filter((d) => d.estado === 'En_curso' || d.estado === 'En_preparacion')
              .map((d) => (
                <Button
                  key={d.id_drp}
                  size="sm"
                  variant={drpSeleccionado?.id_drp === d.id_drp ? 'default' : 'outline'}
                  onClick={() => handleVerDetalle(d.id_drp)}
                >
                  #{d.id_drp.slice(0, 8).toUpperCase()}
                  <Badge variant={d.estado === 'En_curso' ? 'ok' : 'warn'} className="ml-1">
                    {d.estado}
                  </Badge>
                </Button>
              ))}
          </CardContent>
        </Card>
      )}

      {drpSeleccionado && (
        <>
          {/* Dotación vehicular */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-sm">
                <Car aria-hidden="true" className="size-4" />
                Dotación vehicular
                <Badge variant="secondary">{dotaciones.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dotaciones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dotaciones.map((d) => (
                    <Badge key={d.matricula} variant="outline">
                      {d.matricula}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Field className="flex-1">
                  <FieldLabel htmlFor="op-matricula">Vehículo</FieldLabel>
                  <Select
                    value={matriculaInput}
                    onValueChange={(v) => {
                      setMatriculaInput(v)
                      setMatriculaError('')
                    }}
                    disabled={actingDot}
                  >
                    <SelectTrigger id="op-matricula" aria-invalid={!!matriculaError}>
                      <SelectValue placeholder="Seleccionar vehículo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {flota.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          Sin vehículos disponibles
                        </SelectItem>
                      ) : (
                        <SelectGroup>
                          <SelectLabel>Flota</SelectLabel>
                          {flota.map((v) => (
                            <SelectItem key={v.matricula} value={v.matricula}>
                              <span className="font-mono font-semibold">
                                {v.vehiculo_id ?? v.matricula}
                              </span>
                              {v.vehiculo_id && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({v.matricula})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  {matriculaError && <FieldError errors={[{ message: matriculaError }]} />}
                </Field>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={handleAgregarDotacion}
                    disabled={actingDot}
                    aria-label="Agregar vehículo a dotación"
                  >
                    {actingDot ? 'Agregando…' : 'Agregar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal a pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-sm">
                <Users aria-hidden="true" className="size-4" />
                Personal a pie
                <Badge variant="secondary">{personal.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {personal.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {personal.map((p) => (
                    <Badge key={p.id_nombre} variant="secondary">
                      {p.id_nombre}
                      {p.zona_asignada ? ` — ${p.zona_asignada}` : ''}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="op-nombre">Identificador</FieldLabel>
                  <Input
                    id="op-nombre"
                    placeholder="Ej. jjmartinez"
                    value={nombreInput}
                    onChange={(e) => setNombreInput(e.target.value)}
                    disabled={actingPers}
                    aria-invalid={!!nombreError}
                  />
                  {nombreError && <FieldError errors={[{ message: nombreError }]} />}
                </Field>
                <Field>
                  <FieldLabel htmlFor="op-zona">
                    Zona <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Input
                    id="op-zona"
                    placeholder="Ej. Sector Norte"
                    value={zonaInput}
                    onChange={(e) => setZonaInput(e.target.value)}
                    disabled={actingPers}
                  />
                </Field>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleAgregarPersonal}
                disabled={actingPers}
                aria-label="Agregar personal a pie al DRP"
              >
                {actingPers ? 'Agregando…' : 'Agregar personal a pie'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {ejecutorId && !drpSeleccionado && drps.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Pulsa un DRP activo arriba para ver su operativa.
        </p>
      )}
    </div>
  )
}
