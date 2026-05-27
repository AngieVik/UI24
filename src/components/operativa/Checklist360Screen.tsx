import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckSquare,
  AlertTriangle,
  XCircle,
  MinusCircle,
  CheckCircle2,
  ClipboardList,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useChecklist360Activo } from '@/hooks/useChecklist360Activo'
import { useChecklist360Anterior } from '@/hooks/useChecklist360Anterior'
import { useCerrarChecklist360 } from '@/hooks/useCerrarChecklist360'
import {
  CHECKLIST_SECTIONS,
  getVisibleItems,
  type ChecklistItem,
  type ChecklistSection,
  type EstadoEvaluacion,
} from '@/data/checklist360Catalog'

// ── Tipo exportado — usado en useCerrarChecklist360 ───────────

export interface ItemRespuesta {
  estado:               EstadoEvaluacion
  campos_extra:         Record<string, string | string[]>
  es_incidencia_heredada: boolean
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_CONFIG: Record<EstadoEvaluacion, {
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  btnClass: string
  activeClass: string
}> = {
  OK: {
    label: 'Correcto',
    shortLabel: 'OK',
    icon: CheckCircle2,
    btnClass:   'border-green-200 text-green-700 hover:bg-green-50',
    activeClass: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
  },
  OBSERVACION: {
    label: 'Observación',
    shortLabel: 'OBS',
    icon: AlertTriangle,
    btnClass:   'border-amber-200 text-amber-700 hover:bg-amber-50',
    activeClass: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
  },
  INOPERATIVO: {
    label: 'Inoperativo',
    shortLabel: 'INO',
    icon: XCircle,
    btnClass:   'border-red-200 text-red-700 hover:bg-red-50',
    activeClass: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
  },
  NO_APLICA: {
    label: 'No aplica',
    shortLabel: 'N/A',
    icon: MinusCircle,
    btnClass:   'border-zinc-200 text-zinc-500 hover:bg-zinc-50',
    activeClass: 'bg-zinc-400 text-white border-zinc-400 hover:bg-zinc-500',
  },
}

// ── Sub-componente: botones de estado ─────────────────────────

interface EstadoButtonsProps {
  itemId:   string
  current:  EstadoEvaluacion | null
  disabled: boolean
  onChange: (estado: EstadoEvaluacion) => void
}

function EstadoButtons({ itemId, current, disabled, onChange }: EstadoButtonsProps) {
  const estados: EstadoEvaluacion[] = ['OK', 'OBSERVACION', 'INOPERATIVO', 'NO_APLICA']

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Estado del ítem ${itemId}`}>
      {estados.map((estado) => {
        const cfg     = ESTADO_CONFIG[estado]
        const isActive = current === estado
        const Icon     = cfg.icon

        return (
          <button
            key={estado}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={`${cfg.label} — ${itemId}`}
            onClick={() => onChange(estado)}
            className={[
              'inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isActive ? cfg.activeClass : cfg.btnClass,
            ].join(' ')}
          >
            <Icon className="size-3" aria-hidden="true" />
            {cfg.shortLabel}
          </button>
        )
      })}
    </div>
  )
}

// ── Sub-componente: campos extra ──────────────────────────────

import { SubField } from '@/data/checklist360Catalog'

interface SubFieldsProps {
  subFields: SubField[]
  values:    Record<string, string | string[]>
  disabled:  boolean
  onChange:  (key: string, value: string | string[]) => void
}

function SubFields({ subFields, values, disabled, onChange }: SubFieldsProps) {
  return (
    <div className="mt-3 space-y-2.5 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2.5">
      {subFields.map((field) => {
        const value = values[field.key] ?? (field.type === 'multiselect' ? [] : '')

        return (
          <div key={field.key}>
            <label
              htmlFor={`subfield-${field.key}`}
              className="block text-xs font-medium text-foreground/80"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              )}
            </label>

            {field.type === 'text' ? (
              <input
                id={`subfield-${field.key}`}
                type="text"
                disabled={disabled}
                value={value as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder="Descripción breve…"
                className={[
                  'mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'border-input',
                ].join(' ')}
              />
            ) : field.type === 'select' ? (
              <select
                id={`subfield-${field.key}`}
                disabled={disabled}
                value={value as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={[
                  'mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'border-input',
                ].join(' ')}
              >
                <option value="">— Seleccionar —</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              /* multiselect */
              <div
                id={`subfield-${field.key}`}
                role="group"
                aria-label={field.label}
                className="mt-1 flex flex-wrap gap-1.5"
              >
                {field.options?.map((opt) => {
                  const isSelected = (value as string[]).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() => {
                        const arr = value as string[]
                        onChange(
                          field.key,
                          isSelected ? arr.filter((v) => v !== opt) : [...arr, opt],
                        )
                      }}
                      className={[
                        'rounded border px-2 py-0.5 text-xs transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-ring',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-amber-200 text-amber-700 hover:bg-amber-100',
                      ].join(' ')}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Sub-componente: fila de ítem ──────────────────────────────

interface ItemRowProps {
  item:        ChecklistItem
  respuesta:   ItemRespuesta | null
  disabled:    boolean
  onChangeEstado:     (id: string, estado: EstadoEvaluacion) => void
  onChangeCampoExtra: (id: string, key: string, value: string | string[]) => void
}

function ItemRow({ item, respuesta, disabled, onChangeEstado, onChangeCampoExtra }: ItemRowProps) {
  const estado        = respuesta?.estado ?? null
  const camposExtra   = respuesta?.campos_extra ?? {}
  const esHeredado    = respuesta?.es_incidencia_heredada ?? false
  const tieneSubCampos = estado === 'OBSERVACION' || estado === 'INOPERATIVO'

  return (
    <div
      aria-label={`Ítem: ${item.label}`}
      className="rounded-md border bg-card px-3 py-2.5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-sm leading-snug text-foreground">{item.label}</p>

        {esHeredado && (
          <Badge variant="warn" aria-label="incidencia heredada del turno anterior">
            <Info className="size-2.5" aria-hidden="true" />
            Heredado
          </Badge>
        )}
      </div>

      {/* Herencia especial: ítem con incidencias del turno anterior */}
      {esHeredado && item.id === 'danos_previos_chapa' && (
        <div
          aria-label="daños heredados del turno anterior"
          className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800"
        >
          <p className="font-medium">Daños reportados en el turno anterior:</p>
          {camposExtra.nuevo_dano_detectado && (
            <p className="mt-1">🔴 {String(camposExtra.nuevo_dano_detectado)}</p>
          )}
          <div className="mt-2 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              aria-label="todo sigue igual — heredar daños del turno anterior"
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => {
                // Hereda el estado y mantiene campos_extra
                onChangeEstado(item.id, 'OBSERVACION')
              }}
            >
              Todo sigue igual
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              aria-label="modificar o añadir daños"
              className="h-7 text-xs"
              onClick={() => {
                // Deja el formulario abierto para editar
                onChangeEstado(item.id, 'OBSERVACION')
              }}
            >
              Modificar / añadir daños
            </Button>
          </div>
        </div>
      )}

      <EstadoButtons
        itemId={item.id}
        current={estado}
        disabled={disabled}
        onChange={(e) => onChangeEstado(item.id, e)}
      />

      {tieneSubCampos && item.subFields.length > 0 && (
        <SubFields
          subFields={item.subFields}
          values={camposExtra}
          disabled={disabled}
          onChange={(key, value) => onChangeCampoExtra(item.id, key, value)}
        />
      )}
    </div>
  )
}

// ── Sub-componente: sección ───────────────────────────────────

interface SectionCardProps {
  section:    ChecklistSection
  respuestas: Record<string, ItemRespuesta | null>
  esVIR:      boolean
  disabled:   boolean
  onChangeEstado:     (id: string, estado: EstadoEvaluacion) => void
  onChangeCampoExtra: (id: string, key: string, value: string | string[]) => void
}

function SectionCard({
  section, respuestas, esVIR, disabled,
  onChangeEstado, onChangeCampoExtra,
}: SectionCardProps) {
  const visibleItems = section.items.filter((item) => !item.soloVIR || esVIR)
  if (visibleItems.length === 0) return null

  const totalItems    = visibleItems.length
  const itemsEval     = visibleItems.filter((i) => respuestas[i.id]?.estado).length
  const todosEvaluados = itemsEval === totalItems

  return (
    <Card aria-label={`Sección: ${section.label}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm font-semibold uppercase tracking-wide">
            {section.label}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="font-body text-xs text-muted-foreground">
              {itemsEval}/{totalItems}
            </span>
            {todosEvaluados && (
              <Badge variant="ok" aria-label={`sección ${section.label} completada`}>
                <CheckCircle2 className="size-2.5" aria-hidden="true" />
                Listo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            respuesta={respuestas[item.id] ?? null}
            disabled={disabled}
            onChangeEstado={onChangeEstado}
            onChangeCampoExtra={onChangeCampoExtra}
          />
        ))}
      </CardContent>
    </Card>
  )
}

