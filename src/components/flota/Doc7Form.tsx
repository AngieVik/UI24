import { useRef, useState } from 'react'
import { Btn } from '@/components/atoms/Btn'
import { useDoc7, type Doc7FormData } from '@/hooks/useDoc7'
import { useActivacionStore } from '@/stores/useActivacionStore'
import type { NivelCriticidad } from '@/hooks/useChecklist'

const SISTEMAS_OPCIONES = [
  { value: 'exterior',           label: 'Exterior (carrocería)' },
  { value: 'neumaticos',         label: 'Neumáticos' },
  { value: 'luces',              label: 'Luces y señalización' },
  { value: 'sirena',             label: 'Sirena y megafonía' },
  { value: 'motor',              label: 'Motor y mecánica' },
  { value: 'maletin_medicacion', label: 'Maletín de medicación' },
  { value: 'equipamiento_svb',   label: 'Equipamiento SVB' },
  { value: 'camilla',            label: 'Camilla y sujeción' },
  { value: 'comunicaciones',     label: 'Comunicaciones' },
  { value: 'documentacion',      label: 'Documentación' },
  { value: 'otro',               label: 'Otro' },
]

const CRITICIDADES: NivelCriticidad[] = ['Leve', 'Moderada', 'Grave']

interface Doc7FormProps {
  onSuccess?: () => void
}

export function Doc7Form({ onSuccess }: Doc7FormProps) {
  const matricula = useActivacionStore((s) => s.matricula)
  const { isSubmitting, error, success, registrarAveria, reset } = useDoc7(matricula)

  const [sistemaAfectado, setSistemaAfectado] = useState('')
  const [nivelCriticidad, setNivelCriticidad] = useState<NivelCriticidad | ''>('')
  const [descripcion, setDescripcion] = useState('')
  const [imagen, setImagen] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!sistemaAfectado) { setFormError('Selecciona el sistema afectado.'); return }
    if (!nivelCriticidad) { setFormError('Selecciona el nivel de criticidad.'); return }

    const formData: Doc7FormData = {
      sistemaAfectado,
      nivelCriticidad: nivelCriticidad as NivelCriticidad,
      descripcion,
      imagen,
    }

    const ok = await registrarAveria(formData)
    if (ok) {
      setSistemaAfectado('')
      setNivelCriticidad('')
      setDescripcion('')
      setImagen(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess?.()
    }
  }

  if (success) {
    return (
      <div className="doc7-form doc7-form--success" role="status">
        <i className="ti ti-circle-check doc7-form__success-icon" aria-hidden="true" />
        <p>Avería registrada correctamente.</p>
        <Btn type="button" onClick={reset}>Registrar otra avería</Btn>
      </div>
    )
  }

  return (
    <form className="doc7-form" onSubmit={handleSubmit} aria-label="Formulario de avería Doc-7">
      <h2 className="doc7-form__title">
        <i className="ti ti-alert-triangle" aria-hidden="true" /> Registrar avería — {matricula}
      </h2>

      <label className="login__label">
        Sistema afectado <span aria-hidden="true">*</span>
        <select
          className="login__input"
          value={sistemaAfectado}
          onChange={(e) => setSistemaAfectado(e.target.value)}
          aria-required="true"
          disabled={isSubmitting}
        >
          <option value="">Selecciona un sistema…</option>
          {SISTEMAS_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <fieldset className="doc7-form__fieldset" disabled={isSubmitting}>
        <legend className="doc7-form__legend">Nivel de criticidad *</legend>
        <div className="doc7-form__radio-group">
          {CRITICIDADES.map((c) => (
            <label key={c} className="doc7-form__radio-label">
              <input
                type="radio"
                name="nivel_criticidad"
                value={c}
                checked={nivelCriticidad === c}
                onChange={() => setNivelCriticidad(c)}
                aria-required="true"
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="login__label">
        Descripción
        <textarea
          className="login__input doc7-form__textarea"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          placeholder="Describe la incidencia (opcional)"
          disabled={isSubmitting}
        />
      </label>

      <label className="login__label">
        Fotografía (opcional)
        <input
          ref={fileRef}
          className="login__input"
          type="file"
          accept="image/*"
          onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
          disabled={isSubmitting}
        />
      </label>

      {(formError || error) && (
        <p className="login__error" role="alert">
          {formError ?? error}
        </p>
      )}

      <Btn
        type="submit"
        style={{ marginTop: '0.5rem', width: '100%' }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Registrando…' : 'Registrar avería'}
      </Btn>
    </form>
  )
}
