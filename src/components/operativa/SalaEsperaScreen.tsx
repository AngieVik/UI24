import { Btn } from '@/components/atoms/Btn'
import { Badge } from '@/components/atoms/Badge'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useFiliacion, type EstadoPaciente, type Paciente } from '@/hooks/useFiliacion'
import { useGlobalStore } from '@/stores/useGlobalStore'

const ESTADO_TONE: Record<EstadoPaciente, 'warn' | 'info' | 'ok'> = {
  en_espera:   'warn',
  en_consulta: 'info',
  alta:        'ok',
}

const ESTADO_LABEL: Record<EstadoPaciente, string> = {
  en_espera:   'En espera',
  en_consulta: 'En consulta',
  alta:        'Alta',
}

const SIGUIENTE_ESTADO: Partial<Record<EstadoPaciente, EstadoPaciente>> = {
  en_espera:   'en_consulta',
  en_consulta: 'alta',
}

const SIGUIENTE_LABEL: Partial<Record<EstadoPaciente, string>> = {
  en_espera:   'Iniciar consulta',
  en_consulta: 'Dar de alta',
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function PacienteRow({
  paciente,
  onActualizar,
  disabled,
  index,
}: {
  paciente: Paciente
  onActualizar: (idPaciente: string, estado: EstadoPaciente) => void
  disabled: boolean
  index: number
}) {
  const siguiente = SIGUIENTE_ESTADO[paciente.estado]
  return (
    <li className="filiacion-item">
      <span className="filiacion-item__num">#{index + 1}</span>
      <div className="filiacion-item__info">
        <Badge tone={ESTADO_TONE[paciente.estado]}>{ESTADO_LABEL[paciente.estado]}</Badge>
        <span className="filiacion-item__hora">Admisión: {formatTime(paciente.timestamp_admision)}</span>
        {paciente.timestamp_inicio_consulta && (
          <span className="filiacion-item__hora">Consulta: {formatTime(paciente.timestamp_inicio_consulta)}</span>
        )}
      </div>
      {siguiente && (
        <Btn
          type="button"
          disabled={disabled}
          onClick={() => onActualizar(paciente.id_paciente, siguiente)}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          {SIGUIENTE_LABEL[paciente.estado]}
        </Btn>
      )}
    </li>
  )
}

export function SalaEsperaScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const {
    idSesion,
    pacientes,
    isLoadingSesion,
    isLoadingPacientes,
    isSubmitting,
    error,
    abrirSesion,
    admitirPaciente,
    actualizarEstado,
    cerrarSesionLocal,
  } = useFiliacion()

  const enEspera   = pacientes.filter((p) => p.estado === 'en_espera')
  const enConsulta = pacientes.filter((p) => p.estado === 'en_consulta')
  const conAlta    = pacientes.filter((p) => p.estado === 'alta')

  if (!isOnline) {
    return (
      <div className="op-screen" role="main" aria-label="Sala de espera">
        <div className="op-offline-notice" role="status">
          <i className="ti ti-wifi-off" aria-hidden="true" />
          <p>La sala de espera requiere conexión a internet.</p>
        </div>
      </div>
    )
  }

  if (!idSesion) {
    return (
      <div className="op-screen" role="main" aria-label="Sala de espera — sin sesión">
        <div className="op-screen__header">
          <h2 className="op-screen__title">
            <i className="ti ti-users" aria-hidden="true" /> Sala de espera / Filiación
          </h2>
        </div>
        <div className="filiacion-start">
          <i className="ti ti-clipboard-list filiacion-start__icon" aria-hidden="true" />
          <p className="filiacion-start__msg">No hay una sesión de filiación abierta.</p>
          {error && <p className="login__error" role="alert">{error}</p>}
          <Btn type="button" onClick={() => abrirSesion()} disabled={isLoadingSesion}>
            {isLoadingSesion ? 'Abriendo sesión…' : 'Abrir sesión de filiación'}
          </Btn>
        </div>
      </div>
    )
  }

  return (
    <div className="op-screen" role="main" aria-label="Sala de espera">
      <div className="op-screen__header">
        <h2 className="op-screen__title">
          <i className="ti ti-users" aria-hidden="true" /> Sala de espera
          <span className="filiacion-stats">
            <Badge tone="warn">{enEspera.length} espera</Badge>
            <Badge tone="info">{enConsulta.length} consulta</Badge>
            <Badge tone="ok">{conAlta.length} alta</Badge>
          </span>
        </h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Btn type="button" onClick={admitirPaciente} disabled={isSubmitting || isLoadingPacientes}>
            <i className="ti ti-user-plus" aria-hidden="true" /> Admitir paciente
          </Btn>
          <Btn
            type="button"
            onClick={cerrarSesionLocal}
            style={{ background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border-2)' }}
          >
            Cerrar sesión
          </Btn>
        </div>
      </div>

      {error && <p className="login__error" role="alert" style={{ marginBottom: '.5rem' }}>{error}</p>}

      {isLoadingPacientes ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : pacientes.length === 0 ? (
        <p className="op-empty">No hay pacientes en esta sesión. Admite el primero.</p>
      ) : (
        <ul className="filiacion-list" aria-label="Lista de pacientes">
          {pacientes.map((p, i) => (
            <PacienteRow
              key={p.id_paciente}
              paciente={p}
              onActualizar={actualizarEstado}
              disabled={isSubmitting}
              index={i}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
