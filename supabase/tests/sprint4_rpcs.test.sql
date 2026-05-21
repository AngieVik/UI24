-- ============================================================
--  pgTAP — Tests RPCs Sprint 4
--  Tareas 4.1 · 4.3 · 4.5 · 4.6
--
--  Ejecutar: supabase test db
--  Los tests corren en una transacción que se revierte al final.
--
--  Nota: las Edge Functions (4.1 ef-alta/baja-empleado, etc.) se
--  testean en integración — ver testing_arquitectura.md §4.
-- ============================================================

BEGIN;

SELECT plan(16);

-- ============================================================
--  FIXTURES
-- ============================================================

SET LOCAL role TO postgres;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  ('ca000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gerencia4@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('cb000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'coord4@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('cc000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tes4@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('cd000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'target4@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false);

INSERT INTO fichas_empleados (auth_user_id, id_nombre, nombre_real, rol, activo,
                              pin_stepup_hash, pin_stepup_salt)
VALUES
  ('ca000000-0000-0000-0000-000000000001', 'test4_gerencia', 'Gerencia S4', 'gerencia', TRUE,
   'hash_gerencia_s4', 'salt_s4'),
  ('cb000000-0000-0000-0000-000000000001', 'test4_coord',    'Coord S4',    'coordinacion', TRUE, NULL, NULL),
  ('cc000000-0000-0000-0000-000000000001', 'test4_tes',      'TES S4',      'tes',       TRUE, NULL, NULL),
  ('cd000000-0000-0000-0000-000000000001', 'test4_target',   'Target S4',   'flota',     TRUE, NULL, NULL);

-- Vehículo para DRP
INSERT INTO vehiculos (matricula, tipo, condicion_tecnica, estado_operativo)
VALUES ('S4T-001', 'B', 'operativo', 'inactivo');

INSERT INTO locations (location_id, nombre, tipo)
VALUES ('S4T-001', 'Vehículo S4T-001', 'vehiculo');

-- DRP activo
INSERT INTO drps (id_drp, estado, id_coordinacion)
VALUES ('da000000-0000-0000-0000-000000000001', 'En_curso', 'test4_coord');

INSERT INTO dotaciones_drp (id_drp, matricula)
VALUES ('da000000-0000-0000-0000-000000000001', 'S4T-001');

UPDATE vehiculos SET estado_operativo = 'en_drp' WHERE matricula = 'S4T-001';

-- Mochila disponible
INSERT INTO locations (location_id, nombre, tipo)
VALUES ('base-s4', 'Base Sprint 4', 'base');
INSERT INTO mochilas_backpack (id_mochila, codigo, estado)
VALUES ('ma000000-0000-0000-0000-000000000001', 'BKP1', 'disponible');

-- Activación para RGPD clínico
INSERT INTO activaciones_vehiculo (id_activacion, matricula, pilot)
VALUES ('ea000000-0000-0000-0000-000000000001', 'S4T-001', 'test4_tes');

INSERT INTO doc2_informes_svb (id_doc, id_activacion, id_nombre_redactor, auth_uid_redactor, datos_paciente)
VALUES ('ea000000-0000-0000-0000-000000000002',
        'ea000000-0000-0000-0000-000000000001', 'test4_tes',
        'cc000000-0000-0000-0000-000000000001',
        '{"nombre":"Juan","dni":"12345678A"}');

-- Empleado con solicitud vacaciones
INSERT INTO doc_solicitudes_vacaciones (
  id, id_nombre, periodo_anual, fecha_inicio, fecha_fin, estado
) VALUES (
  'fa000000-0000-0000-0000-000000000001',
  'test4_tes', '2026', '2026-07-01', '2026-07-03', 'Pendiente_Aprobacion'
);

SET LOCAL role TO authenticated;

-- ============================================================
--  4.1 rpc_cambiar_rol
-- ============================================================

-- Test 1: TES no puede cambiar roles
SELECT set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $q$ SELECT rpc_cambiar_rol('test4_target', 'medico') $q$,
  'P0001',
  '4.1 cambiar_rol: TES no puede cambiar roles'
);

-- Test 2: Gerencia sí puede cambiar el rol del target
SELECT set_config('request.jwt.claims',
  '{"sub":"ca000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_cambiar_rol('test4_target', 'medico') IS NULL),
  '4.1 cambiar_rol: Gerencia cambia rol de test4_target a medico'
);

-- Test 3: El cambio se refleja en fichas_empleados
SELECT ok(
  (SELECT rol FROM fichas_empleados WHERE id_nombre = 'test4_target') = 'medico',
  '4.1 cambiar_rol: rol actualizado correctamente en fichas_empleados'
);

-- Test 4: El cambio queda auditado en auditoria_rbac
SELECT ok(
  (SELECT COUNT(*) FROM auditoria_rbac
   WHERE tipo_evento = 'cambio_rol' AND id_nombre = 'test4_target') >= 1,
  '4.1 cambiar_rol: cambio auditado por trigger'
);

