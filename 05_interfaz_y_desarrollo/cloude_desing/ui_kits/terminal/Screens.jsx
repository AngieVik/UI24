// Screens.jsx — vistas in-place que reemplazan el contenido del home_area.

function TerminalCheck({ onSubmit }) {
  const [user, setUser] = React.useState("");
  const [pin, setPin] = React.useState("");
  return (
    <div className="screen screen--check">
      <form className="check-form" onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(); }}>
        <header className="check-form__hd">
          <img src={(window.U24_ASSETS || "") + "u24-logo-mark.svg"} alt="" className="check-form__logo" />
          <h2 className="check-form__title">terminal_check</h2>
          <p className="check-form__sub">Identifícate para abrir el terminal.</p>
        </header>
        <Field label="ID_nombre">
          <input type="text" placeholder="ej. M. Álvarez" value={user} onChange={(e) => setUser(e.target.value)} />
        </Field>
        <Field label="PIN · 6 dígitos">
          <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••••" />
        </Field>
        <Field label="Función del turno">
          <div className="seg">
            <button type="button" className="seg__opt seg__opt--on">pilot</button>
            <button type="button" className="seg__opt">carry</button>
            <button type="button" className="seg__opt">a pie</button>
          </div>
        </Field>
        <div className="check-form__foot">
          <Btn tone="ghost">Cancelar</Btn>
          <Btn icon="ti-login">Hacer check-in</Btn>
        </div>
      </form>
    </div>
  );
}

