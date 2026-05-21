-- ============================================================
--  pgTAP — Tests de seguridad Sprint 14
--  Valida: RLS habilitado, columnas RGPD, RPCs de supresión,
--          push_subscriptions y funciones de auditoría.
--
--  Ejecutar: supabase test db
-- ============================================================

BEGIN;

SELECT plan(16);

-- ── 1. RLS activo en tablas críticas ──────────────────────────

SELECT has_table_privilege(
  'authenticated',
  'push_subscriptions',
  'SELECT'
) AS push_subs_select_ok;

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fichas_empleados'),
  'fichas_empleados tiene RLS activo'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'galletas_terminales'),
  'galletas_terminales tiene RLS activo'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventario_vehiculo'),
  'inventario_vehiculo tiene RLS activo'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'doc2_informes_svb'),
  'doc2_informes_svb tiene RLS activo'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions'),
  'push_subscriptions tiene RLS activo'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_config'),
  'system_config tiene RLS activo'
);

SELECT ok(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'doc_solicitudes_vacaciones'),
  'doc_solicitudes_vacaciones tiene RLS activo'
);

-- ── 2. Columna RGPD en fichas_empleados ───────────────────────

SELECT col_is_null(
  'public', 'fichas_empleados', 'rgpd_suprimido_at',
  'fichas_empleados.rgpd_suprimido_at es nullable (supresión pendiente = NULL)'
);

SELECT col_type_is(
  'public', 'fichas_empleados', 'rgpd_suprimido_at', 'timestamp with time zone',
  'fichas_empleados.rgpd_suprimido_at es TIMESTAMPTZ'
);

-- ── 3. RPCs de RGPD existen y son SECURITY DEFINER ───────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rpc_solicitar_borrado_rgpd'
      AND p.prosecdef = TRUE
  ),
  'rpc_solicitar_borrado_rgpd existe y es SECURITY DEFINER'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rpc_procesar_borrado_rgpd'
      AND p.prosecdef = TRUE
  ),
  'rpc_procesar_borrado_rgpd existe y es SECURITY DEFINER'
);

-- ── 4. Funciones de auditoría de seguridad ────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'f_tablas_sin_rls'
  ),
  'f_tablas_sin_rls existe'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'f_funciones_sin_security_definer'
  ),
  'f_funciones_sin_security_definer existe'
);

-- ── 5. push_subscriptions: endpoint único por constraint ──────

SELECT col_is_unique(
  'public', 'push_subscriptions', ARRAY['endpoint'],
  'push_subscriptions.endpoint tiene constraint UNIQUE'
);

-- ── 6. idempotency_keys: tabla de ledger presente ─────────────

SELECT has_table(
  'public', 'idempotency_keys',
  'Tabla idempotency_keys (ADR-012) existe en public'
);

SELECT * FROM finish();

ROLLBACK;
