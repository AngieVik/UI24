import { useState } from 'react'
import { Btn } from '@/components/atoms/Btn'
import { useLoginFlow } from '@/hooks/useLoginFlow'

type Tab = 'normal' | 'emergencia'

export function LoginScreen() {
  const [tab, setTab] = useState<Tab>('normal')
  const [idNombre, setIdNombre] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const { isLoading, error, isBlocked, loginNormal, loginEmergencia } = useLoginFlow()

  async function handleNormal(e: React.FormEvent) {
    e.preventDefault()
    await loginNormal(idNombre.trim(), password)
  }

  async function handleEmergencia(e: React.FormEvent) {
    e.preventDefault()
    await loginEmergencia(idNombre.trim(), pin)
  }

  return (
    <div className="login">
      <header className="login__hd">
        <span className="login__logo">U24</span>
        <span className="login__subtitle">Sistema operativo de ambulancias</span>
      </header>

      <div className="login__tabs" role="tablist" aria-label="Modo de acceso">
        <button
          role="tab"
          aria-selected={tab === 'normal'}
          aria-controls="panel-normal"
          className={`login__tab${tab === 'normal' ? ' login__tab--active' : ''}`}
          onClick={() => setTab('normal')}
        >
          Acceso normal
        </button>
        <button
          role="tab"
          aria-selected={tab === 'emergencia'}
          aria-controls="panel-emergencia"
          className={`login__tab${tab === 'emergencia' ? ' login__tab--active' : ''}`}
          onClick={() => setTab('emergencia')}
        >
          Emergencia
        </button>
      </div>

      {tab === 'normal' && (
        <form
          id="panel-normal"
          role="tabpanel"
          className="login__form"
          onSubmit={handleNormal}
          aria-label="Formulario de acceso normal"
        >
          <label className="login__label">
            Identificador
            <input
              className="login__input"
              type="text"
              autoComplete="username"
              value={idNombre}
              onChange={(e) => setIdNombre(e.target.value)}
              disabled={isBlocked || isLoading}
              aria-required="true"
            />
          </label>
          <label className="login__label">
            Contraseña
            <input
              className="login__input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBlocked || isLoading}
              aria-required="true"
            />
          </label>
          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}
          <Btn
            type="submit"
            disabled={isBlocked || isLoading || !idNombre || !password}
          >
            {isLoading ? 'Verificando…' : 'Entrar'}
          </Btn>
          {isBlocked && (
            <p className="login__help">
              <i className="ti ti-info-circle" aria-hidden="true" />{' '}
              Para recuperar el acceso contacta con RRHH. No existe recuperación automática (ADR-004).
            </p>
          )}
        </form>
      )}

      {tab === 'emergencia' && (
        <form
          id="panel-emergencia"
          role="tabpanel"
          className="login__form"
          onSubmit={handleEmergencia}
          aria-label="Formulario de acceso de emergencia"
        >
          <p className="login__info">
            Introduce tu identificador y el PIN de 6 dígitos proporcionado por coordinación.
          </p>
          <label className="login__label">
            Identificador
            <input
              className="login__input"
              type="text"
              autoComplete="username"
              value={idNombre}
              onChange={(e) => setIdNombre(e.target.value)}
              disabled={isLoading}
              aria-required="true"
            />
          </label>
          <label className="login__label">
            PIN de emergencia
            <input
              className="login__input login__input--pin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              disabled={isLoading}
              aria-required="true"
              aria-describedby="pin-hint"
            />
            <span id="pin-hint" className="login__help" style={{ marginTop: '0.25rem' }}>
              6 dígitos numéricos
            </span>
          </label>
          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}
          <Btn
            type="submit"
            disabled={isLoading || !idNombre || pin.length !== 6}
          >
            {isLoading ? 'Verificando…' : 'Acceder con PIN'}
          </Btn>
          <p className="login__help">
            <i className="ti ti-phone" aria-hidden="true" />{' '}
            Si no tienes PIN, contacta con coordinación o RRHH.
          </p>
        </form>
      )}
    </div>
  )
}
