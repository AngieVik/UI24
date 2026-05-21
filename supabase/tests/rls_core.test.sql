-- ============================================================
--  pgTAP — Tests RLS core
--  Sprint 2 — Tareas 2.1 · 2.2 · 2.3 · 2.4
--
--  Ejecutar: supabase test db
--  Los tests corren en una transacción que se revierte al final;
--  el esquema de producción no queda modificado.
-- ============================================================

BEGIN;

SELECT plan(16);

-- ============================================================
--  FIXTURES (ejecutados como postgres / superuser → RLS bypassed)
-- ============================================================

-- 4 usuarios de auth.users para representar roles distintos
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tes@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('b0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gerencia@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('c0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'medico@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('d0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'flota.baja@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false);

-- fichas_empleados: TES y GERENCIA activos, MEDICO activo, FLOTA inactivo
INSERT INTO fichas_empleados (auth_user_id, id_nombre, nombre_real, rol, activo) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'test_tes',        'TES Test',       'tes',     TRUE),
  ('b0000000-0000-0000-0000-000000000001', 'test_gerencia',   'Gerencia Test',  'gerencia',TRUE),
  ('c0000000-0000-0000-0000-000000000001', 'test_medico',     'Medico Test',    'medico',  TRUE),
  ('d0000000-0000-0000-0000-000000000001', 'test_flota_baja', 'Flota Inactivo', 'flota',   FALSE);

-- Vehículo y activación (necesarios para las FKs de doc2)
INSERT INTO vehiculos (matricula, tipo, condicion_tecnica, estado_operativo)
VALUES ('TST-000', 'A1', 'operativo', 'inactivo');

INSERT INTO activaciones_vehiculo (id_activacion, matricula, pilot)
VALUES ('e0000000-0000-0000-0000-000000000001', 'TST-000', 'test_tes');

-- Galletas: una por cada usuario (solo la de TES debe ser visible para TES)
INSERT INTO galletas_terminales (id_terminal, tipo, id_nombre) VALUES
  ('terminal-tes',      'permanente', 'test_tes'),
  ('terminal-gerencia', 'permanente', 'test_gerencia');

-- Doc2: una creada por TES (UUID_TES en auth_uid_redactor), otra por MEDICO
INSERT INTO doc2_informes_svb (id_doc, id_activacion, id_nombre_redactor, auth_uid_redactor) VALUES
  ('e0000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000001', 'test_tes',    'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000001', 'test_medico', 'c0000000-0000-0000-0000-000000000001');

-- Auditoría RBAC: una fila para probar SELECT permitido/denegado por rol
INSERT INTO auditoria_rbac (tipo_evento, id_nombre) VALUES ('login_exitoso', 'test_tes');

-- Doc1 asistencias: una para TES, otra para GERENCIA
INSERT INTO doc1_asistencias (id_nombre) VALUES ('test_tes');
INSERT INTO doc1_asistencias (id_nombre) VALUES ('test_gerencia');

-- PSA (para Realtime test)
INSERT INTO psa_sesiones (id_sesion, matricula)
VALUES ('f0000000-0000-0000-0000-000000000001', 'TST-000');
INSERT INTO psa_pacientes (id_sesion, datos_clinicos)
VALUES ('f0000000-0000-0000-0000-000000000001', '{}');

-- Filiación (para Realtime test)
INSERT INTO filiacion_sesiones (id_sesion, id_drp) VALUES ('f0000000-0000-0000-0000-000000000002', NULL);
INSERT INTO filiacion_pacientes (id_sesion)       VALUES ('f0000000-0000-0000-0000-000000000002');

-- Mensajes bandeja: uno para TES, uno para GERENCIA
INSERT INTO mensajes_bandeja (id_nombre_destino, contenido) VALUES
  ('test_tes',      'Hola TES'),
  ('test_gerencia', 'Hola Gerencia');

-- ============================================================
--  Cambiar a rol authenticated para que RLS tome efecto.
--  A partir de aquí solo cambiamos JWT claims entre tests.
-- ============================================================

SET LOCAL role TO authenticated;

-- ─────────────────────────────────────────────────────────────
--  2.1 fichas_empleados
-- ─────────────────────────────────────────────────────────────

-- Test 1: TES ve los empleados activos
SELECT set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT COUNT(*) FROM fichas_empleados WHERE activo = TRUE) >= 3,
  '2.1 fichas: TES ve empleados activos'
);

-- Test 2: TES no ve al empleado inactivo ajeno (test_flota_baja)
SELECT ok(
  (SELECT COUNT(*) FROM fichas_empleados
   WHERE id_nombre = 'test_flota_baja' AND activo = FALSE) = 0,
  '2.1 fichas: TES no ve empleado inactivo ajeno'
);