function VistaVehiculos() {
  const fleet = [
    { id: "A-01", plate: "9221-MJB", op: "en_espera",  tone: "neutral", tec: "operativo" },
    { id: "A-04", plate: "2847-LDH", op: "ruta",       tone: "info",    tec: "operativo", active: true },
    { id: "A-07", plate: "6193-KPB", op: "alerta",     tone: "crit",    tec: "operativo" },
    { id: "A-09", plate: "0473-PXC", op: "estacionado",tone: "warn",    tec: "averiado_leve" },
    { id: "A-11", plate: "5318-ZAR", op: "en_espera",  tone: "neutral", tec: "inoperativo_critico" },
    { id: "A-12", plate: "7704-NDM", op: "activado",   tone: "ok",      tec: "operativo" },
  ];
  return (
    <div className="screen screen--fleet">
      <header className="screen__hd">
        <h2>Vista de vehículos</h2>
        <div className="screen__hd-actions">
          <input type="search" placeholder="Buscar matrícula o ID" />
          <Btn tone="ghost" icon="ti-filter">Filtros</Btn>
        </div>
      </header>
      <table className="tbl tbl--fleet">
        <thead>
          <tr><th>ID</th><th>Matrícula</th><th>Estado operativo</th><th>condicion_tecnica</th><th>Tipo servicio</th><th></th></tr>
        </thead>
        <tbody>
          {fleet.map((v) => (
            <tr key={v.id} className={v.active ? "tr--active" : ""}>
              <td className="td--id">{v.id}</td>
              <td className="td--mono">{v.plate}</td>
              <td><Badge tone={v.tone} bold>{v.op}</Badge></td>
              <td>
                {v.tec === "operativo" && <Badge tone="ok">Operativo</Badge>}
                {v.tec === "averiado_leve" && <Badge tone="warn">Averiado leve</Badge>}
                {v.tec === "inoperativo_critico" && <Badge tone="crit" bold>Inoperativo crítico</Badge>}
              </td>
              <td>{v.active ? "Guardia urgencias" : <span className="td--dim">—</span>}</td>
              <td className="td--end">
                <Btn tone="ghost" icon="ti-chevron-right">Seleccionar</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="fleet__expand" open>
        <summary>selector_estados_ID_vehiculo · A-04</summary>
        <div className="fleet__panel">
          <Field label="estado_operativo">
            <div className="seg seg--wrap">
              <button className="seg__opt">en_espera</button>
              <button className="seg__opt seg__opt--on">ruta</button>
              <button className="seg__opt">alerta</button>
              <button className="seg__opt">estacionado</button>
              <button className="seg__opt">activado</button>
            </div>
          </Field>
          <Field label="condicion_tecnica · solo lectura">
            <Badge tone="ok">Operativo</Badge>
          </Field>
          <Field label="tipo_servicio">
            <select defaultValue="Guardia urgencias">
              <option>Programado</option>
              <option>Guardia urgencias</option>
              <option>Traslado</option>
              <option>DRP</option>
            </select>
          </Field>
        </div>
      </details>
    </div>
  );
}

function VisorDRP() {
  return (
    <div className="screen screen--drp">
      <header className="screen__hd">
        <h2>Visor DRP</h2>
        <div className="screen__hd-actions">
          <Btn tone="yellow" icon="ti-circle-plus">Crear DRP</Btn>
        </div>
      </header>
      <DRPRow name="Atlético-Sevilla" date="14/03 · 20:00" loc="Estadio Pizjuán" state="En preparación" tone="info" expanded />
      <DRPRow name="Maratón Sierra Norte" date="16/03 · 09:00" loc="Pq. Sierra Norte" state="En espera" tone="neutral" />
      <DRPRow name="Concierto Camarón Fest" date="18/03 · 22:00" loc="Cartuja · Calle Alta" state="En curso" tone="info" bold />
      <div className="drp-fin">
        <span className="drp-fin__hd">Finalizados (últimas 48 h) · solo lectura</span>
        <DRPRow name="Feria San José" date="11/03 · 17:00" loc="Recinto ferial" state="Finalizado" tone="ok" dim />
      </div>
    </div>
  );
}

function DRPRow({ name, date, loc, state, tone, bold, expanded, dim }) {
  const [open, setOpen] = React.useState(!!expanded);
  return (
    <article className={"drp-card" + (dim ? " drp-card--dim" : "")}>
      <header className="drp-card__hd">
        <div className="drp-card__title">
          <button className="drp-card__toggle" onClick={() => setOpen(!open)}>
            <i className={"ti " + (open ? "ti-chevron-up" : "ti-chevron-down")}></i>
          </button>
          <h3>{name}</h3>
          <span className="drp-card__meta">{date}</span>
          <span className="drp-card__meta">·</span>
          <span className="drp-card__meta">{loc}</span>
        </div>
        <Badge tone={tone} bold={bold}>{state}</Badge>
      </header>
      {open && (
        <div className="drp-card__body">
          <span className="drp-card__sec">Dotaciones</span>
          <div className="drp-dots">
            <div className="drp-dot">
              <span className="drp-dot__id"><i className="ti ti-ambulance"></i> A-04 · 2847-LDH</span>
              <span className="drp-dot__pp">M. Álvarez · R. Suárez</span>
              <Badge tone="info">SVAE</Badge>
            </div>
            <div className="drp-dot">
              <span className="drp-dot__id"><i className="ti ti-ambulance"></i> A-09 · 0473-PXC</span>
              <span className="drp-dot__pp">J. Pinto · L. Ferrer</span>
              <Badge tone="info">SVB</Badge>
            </div>
            <div className="drp-dot drp-dot--foot">
              <span className="drp-dot__id"><i className="ti ti-user"></i> Personal a pie</span>
              <span className="drp-dot__pp">A. Casal · D. Romero</span>
              <Badge tone="neutral">2</Badge>
            </div>
          </div>
          <div className="drp-card__actions">
            <Btn tone="ghost" icon="ti-door-enter">Entrar al DRP</Btn>
            <Btn tone="ghost" icon="ti-door-exit">Salir del DRP</Btn>
            <Btn tone="ghost" icon="ti-edit">Editar recursos</Btn>
          </div>
        </div>
      )}
    </article>
  );
}

Object.assign(window, { TerminalCheck, VistaVehiculos, VisorDRP });
