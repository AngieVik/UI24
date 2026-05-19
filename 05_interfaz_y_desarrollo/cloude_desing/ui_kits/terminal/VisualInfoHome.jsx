// VisualInfoHome.jsx — contenido por defecto del home_area cuando no hay navegación.
// Espejo del estado raíz (panel personal, panel vehículo, visual_info_drp, bandejas).

function VisualInfoHome({ onOpenScreen }) {
  return (
    <div className="vih">
      <PanelPersonal />
      <PanelVehiculo />
      <VisualInfoDRP onOpenScreen={onOpenScreen} />
      <BandejaEntradaPersonal />
    </div>
  );
}

function PanelPersonal() {
  return (
    <section className="card vih__card">
      <header className="card__hd">
        <span className="card__title">Personal en turno</span>
        <Badge tone="ok"><i className="ti ti-user-check" style={{fontSize:11}}></i>3 con check-in</Badge>
      </header>
      <table className="tbl">
        <thead>
          <tr><th>ID_nombre</th><th>Estado</th><th>Función</th><th>Teléfono</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><Avatar initials="MA" /> Manuel Álvarez</td>
            <td><Badge tone="ok">checkin_on</Badge></td>
            <td><Badge tone="info" bold>pilot</Badge></td>
            <td className="td--num">+34 612 04 88 12</td>
          </tr>
          <tr>
            <td><Avatar initials="RS" /> Rocío Suárez</td>
            <td><Badge tone="ok">checkin_on</Badge></td>
            <td><Badge tone="neutral" bold>carry</Badge></td>
            <td className="td--num">+34 698 31 22 09</td>
          </tr>
          <tr>
            <td><Avatar initials="AC" /> Ana Casal</td>
            <td><Badge tone="ok">checkin_on</Badge></td>
            <td><Badge tone="info" bold>DUE</Badge></td>
            <td className="td--num">+34 654 70 11 33</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function PanelVehiculo() {
  return (
    <section className="card vih__card">
      <header className="card__hd">
        <span className="card__title">Vehículo del terminal</span>
        <Badge tone="info">En ruta</Badge>
      </header>
      <div className="vp">
        <div className="vp__lead">
          <span className="vp__id">A-04</span>
          <span className="vp__plate">2847-LDH</span>
        </div>
        <div className="vp__grid">
          <KV k="Pilot">M. Álvarez <button className="ic-btn" title="Intercambiar"><i className="ti ti-arrows-exchange"></i></button></KV>
          <KV k="Carry">R. Suárez <button className="ic-btn" title="Quitar"><i className="ti ti-user-minus"></i></button></KV>
          <KV k="Servicio">Guardia urgencias</KV>
          <KV k="condicion_tecnica"><Badge tone="ok">Operativo</Badge></KV>
        </div>
      </div>
    </section>
  );
}

function VisualInfoDRP({ onOpenScreen }) {
  const [open, setOpen] = React.useState(true);
  return (
    <section className="card vih__card vih__drp">
      <header className="card__hd">
        <span className="card__title">
          <i className="ti ti-map-pin" style={{marginRight:6}}></i>
          DRP Atlético-Sevilla
        </span>
        <Badge tone="info" bold>En preparación</Badge>
      </header>
      <div className="vid__meta">
        <KV k="Fecha" thin>14 / 03 / 2026</KV>
        <KV k="Hora" thin>20:00</KV>
        <KV k="Ubicación" thin>Estadio Pizjuán · Puerta 7</KV>
      </div>
      <div className="vid__row">
        <button className="vid__expand" onClick={() => setOpen(!open)}>
          <i className={"ti " + (open ? "ti-chevron-up" : "ti-chevron-down")}></i>
          Operativa DRP · documentos
        </button>
        <div className="vid__icons">
          <button className="ic-btn" title="Añadir asistencia Doc-1" onClick={() => onOpenScreen("add-doc1-modal")}>
            <i className="ti ti-circle-plus"></i>
          </button>
          <button className="ic-btn" title="Entrar a módulo filiación">
            <i className="ti ti-door-enter"></i>
          </button>
          <button className="ic-btn ic-btn--yellow" title="Activo en DRP">
            <i className="ti ti-ambulance"></i>
          </button>
        </div>
      </div>
      {open && (
        <div className="vid__docs">
          <button className="doc-tile" onClick={() => onOpenScreen("doc2-modal")}>
            <i className="ti ti-heart-rate-monitor"></i><span>Doc-2 Informe asistencial</span>
          </button>
          <button className="doc-tile"><i className="ti ti-file-text"></i><span>Doc-3 Triaje</span></button>
          <button className="doc-tile"><i className="ti ti-file-text"></i><span>Doc-4 Evolución</span></button>
          <button className="doc-tile"><i className="ti ti-file-text"></i><span>Doc-5 Alta</span></button>
          <button className="doc-tile doc-tile--warn"><i className="ti ti-alert-triangle"></i><span>Doc-11 Aviso urgente</span></button>
        </div>
      )}
    </section>
  );
}

function BandejaEntradaPersonal() {
  return (
    <section className="card vih__card vih__inbox">
      <header className="card__hd">
        <span className="card__title">Bandejas personales · solo lectura</span>
      </header>
      <div className="inbox-row">
        <button className="inbox-pin inbox-pin--unread">
          <i className="ti ti-mail"></i>
          <span className="inbox-pin__ini">MA</span>
          <span className="inbox-pin__dot"></span>
        </button>
        <button className="inbox-pin">
          <i className="ti ti-mail"></i>
          <span className="inbox-pin__ini">RS</span>
        </button>
        <button className="inbox-pin inbox-pin--unread">
          <i className="ti ti-mail"></i>
          <span className="inbox-pin__ini">AC</span>
          <span className="inbox-pin__dot"></span>
        </button>
        <span className="inbox-row__lbl">3 buzones · 2 sin leer</span>
      </div>
    </section>
  );
}

Object.assign(window, { VisualInfoHome, PanelPersonal, PanelVehiculo, VisualInfoDRP, BandejaEntradaPersonal });
