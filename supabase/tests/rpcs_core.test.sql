-- ============================================================
--  pgTAP — Tests RPCs core + Triggers
--  Sprint 3 — Tareas 3.1 · 3.2 · 3.3 · 3.4 · 3.5
--
--  Ejecutar: supabase test db
--  Todos los tests corren en una transacción revertida al final.
-- ============================================================

BEGIN;

SELECT plan(22);

-- ============================================================
--  FIXTURES (como postgres / superuser — RLS bypassed)
-- ============================================================

-- Usuarios base para los tests
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  ('aa000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tes3@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('bb000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gerencia3@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false),
  ('cc000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'logistica3@u24.test', '', NOW(), NOW(), NOW(), '{}', '{}', false);

-- fichas_empleados: TES (sin step-up), GERENCIA (con step-up), LOGISTICA
INSERT INTO fichas_empleados (auth_user_id, id_nombre, nombre_real, rol, activo,
                              pin_stepup_hash, pin_stepup_salt)
VALUES
  ('aa000000-0000-0000-0000-000000000001', 'test3_tes',      'TES Sprint3',      'tes',      TRUE, NULL,    NULL),
  ('bb000000-0000-0000-0000-000000000001', 'test3_gerencia', 'Gerencia Sprint3', 'gerencia', TRUE,
   'abc123hash', 'abc123salt'),
  ('cc000000-0000-0000-0000-000000000001', 'test3_logistica','Logistica Sprint3','logistica',TRUE, NULL,    NULL);

-- Vehículo de prueba + location
INSERT INTO vehiculos (matricula, tipo, condicion_tecnica, estado_operativo)
VALUES ('S3T-001', 'A1', 'operativo', 'inactivo');

INSERT INTO locations (location_id, nombre, tipo)
VALUES ('S3T-001', 'Vehículo Sprint3 Test', 'vehiculo');

-- Activación abierta para el vehículo
INSERT INTO activaciones_vehiculo (id_activacion, matricula, pilot)
VALUES ('fa000000-0000-0000-0000-000000000001', 'S3T-001', 'test3_tes');

-- Ítem de catálogo
INSERT INTO catalogo_items (id_item, categoria, nombre) VALUES (9901, 'test', 'Item Sprint3');

-- Inventario del vehículo con stock
INSERT INTO inventario_vehiculo (matricula, id_item, subgrupo, stock_real)
VALUES ('S3T-001', 9901, 'medicacion', 10);

-- Galleta activa para TES
INSERT INTO galletas_terminales (id_terminal, tipo, id_nombre)
VALUES ('terminal-s3-tes', 'permanente', 'test3_tes');

-- ============================================================
--  Cambiar a rol authenticated
-- ============================================================

SET LOCAL role TO authenticated;

-- ============================================================
--  3.1 RPCs de galletas
-- ============================================================

-- Test 1: TES puede solicitar desbloqueo
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_solicitar_desbloqueo('terminal-s3-tes', 'Bloqueado por error') IS NOT NULL),
  '3.1 solicitar_desbloqueo: TES puede abrir solicitud'
);

-- Test 2: Una segunda solicitud pendiente para el mismo terminal falla
SELECT throws_ok(
  $q$ SELECT rpc_solicitar_desbloqueo('terminal-s3-tes', 'Duplicado') $q$,
  'P0001',
  '3.1 solicitar_desbloqueo: no permite duplicados activos'
);

-- Test 3: TES no puede revocar galleta de GERENCIA sin step-up correcto
-- (el step-up fallará porque 'wrong_hash' != 'abc123hash')
SELECT throws_ok(
  $q$
    SELECT rpc_revocar_y_reemitir_galleta(
      'terminal-s3-gerencia', 'test3_gerencia', 'permanente', 'wrong_hash', NULL
    )
  $q$,
  'P0001',
  '3.1 revocar_galleta: TES falla sin step-up válido'
);

-- Test 4: TES puede transferir su propia galleta a otro terminal
SELECT ok(
  (SELECT rpc_transferir_galleta('terminal-s3-tes-nuevo') IS NOT NULL),
  '3.1 transferir_galleta: TES puede transferir su galleta al nuevo terminal'
);

