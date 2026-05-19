// Atoms.jsx — componentes pequeños reutilizables.

function Badge({ tone = "neutral", icon, children, bold }) {
  return (
    <span className={"badge badge--" + tone + (bold ? " badge--bold" : "")}>
      {icon ? <i className={"ti " + icon}></i> : null}
      {children}
    </span>
  );
}

function Btn({ tone = "primary", icon, children, onClick, type = "button", disabled, group }) {
  return (
    <button
      type={type}
      className={"btn btn--" + tone}
      onClick={onClick}
      disabled={disabled}
    >
      {icon ? <i className={"ti " + icon}></i> : null}
      {children}
    </button>
  );
}

function BtnGroup({ children }) {
  return <div className="btn-group">{children}</div>;
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field__lbl">{label}</span>
      {children}
      {error ? <span className="field__err">{error}</span> : null}
    </label>
  );
}

function Toggle({ on, onChange, children }) {
  return (
    <label className="toggle-row">
      <button
        type="button"
        className={"toggle" + (on ? " toggle--on" : "")}
        aria-pressed={on}
        onClick={() => onChange(!on)}
      >
        <span className="toggle__knob"></span>
      </button>
      <span className="toggle-row__lbl">{children}</span>
    </label>
  );
}

function KV({ k, children, thin }) {
  return (
    <div className="kv">
      <span className="kv__k">{k}</span>
      <span className={"kv__v" + (thin ? " kv__v--thin" : "")}>{children}</span>
    </div>
  );
}

function Avatar({ initials, role }) {
  return (
    <span className="avatar" title={role}>
      <span className="avatar__ini">{initials}</span>
    </span>
  );
}

Object.assign(window, { Badge, Btn, BtnGroup, Field, Toggle, KV, Avatar });
