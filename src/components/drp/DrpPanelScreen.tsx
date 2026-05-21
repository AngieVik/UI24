import { useEffect, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useDrp, type DrpRecord } from '@/hooks/useDrp'
import { useGlobalStore } from '@/stores/useGlobalStore'

type Accion = 'preparar' | 'iniciar' | 'finalizar' | 'archivar'

const ESTADO_LABEL: Record<string, string> = {
  En_espera:          'En espera',
  En_preparacion:     'En preparación',
  En_curso:           'En curso',
  Finalizado:         'Finalizado',
  Finalizado_Retenido:'Retenido',
  Archivado:          'Archivado',
  Cancelado:          'Cancelado',
}

const ESTADO_TONE: Record<string, 'ok' | 'warn' | 'crit' | 'info'> = {
  En_espera:           'info',
  En_preparacion:      'warn',
  En_curso:            'ok',
  Finalizado:          'info',
  Finalizado_Retenido: 'crit',
  Archivado:           'info',
  Cancelado:           'crit',
}

function accionesPosibles(estado: string): Accion[] {
  switch (estado) {
    case 'En_espera':      return ['preparar']
    case 'En_preparacion': return ['iniciar']
    case 'En_curso':       return ['finalizar']
    case 'Finalizado':     return ['archivar']
    case 'Cancelado':      return ['archivar']
    default:               return []
  }
}

const ACCION_LABEL: Record<Accion, string> = {
  preparar:  'Preparar',
  iniciar:   'Iniciar',
  finalizar: 'Finalizar',
  archivar:  'Archivar',
}

interface ConfirmState {
  tipo: 'transicion' | 'cancelar'
  idDrp: string
  accion?: Accion
  label: string
}

