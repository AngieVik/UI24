import { useState } from 'react'
import { Btn } from '@/components/atoms/Btn'
import { useLoginFlow } from '@/hooks/useLoginFlow'
import logoUrl from '@/assets/logo.svg'

export function LoginScreen() {
  const [idNombre, setIdNombre] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { isLoading, error, loginNormal, loginEmergencia } = useLoginFlow()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = idNombre.trim()
    if (id === 'PIN') {
      await loginEmergencia('PIN', password)
    } else {
      await loginNormal(id, password)
    }
  }

  return (
    <div className="login">
      <header className="login__hd">
        <img src={logoUrl} alt="U24" className="login__logo-img" />
      </header>

      <form className="login__form" onSubmit={handleSubmit}>
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
          Contraseña
          <div className="login__input-wrap">
            <input
              className="login__input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              aria-required="true"
            />
            <button
              type="button"
              className="login__eye"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              <i className={`ti ti-eye${showPassword ? '-off' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </label>

        <div className="login__error-box" role="alert" aria-live="polite">
          {error && <span className="login__error">{error}</span>}
        </div>

        <Btn type="submit" disabled={isLoading || !idNombre || !password}>
          {isLoading ? 'Verificando…' : 'Login'}
        </Btn>
      </form>
    </div>
  )
}
