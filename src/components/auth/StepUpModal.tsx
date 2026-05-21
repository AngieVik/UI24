import { useState } from 'react'
import { Modal } from '@/components/feedback/ModalError'
import { Btn } from '@/components/atoms/Btn'
import { useStepUp } from '@/hooks/useStepUp'

export function StepUpModal() {
  const { isOpen, isLoading, error, submitPin, cancel } = useStepUp()
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submitPin(password)
    setPassword('')
  }

  function handleClose() {
    cancel()
    setPassword('')
  }

  return (
    <Modal
      open={isOpen}
      title="Confirma tu identidad"
      onClose={handleClose}
      footer={
        <>
          <Btn tone="ghost" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Btn>
          <Btn
            type="submit"
            form="stepup-form"
            disabled={isLoading || password.length < 1}
          >
            {isLoading ? 'Verificando…' : 'Confirmar'}
          </Btn>
        </>
      }
    >
      <form id="stepup-form" onSubmit={handleSubmit}>
        <p style={{ marginTop: 0, marginBottom: '1rem', color: '#555' }}>
          Esta acción requiere verificación adicional. Introduce tu contraseña.
        </p>
        <label className="login__label">
          Contraseña
          <input
            className="login__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            aria-required="true"
          />
        </label>
        {error && (
          <p className="login__error" role="alert" style={{ marginTop: '0.5rem' }}>
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
