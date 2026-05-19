// Modal.jsx — overlay sobre home_area + dos variantes (Doc-2, añadir Doc-1).

function Modal({ open, title, onClose, footer, light, children }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={"modal" + (light ? " modal--light" : "")}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__hd">
          <span className="modal__title">{title}</span>
          <button className="modal__close" aria-label="Cerrar" onClick={onClose}>
            <i className="ti ti-x"></i>
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

function Doc2Modal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Doc-2 Informe asistencial"
      footer={
        <>
          <Btn tone="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn icon="ti-device-floppy">Guardar Doc-2</Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Paciente · ID_filiacion">
          <input type="text" defaultValue="P-2026-0184" />
        </Field>
        <Field label="Nombre y apellidos">
          <input type="text" defaultValue="Carmen Delgado Pérez" />
        </Field>
        <Field label="Edad">
          <input type="text" defaultValue="62" />
        </Field>
        <Field label="DNI/NIE/Pasaporte">
          <input type="text" defaultValue="28456732K" />
        </Field>
        <Field label="Motivo de la asistencia">
          <textarea rows="2" defaultValue="Dolor torácico en banda, irradiado a brazo izquierdo, 25 min de evolución."></textarea>
        </Field>
        <Field label="Constantes">
          <div className="grid-3">
            <input type="text" defaultValue="TA 144/92" />
            <input type="text" defaultValue="FC 102" />
            <input type="text" defaultValue="SpO2 96%" />
          </div>
        </Field>
        <Field label="Resolución">
          <textarea rows="2" defaultValue="Traslado a Hospital Virgen del Rocío · prealerta UCI."></textarea>
        </Field>
      </div>
    </Modal>
  );
}

function AddDoc1Modal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      light
      title="Añadir asistencia · Doc-1"
      footer={
        <>
          <Btn tone="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn tone="yellow" icon="ti-circle-plus">Registrar asistencia</Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nombre y apellidos">
          <input type="text" placeholder="Repositorio p_filiacion" />
        </Field>
        <Field label="Edad">
          <input type="text" />
        </Field>
        <Field label="DNI/NIE/Pasaporte">
          <input type="text" />
        </Field>
        <Field label="Motivo de la asistencia">
          <textarea rows="2"></textarea>
        </Field>
        <Field label="Resolución">
          <textarea rows="2"></textarea>
        </Field>
      </div>
    </Modal>
  );
}

Object.assign(window, { Modal, Doc2Modal, AddDoc1Modal });
