// BlackColumn.jsx — barra lateral fija 52px, acordeón, indicador amarillo.
// Items definidos en black_column.md (AngieVik/UI24).

const NAV = [
  { id: "home",     icon: "ti-home",                label: "Home" },
  { id: "checkin",  icon: "ti-login",               label: "Check-in" },
  {
    id: "operativa", icon: "ti-ambulance",          label: "Operativa rutinaria",
    children: [
      { id: "doc10v", icon: "ti-file-text",          label: "Doc-10 Envío material" },
      { id: "doc6",   icon: "ti-package",            label: "Doc-6 Gasto material" },
      { id: "doc8",   icon: "ti-clipboard-list",     label: "Doc-8 Parte de trabajo" },
      { sep: true },
      { id: "doc2",   icon: "ti-heart-rate-monitor", label: "Doc-2 Informe asistencial" },
      { id: "doc11",  icon: "ti-alert-triangle",     label: "Doc-11 Aviso urgente" },
      { id: "fuel",   icon: "ti-gas-station",        label: "Repostar combustible" },
      { id: "adblue", icon: "ti-droplet",            label: "Repostar AdBlue" },
      { id: "chk360", icon: "ti-checkbox",           label: "Doc-Checklist360" },
      { id: "vehs",   icon: "ti-steering-wheel",     label: "Vehículos" },
    ],
  },
  {
    id: "drp", icon: "ti-map-pin", label: "DRP",
    children: [
      { id: "drp_op",   icon: "ti-activity",       label: "Operativa DRP" },
      { id: "drp_vis",  icon: "ti-selector",       label: "Visor DRP" },
      { id: "drp_res",  icon: "ti-chart-bar",      label: "Resumen DRP" },
      { id: "drp_log",  icon: "ti-package",        label: "Logística DRP" },
      { id: "drp_new",  icon: "ti-circle-plus",    label: "Crear DRP" },
      { id: "drp_est",  icon: "ti-toggle-left",    label: "Estados DRP" },
    ],
  },
  { id: "mods",     icon: "ti-puzzle",             label: "Módulos especiales" },
  { id: "log",      icon: "ti-building-warehouse", label: "Logística y almacén" },
  { id: "fleet",    icon: "ti-car",                label: "Flota y taller" },
  { id: "sec",      icon: "ti-shield-lock",        label: "Coordinación y seguridad" },
  { id: "rrhh",     icon: "ti-id-badge",           label: "Gestión y RRHH" },
  { id: "tab",      icon: "ti-speakerphone",       label: "Tablón central" },
  { id: "doc13",    icon: "ti-message-report",     label: "Buzón interno" },
];

function BlackColumn({ active, openGroup, onSelect, onToggleGroup }) {
  return (
    <nav className="bc">
      <div className="bc__logo" title="U24 Servicios Sanitarios">
        <img src={(window.U24_ASSETS || "") + "u24-logo-mark.svg"} alt="U24" />
      </div>
      <div className="bc__items">
        {NAV.map((item) => {
          const isActive = active === item.id || (item.children && item.children.some(c => c.id === active));
          const isOpen = openGroup === item.id;
          return (
            <React.Fragment key={item.id}>
              <button
                className={"bc__btn" + (isActive ? " bc__btn--active" : "")}
                title={item.label}
                aria-label={item.label}
                onClick={() => {
                  if (item.children) onToggleGroup(item.id);
                  else onSelect(item.id);
                }}
              >
                <i className={"ti " + item.icon}></i>
              </button>
              {item.children && isOpen && item.children.map((c, i) =>
                c.sep
                  ? <div key={"sep" + i} className="bc__sep" aria-hidden="true"></div>
                  : (
                    <button
                      key={c.id}
                      className={"bc__btn bc__btn--sub" + (active === c.id ? " bc__btn--active" : "")}
                      title={c.label}
                      aria-label={c.label}
                      onClick={() => onSelect(c.id)}
                    >
                      <i className={"ti " + c.icon}></i>
                    </button>
                  )
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

window.BlackColumn = BlackColumn;
window.NAV = NAV;
