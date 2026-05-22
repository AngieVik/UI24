-- ============================================================
--  Seed 04 — Usuarios demo (6 roles)
--  Fuente: er_y_seeds.md §2.2
--
--  SEGURIDAD: La contraseña se lee de la variable de entorno
--  SEED_ADMIN_PASSWORD. Este archivo NUNCA debe contener
--  contraseñas en texto plano.
--
--  Ejecución:
--    SEED_ADMIN_PASSWORD=<tu_pass> supabase db reset
--
--  Supabase Auth crea los usuarios en auth.users via Admin API
--  (supabase/functions o via Supabase CLI seed con auth).
--  Las filas en fichas_empleados se insertan aquí asumiendo
--  que el auth_user_id viene de un paso previo de seed de Auth.
--
--  En entornos locales con supabase start, usar el helper SQL
--  de abajo con la función auth.uid() generando UUIDs fijos.
-- ============================================================

-- UUIDs fijos para demo local (no usar en staging/prod)
-- Se pueden regenerar con gen_random_uuid() en un deploy real.

DO $$
DECLARE
  v_tes_uid       UUID := '10000000-0000-0000-0000-000000000001';
  v_flota_uid     UUID := '10000000-0000-0000-0000-000000000002';
  v_coord_uid     UUID := '10000000-0000-0000-0000-000000000003';
  v_logis_uid     UUID := '10000000-0000-0000-0000-000000000004';
  v_geren_uid     UUID := '10000000-0000-0000-0000-000000000005';
  v_rrhh_uid      UUID := '10000000-0000-0000-0000-000000000006';
  v_pass          TEXT := current_setting('app.seed_admin_password', true);
BEGIN
  -- Crear usuarios en auth.users (solo en entorno local con service_role)
  -- En staging/prod usar ef_alta_empleado via Edge Function.
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  )
  SELECT
    uid,
    email_val,
    crypt(COALESCE(v_pass, 'demo_password_change_me'), gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(), NOW(), 'authenticated', 'authenticated'
  FROM (VALUES
    (v_tes_uid,   'tes_demo@u24.com'),
    (v_flota_uid, 'flota_demo@u24.com'),
    (v_coord_uid, 'coordinacion_demo@u24.com'),
    (v_logis_uid, 'logistica_demo@u24.com'),
    (v_geren_uid, 'gerencia_demo@u24.com'),
    (v_rrhh_uid,  'rrhh_demo@u24.com')
  ) AS t(uid, email_val)
  ON CONFLICT (id) DO NOTHING;

  -- Insertar fichas_empleados correspondientes
  INSERT INTO fichas_empleados (auth_user_id, id_nombre, nombre_real, rol, activo)
  VALUES
    (v_tes_uid,   'tes_demo',         'TES Demo',          'tes',         TRUE),
    (v_flota_uid, 'flota_demo',       'Flota Demo',        'flota',       TRUE),
    (v_coord_uid, 'coordinacion_demo','Coordinación Demo', 'coordinacion',TRUE),
    (v_logis_uid, 'logistica_demo',   'Logística Demo',   'logistica',   TRUE),
    (v_geren_uid, 'gerencia_demo',    'Gerencia Demo',     'gerencia',    TRUE),
    (v_rrhh_uid,  'rrhh_demo',        'RRHH Demo',         'rrhh',        TRUE)
  ON CONFLICT (auth_user_id) DO NOTHING;
END $$;


-- ============================================================
--  Seed de system_config — claves canónicas (Gap F5 + Fase 7)
-- ============================================================

INSERT INTO system_config (clave, valor, descripcion) VALUES
  ('periodo_vacaciones_abierto',
   '{"activo": false, "fecha_inicio": null, "fecha_fin": null}',
   'Toggle global del período de solicitud de vacaciones (Doc-12)'),
  ('marquesina',
   '{"texto": "", "velocidad": 50}',
   'Texto del ticker del header negro + velocidad (0–100)'),
  ('box_timeout_minutos',
   '{"valor": 45}',
   'Minutos sin cambio de estado en en_consulta antes de alerta watchdog'),
  ('offline_session_ttl_dias',
   '{"valor": 7}',
   'TTL de la sesión offline PBKDF2 cacheada (días)'),
  ('modulo_psa_habilitado',
   '{"enabled": true}',
   'Kill switch del módulo PSA'),
  ('modulo_filiacion_habilitado',
   '{"enabled": true}',
   'Kill switch del módulo de filiación'),
  ('modulo_drp_habilitado',
   '{"enabled": true}',
   'Kill switch del módulo DRP'),
  ('realtime_kill_switch',
   '{"enabled": false}',
   'Fuerza degraded_mode en todos los clientes si true'),
  ('cola_offline_procesamiento',
   '{"enabled": true}',
   'Si false, suspende el procesamiento de la cola offline (no descarta)')
ON CONFLICT (clave) DO NOTHING;


-- ============================================================
--  Seed de mochilas BKP1–BKP8
-- ============================================================

INSERT INTO mochilas_backpack (codigo, estado)
SELECT codigo, 'disponible'
FROM (VALUES
  ('BKP1'), ('BKP2'), ('BKP3'), ('BKP4'),
  ('BKP5'), ('BKP6'), ('BKP7'), ('BKP8')
) AS t(codigo)
ON CONFLICT (codigo) DO NOTHING;