// ── Sub-componente: vista de checklist cerrado (readonly) ─────

interface ChecklistCerradoViewProps {
  data: ReturnType<typeof useChecklist360Activo>['data']
}

function ChecklistCerradoView({ data }: ChecklistCerradoViewProps) {
  if (!data) return null

  const items      = data.items_revisados as Record<string, ItemRespuesta>
  const incidencias = Object.entries(items).filter(
    ([, r]) => r.estado === 'OBSERVACION' || r.estado === 'INOPERATIVO',
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="size-5 text-green-600" aria-hidden="true" />
            <div>
              <p className="font-body text-sm font-medium">Revisión 360° completada</p>
              <p className="font-body text-xs text-muted-foreground">
                {fmtDateTime(data.timestamp_cierre)}
              </p>
            </div>
            <Badge variant="ok" className="ml-auto" aria-label="checklist completado">
              Completado
            </Badge>
          </div>
        </CardContent>
      </Card>

      {incidencias.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-semibold uppercase tracking-wide">
              Incidencias registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incidencias.map(([itemId, r]) => {
              const cfg = ESTADO_CONFIG[r.estado]
              return (
                <div key={itemId} className="flex items-start gap-2 text-sm">
                  <cfg.icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-medium">{itemId}</span>
                    {Object.keys(r.campos_extra ?? {}).length > 0 && (
                      <p className="font-body text-xs text-muted-foreground">
                        {Object.values(r.campos_extra)
                          .map((v) => (Array.isArray(v) ? v.join(', ') : v))
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Contenido principal ───────────────────────────────────────

interface ChecklistContentProps {
  idChecklist: string
  matricula:   string
}

function ChecklistContent({ idChecklist, matricula }: ChecklistContentProps) {
  // ── Datos ───────────────────────────────────────────────────
  const { data: checklist, isLoading, isError } = useChecklist360Activo(idChecklist)
  const { anterior, isLoading: isLoadingAnterior } = useChecklist360Anterior(matricula)
  const { cerrar, isSubmitting, error: submitError } = useCerrarChecklist360()

  // ── Tipo de vehículo (VIR) ──────────────────────────────────
  const { data: vehiculoData } = useQuery({
    queryKey:  ['vehiculo_tipo', matricula],
    enabled:   !!matricula,
    staleTime: 30 * 60_000, // tipo de vehículo no cambia durante el turno
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('tipo')
        .eq('matricula', matricula)
        .single()
      if (error) throw error
      return data
    },
  })
  const esVIR = vehiculoData?.tipo === 'VIR'

  // ── Estado local del formulario ─────────────────────────────
  const visibleItems  = getVisibleItems(esVIR)
  const [respuestas, setRespuestas] = useState<Record<string, ItemRespuesta>>({})
  const [heredadoInit, setHeredadoInit] = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [submitResult, setSubmitResult] = useState<'ok' | 'queued' | null>(null)

  // Pre-cargar herencia una sola vez cuando anterior está disponible
  useEffect(() => {
    if (heredadoInit) return
    if (isLoadingAnterior) return
    if (Object.keys(anterior).length === 0) {
      setHeredadoInit(true)
      return
    }

    // Solo pre-cargar ítems con incidencias (OBS o INO)
    const preloaded: Record<string, ItemRespuesta> = {}
    for (const [itemId, r] of Object.entries(anterior)) {
      if (r.estado === 'OBSERVACION' || r.estado === 'INOPERATIVO') {
        // Verificar que el ítem es visible (VIR check)
        const itemVisible = visibleItems.some((i) => i.id === itemId)
        if (itemVisible) {
          preloaded[itemId] = {
            ...r,
            es_incidencia_heredada: true,
          }
        }
      }
    }
    if (Object.keys(preloaded).length > 0) {
      setRespuestas(preloaded)
    }
    setHeredadoInit(true)
  }, [anterior, isLoadingAnterior, heredadoInit, visibleItems])

  // ── Callbacks ───────────────────────────────────────────────
  const handleChangeEstado = useCallback(
    (itemId: string, estado: EstadoEvaluacion) => {
      setRespuestas((prev) => ({
        ...prev,
        [itemId]: {
          estado,
          campos_extra: prev[itemId]?.campos_extra ?? {},
          es_incidencia_heredada: prev[itemId]?.es_incidencia_heredada ?? false,
        },
      }))
    },
    [],
  )

  const handleChangeCampoExtra = useCallback(
    (itemId: string, key: string, value: string | string[]) => {
      setRespuestas((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          estado: prev[itemId]?.estado ?? 'OBSERVACION',
          campos_extra: {
            ...(prev[itemId]?.campos_extra ?? {}),
            [key]: value,
          },
          es_incidencia_heredada: prev[itemId]?.es_incidencia_heredada ?? false,
        },
      }))
    },
    [],
  )

  // ── Cálculos ────────────────────────────────────────────────
  const totalVisible   = visibleItems.length
  const totalEvaluados = visibleItems.filter((i) => !!respuestas[i.id]?.estado).length
  const todosCompletos = totalEvaluados === totalVisible

  // ── Handlers de envío ───────────────────────────────────────
  async function handleConfirmar() {
    setShowModal(false)
    const result = await cerrar({ id_checklist: idChecklist, respuestas })
    if (result) {
      setSubmitResult(result.online ? 'ok' : 'queued')
    }
  }

  // ── Estados de pantalla ─────────────────────────────────────

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="cargando checklist"
        className="mx-auto max-w-2xl space-y-4 px-4 py-6"
      >
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12 text-center">
        <p className="font-body text-sm text-destructive">
          No se pudo cargar el checklist. Inténtalo de nuevo.
        </p>
      </div>
    )
  }

  // Checklist ya cerrado → vista readonly
  if (checklist?.cerrado) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <h2 className="font-display text-lg font-bold">
          Checklist 360° — Revisión del vehículo
        </h2>
        <ChecklistCerradoView data={checklist} />
      </div>
    )
  }

  // Resultado tras guardar (online o encolado offline)
  if (submitResult) {
    return (
      <div
        role="status"
        aria-label={submitResult === 'ok' ? 'checklist completado' : 'checklist encolado offline'}
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckSquare className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">
          {submitResult === 'ok' ? '¡Revisión 360° completada!' : 'Revisión encolada offline'}
        </h2>
        <p className="font-body text-sm text-muted-foreground">
          {submitResult === 'ok'
            ? 'El checklist se ha guardado correctamente.'
            : 'El checklist se guardará automáticamente cuando recuperes la conexión.'}
        </p>
      </div>
    )
  }

  // Formulario activo
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold leading-tight">
          Checklist 360° — Revisión del vehículo
        </h2>
        <Badge
          variant="info"
          aria-label={`${totalEvaluados} de ${totalVisible} ítems evaluados`}
        >
          {totalEvaluados}/{totalVisible}
        </Badge>
      </div>

      {/* Matricula + fecha */}
      <Card>
        <CardContent className="flex items-center justify-between pt-4 pb-3">
          <div>
            <p className="font-body text-xs text-muted-foreground">Vehículo</p>
            <p
              className="font-display text-base font-semibold"
              aria-label={`matrícula ${matricula}`}
            >
              {matricula}
            </p>
          </div>
          {esVIR && (
            <Badge variant="accent" aria-label="vehículo tipo VIR">
              VIR 4x4
            </Badge>
          )}
          <div className="text-right">
            <p className="font-body text-xs text-muted-foreground">Inicio revisión</p>
            <p className="font-body text-sm">
              {fmtDateTime(checklist?.timestamp_inicio)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error de envío */}
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      {/* Secciones */}
      {CHECKLIST_SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          respuestas={respuestas}
          esVIR={esVIR}
          disabled={isSubmitting}
          onChangeEstado={handleChangeEstado}
          onChangeCampoExtra={handleChangeCampoExtra}
        />
      ))}

      {/* Botón flotante de envío */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-4 py-3 shadow-md">
        <Button
          type="button"
          disabled={!todosCompletos || isSubmitting}
          onClick={() => setShowModal(true)}
          className="w-full"
          aria-label={
            todosCompletos
              ? 'completar revisión 360°'
              : `faltan ${totalVisible - totalEvaluados} ítems por evaluar`
          }
        >
          <CheckSquare className="mr-2 size-4" aria-hidden="true" />
          {isSubmitting
            ? 'Guardando…'
            : todosCompletos
            ? 'Completar revisión 360°'
            : `Faltan ${totalVisible - totalEvaluados} ítems`}
        </Button>
      </div>

      {/* Modal de confirmación */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent aria-describedby="checklist-confirm-description">
          <DialogHeader>
            <DialogTitle>Confirmar revisión 360°</DialogTitle>
            <DialogDescription id="checklist-confirm-description">
              {(() => {
                const incidencias = visibleItems.filter(
                  (i) => respuestas[i.id]?.estado === 'OBSERVACION' || respuestas[i.id]?.estado === 'INOPERATIVO',
                ).length
                return incidencias > 0
                  ? `Se han registrado ${incidencias} incidencia${incidencias !== 1 ? 's' : ''}. El sistema generará avisos de avería automáticamente. ¿Confirmar y cerrar la revisión?`
                  : '¿Confirmar y cerrar la revisión? No se han detectado incidencias.'
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              aria-label="cancelar confirmación"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              aria-label="confirmar revisión 360°"
            >
              Confirmar revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────

export function Checklist360Screen() {
  const idChecklist = useActivacionStore((s) => s.id_checklist)
  const matricula   = useActivacionStore((s) => s.matricula)

  // Gate: sin vehículo activado (checklist es exclusivo del vehículo)
  if (!idChecklist || !matricula) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <ClipboardList aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">
          Checklist 360° — Revisión del vehículo
        </h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay vehículo activado. Ve a Operativa → Vehículos para activar uno.
        </p>
      </div>
    )
  }

  return <ChecklistContent idChecklist={idChecklist} matricula={matricula} />
}
