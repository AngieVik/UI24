import { useEffect, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useCheckin } from '@/hooks/useCheckin'
import type { Database } from '@/types/supabase'

type Vehiculo = Database['public']['Tables']['vehiculos']['Row']

const CONDICION_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  operativo:     'ok',
  averiado_leve: 'warn',
  averiado_grave: 'crit',
}

const CONDICION_LABEL: Record<string, string> = {
  operativo:      'Operativo',
  averiado_leve:  'Avería leve',
  averiado_grave: 'Avería grave',
}

export function VehiclePickerScreen() {
  const { vehiculos, isLoadingList, isSubmitting, error, cargarVehiculos, checkin } = useCheckin()
  const [selected, setSelected] = useState<string | null>(null)
  const [kmInicio, setKmInicio] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { cargarVehiculos() }, [])

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!selected) { setFormError('Selecciona un vehículo.'); return }
    const km = parseInt(kmInicio, 10)
    if (isNaN(km) || km < 0) { setFormError('Introduce un kilometraje válido.'); return }
    await checkin(selected, km)
  }

  function isDisabled(v: Vehiculo) {
    return v.condicion_tecnica === 'dado_de_baja' || v.condicion_tecnica === 'en_taller'
  }

  return (
    <div className="picker-screen" role="main" aria-label="Selección de vehículo">
      <div className="picker-screen__card">
        <h1 className="picker-screen__title">
          <i className="ti ti-ambulance" aria-hidden="true" /> Selecciona tu vehículo
        </h1>

        {isLoadingList ? (
          <LoadingSkeleton variant="card" rows={3} />
        ) : (
          <form onSubmit={handleCheckin} aria-label="Formulario de check-in">
            <ul className="vehicle-list" role="listbox" aria-label="Vehículos disponibles">
              {vehiculos.length === 0 && (
                <li className="vehicle-list__empty">No hay vehículos disponibles en este momento.</li>
              )}
              {vehiculos.map((v) => (
                <li
                  key={v.matricula}
                  role="option"
                  aria-selected={selected === v.matricula}
                  aria-disabled={isDisabled(v)}
                  className={[
                    'vehicle-item',
                    selected === v.matricula && 'vehicle-item--selected',
                    isDisabled(v) && 'vehicle-item--disabled',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !isDisabled(v) && setSelected(v.matricula)}
                >
                  <span className="vehicle-item__matricula">{v.matricula}</span>
                  <span className="vehicle-item__tipo">{v.tipo}</span>
                  <Badge tone={CONDICION_TONE[v.condicion_tecnica] ?? 'neutral'}>
                    {CONDICION_LABEL[v.condicion_tecnica] ?? v.condicion_tecnica}
                  </Badge>
                </li>
              ))}
            </ul>

            {selected && (
              <label className="login__label" style={{ marginTop: '1.5rem' }}>
                Kilómetros al inicio del turno
                <input
                  className="login__input"
                  type="number"
                  min={0}
                  step={1}
                  value={kmInicio}
                  onChange={(e) => setKmInicio(e.target.value)}
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </label>
            )}

            {(formError || error) && (
              <p className="login__error" role="alert" style={{ marginTop: '0.75rem' }}>
                {formError ?? error}
              </p>
            )}

            <Btn
              type="submit"
              style={{ marginTop: '1rem', width: '100%' }}
              disabled={!selected || !kmInicio || isSubmitting}
            >
              {isSubmitting ? 'Iniciando turno…' : 'Iniciar turno'}
            </Btn>
          </form>
        )}
      </div>
    </div>
  )
}
