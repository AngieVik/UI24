// App.jsx — composición principal del terminal.
// Estado_0 (bloqueado) vs estado_1 (autenticado) + navegación in-place + modales.

function App() {
  const [unlocked, setUnlocked] = React.useState(true);
  const [active, setActive] = React.useState("home");
  const [openGroup, setOpenGroup] = React.useState(null);
  const [modal, setModal] = React.useState(null);
  const [offline, setOffline] = React.useState(false);

  // Estado_0 — terminal_check centrado, sin chrome
  if (!unlocked) {
    return (
      <div className="estado-0">
        <TerminalCheck onSubmit={() => setUnlocked(true)} />
      </div>
    );
  }

  const ticker = "Tablón · Doc-12 Vacaciones de verano abierto hasta 30 de abril · Marquesina actualizada hace 18 min.";
  const showBack = active !== "home" || modal !== null;

  const onBack = () => {
    if (modal) return setModal(null);
    setActive("home");
  };
  const onSelect = (id) => { setActive(id); setModal(null); };
  const onToggleGroup = (id) => setOpenGroup(openGroup === id ? null : id);
  const onOpenScreen = (id) => {
    if (id.endsWith("modal")) setModal(id);
    else setActive(id);
  };

  return (
    <div className="terminal">
      <BlackColumn
        active={active}
        openGroup={openGroup}
        onSelect={onSelect}
        onToggleGroup={onToggleGroup}
      />
      <div className="terminal__main">
        <Header
          showBack={showBack}
          onBack={onBack}
          unreadFleet={true}
          unreadCoord={false}
          ticker={ticker}
        />
        {offline && (
          <div className="banner" role="status">
            <i className="ti ti-wifi-off"></i>
            <span><b>Sin conexión</b> · Última sincronización: hace 12 min · Los partes de trabajo y registros clínicos siguen disponibles.</span>
            <button className="banner__close" onClick={() => setOffline(false)}><i className="ti ti-x"></i></button>
          </div>
        )}
        <main className="home">
          {active === "home"     && <VisualInfoHome onOpenScreen={onOpenScreen} />}
          {active === "checkin"  && <TerminalCheck onSubmit={() => setActive("home")} />}
          {active === "vehs"     && <VistaVehiculos />}
          {active === "drp_vis"  && <VisorDRP />}
          {active !== "home" && active !== "checkin" && active !== "vehs" && active !== "drp_vis" && (
            <Placeholder id={active} />
          )}
        </main>

        <Doc2Modal     open={modal === "doc2-modal"}     onClose={() => setModal(null)} />
        <AddDoc1Modal  open={modal === "add-doc1-modal"} onClose={() => setModal(null)} />

        <button
          className="dev-toggle"
          title={unlocked ? "Bloquear terminal" : "Desbloquear"}
          onClick={() => setUnlocked(false)}
        >
          <i className="ti ti-lock"></i>
        </button>
        <button
          className="dev-toggle dev-toggle--2"
          title={offline ? "Conectar" : "Simular sin conexión"}
          onClick={() => setOffline(!offline)}
        >
          <i className={"ti " + (offline ? "ti-wifi" : "ti-wifi-off")}></i>
        </button>
      </div>
    </div>
  );
}

function Placeholder({ id }) {
  // Pantalla de marcador para nodos del black_column que no recreamos en este UI kit.
  const found = (window.NAV || []).flatMap((n) => [n, ...(n.children || [])]).find((x) => x && x.id === id);
  const label = found ? found.label : id;
  return (
    <div className="screen screen--placeholder">
      <div className="ph">
        <i className={"ti " + (found?.icon || "ti-square") + " ph__ico"}></i>
        <h2>{label}</h2>
        <p>
          Esta vista forma parte del terminal real pero no está recreada en este UI kit.
          El sistema documenta su comportamiento en{" "}
          <code>mapeo_visual_ui.md</code> dentro del repo <code>AngieVik/UI24</code>.
        </p>
        <p className="ph__hint">
          Las vistas recreadas son: <b>Home</b>, <b>Check-in</b>, <b>Vehículos</b> y <b>Visor DRP</b>.
        </p>
      </div>
    </div>
  );
}

window.App = App;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
