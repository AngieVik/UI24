-- =============================================================================
-- 20260527000004_turno_shift.sql  (v2 — corregido 2026-05-28)
--
-- Turno/Shift architectural correction:
--   - Doc-8 lifecycle follows worker checkin/checkout, NOT vehicle activation.
--   - id_activacion is now NULLABLE (a shift can exist without any vehicle).
--   - New column id_nombre (who opened the shift).
--   - New RPCs: rpc_abrir_turno + rpc_cerrar_turno + rpc_cerrar_turno_por_nombre.
--   - rpc_actualizar_vehiculo updated: does NOT create/close Doc-8.
--     It only manages activaciones_vehiculo + checklist.
--
-- CORRECCIONES respecto al borrador original:
--   - Idempotency_keys: usa columnas reales (mutation_uuid, rpc_name, id_nombre,
--     resultado). La columna 'id UUID' no existe en la tabla.
--   - doc_checklist360 INSERT: añade matricula e id_nombre_redactor (NOT NULL).
--   - activaciones_vehiculo: usa timestamp_apertura/timestamp_cierre
--     (no timestamp_activacion/timestamp_desactivacion que no existen).
--   - rpc_cerrar_turno_por_nombre: nueva RPC requerida por useCerrarTurnoPorNombre.
--   - rpc_checkin_vehiculo: NO se reescribe aquí; la versión de 000003 es
--     compatible con el frontend (parámetros en mismo orden/tipo).
-- =============================================================================

-- ── Part 1: Schema changes on doc8_partes_trabajo ──────────────────────────

-- Make id_activacion nullable (shift can exist without a vehicle)
ALTER TABLE doc8_partes_trabajo
  ALTER COLUMN id_activacion DROP NOT NULL;

-- Add id_nombre column (who opened the shift). Allow NULL initially for backfill.
ALTER TABLE doc8_partes_trabajo
  ADD COLUMN IF NOT EXISTS id_nombre TEXT;

-- Backfill: get id_nombre from the activacion's pilot field where possible
UPDATE doc8_partes_trabajo d
SET id_nombre = COALESCE(
  (SELECT a.pilot FROM activaciones_vehiculo a WHERE a.id_activacion = d.id_activacion),
  'migrado'
)
WHERE id_nombre IS NULL;

-- Now enforce NOT NULL
ALTER TABLE doc8_partes_trabajo
  ALTER COLUMN id_nombre SET NOT NULL,
  ALTER COLUMN id_nombre SET DEFAULT 'system';

-- ── Part 2: km columns on activaciones_vehiculo (ADD IF NOT EXISTS — safe) ──
-- These semantically belong on the vehicle activation, not the shift doc.
ALTER TABLE activaciones_vehiculo
  ADD COLUMN IF NOT EXISTS km_inicio INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS km_fin    INTEGER DEFAULT NULL;

-- Backfill km from existing doc8 rows (best-effort; ok if 0 rows match)
UPDATE activaciones_vehiculo a
SET
  km_inicio = d.km_inicio,
  km_fin    = d.km_fin
FROM doc8_partes_trabajo d
WHERE d.id_activacion = a.id_activacion
  AND (d.km_inicio IS NOT NULL OR d.km_fin IS NOT NULL);