export function DrpPanelScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const {
    drps, dotaciones, personal, descuadresPendientes,
    loading, error, setError,
    cargarDetalle,
    crearDrp, transicionarDrp, cancelarDrp,
    agregarDotacion, agregarPersonal,
    resolverDescuadre,
  } = useDrp()

  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [inputMatricula, setInputMatricula] = useState('')
  const [inputPersonal, setInputPersonal] = useState('')
  const [inputZona, setInputZona] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (seleccionado) cargarDetalle(seleccionado)
  }, [seleccionado, cargarDetalle])

  async function handleCrear() {
    if (!isOnline) return
    setSubmitting(true)
    const id = await crearDrp()
    if (id) setSeleccionado(id)
    setSubmitting(false)
  }

  async function handleTransicion(idDrp: string, accion: Accion) {
    setSubmitting(true)
    const ok = await transicionarDrp(idDrp, accion)
    if (ok && seleccionado) await cargarDetalle(seleccionado)
    setConfirm(null)
    setSubmitting(false)
  }

  async function handleCancelar(idDrp: string) {
    setSubmitting(true)
    const ok = await cancelarDrp(idDrp, motivoCancelacion || undefined)
    if (ok && seleccionado) await cargarDetalle(seleccionado)
    setConfirm(null)
    setMotivoCancelacion('')
    setSubmitting(false)
  }

  async function handleAgregarDotacion() {
    if (!seleccionado || !inputMatricula.trim()) return
    setSubmitting(true)
    const ok = await agregarDotacion(seleccionado, inputMatricula.trim().toUpperCase())
    if (ok) setInputMatricula('')
    setSubmitting(false)
  }

  async function handleAgregarPersonal() {
    if (!seleccionado || !inputPersonal.trim()) return
    setSubmitting(true)
    const ok = await agregarPersonal(seleccionado, inputPersonal.trim(), inputZona.trim() || undefined)
    if (ok) { setInputPersonal(''); setInputZona('') }
    setSubmitting(false)
  }

  async function handleResolver(idDescuadre: string) {
    setSubmitting(true)
    await resolverDescuadre(idDescuadre, 'Resuelto')
    setSubmitting(false)
  }

  if (!isOnline) {
    return (
      <div role="main" className="p-4">
        <p className="text-fg-2 text-sm">El módulo DRP requiere conexión a red.</p>
      </div>
    )
  }

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">Panel DRP</h1>
        <Btn
          variant="primary"
          size="sm"
          onClick={handleCrear}
          disabled={submitting || loading}
          aria-label="Crear nuevo DRP"
        >
          + Nuevo DRP
        </Btn>
      </div>

      {error && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {loading && <LoadingSkeleton variant="row" />}

      {/* Lista de DRPs */}
      {!loading && drps.length === 0 && (
        <p className="text-fg-2 text-sm">No hay DRPs activos.</p>
      )}

      <ul className="space-y-2" aria-label="Lista de DRPs">
        {drps.map((drp) => (
          <li key={drp.id_drp}>
            <button
              className={`w-full text-left rounded p-3 border transition-colors ${
                seleccionado === drp.id_drp
                  ? 'border-u24-yellow bg-u24-yellow/10'
                  : 'border-border-1 bg-surface-1 hover:border-u24-yellow/50'
              }`}
              onClick={() => setSeleccionado(seleccionado === drp.id_drp ? null : drp.id_drp)}
              aria-expanded={seleccionado === drp.id_drp}
              aria-controls={`drp-detail-${drp.id_drp}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-fg-1 font-mono text-xs">{drp.id_drp.slice(0, 8)}…</span>
                <Badge tone={ESTADO_TONE[drp.estado] ?? 'info'}>
                  {ESTADO_LABEL[drp.estado] ?? drp.estado}
                </Badge>
              </div>
              <div className="text-fg-2 text-xs mt-1">
                Coordinación: {drp.id_coordinacion}
                {drp.timestamp_inicio && (
                  <> · Inicio: {new Date(drp.timestamp_inicio).toLocaleTimeString('es-ES')}</>
                )}
              </div>
            </button>

            {seleccionado === drp.id_drp && (
              <div
                id={`drp-detail-${drp.id_drp}`}
                className="border border-border-1 border-t-0 rounded-b bg-surface-2 p-3 space-y-4"
              >
                <DrpDetalle
                  drp={drp}
                  dotaciones={dotaciones}
                  personal={personal}
                  descuadresPendientes={descuadresPendientes}
                  submitting={submitting}
                  inputMatricula={inputMatricula}
                  setInputMatricula={setInputMatricula}
                  inputPersonal={inputPersonal}
                  setInputPersonal={setInputPersonal}
                  inputZona={inputZona}
                  setInputZona={setInputZona}
                  onTransicion={(accion) =>
                    setConfirm({ tipo: 'transicion', idDrp: drp.id_drp, accion, label: ACCION_LABEL[accion] })
                  }
                  onCancelar={() =>
                    setConfirm({ tipo: 'cancelar', idDrp: drp.id_drp, label: 'Cancelar DRP' })
                  }
                  onAgregarDotacion={handleAgregarDotacion}
                  onAgregarPersonal={handleAgregarPersonal}
                  onResolver={handleResolver}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Modal de confirmación */}
      {confirm && (
        <ConfirmModal
          label={confirm.label}
          extra={
            confirm.tipo === 'cancelar' ? (
              <textarea
                className="w-full bg-surface-1 border border-border-1 rounded p-2 text-fg-1 text-sm resize-none"
                rows={2}
                placeholder="Motivo de cancelación (opcional)"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                aria-label="Motivo de cancelación"
              />
            ) : null
          }
          submitting={submitting}
          onConfirm={() => {
            if (confirm.tipo === 'transicion' && confirm.accion) {
              handleTransicion(confirm.idDrp, confirm.accion)
            } else {
              handleCancelar(confirm.idDrp)
            }
          }}
          onCancel={() => { setConfirm(null); setMotivoCancelacion('') }}
        />
      )}
    </div>
  )
}

/* ── Subcomponente: detalle del DRP seleccionado ── */

interface DrpDetalleProps {
  drp: DrpRecord
  dotaciones: ReturnType<typeof useDrp>['dotaciones']
  personal: ReturnType<typeof useDrp>['personal']
  descuadresPendientes: ReturnType<typeof useDrp>['descuadresPendientes']
  submitting: boolean
  inputMatricula: string
  setInputMatricula: (v: string) => void
  inputPersonal: string
  setInputPersonal: (v: string) => void
  inputZona: string
  setInputZona: (v: string) => void
  onTransicion: (accion: Accion) => void
  onCancelar: () => void
  onAgregarDotacion: () => void
  onAgregarPersonal: () => void
  onResolver: (id: string) => void
}

function DrpDetalle({
  drp, dotaciones, personal, descuadresPendientes,
  submitting,
  inputMatricula, setInputMatricula,
  inputPersonal, setInputPersonal,
  inputZona, setInputZona,
  onTransicion, onCancelar,
  onAgregarDotacion, onAgregarPersonal, onResolver,
}: DrpDetalleProps) {
  const acciones = accionesPosibles(drp.estado)
  const editable = ['En_espera', 'En_preparacion', 'En_curso'].includes(drp.estado)
  const esFinalRetenido = drp.estado === 'Finalizado_Retenido'

  return (
    <div className="space-y-4">
      {/* Acciones de estado */}
      <div className="flex flex-wrap gap-2 items-center">
        {acciones.map((accion) => (
          <Btn
            key={accion}
            variant={accion === 'finalizar' ? 'primary' : 'secondary'}
            size="sm"
            disabled={submitting}
            onClick={() => onTransicion(accion)}
          >
            {ACCION_LABEL[accion]}
          </Btn>
        ))}
        {!['Finalizado','Finalizado_Retenido','Archivado','Cancelado'].includes(drp.estado) && (
          <Btn variant="destructive" size="sm" disabled={submitting} onClick={onCancelar}>
            Cancelar DRP
          </Btn>
        )}
      </div>

      {/* Descuadres pendientes — DRP Retenido */}
      {esFinalRetenido && (
        <section aria-labelledby="descuadres-titulo">
          <h2 id="descuadres-titulo" className="text-warn-400 font-cmd text-sm mb-2">
            ⚠ Descuadres pendientes ({descuadresPendientes.length})
          </h2>
          {descuadresPendientes.length === 0 ? (
            <p className="text-fg-2 text-xs">Cargando descuadres…</p>
          ) : (
            <ul className="space-y-2">
              {descuadresPendientes.map((d) => (
                <li key={d.id_descuadre} className="bg-surface-1 rounded p-2 flex items-center justify-between text-sm">
                  <span className="text-fg-1">
                    Ítem {d.id_item} · {d.location_origen} → {d.location_destino} · Δ {d.cantidad_diferencia}
                  </span>
                  <Btn
                    variant="primary"
                    size="sm"
                    disabled={submitting}
                    onClick={() => onResolver(d.id_descuadre)}
                    aria-label={`Resolver descuadre ítem ${d.id_item}`}
                  >
                    Resolver
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Dotaciones de vehículos */}
      <section aria-labelledby="dotaciones-titulo">
        <h2 id="dotaciones-titulo" className="text-fg-1 font-cmd text-sm mb-2">
          Dotaciones ({dotaciones.filter((d) => !d.timestamp_salida).length} activas)
        </h2>
        {dotaciones.length === 0 ? (
          <p className="text-fg-2 text-xs">Sin vehículos asignados.</p>
        ) : (
          <ul className="space-y-1">
            {dotaciones.map((d) => (
              <li key={d.matricula} className="flex items-center gap-2 text-sm text-fg-1">
                <span className="font-mono">{d.matricula}</span>
                {d.timestamp_salida
                  ? <Badge tone="info">Salida</Badge>
                  : <Badge tone="ok">Activo</Badge>
                }
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form
            className="flex gap-2 mt-2"
            onSubmit={(e) => { e.preventDefault(); onAgregarDotacion() }}
          >
            <input
              type="text"
              className="flex-1 bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
              placeholder="Matrícula"
              value={inputMatricula}
              onChange={(e) => setInputMatricula(e.target.value)}
              aria-label="Matrícula del vehículo"
              maxLength={10}
            />
            <Btn variant="secondary" size="sm" type="submit" disabled={submitting || !inputMatricula.trim()}>
              Añadir
            </Btn>
          </form>
        )}
      </section>

      {/* Personal a pie */}
      <section aria-labelledby="personal-titulo">
        <h2 id="personal-titulo" className="text-fg-1 font-cmd text-sm mb-2">
          Personal a pie ({personal.filter((p) => !p.timestamp_salida).length} activos)
        </h2>
        {personal.length === 0 ? (
          <p className="text-fg-2 text-xs">Sin personal asignado.</p>
        ) : (
          <ul className="space-y-1">
            {personal.map((p) => (
              <li key={p.id_nombre} className="flex items-center gap-2 text-sm text-fg-1">
                <span>{p.id_nombre}</span>
                {p.zona_asignada && <span className="text-fg-2 text-xs">zona {p.zona_asignada}</span>}
                {p.timestamp_salida
                  ? <Badge tone="info">Salida</Badge>
                  : <Badge tone="ok">Activo</Badge>
                }
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form
            className="flex gap-2 mt-2 flex-wrap"
            onSubmit={(e) => { e.preventDefault(); onAgregarPersonal() }}
          >
            <input
              type="text"
              className="flex-1 bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
              placeholder="id_nombre del empleado"
              value={inputPersonal}
              onChange={(e) => setInputPersonal(e.target.value)}
              aria-label="Empleado a añadir"
            />
            <input
              type="text"
              className="w-24 bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
              placeholder="Zona"
              value={inputZona}
              onChange={(e) => setInputZona(e.target.value)}
              aria-label="Zona asignada"
            />
            <Btn variant="secondary" size="sm" type="submit" disabled={submitting || !inputPersonal.trim()}>
              Añadir
            </Btn>
          </form>
        )}
      </section>
    </div>
  )
}

/* ── Subcomponente: modal de confirmación ── */

interface ConfirmModalProps {
  label: string
  extra?: React.ReactNode
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ label, extra, submitting, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-surface-1 border border-border-1 rounded-lg p-5 w-full max-w-sm space-y-4">
        <h2 id="confirm-titulo" className="text-fg-1 font-cmd text-base">
          ¿{label}?
        </h2>
        {extra}
        <div className="flex gap-3 justify-end">
          <Btn variant="secondary" size="sm" disabled={submitting} onClick={onCancel}>
            Cancelar
          </Btn>
          <Btn variant="destructive" size="sm" disabled={submitting} onClick={onConfirm}>
            Confirmar
          </Btn>
        </div>
      </div>
    </div>
  )
}
