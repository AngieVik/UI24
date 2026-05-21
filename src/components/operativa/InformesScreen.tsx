import { useEffect, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useInformes, type InformeSVB, type DatosPaciente } from '@/hooks/useInformes'
import { useActivacionStore } from '@/stores/useActivacionStore'

const CAMPOS: { key: keyof DatosPaciente; label: string; type?: string }[] = [
  { key: 'nombre',     label: 'Nombre del paciente' },
  { key: 'edad',       label: 'Edad',               type: 'number' },
  { key: 'motivo',     label: 'Motivo de asistencia' },
  { key: 'tratamiento', label: 'Tratamiento aplicado' },
  { key: 'destino',    label: 'Destino / derivación' },
  { key: 'observaciones', label: 'Observaciones' },
]

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function InformeCard({
  informe,
  onCerrar,
  disabled,
}: {
  informe: InformeSVB
  onCerrar: (id: string) => void
  disabled: boolean
}) {
  const datos = informe.datos_paciente ?? {}
  return (
    <li className="informe-card">
      <div className="informe-card__header">
        <span className="informe-card__fecha">{formatDateTime(informe.timestamp_asistencia)}</span>
        <Badge tone={informe.estado === 'borrador' ? 'warn' : 'ok'}>
          {informe.estado === 'borrador' ? 'Borrador' : 'Cerrado'}
        </Badge>
        {informe.estado === 'borrador' && (
          <Btn
            type="button"
            disabled={disabled}
            onClick={() => onCerrar(informe.id_doc)}
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            Cerrar informe
          </Btn>
        )}
      </div>
      {datos.nombre && <p className="informe-card__paciente"><b>{datos.nombre}</b>{datos.edad ? `, ${datos.edad} años` : ''}</p>}
      {datos.motivo && <p className="informe-card__detail">{datos.motivo}</p>}
    </li>
  )
}

function NuevoInformeForm({
  onSubmit,
  onCancel,
  disabled,
}: {
  onSubmit: (datos: DatosPaciente) => void
  onCancel: () => void
  disabled: boolean
}) {
  const [datos, setDatos] = useState<DatosPaciente>({})

  function setField(key: keyof DatosPaciente, value: string) {
    setDatos((d) => ({ ...d, [key]: key === 'edad' ? (parseInt(value, 10) || undefined) : value || undefined }))
  }

  return (
    <form
      className="informe-form"
      onSubmit={(e) => { e.preventDefault(); onSubmit(datos) }}
      aria-label="Nuevo informe asistencial"
    >
      <h3 className="informe-form__title">Nuevo informe Doc-2 SVB</h3>
      {CAMPOS.map(({ key, label, type }) => (
        <label key={key} className="login__label">
          {label}
          <input
            className="login__input"
            type={type ?? 'text'}
            value={(datos[key] as string | number | undefined) ?? ''}
            onChange={(e) => setField(key, e.target.value)}
            disabled={disabled}
          />
        </label>
      ))}
      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
        <Btn type="button" onClick={onCancel} disabled={disabled}
          style={{ background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border-2)' }}>
          Cancelar
        </Btn>
        <Btn type="submit" disabled={disabled}>
          {disabled ? 'Creando…' : 'Crear informe'}
        </Btn>
      </div>
    </form>
  )
}

export function InformesScreen() {
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const { informes, isLoading, isSubmitting, error, cargarInformes, crearInforme, cerrarInforme } = useInformes()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { cargarInformes() }, [cargarInformes])

  async function handleCrear(datos: DatosPaciente) {
    const id = await crearInforme(datos)
    if (id) setShowForm(false)
  }

  if (!idActivacion) {
    return (
      <div className="op-screen" role="main" aria-label="Informes asistenciales">
        <p className="op-empty">Sin activación activa. Realiza primero el check-in.</p>
      </div>
    )
  }

  return (
    <div className="op-screen" role="main" aria-label="Informes asistenciales">
      <div className="op-screen__header">
        <h2 className="op-screen__title">
          <i className="ti ti-heart-rate-monitor" aria-hidden="true" /> Doc-2 Informes asistenciales SVB
        </h2>
        {!showForm && (
          <Btn type="button" onClick={() => setShowForm(true)} disabled={isSubmitting}>
            <i className="ti ti-plus" aria-hidden="true" /> Nuevo informe
          </Btn>
        )}
      </div>

      {error && <p className="login__error" role="alert" style={{ marginBottom: '.5rem' }}>{error}</p>}

      {showForm && (
        <NuevoInformeForm
          onSubmit={handleCrear}
          onCancel={() => setShowForm(false)}
          disabled={isSubmitting}
        />
      )}

      {isLoading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : informes.length === 0 && !showForm ? (
        <p className="op-empty">No hay informes en esta activación. Crea el primero.</p>
      ) : (
        <ul className="informe-list" aria-label="Informes de la activación">
          {informes.map((inf) => (
            <InformeCard
              key={inf.id_doc}
              informe={inf}
              onCerrar={cerrarInforme}
              disabled={isSubmitting}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
