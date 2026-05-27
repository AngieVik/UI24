import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  HeartPulse,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useInformes, type DatosPaciente, type InformeSVB } from '@/hooks/useInformes'

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Formulario de informe ─────────────────────────────────────

interface InformeFormProps {
  datos:       DatosPaciente
  readOnly:    boolean
  onChange:    (datos: DatosPaciente) => void
}

function InformeForm({ datos, readOnly, onChange }: InformeFormProps) {
  function field(key: keyof DatosPaciente, label: string, type: 'text' | 'number' = 'text') {
    const value = datos[key]
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={`inf-${key}`} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <Input
          id={`inf-${key}`}
          type={type}
          disabled={readOnly}
          value={type === 'number' ? (value != null ? String(value) : '') : (value as string ?? '')}
          onChange={(e) => {
            const v = type === 'number'
              ? (e.target.value === '' ? undefined : Number(e.target.value))
              : (e.target.value || undefined)
            onChange({ ...datos, [key]: v })
          }}
          className="h-8 text-sm"
          placeholder={readOnly ? '—' : `Introducir ${label.toLowerCase()}…`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Datos del paciente */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {field('nombre', 'Nombre paciente')}
        {field('edad', 'Edad', 'number')}
        {field('motivo', 'Motivo')}
        {field('tratamiento', 'Tratamiento')}
        {field('destino', 'Destino')}
      </div>

      {/* Constantes vitales */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Constantes vitales
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(['fc', 'tas', 'tad', 'spo2', 'glc', 'temp'] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <Label htmlFor={`const-${k}`} className="text-xs text-muted-foreground">
                {k.toUpperCase()}
              </Label>
              <Input
                id={`const-${k}`}
                type="number"
                disabled={readOnly}
                value={datos.constantes?.[k] != null ? String(datos.constantes[k]) : ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value)
                  onChange({
                    ...datos,
                    constantes: { ...datos.constantes, [k]: v },
                  })
                }}
                className="h-8 text-sm"
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Observaciones */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="inf-obs" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Observaciones
        </Label>
        <Textarea
          id="inf-obs"
          disabled={readOnly}
          value={datos.observaciones ?? ''}
          onChange={(e) => onChange({ ...datos, observaciones: e.target.value || undefined })}
          rows={3}
          placeholder={readOnly ? '—' : 'Observaciones clínicas…'}
          className="resize-none text-sm"
        />
      </div>
    </div>
  )
}

// ── Fila de informe ───────────────────────────────────────────

interface InformeRowProps {
  informe:      InformeSVB
  onCerrar:     (id: string, datos: DatosPaciente) => void
  isSubmitting: boolean
}

function InformeRow({ informe, onCerrar, isSubmitting }: InformeRowProps) {
  const [open, setOpen]   = useState(false)
  const [datos, setDatos] = useState<DatosPaciente>(informe.datos_paciente)
  const isCerrado         = informe.estado === 'cerrado'

  return (
    <Card aria-label={`Informe ${informe.id_doc.slice(0, 8)}`}>
      <CardHeader
        className="cursor-pointer select-none pb-2"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              : <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
            <span className="font-body text-sm font-medium">
              #{informe.id_doc.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              {fmtDateTime(informe.timestamp_asistencia)}
            </span>
          </div>
          <Badge
            variant={isCerrado ? 'secondary' : 'ok'}
            aria-label={isCerrado ? 'cerrado' : 'borrador'}
          >
            {isCerrado ? (
              <><Lock className="mr-1 size-2.5" aria-hidden="true" />Cerrado</>
            ) : (
              <><Pencil className="mr-1 size-2.5" aria-hidden="true" />Borrador</>
            )}
          </Badge>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <InformeForm datos={datos} readOnly={isCerrado} onChange={setDatos} />
          {!isCerrado && (
            <Button
              size="sm"
              onClick={() => onCerrar(informe.id_doc, datos)}
              disabled={isSubmitting}
              aria-label={`Cerrar informe ${informe.id_doc.slice(0, 8)}`}
            >
              <Lock aria-hidden="true" className="size-4" />
              {isSubmitting ? 'Guardando…' : 'Cerrar informe'}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Pantalla principal ────────────────────────────────────────

export function Doc2InformeAsistencialScreen() {
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const {
    informes, isLoading, isSubmitting, error,
    cargarInformes, crearInforme, cerrarInforme,
  } = useInformes()

  const [newDatos, setNewDatos]  = useState<DatosPaciente>({})
  const [showNew, setShowNew]    = useState(false)
  const [feedback, setFeedback]  = useState<string | null>(null)

  useEffect(() => {
    if (idActivacion) cargarInformes()
  }, [idActivacion, cargarInformes])

  // Gate: sin vehículo activo
  if (!idActivacion) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <HeartPulse aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">
          Doc-2 — Informe asistencial
        </h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay turno activo. Inicia un turno desde Operativa → Vehículos.
        </p>
      </div>
    )
  }

  async function handleNuevoInforme() {
    setFeedback(null)
    const id = await crearInforme(newDatos)
    if (id) {
      setNewDatos({})
      setShowNew(false)
      setFeedback('Informe creado.')
    }
  }

  async function handleCerrar(idDoc: string, datos: DatosPaciente) {
    setFeedback(null)
    const ok = await cerrarInforme(idDoc, datos)
    if (ok) setFeedback('Informe cerrado.')
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold leading-tight">
            Doc-2 — Informe asistencial
          </h2>
          <Badge variant="secondary" aria-label={`${informes.length} informes`}>
            {informes.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={cargarInformes}
            disabled={isLoading}
            aria-label="Recargar informes"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNew((v) => !v)}
            aria-label="Nuevo informe asistencial"
          >
            <Plus aria-hidden="true" className="size-4" />
            Nuevo informe
          </Button>
        </div>
      </div>

      {/* Error / feedback */}
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      {feedback && (
        <p role="status" className="text-sm text-muted-foreground">{feedback}</p>
      )}

      {/* Formulario nuevo informe */}
      {showNew && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <FilePlus aria-hidden="true" className="size-4" />
              Nuevo informe asistencial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InformeForm datos={newDatos} readOnly={false} onChange={setNewDatos} />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleNuevoInforme}
                disabled={isSubmitting}
                aria-label="Crear informe"
              >
                {isSubmitting ? 'Guardando…' : 'Crear informe'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowNew(false); setNewDatos({}) }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de informes */}
      {isLoading ? (
        <div role="status" aria-label="Cargando informes" className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : informes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-body text-sm text-muted-foreground">
              Sin informes en este turno. Crea el primero con "Nuevo informe".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {informes.map((inf) => (
            <InformeRow
              key={inf.id_doc}
              informe={inf}
              onCerrar={handleCerrar}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
