interface HeaderProps {
  marquesinaText?: string
  unreadCount?: number
  onMailClick?: () => void
}

export function Header({ marquesinaText, unreadCount = 0, onMailClick }: HeaderProps) {
  return (
    <header className="hd" role="banner">
      <span className="hd__logo" aria-label="U24 Servicios Sanitarios">
        U24
      </span>

      {marquesinaText && (
        <div className="hd__ticker" aria-live="polite" aria-atomic="true">
          {marquesinaText}
        </div>
      )}

      <div className="hd__actions">
        <button
          className={`hd__icon${unreadCount > 0 ? ' hd__icon--unread' : ''}`}
          aria-label={
            unreadCount > 0
              ? `Bandeja de mensajes — ${unreadCount} sin leer`
              : 'Bandeja de mensajes'
          }
          onClick={onMailClick}
        >
          <i className="ti ti-mail" aria-hidden="true" />
          {unreadCount > 0 && <span className="hd__dot" aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