-- Test 3: GERENCIA sí ve al empleado inactivo
SELECT set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT COUNT(*) FROM fichas_empleados
   WHERE id_nombre = 'test_flota_baja' AND activo = FALSE) = 1,
  '2.1 fichas: Gerencia ve empleado inactivo'
);

-- Test 4: TES no puede INSERT directo en fichas_empleados (RLS deny-by-default)
SELECT set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $q$
    INSERT INTO fichas_empleados (auth_user_id, id_nombre, nombre_real, rol)
    VALUES ('99999999-0000-0000-0000-000000000001', 'intruso', 'Intruso', 'tes')
  $q$,
  '42501',
  '2.1 fichas: INSERT directo bloqueado por RLS'
);

-- ─────────────────────────────────────────────────────────────
--  2.1 galletas_terminales
-- ─────────────────────────────────────────────────────────────

-- Test 5: TES ve su propia galleta activa
SELECT ok(
  (SELECT COUNT(*) FROM galletas_terminales
   WHERE id_nombre = 'test_tes' AND revocado_at IS NULL) = 1,
  '2.1 galletas: TES ve su propia galleta activa'
);

-- Test 6: TES no ve la galleta de GERENCIA
SELECT ok(
  (SELECT COUNT(*) FROM galletas_terminales WHERE id_nombre = 'test_gerencia') = 0,
  '2.1 galletas: TES no ve galleta ajena'
);

-- ─────────────────────────────────────────────────────────────
--  2.2 doc2_informes_svb (redactor ve lo propio; clínico ve todo)
-- ─────────────────────────────────────────────────────────────

-- Test 7: TES no ve el informe de MEDICO
SELECT ok(
  (SELECT COUNT(*) FROM doc2_informes_svb
   WHERE auth_uid_redactor = 'c0000000-0000-0000-0000-000000000001') = 0,
  '2.2 doc2: TES no ve informe ajeno'
);

-- Test 8: TES ve su propio informe
SELECT ok(
  (SELECT COUNT(*) FROM doc2_informes_svb
   WHERE auth_uid_redactor = 'a0000000-0000-0000-0000-000000000001') = 1,
  '2.2 doc2: TES ve su propio informe'
);

-- Test 9: MEDICO ve todos los informes (2 en total)
SELECT set_config('request.jwt.claims',
  '{"sub":"c0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT COUNT(*) FROM doc2_informes_svb) = 2,
  '2.2 doc2: Medico ve todos los informes'
);

-- ─────────────────────────────────────────────────────────────
--  2.3 tablas inmutables
-- ─────────────────────────────────────────────────────────────

-- Test 10: TES no puede SELECT auditoria_rbac (no es gerencia ni rrhh)
SELECT set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT COUNT(*) FROM auditoria_rbac) = 0,
  '2.3 auditoria_rbac: TES no puede SELECT (no es gerencia/rrhh)'
);

-- Test 11: GERENCIA puede SELECT auditoria_rbac
SELECT set_config('request.jwt.claims',
  '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT COUNT(*) FROM auditoria_rbac) = 1,
  '2.3 auditoria_rbac: Gerencia puede SELECT'
);

-- Test 12: TES puede SELECT su propia asistencia (doc1)
SELECT set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT COUNT(*) FROM doc1_asistencias WHERE id_nombre = 'test_tes') = 1,
  '2.3 doc1: TES ve su propia asistencia'
);

-- Test 13: TES no puede SELECT la asistencia de GERENCIA
SELECT ok(
  (SELECT COUNT(*) FROM doc1_asistencias WHERE id_nombre = 'test_gerencia') = 0,
  '2.3 doc1: TES no ve asistencia ajena'
);

-- ─────────────────────────────────────────────────────────────
--  2.4 tablas Realtime
-- ─────────────────────────────────────────────────────────────

-- Test 14: authenticated puede SELECT psa_pacientes (canal Realtime)
SELECT ok(
  (SELECT COUNT(*) FROM psa_pacientes) = 1,
  '2.4 psa_pacientes: authenticated puede SELECT (Realtime OK)'
);

-- Test 15: TES ve sus propios mensajes de bandeja
SELECT ok(
  (SELECT COUNT(*) FROM mensajes_bandeja WHERE id_nombre_destino = 'test_tes') = 1,
  '2.4 mensajes: TES ve sus propios mensajes'
);

-- Test 16: TES no ve los mensajes de GERENCIA
SELECT ok(
  (SELECT COUNT(*) FROM mensajes_bandeja WHERE id_nombre_destino = 'test_gerencia') = 0,
  '2.4 mensajes: TES no ve mensajes ajenos'
);

SELECT finish();
ROLLBACK;