-- Test 5: Tras la transferencia la galleta anterior queda revocada
SELECT ok(
  (SELECT revocado_at IS NOT NULL FROM galletas_terminales
   WHERE id_terminal = 'terminal-s3-tes' AND id_nombre = 'test3_tes'),
  '3.1 transferir_galleta: galleta original revocada tras transferencia'
);

-- Test 6: TES no puede transferir dos veces (no hay galleta activa en terminal antiguo)
SELECT throws_ok(
  $q$ SELECT rpc_transferir_galleta('terminal-s3-tes-otro') $q$,
  'P0001',
  '3.1 transferir_galleta: falla sin galleta activa'
);

-- ============================================================
--  3.2 RPCs de vehículos
-- ============================================================

-- Test 7: TES no puede dar de alta un vehículo
SELECT throws_ok(
  $q$ SELECT rpc_alta_vehiculo('MAT-999', 'A2', NULL) $q$,
  'P0001',
  '3.2 alta_vehiculo: TES no tiene permiso'
);

-- Test 8: GERENCIA puede dar de alta un vehículo
SELECT set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT rpc_alta_vehiculo('MAT-S3G', 'B', NULL) IS NOT NULL),
  '3.2 alta_vehiculo: GERENCIA da de alta MAT-S3G'
);

-- Test 9: El vehículo recién dado de alta existe en vehiculos
SELECT ok(
  (SELECT COUNT(*) FROM vehiculos WHERE matricula = 'MAT-S3G') = 1,
  '3.2 alta_vehiculo: registro en vehiculos creado'
);

-- Test 10: El vehículo recién dado de alta existe en locations
SELECT ok(
  (SELECT COUNT(*) FROM locations WHERE location_id = 'MAT-S3G' AND tipo = 'vehiculo') = 1,
  '3.2 alta_vehiculo: location de tipo vehiculo creada'
);

-- Test 11: GERENCIA puede dar de baja el vehículo sin activación abierta
SELECT ok(
  (SELECT rpc_baja_vehiculo('MAT-S3G', 'Test baja') IS NULL),
  '3.2 baja_vehiculo: GERENCIA da de baja MAT-S3G'
);

-- Test 12: No se puede dar de baja un vehículo con activación abierta
SELECT throws_ok(
  $q$ SELECT rpc_baja_vehiculo('S3T-001', 'Tiene activacion') $q$,
  'P0001',
  '3.2 baja_vehiculo: rechaza vehículo con activación abierta'
);

-- ============================================================
--  3.3 RPCs de inventario
-- ============================================================

-- Test 13: TES no puede hacer ajuste manual de stock
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $q$
    SELECT rpc_ajuste_manual_stock(
      'fb000000-0000-0000-0000-000000000001',
      'S3T-001', 9901, 5, NULL, 'medicacion'
    )
  $q$,
  'P0001',
  '3.3 ajuste_stock: TES no tiene permiso'
);

-- Test 14: LOGISTICA puede ajustar stock de vehículo
SELECT set_config('request.jwt.claims',
  '{"sub":"cc000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT (rpc_ajuste_manual_stock(
    'fb000000-0000-0000-0000-000000000002',
    'S3T-001', 9901, 7, 'Test ajuste', 'medicacion'
  ))->>'stock_nuevo' = '7'),
  '3.3 ajuste_stock: LOGISTICA ajusta stock a 7'
);

-- Test 15: El ajuste es idempotente (segundo intento con mismo mutation_uuid devuelve mismo resultado)
SELECT ok(
  (SELECT (rpc_ajuste_manual_stock(
    'fb000000-0000-0000-0000-000000000002',
    'S3T-001', 9901, 99, 'Reintento', 'medicacion'
  ))->>'stock_nuevo' = '7'),
  '3.3 ajuste_stock: idempotencia — segundo llamado devuelve resultado cacheado'
);

-- Test 16: TES puede deducir material de vehículo activo
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT ok(
  (SELECT (rpc_deducir_material(
    'fc000000-0000-0000-0000-000000000001',
    'S3T-001', 9901, 3, 'medicacion',
    'fa000000-0000-0000-0000-000000000001', NULL
  ))->>'stock_restante' = '4'),
  '3.3 deducir_material: TES deduce 3 unidades (stock_real era 7 tras ajuste)'
);

