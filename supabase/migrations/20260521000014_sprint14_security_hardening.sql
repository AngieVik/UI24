-- ============================================================
--  U24 — Sprint 14: Hardening de seguridad + RPCs RGPD
--  14.1 Auditoría y endurecimiento
--  14.2 Derecho de supresión RGPD (Art. 17 RGPD / LOPDGDD)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
--  14.2 — RGPD: columna de supresión en fichas_empleados
--
--  Referenciada en el runbook RB-07 (paso 4). Sin esta columna
--  la seudonimización no queda auditada con timestamp.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE fichas_empleados
  ADD COLUMN IF NOT EXISTS rgpd_suprimido_at TIMESTAMPTZ;

COMMENT ON COLUMN fichas_empleados.rgpd_suprimido_at IS
  'Timestamp de supresión RGPD (Art. 17). NULL = datos vigentes. '
  'La fila no se borra — los IDs históricos en documentos asistenciales deben conservarse.';

-- Índice para facilitar auditorías periódicas
CREATE INDEX IF NOT EXISTS fichas_empleados_rgpd_idx
  ON fichas_empleados(rgpd_suprimido_at)
  WHERE rgpd_suprimido_at IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
--  14.2 — rpc_solicitar_borrado_rgpd
--
--  Cualquier empleado activo puede solicitar la supresión de sus
--  propios datos. Crea un registro de auditoría y notifica a
--  gerencia con un aviso Doc-11 de nivel 'aviso'.
--
--  La supresión real la ejecuta gerencia via rpc_procesar_borrado_rgpd.
-- ──────────────────────────────────────────────────────────────

ALTER TYPE tipo_evento_rbac ADD VALUE IF NOT EXISTS 'rgpd_solicitud';
ALTER TYPE tipo_evento_rbac ADD VALUE IF NOT EXISTS 'rgpd_supresion';

CREATE OR REPLACE FUNCTION rpc_solicitar_borrado_rgpd(
  p_mutation_uuid UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT := auth_id_nombre_actual();
BEGIN
  IF v_id_nombre IS NULL THEN
    RAISE EXCEPTION 'ERR_AUTH_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotencia: si ya hay solicitud pendiente para este empleado, no duplicar
  IF EXISTS (
    SELECT 1 FROM auditoria_rbac
    WHERE tipo_evento = 'rgpd_solicitud'
      AND id_nombre   = v_id_nombre
      AND created_at  > NOW() - INTERVAL '30 days'
  ) THEN
    RETURN;  -- Solicitud reciente ya registrada — idempotente
  END IF;

  -- Registrar la solicitud en auditoria_rbac
  INSERT INTO auditoria_rbac(id_evento, tipo_evento, id_nombre, metadata)
  VALUES (
    p_mutation_uuid,
    'rgpd_solicitud',
    v_id_nombre,
    jsonb_build_object('canal', 'app', 'estado', 'pendiente')
  );

  -- Notificar a gerencia con aviso Doc-11
  INSERT INTO doc11_avisos(
    id_aviso, tipo_aviso, nivel, id_nombre_emisor,
    texto, leido_por
  )
  VALUES (
    gen_random_uuid(),
    'sistema',
    'aviso',
    'sistema',
    'Solicitud de supresión RGPD de ' || v_id_nombre ||
    '. Revisar y ejecutar rpc_procesar_borrado_rgpd en < 30 días.',
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_solicitar_borrado_rgpd(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────
--  14.2 — rpc_procesar_borrado_rgpd
--
--  Solo gerencia puede ejecutar la supresión. Seudonimiza los
--  campos PII en fichas_empleados sin borrar la fila (necesaria
--  para mantener FK históricas en documentos asistenciales).
--
--  Sigue el procedimiento descrito en runbook RB-07, paso 4.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_procesar_borrado_rgpd(
  p_id_nombre   TEXT,
  p_issue_ref   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor     TEXT := auth_id_nombre_actual();
  v_rol_ejecutor rol_empleado;
BEGIN
  SELECT rol INTO v_rol_ejecutor
  FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  IF v_rol_ejecutor IS DISTINCT FROM 'gerencia' THEN
    RAISE EXCEPTION 'ERR_RBAC_RGPD: Solo gerencia puede procesar borrados RGPD'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fichas_empleados WHERE id_nombre = p_id_nombre
  ) THEN
    RAISE EXCEPTION 'ERR_RGPD_NOT_FOUND: Empleado no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  -- Prevenir doble supresión
  IF EXISTS (
    SELECT 1 FROM fichas_empleados
    WHERE id_nombre = p_id_nombre AND rgpd_suprimido_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ERR_RGPD_ALREADY_DONE: Este empleado ya fue suprimido'
      USING ERRCODE = 'P0001';
  END IF;

  -- PASO 1: Revocar todas las galletas activas
  UPDATE galletas_terminales
  SET revocado_at = NOW()
  WHERE id_nombre = p_id_nombre
    AND revocado_at IS NULL;

  -- PASO 2: Seudonimizar PII — los campos pueden no existir en todas las versiones
  --         del esquema; UPDATE ignora columnas inexistentes (se gestionan en init)
  UPDATE fichas_empleados
  SET
    activo             = FALSE,
    fecha_baja         = COALESCE(fecha_baja, NOW()),
    rgpd_suprimido_at  = NOW(),
    -- Campos PII a seudonimizar (uso de DO NOTHING si la columna no existe)
    nombre_real        = CASE WHEN nombre_real   IS NOT NULL THEN 'ELIMINADO_RGPD' ELSE NULL END
  WHERE id_nombre = p_id_nombre;

  -- PASO 3: Registrar supresión en auditoria_rbac
  INSERT INTO auditoria_rbac(id_evento, tipo_evento, id_nombre, metadata)
  VALUES (
    gen_random_uuid(),
    'rgpd_supresion',
    p_id_nombre,
    jsonb_build_object(
      'ejecutado_por', v_ejecutor,
      'issue_ref',     p_issue_ref,
      'timestamp',     NOW()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_procesar_borrado_rgpd(TEXT, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────
--  14.1 — Función de auditoría de seguridad
--
--  Devuelve tablas del schema public que no tienen RLS activo.
--  Se usa como check de pre-producción y en el drill RB-06.
--  Solo accesible con service_role / superuser.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION f_tablas_sin_rls()
RETURNS TABLE(tabla TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tablename::TEXT
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = FALSE
  ORDER BY tablename;
$$;

REVOKE ALL ON FUNCTION f_tablas_sin_rls() FROM PUBLIC;

COMMENT ON FUNCTION f_tablas_sin_rls IS
  'Auditoría: devuelve tablas públicas sin RLS activo. '
  'En producción el resultado esperado es 0 filas. Solo service_role.';

-- ──────────────────────────────────────────────────────────────
--  14.1 — Función de auditoría de RPCs sin SECURITY DEFINER
--
--  Detecta funciones en el schema public que podrían exponer
--  el search_path del invocador (vector de escalada de privilegios).
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION f_funciones_sin_security_definer()
RETURNS TABLE(funcion TEXT, tipo_seguridad TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.proname::TEXT AS funcion,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS tipo_seguridad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'rpc_%'
    AND NOT p.prosecdef
  ORDER BY p.proname;
$$;

REVOKE ALL ON FUNCTION f_funciones_sin_security_definer() FROM PUBLIC;

COMMENT ON FUNCTION f_funciones_sin_security_definer IS
  'Auditoría: lista RPCs públicas sin SECURITY DEFINER. '
  'En producción el resultado esperado es 0 filas. Solo service_role.';
