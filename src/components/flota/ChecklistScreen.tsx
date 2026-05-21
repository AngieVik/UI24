import { useState } from 'react'
import { Btn } from '@/components/atoms/Btn'
import { useChecklist, type NivelCriticidad, type ChecklistItemData } from '@/hooks/useChecklist'
import { useActivacionStore } from '@/stores/useActivacionStore'

interface Sistema {
  key: string
  label: string
}

const SISTEMAS: Sistema[] = [
  { key: 'exterior',           label: 'Exterior (carrocería)' },
  { key: 'neumaticos',         label: 'Neumáticos' },
  { key: 'luces',              label: 'Luces y señalización' },
  { key: 'sirena',             label: 'Sirena y megafonía' },
  { key: 'motor',              label: 'Motor y mecánica' },
  { key: 'maletin_medicacion', label: 'Maletín de medicación' },
  { key: 'equipamiento_svb',   label: 'Equipamiento SVB' },
  { key: 'camilla',            label: 'Camilla y sujeción' },
  { key: 'comunicaciones',     label: 'Comunicaciones' },
  { key: 'documentacion',      label: 'Documentación' },
]

const CRITICIDADES: NivelCriticidad[] = ['Leve', 'Moderada', 'Grave']

type ItemState = { ok: boolean | null; criticidad: NivelCriticidad | ''; descripcion: string }
type ChecklistState = Record<string, ItemState>

function buildInitial(): ChecklistState {
  return Object.fromEntries(
    SISTEMAS.map((s) => [s.key, { ok: null, criticidad: '', descripcion: '' }]),
  )
}

export function ChecklistScreen() {
  const matricula = useActivacionStore((s) => s.matricula)
  const { isSubmitting, error, cerrarChecklist } = useChecklist()
  const [items, setItems] = useState<ChecklistState>(buildInitial)
  const [formError, setFormError] = useState<string | null>(null)

  function setOk(key: string, ok: boolean) {
    setItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], ok, criticidad: ok ? '' : prev[key].criticidad, descripcion: ok ? '' : prev[key].descripcion },
    }))
  }

  function setCriticidad(key: string, criticidad: NivelCriticidad) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], criticidad } }))
  }

  function setDescripcion(key: string, descripcion: string) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], descripcion } }))
  }

  const allReviewed = SISTEMAS.every((s) => items[s.key].ok !== null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!allReviewed) {
      setFormError('Revisa todos los sistemas antes de cerrar el checklist.')
      return
    }

    for (const s of SISTEMAS) {
      const item = items[s.key]
      if (!item.ok && !item.criticidad) {
        setFormError(`Indica la criticidad para "${s.label}".`)
        return
      }
    }

    const payload: Record<string, ChecklistItemData> = {}
    for (const s of SISTEMAS) {
      const item = items[s.key]
      payload[s.key] = item.ok
        ? { ok: true }
        : { ok: false, criticidad: item.criticidad as NivelCriticidad, descripcion: item.descripcion || undefined }
    }

    await cerrarChecklist(payload)
  }

  return (
    <div className="checklist-screen" role="main" aria-label="Revisión 360° del vehículo">
      <div className="checklist-screen__card">
        <h1 className="checklist-screen__title">
          <i className="ti ti-clipboard-check" aria-hidden="true" /> Revisión 360° — {matricula}
        </h1>

        <form onSubmit={handleSubmit} aria-label="Formulario de revisión">
          <ul className="checklist-list" aria-label="Sistemas a revisar">
            {SISTEMAS.map((s) => {
              const item = items[s.key]
              return (
                <li key={s.key} className="checklist-item">
                  <div className="checklist-item__row">
                    <span className="checklist-item__label">{s.label}</span>
                    <div className="checklist-item__toggles" role="group" aria-label={`Estado de ${s.label}`}>
                      <button
                        type="button"
                        className={['checklist-item__toggle', item.ok === true && 'checklist-item__toggle--ok'].filter(Boolean).join(' ')}
                        onClick={() => setOk(s.key, true)}
                        aria-pressed={item.ok === true}
                        disabled={isSubmitting}
                      >
                        <i className="ti ti-check" aria-hidden="true" /> OK
                      </button>
                      <button
                        type="button"
                        className={['checklist-item__toggle', item.ok === false && 'checklist-item__toggle--ng'].filter(Boolean).join(' ')}
                        onClick={() => setOk(s.key, false)}
                        aria-pressed={item.ok === false}
                        disabled={isSubmitting}
                      >
                        <i className="ti ti-x" aria-hidden="true" /> NG
                      </button>
                    </div>
                  </div>

                  {item.ok === false && (
                    <div className="checklist-item__detail">
                      <label className="checklist-item__field-label">
                        Criticidad <span aria-hidden="true">*</span>
                        <select
                          className="checklist-item__select"
                          value={item.criticidad}
                          onChange={(e) => setCriticidad(s.key, e.target.value as NivelCriticidad)}
                          aria-required="true"
                          disabled={isSubmitting}
                        >
                          <option value="">Selecciona…</option>
                          {CRITICIDADES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label className="checklist-item__field-label">
                        Descripción
                        <textarea
                          className="checklist-item__textarea"
                          value={item.descripcion}
                          onChange={(e) => setDescripcion(s.key, e.target.value)}
                          rows={2}
                          placeholder="Describe la incidencia (opcional)"
                          disabled={isSubmitting}
                        />
                      </label>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {(formError || error) && (
            <p className="login__error" role="alert" style={{ marginTop: '0.75rem' }}>
              {formError ?? error}
            </p>
          )}

          <Btn
            type="submit"
            style={{ marginTop: '1rem', width: '100%' }}
            disabled={!allReviewed || isSubmitting}
          >
            {isSubmitting ? 'Cerrando checklist…' : 'Cerrar checklist y continuar'}
          </Btn>
        </form>
      </div>
    </div>
  )
}