-- ============================================================
--  4.3 rpc_cancelar_drp
-- ============================================================

-- Test 5: TES no puede cancelar un DRP
SELECT set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $q$ SELECT rpc_cancelar_drp('da000000-0000-0000-0000-000000000001', NULL) $q$,
  'P0001',
  '4.3 cancelar_drp: TES no puede cancelar DRP'
);

-- Test 6: Coordinación puede cancelar el DRP
SELECT set_config('request.jwt.claims',
  '{"sub":"cb000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_cancelar_drp('da000000-0000-0000-0000-000000000001', 'Test cancelación') IS NULL),
  '4.3 cancelar_drp: Coordinación cancela el DRP'
);

-- Test 7: El DRP queda en estado Cancelado
SELECT ok(
  (SELECT estado FROM drps WHERE id_drp = 'da000000-0000-0000-0000-000000000001') = 'Cancelado',
  '4.3 cancelar_drp: DRP pasa a estado Cancelado'
);

-- Test 8: El vehículo vuelve a inactivo
SELECT ok(
  (SELECT estado_operativo FROM vehiculos WHERE matricula = 'S4T-001') = 'inactivo',
  '4.3 cancelar_drp: vehículo liberado a estado inactivo'
);

-- Test 9: No se puede cancelar dos veces el mismo DRP
SELECT throws_ok(
  $q$ SELECT rpc_cancelar_drp('da000000-0000-0000-0000-000000000001', 'Segundo intento') $q$,
  'P0001',
  '4.3 cancelar_drp: rechaza segunda cancelación del mismo DRP'
);

-- ============================================================
--  4.3 rpc_asignar_mochila_a_drp
-- ============================================================

-- Crear un segundo DRP para asignar mochila (el primero está Cancelado)
SET LOCAL role TO postgres;
INSERT INTO drps (id_drp, estado, id_coordinacion)
VALUES ('da000000-0000-0000-0000-000000000002', 'En_espera', 'test4_coord');
SET LOCAL role TO authenticated;

-- Test 10: TES no puede asignar mochila a DRP
SELECT set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $q$
    SELECT rpc_asignar_mochila_a_drp(
      'ma000000-0000-0000-0000-000000000001',
      'da000000-0000-0000-0000-000000000002'
    )
  $q$,
  'P0001',
  '4.3 asignar_mochila: TES no tiene permiso'
);

-- Test 11: Coordinación puede asignar mochila a DRP en espera
SELECT set_config('request.jwt.claims',
  '{"sub":"cb000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_asignar_mochila_a_drp(
    'ma000000-0000-0000-0000-000000000001',
    'da000000-0000-0000-0000-000000000002'
  ) IS NULL),
  '4.3 asignar_mochila: Coordinación asigna BKP1 al DRP en espera'
);

-- Test 12: La mochila queda en estado desplegada
SELECT ok(
  (SELECT estado FROM mochilas_backpack
   WHERE id_mochila = 'ma000000-0000-0000-0000-000000000001') = 'desplegada',
  '4.3 asignar_mochila: mochila pasa a estado desplegada'
);

-- ============================================================
--  4.5 rpc_solicitar_borrado_rgpd y rpc_procesar_borrado_rgpd
-- ============================================================

-- Test 13: TES puede solicitar borrado clínico
SELECT set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_solicitar_borrado_rgpd(
    'borrado_clinico',
    'ea000000-0000-0000-0000-000000000001',
    'Paciente solicitó borrado de datos'
  ) IS NOT NULL),
  '4.5 solicitar_borrado_rgpd: TES crea solicitud de borrado clínico'
);

-- Test 14: TES no puede procesar su propia solicitud
SELECT throws_ok(
  $q$
    SELECT rpc_procesar_borrado_rgpd(
      (SELECT id FROM solicitudes_rgpd WHERE identificador = 'ea000000-0000-0000-0000-000000000001' LIMIT 1),
      NULL
    )
  $q$,
  'P0001',
  '4.5 procesar_borrado_rgpd: TES no puede procesar solicitudes RGPD'
);

-- Test 15: Gerencia puede procesar el borrado clínico
SELECT set_config('request.jwt.claims',
  '{"sub":"ca000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_procesar_borrado_rgpd(
    (SELECT id FROM solicitudes_rgpd
     WHERE identificador = 'ea000000-0000-0000-0000-000000000001' LIMIT 1),
    'Procesado en test'
  ) IS NULL),
  '4.5 procesar_borrado_rgpd: Gerencia procesa borrado clínico'
);

-- Test 16: Los datos_paciente quedan anonimizados en doc2
SELECT ok(
  (SELECT datos_paciente FROM doc2_informes_svb
   WHERE id_doc = 'ea000000-0000-0000-0000-000000000002') = '{}'::jsonb,
  '4.5 borrado_clinico: datos_paciente anonimizados en doc2'
);

SELECT finish();
ROLLBACK;
