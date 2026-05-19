// Header.jsx — barra superior negra: logo + ticker + bandejas + back.

function Header({ showBack, onBack, unreadFleet, unreadCoord, ticker }) {
  return (
    <header className="hd">
      <span className="hd__brand">
        <span className="hd__name">U24</span>
      </span>
      <div className="hd__ticker" role="marquee">{ticker}</div>
      <div className="hd__actions">
        <button
          className={"hd__icon" + (unreadFleet ? " hd__icon--unread" : "")}
          title="Bandeja flota"
          aria-label="Bandeja flota"
        >
          <i className="ti ti-mail"></i>
          {unreadFleet ? <span className="hd__dot"></span> : null}
        </button>
        <button
          className={"hd__icon" + (unreadCoord ? " hd__icon--unread" : "")}
          title="Bandeja coordinación"
          aria-label="Bandeja coordinación"
        >
          <i className="ti ti-mail"></i>
          {unreadCoord ? <span className="hd__dot"></span> : null}
        </button>
        {showBack && (
          <button className="hd__icon hd__back" title="Atrás" aria-label="Atrás" onClick={onBack}>
            <i className="ti ti-arrow-left"></i>
          </button>
        )}
      </div>
    </header>
  );
}

window.Header = Header;
