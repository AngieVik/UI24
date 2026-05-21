import { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useVacaciones, type SolicitudVacaciones } from '@/hooks/useVacaciones'

const ESTADO_TONE: Record<string, 'ok' | 'warn' | 'crit' | 'info'> = {
  Borrador:              'info',
  Pendiente_Aprobacion:  'warn',
  Aprobada:              'ok',
  Denegada:              'crit',
}

const ESTADO_LABEL: Record<string, string> = {
  Borrador:             'Borrador',
  Pendiente_Aprobacion: 'Pendiente',
  Aprobada:             'Aprobada',
  Denegada:             'Denegada',
}

interface FormState {
  periodo_anual: string
  fecha_inicio: string
  fecha_fin: string
  preferencia: 'opcion_1' | 'opcion_2' | 'opcion_3'
  observaciones: string
}

const FORM_VACIO: FormState = {
  periodo_anual: new Date().getFullYear().toString(),
  fecha_inicio:  '',
  fecha_fin:     '',
  preferencia:   'opcion_1',
  observaciones: '',
}

function SolicitudCard({
  sol,
  esRrhh,
  onResolver,
  submitting,
}: {
  sol: SolicitudVacaciones
  esRrhh: boolean
  onResolver: (id: string, d: 'Aprobada' | 'Denegada') => void
  submitting: boolean
}) {
  return (
    <li className="border border-border-1 bg-surface-1 rounded p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-fg-1 text-sm font-medium">
            {sol.fecha_inicio} → {sol.fecha_fin}
          </span>
          <span className="text-fg-2 text-xs ml-2">Período {sol.periodo_anual}</span>
        </div>
        <Badge tone={ESTADO_TONE[sol.estado] ?? 'info'}>
          {ESTADO_LABEL[sol.estado] ?? sol.estado}
        </Badge>
      </div>

      {sol.observaciones && (
        <p className="text-fg-2 text-xs">{sol.observaciones}</p>
      )}

      {sol.resolucion_rrhh && (
        <p className="text-fg-3 text-xs italic">
          Nota RRHH: {sol.resolucion_rrhh}
        </p>
      )}

      {esRrhh && sol.estado === 'Pendiente_Aprobacion' && (
        <div className="flex gap-2">
          <Btn
            variant="primary"
            size="sm"
            disabled={submitting}
            onClick={() => onResolver(sol.id, 'Aprobada')}
          >
            Aprobar
          </Btn>
          <Btn
            variant="destructive"
            size="sm"
            disabled={submitting}
            onClick={() => onResolver(sol.id, 'Denegada')}
          >
            Denegar
          </Btn>
        </div>
      )}
    </li>
  )
}

export function VacacionesScreen() {
  const { solicitudes, pendientes, propias, loading, submitting, error, setError,
          enviarSolicitud, resolverSolicitud } = useVacaciones()

  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [vistaRrhh, setVistaRrhh] = useState(false)

  const esRrhh = false // será true si el rol es rrhh/gerencia — aquí simplificado

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setFormError(null)
    if (!form.fecha_inicio || !form.fecha_fin) {
      setFormError('Debes indicar las fechas de inicio y fin.')
      return
    }
    const id = await enviarSolicitud({
      periodo_anual:  form.periodo_anual,
      fecha_inicio:   form.fecha_inicio,
      fecha_fin:      form.fecha_fin,
      preferencia:    form.preferencia,
      observaciones:  form.observaciones || undefined,
    })
    if (id) { setForm(null); setFormError(null) }
  }

  const lista = vistaRrhh ? solicitudes : propias

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">
          Vacaciones
          {pendientes.length > 0 && (
            <Badge tone="warn" className="ml-2">{pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}</Badge>
          )}
        </h1>
        <div className="flex gap-2">
          {pendientes.length > 0 && (
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => setVistaRrhh((v) => !v)}
              aria-pressed={vistaRrhh}
            >
              {vistaRrhh ? 'Mis solicitudes' : 'Ver pendientes'}
            </Btn>
          )}
          {!form && (
            <Btn
              variant="primary"
              size="sm"
              onClick={() => setForm(FORM_VACIO)}
              aria-label="Nueva solicitud de vacaciones"
            >
              + Solicitar
            </Btn>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Formulario de nueva solicitud */}
      {form && (
        <form
          aria-label="Nueva solicitud de vacaciones"
          onSubmit={handleEnviar}
          className="border border-u24-yellow/50 bg-u24-yellow/5 rounded p-4 space-y-3"
        >
          <h2 className="text-fg-1 font-cmd text-sm">Nueva solicitud</h2>

          {formError && (
            <p role="alert" className="text-red-400 text-xs">{formError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-fg-2 text-xs">
              Período anual
              <input
                type="text"
                className="bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
                value={form.periodo_anual}
                onChange={(e) => setForm((f) => f && { ...f, periodo_anual: e.target.value })}
                required
                aria-label="Período anual"
              />
            </label>
            <label className="flex flex-col gap-1 text-fg-2 text-xs">
              Preferencia
              <select
                className="bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
                value={form.preferencia}
                onChange={(e) => setForm((f) => f && { ...f, preferencia: e.target.value as FormState['preferencia'] })}
                aria-label="Preferencia de selección"
              >
                <option value="opcion_1">Opción 1</option>
                <option value="opcion_2">Opción 2</option>
                <option value="opcion_3">Opción 3</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-fg-2 text-xs">
              Fecha inicio
              <input
                type="date"
                className="bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
                value={form.fecha_inicio}
                onChange={(e) => setForm((f) => f && { ...f, fecha_inicio: e.target.value })}
                required
                aria-label="Fecha de inicio"
              />
            </label>
            <label className="flex flex-col gap-1 text-fg-2 text-xs">
              Fecha fin
              <input
                type="date"
                className="bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm"
                value={form.fecha_fin}
                onChange={(e) => setForm((f) => f && { ...f, fecha_fin: e.target.value })}
                required
                aria-label="Fecha de fin"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-fg-2 text-xs">
            Observaciones (opcional)
            <textarea
              className="bg-surface-1 border border-border-1 rounded px-2 py-1 text-fg-1 text-sm resize-none"
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm((f) => f && { ...f, observaciones: e.target.value })}
              aria-label="Observaciones"
            />
          </label>

          <div className="flex gap-2">
            <Btn variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </Btn>
            <Btn variant="secondary" size="sm" type="button" onClick={() => { setForm(null); setFormError(null) }}>
              Cancelar
            </Btn>
          </div>
        </form>
      )}

      {loading && <LoadingSkeleton variant="row" />}

      {!loading && lista.length === 0 && (
        <p className="text-fg-2 text-sm">
          {vistaRrhh ? 'No hay solicitudes pendientes.' : 'No tienes solicitudes de vacaciones.'}
        </p>
      )}

      <ul className="space-y-2" aria-label="Solicitudes de vacaciones">
        {lista.map((sol) => (
          <SolicitudCard
            key={sol.id}
            sol={sol}
            esRrhh={esRrhh || vistaRrhh}
            onResolver={resolverSolicitud}
            submitting={submitting}
          />
        ))}
      </ul>
    </div>
  )
}
