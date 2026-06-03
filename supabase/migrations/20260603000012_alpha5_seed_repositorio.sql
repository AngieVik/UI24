-- ============================================================
--  ALPHA.5 — Seed repositorio_documentos con los docs de la app.
--  url = leafId interno del router (App.tsx selectedLeafId).
--  Idempotente (INSERT ... WHERE NOT EXISTS por url).
-- ============================================================

INSERT INTO repositorio_documentos (nombre, categoria, descripcion, url, activo)
SELECT t.nombre, t.categoria, t.descripcion, t.url, TRUE
FROM (VALUES
  ('Doc-2 — Informe asistencial',     'Clínico',   'Informe clínico del servicio prestado',                       'doc2'),
  ('Doc-6 — Gasto de material',       'Logística', 'Registro de consumo de material durante el servicio',          'doc6'),
  ('Doc-7 — Informe de avería',       'Flota',     'Notificación de avería o incidencia en el vehículo',           'doc7_op'),
  ('Doc-8 — Parte de trabajo',        'Operativa', 'Parte diario de trabajo: turno, kilómetros y notas',           'doc8'),
  ('Doc-9 — Entrada a almacén',       'Logística', 'Registro de material recibido en almacén',                     'log_doc9'),
  ('Doc-10 — Envío de material',      'Logística', 'Solicitud y registro de envío de material entre bases',        'doc10_op'),
  ('Doc-11 — Aviso urgente',          'Operativa', 'Aviso urgente entre equipos operativos',                       'doc11'),
  ('Doc-12 — Solicitud de vacaciones','RRHH',      'Solicitud formal de vacaciones o permiso',                     'rrhh_vacaciones'),
  ('Módulo PSA',                      'Clínico',   'Registro de sesión de soporte psicológico a afectados',        'mod_psa'),
  ('Módulo Filiación',                'Clínico',   'Registro de filiación de paciente',                            'mod_filiacion'),
  ('Repostaje combustible',           'Flota',     'Registro de repostaje de combustible del vehículo',            'fuel'),
  ('Repostaje AdBlue',                'Flota',     'Registro de repostaje de AdBlue del vehículo',                 'adblue'),
  ('Checklist 360°',                  'Flota',     'Checklist de revisión completa del vehículo al inicio de turno','chk360')
) AS t(nombre, categoria, descripcion, url)
WHERE NOT EXISTS (
  SELECT 1 FROM repositorio_documentos r WHERE r.url = t.url
);