-- Test 17: Deducción supera stock → falla
SELECT throws_ok(
  $q$
    SELECT rpc_deducir_material(
      'fc000000-0000-0000-0000-000000000002',
      'S3T-001', 9901, 100, 'medicacion', NULL, NULL
    )
  $q$,
  'P0001',
  '3.3 deducir_material: rechaza deducción por encima del stock'
);

-- ============================================================
--  3.4 Checklist360 + trigger doc7
-- ============================================================

-- Test 18: TES puede insertar checklist abierto
SET LOCAL role TO postgres;  -- necesitamos saltar RLS para INSERT directo en test
INSERT INTO doc_checklist360 (id_checklist, matricula, id_activacion, id_nombre_redactor,
                               items_revisados, cerrado)
VALUES (
  'fd000000-0000-0000-0000-000000000001',
  'S3T-001',
  'fa000000-0000-0000-0000-000000000001',
  'test3_tes',
  '{"motor":{"ok":false,"descripcion":"Pierde aceite","criticidad":"Moderada","sistema_afectado":"Motor"},"frenos":{"ok":true,"descripcion":"OK"}}',
  FALSE
);
SET LOCAL role TO authenticated;

SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Cerrar el checklist (activa el trigger BEFORE UPDATE)
SET LOCAL role TO postgres;
UPDATE doc_checklist360 SET cerrado = TRUE
WHERE id_checklist = 'fd000000-0000-0000-0000-000000000001';
SET LOCAL role TO authenticated;

SELECT ok(
  (SELECT COUNT(*) FROM doc7_averias
   WHERE matricula = 'S3T-001' AND sistema_afectado = 'Motor') = 1,
  '3.4 checklist360: trigger genera doc7 para sistema fallido'
);

-- Test 19: Vehículo pasa a averiado_leve tras inserción de doc7 (Moderada)
SELECT ok(
  (SELECT condicion_tecnica FROM vehiculos WHERE matricula = 'S3T-001') = 'averiado_leve',
  '3.4 trigger_doc7: vehiculo pasa a averiado_leve por avería Moderada'
);

-- ============================================================
--  3.5 Triggers de integridad
-- ============================================================

-- Test 20: Trigger km — rechaza km_fin < km_inicio en activaciones
SET LOCAL role TO postgres;
SELECT throws_ok(
  $q$
    INSERT INTO activaciones_vehiculo (id_activacion, matricula, pilot, km_inicio, km_fin)
    VALUES ('fe000000-0000-0000-0000-000000000001', 'S3T-001', 'test3_tes', 1000, 500)
  $q$,
  'P0001',
  '3.5 trg_validar_km: rechaza km_fin < km_inicio en activaciones'
);
SET LOCAL role TO authenticated;

-- Test 21: Trigger cambio_rol — registra en auditoria_rbac
SET LOCAL role TO postgres;
UPDATE fichas_empleados SET rol = 'coordinacion' WHERE id_nombre = 'test3_tes';

SELECT ok(
  (SELECT COUNT(*) FROM auditoria_rbac
   WHERE tipo_evento = 'cambio_rol' AND id_nombre = 'test3_tes') >= 1,
  '3.5 trg_audit_cambio_rol: registra cambio de rol en auditoria_rbac'
);
SET LOCAL role TO authenticated;

-- Test 22: Trigger purgar_plantillas — archivado borra líneas de plantilla
SET LOCAL role TO postgres;
INSERT INTO plantillas_stock (plantilla_id, tipo) VALUES ('test3_plantilla', 'test');
INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo)
VALUES ('test3_plantilla', 'test', 9901, 5);

UPDATE catalogo_items SET archivado = TRUE WHERE id_item = 9901;

SELECT ok(
  (SELECT COUNT(*) FROM plantilla_lineas WHERE id_item = 9901) = 0,
  '3.5 trg_purgar_plantillas: archivado elimina líneas de plantilla'
);
SET LOCAL role TO authenticated;

SELECT finish();
ROLLBACK;
