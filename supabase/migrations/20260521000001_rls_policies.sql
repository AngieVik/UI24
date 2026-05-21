-- ============================================================
--  U24 — Políticas RLS
--  Sprint 2, Tareas 2.1 · 2.2 · 2.3 · 2.4
--  Fecha: 2026-05-21
-- ============================================================

-- ============================================================
--  BLOQUE 0 — Índice de soporte y funciones helper
--
--  auth_rol_actual() y auth_id_nombre_actual() son SECURITY
--  DEFINER para evitar recursión: al leer fichas_empleados desde
--  dentro de una política sobre fichas_empleados, bypass RLS.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_fichas_empleados_auth_user_id
  ON fichas_empleados (auth_user_id);

CREATE OR REPLACE FUNCTION auth_rol_actual()
RETURNS rol_empleado
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid()
    AND activo = TRUE
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION auth_id_nombre_actual()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;


-- ============================================================
--  BLOQUE 1 — Tarea 2.1: tablas core
--
--  Principio: escritura de dominio SOLO vía RPC/EF.
--  Los INSERT/UPDATE/DELETE directos quedan bloqueados por
--  deny-by-default (RLS habilitado sin política de escritura).
-- ============================================================

-- fichas_empleados ─────────────────────────────────────────
-- Todos los authenticated ven empleados activos (necesario para
-- asignaciones pilot/carry, lookups de id_nombre, etc.).
-- Registros inactivos solo visibles a: propio usuario, gerencia y rrhh.
CREATE POLICY "fichas_empleados select"
  ON fichas_empleados FOR SELECT
  TO authenticated
  USING (
    activo = TRUE
    OR auth_user_id = auth.uid()
    OR auth_rol_actual() IN ('gerencia', 'rrhh')
  );

-- galletas_terminales ──────────────────────────────────────
-- El usuario solo ve su propia galleta activa para poder cachearla
-- en IndexedDB como contexto offline (ADR-001).
-- La verificación de fingerprint sigue siendo responsabilidad de la EF.
CREATE POLICY "galletas_terminales select propia"
  ON galletas_terminales FOR SELECT
  TO authenticated
  USING (
    id_nombre = auth_id_nombre_actual()
    AND revocado_at IS NULL
  );


-- ============================================================
--  BLOQUE 2 — Tarea 2.2: documentos clínicos (Doc-2..Doc-5)
--
--  Redactor ve sus propios documentos.
--  Roles clínicos/supervisión ven todos.
--  Escritura: deny-by-default (solo vía RPC SECURITY DEFINER).
-- ============================================================

CREATE POLICY "doc2_informes_svb select"
  ON doc2_informes_svb FOR SELECT
  TO authenticated
  USING (
    auth_uid_redactor = auth.uid()
    OR auth_rol_actual() IN ('medico', 'due', 'coordinacion', 'gerencia', 'rrhh', 'responsable_flota')
  );

CREATE POLICY "doc3_informes_sva select"
  ON doc3_informes_sva FOR SELECT
  TO authenticated
  USING (
    auth_uid_redactor = auth.uid()
    OR auth_rol_actual() IN ('medico', 'due', 'coordinacion', 'gerencia', 'rrhh', 'responsable_flota')
  );

CREATE POLICY "doc4_consentimientos select"
  ON doc4_consentimientos FOR SELECT
  TO authenticated
  USING (
    auth_uid_redactor = auth.uid()
    OR auth_rol_actual() IN ('medico', 'due', 'coordinacion', 'gerencia', 'rrhh')
  );

CREATE POLICY "doc5_rechazos_alta select"
  ON doc5_rechazos_alta FOR SELECT
  TO authenticated
  USING (
    auth_uid_redactor = auth.uid()
    OR auth_rol_actual() IN ('medico', 'due', 'coordinacion', 'gerencia', 'rrhh')
  );


-- ============================================================
--  BLOQUE 3 — Tarea 2.3: tablas inmutables
--
--  Las políticas USING(FALSE) para UPDATE/DELETE ya están en la
--  migración inicial. Aquí se añaden los SELECT autorizados para
--  que los roles de supervisión puedan auditar sin escritura.
-- ============================================================

-- auditoria_rbac: solo acceso de cumplimiento para gerencia/rrhh.
CREATE POLICY "auditoria_rbac select"
  ON auditoria_rbac FOR SELECT
  TO authenticated
  USING (auth_rol_actual() IN ('gerencia', 'rrhh'));

-- auditoria_inventario: logística y gerencia para conciliación.
CREATE POLICY "auditoria_inventario select"
  ON auditoria_inventario FOR SELECT
  TO authenticated
  USING (auth_rol_actual() IN ('logistica', 'gerencia', 'responsable_logistica'));

-- doc1_asistencias: propio registro de asistencia + supervisión RRHH.
CREATE POLICY "doc1_asistencias select"
  ON doc1_asistencias FOR SELECT
  TO authenticated
  USING (
    id_nombre = auth_id_nombre_actual()
    OR auth_rol_actual() IN ('gerencia', 'rrhh')
  );

-- filiacion_eventos: trazabilidad de eventos DRP para coordinación.
CREATE POLICY "filiacion_eventos select"
  ON filiacion_eventos FOR SELECT
  TO authenticated
  USING (auth_rol_actual() IN ('coordinacion', 'gerencia', 'medico', 'due'));


-- ============================================================
--  BLOQUE 4 — Tarea 2.4: tablas para Supabase Realtime
--
--  Supabase Realtime requiere al menos una política SELECT para
--  authenticated. Sin ella, el canal devuelve vacío aunque el
--  cliente esté suscrito. (Hallazgo P-06)
-- ============================================================

-- psa_sesiones y psa_pacientes: sala de espera PSA en tiempo real.
CREATE POLICY "psa_sesiones select authenticated"
  ON psa_sesiones FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "psa_pacientes select authenticated"
  ON psa_pacientes FOR SELECT
  TO authenticated
  USING (TRUE);

-- filiacion_sesiones y filiacion_pacientes: coordinación DRP en tiempo real.
CREATE POLICY "filiacion_sesiones select authenticated"
  ON filiacion_sesiones FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "filiacion_pacientes select authenticated"
  ON filiacion_pacientes FOR SELECT
  TO authenticated
  USING (TRUE);

-- mensajes_bandeja: el destinatario solo ve sus propios mensajes.
-- La caché offline de bandeja también respeta esta restricción (ADR-001).
CREATE POLICY "mensajes_bandeja select destinatario"
  ON mensajes_bandeja FOR SELECT
  TO authenticated
  USING (id_nombre_destino = auth_id_nombre_actual());
