import { useToast } from '@/hooks/useToast'

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`} role="alert">
          <span>{t.message}</span>
          <button
            className="toast__dismiss"
            aria-label="Cerrar notificación"
            onClick={() => dismiss(t.id)}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
