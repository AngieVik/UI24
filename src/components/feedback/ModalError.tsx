import { useRef, useEffect, type ReactNode } from 'react'
import { Btn } from '@/components/atoms/Btn'

/* ── Modal base con focus trap ─────────────────────────────────────────── */

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap + Escape (ADR-003)
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function trapTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', trapTab)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', trapTab)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__hd">
          <span className="modal__title" id="modal-title">
            {title}
          </span>
          <button
            className="modal__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>

        <div className="modal__body">{children}</div>

        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

/* ── ModalError — variante semántica ───────────────────────────────────── */

interface ModalErrorProps {
  open: boolean
  message: string
  onClose: () => void
  onRetry?: () => void
}

export function ModalError({
  open,
  message,
  onClose,
  onRetry,
}: ModalErrorProps) {
  return (
    <Modal
      open={open}
      title="Ha ocurrido un error"
      onClose={onClose}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose}>
            Cerrar
          </Btn>
          {onRetry && <Btn onClick={onRetry}>Reintentar</Btn>}
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  )
}