-- =============================================================================
-- Part 3: rpc_abrir_turno
--   Opens a shift Doc-8 at worker checkin. Idempotent via mutation_uuid.
--   Called by useAbrirTurno.ts: { p_mutation_uuid, p_id_nombre }
--   Returns: { id_parte: TEXT, noop: BOOL }
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_abrir_turno(
  p_mutation_uuid UUID,
  p_id_nombre     TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_resultado JSONB;
  v_new_id    UUID;
BEGIN
  -- Idempotency: si ya se procesó, devolver el resultado guardado
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  -- Validar identidad de la sesión (también satisface la FK de idempotency_keys)
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  -- Registrar mutación
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_abrir_turno', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Crear Doc-8 de turno (sin vehículo aún — id_activacion queda NULL)
  INSERT INTO doc8_partes_trabajo (id_nombre, timestamp_inicio, estado)
  VALUES (v_id_nombre, NOW(), 'Abierto_En_Turno')
  RETURNING id_parte INTO v_new_id;

  v_resultado := jsonb_build_object('id_parte', v_new_id::TEXT, 'noop', FALSE);
  UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_abrir_turno(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION rpc_abrir_turno IS
  'Abre el Doc-8 de turno al hacer checkin. Idempotente vía mutation_uuid.';

-- =============================================================================
-- Part 4: rpc_cerrar_turno
--   Closes a shift Doc-8 by id_parte. Idempotent via mutation_uuid.
--   Called by useCerrarTurno.ts: { p_mutation_uuid, p_id_parte }
--   Returns: { closed: BOOL, noop: BOOL }
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_cerrar_turno(
  p_mutation_uuid UUID,
  p_id_parte      UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_resultado JSONB;
  v_rows      INT;
BEGIN
  -- Idempotency
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  -- Validar sesión
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  -- Registrar mutación
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_cerrar_turno', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Cerrar el parte
  UPDATE doc8_partes_trabajo
  SET estado        = 'Enviado_Cerrado',
      timestamp_fin = NOW()
  WHERE id_parte = p_id_parte
    AND estado   = 'Abierto_En_Turno';
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  v_resultado := jsonb_build_object('closed', TRUE, 'noop', v_rows = 0);
  UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cerrar_turno(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION rpc_cerrar_turno IS
  'Cierra el Doc-8 de turno por id_parte. Idempotente vía mutation_uuid.';

-- =============================================================================
-- Part 5: rpc_cerrar_turno_por_nombre  [NUEVA — faltaba en todas las migraciones]
--   Closes the open shift Doc-8 for a worker identified by id_nombre.
--   Called by useCerrarTurnoPorNombre.ts: { p_mutation_uuid, p_id_nombre,
--                                           p_km_fin?, p_notas? }
--   Returns: { id_parte: TEXT | NULL, noop: BOOL }
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_cerrar_turno_por_nombre(
  p_mutation_uuid UUID,
  p_id_nombre     TEXT,
  p_km_fin        INT  DEFAULT NULL,
  p_notas         TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_id_parte  UUID;
  v_resultado JSONB;
BEGIN
  -- Idempotency
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  -- Validar sesión del terminal (el terminal gestiona presencias)
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  -- Registrar mutación usando el ejecutor de la sesión como FK válida
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_cerrar_turno_por_nombre', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Buscar el parte abierto del trabajador objetivo
  SELECT id_parte INTO v_id_parte
  FROM doc8_partes_trabajo
  WHERE id_nombre = p_id_nombre
    AND estado    = 'Abierto_En_Turno'
  ORDER BY timestamp_inicio DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Sin turno abierto — noop idempotente
    v_resultado := jsonb_build_object('id_parte', NULL, 'noop', TRUE);
    UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
    RETURN v_resultado;
  END IF;

  -- Cerrar el parte con datos opcionales de cierre
  UPDATE doc8_partes_trabajo
  SET estado        = 'Enviado_Cerrado',
      timestamp_fin = NOW(),
      km_fin        = COALESCE(p_km_fin, km_fin),
      notas         = COALESCE(p_notas, notas)
  WHERE id_parte = v_id_parte;

  v_resultado := jsonb_build_object('id_parte', v_id_parte::TEXT, 'noop', FALSE);
  UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cerrar_turno_por_nombre(UUID, TEXT, INT, TEXT) TO authenticated;

COMMENT ON FUNCTION rpc_cerrar_turno_por_nombre IS
  'Cierra el Doc-8 de turno de un trabajador por su id_nombre. '
  'Idempotente. Usado en checkout de cualquier trabajador del terminal.';

-- =============================================================================
-- Part 6: rpc_actualizar_vehiculo (v2 — no doc8 creation)
--
--   Compared to 20260527000003:
--     • Accepts optional p_id_parte UUID to link shift doc to vehicle activation.
--     • Branch ''activado'': creates activacion + checklist only (NO doc8).
--       If p_id_parte is provided, updates doc8's id_activacion + km_inicio.
--     • Branch ''desactivado'': closes activacion only.
--       If p_id_parte is provided, updates doc8's km_fin.
--     • Subestado branch: unchanged.
--
--   FIXES vs borrador original:
--     • timestamp_apertura (no timestamp_activacion).
--     • timestamp_cierre (no timestamp_desactivacion).
--     • doc_checklist360: incluye matricula e id_nombre_redactor (NOT NULL).
--     • idempotency_keys: usa columnas reales (mutation_uuid, rpc_name, id_nombre, resultado).
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_actualizar_vehiculo(
  p_mutation_uuid  UUID,
  p_matricula      TEXT,
  p_estado_destino TEXT,
  p_tipo_servicio  TEXT   DEFAULT NULL,
  p_pilot          TEXT   DEFAULT NULL,
  p_carry          TEXT   DEFAULT NULL,
  p_km_inicio      INT    DEFAULT NULL,
  p_km_fin         INT    DEFAULT NULL,
  p_id_parte       UUID   DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_id_activacion UUID;
  v_id_checklist  UUID;
  v_estado_actual TEXT;
  v_resultado     JSONB;
BEGIN
  -- Idempotency
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  -- Validar sesión
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  -- Registrar mutación
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_actualizar_vehiculo', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- ── Branch: ACTIVADO ────────────────────────────────────────────────────────
  IF p_estado_destino = 'activado' THEN

    IF p_pilot IS NULL THEN
      RAISE EXCEPTION 'ERR_PILOT_001: p_pilot required for activado' USING ERRCODE = 'P0001';
    END IF;

    -- Crear activación de vehículo
    INSERT INTO activaciones_vehiculo (
      matricula,
      pilot,
      carry,
      tipo_servicio,
      km_inicio,
      timestamp_apertura
    )
    VALUES (
      p_matricula,
      p_pilot,
      p_carry,
      COALESCE(p_tipo_servicio, 'sin_asignar'),
      p_km_inicio,
      NOW()
    )
    RETURNING id_activacion INTO v_id_activacion;

    -- Crear Checklist360 (requiere matricula + id_nombre_redactor)
    INSERT INTO doc_checklist360 (
      matricula,
      id_activacion,
      id_nombre_redactor,
      timestamp_inicio
    )
    VALUES (
      p_matricula,
      v_id_activacion,
      COALESCE(p_pilot, v_id_nombre),
      NOW()
    )
    RETURNING id_checklist INTO v_id_checklist;

    -- Actualizar estado del vehículo
    UPDATE vehiculos
    SET estado_operativo    = 'activado',
        subestado_operativo = 'en_espera'
    WHERE matricula = p_matricula;

    -- Si el caller pasa id_parte, vincular la activación al parte de turno
    IF p_id_parte IS NOT NULL THEN
      UPDATE doc8_partes_trabajo
      SET id_activacion = v_id_activacion,
          km_inicio     = p_km_inicio
      WHERE id_parte = p_id_parte
        AND estado   = 'Abierto_En_Turno';
    END IF;

    v_resultado := jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'activado',
      'id_activacion',    v_id_activacion::TEXT,
      'id_checklist',     v_id_checklist::TEXT,
      'noop',             FALSE
    );

  -- ── Branch: DESACTIVADO ─────────────────────────────────────────────────────
  ELSIF p_estado_destino = 'desactivado' THEN

    -- Cerrar la activación activa
    UPDATE activaciones_vehiculo
    SET km_fin           = COALESCE(p_km_fin, km_fin),
        timestamp_cierre = NOW()
    WHERE matricula         = p_matricula
      AND timestamp_cierre IS NULL
    RETURNING id_activacion INTO v_id_activacion;

    -- Actualizar estado del vehículo
    UPDATE vehiculos
    SET estado_operativo    = 'desactivado',
        subestado_operativo = NULL
    WHERE matricula = p_matricula;

    -- Si el caller pasa id_parte, actualizar km_fin en el parte de turno
    IF p_id_parte IS NOT NULL THEN
      UPDATE doc8_partes_trabajo
      SET km_fin = p_km_fin
      WHERE id_parte = p_id_parte
        AND estado   = 'Abierto_En_Turno';
    END IF;

    v_resultado := jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'desactivado',
      'noop',             FALSE
    );

  -- ── Branch: SUBESTADO ───────────────────────────────────────────────────────
  ELSIF p_estado_destino IN ('en_espera', 'ruta', 'estacionado', 'alerta') THEN

    UPDATE vehiculos
    SET subestado_operativo = p_estado_destino::subestado_operativo
    WHERE matricula = p_matricula;

    SELECT estado_operativo INTO v_estado_actual
    FROM vehiculos WHERE matricula = p_matricula;

    v_resultado := jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', v_estado_actual,
      'subestado',        p_estado_destino,
      'noop',             FALSE
    );

  ELSE
    RAISE EXCEPTION 'ERR_VEHICULO_010: Estado destino desconocido: %', p_estado_destino
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_actualizar_vehiculo(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, UUID)
  TO authenticated;

COMMENT ON FUNCTION rpc_actualizar_vehiculo IS
  'Actualiza estado del vehículo (activado/desactivado/subestado). '
  'No crea Doc-8 — ese se crea en rpc_abrir_turno. '
  'Pasa p_id_parte para vincular la activación al parte de turno.';
