-- =============================================================================
-- 20260527000004_turno_shift.sql
--
-- Turno/Shift architectural correction:
--   - Doc-8 lifecycle now follows worker checkin/checkout, NOT vehicle activation.
--   - id_activacion is now NULLABLE (a shift can exist without any vehicle).
--   - New column id_nombre (who opened the shift).
--   - New RPCs: rpc_abrir_turno + rpc_cerrar_turno.
--   - rpc_actualizar_vehiculo updated: NO LONGER creates/closes Doc-8.
--     It only manages activaciones_vehiculo + checklist.
--   - Added km_inicio/km_fin to activaciones_vehiculo (semantic home for km).
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

-- ── Part 2: Add km columns to activaciones_vehiculo ────────────────────────

-- These semantically belong on the vehicle activation, not the shift doc.
ALTER TABLE activaciones_vehiculo
  ADD COLUMN IF NOT EXISTS km_inicio INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS km_fin    INTEGER DEFAULT NULL;

-- Backfill km from existing doc8 rows
UPDATE activaciones_vehiculo a
SET
  km_inicio = d.km_inicio,
  km_fin    = d.km_fin
FROM doc8_partes_trabajo d
WHERE d.id_activacion = a.id_activacion
  AND (d.km_inicio IS NOT NULL OR d.km_fin IS NOT NULL);

-- ── Part 3: Idempotency keys helper (if table exists) ─────────────────────

-- rpc_abrir_turno / rpc_cerrar_turno use the standard idempotency_keys table
-- (created in earlier migrations). If not present, use a simple UUID check.

-- ── Part 4: rpc_abrir_turno ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_abrir_turno(
  p_mutation_uuid UUID,
  p_id_nombre     TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id      UUID;
BEGIN
  -- Idempotency: if this mutation already ran, return the same id_parte
  SELECT id INTO v_existing_id
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;

  IF FOUND THEN
    RETURN jsonb_build_object('id_parte', v_existing_id::TEXT, 'noop', TRUE);
  END IF;

  -- Create the shift Doc-8 (no vehicle yet)
  INSERT INTO doc8_partes_trabajo(
    id_nombre,
    timestamp_inicio,
    estado
  )
  VALUES (
    p_id_nombre,
    NOW(),
    'Abierto_En_Turno'
  )
  RETURNING id_parte INTO v_new_id;

  -- Register mutation for idempotency
  INSERT INTO idempotency_keys(mutation_uuid, id)
  VALUES (p_mutation_uuid, v_new_id);

  RETURN jsonb_build_object('id_parte', v_new_id::TEXT, 'noop', FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_abrir_turno(UUID, TEXT) TO authenticated;

-- ── Part 5: rpc_cerrar_turno ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_cerrar_turno(
  p_mutation_uuid UUID,
  p_id_parte      UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows INT;
BEGIN
  -- Idempotency
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid) THEN
    RETURN jsonb_build_object('closed', TRUE, 'noop', TRUE);
  END IF;

  UPDATE doc8_partes_trabajo
  SET
    estado        = 'Enviado_Cerrado',
    timestamp_fin = NOW()
  WHERE
    id_parte = p_id_parte
    AND estado = 'Abierto_En_Turno';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    INSERT INTO idempotency_keys(mutation_uuid, id)
    VALUES (p_mutation_uuid, p_id_parte);
  END IF;

  RETURN jsonb_build_object('closed', TRUE, 'noop', v_rows = 0);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cerrar_turno(UUID, UUID) TO authenticated;

-- ── Part 6: rpc_actualizar_vehiculo (updated — no doc8 creation) ───────────
--
-- Compared to 20260527000003:
--   • Accepts optional p_id_parte UUID to link shift doc to vehicle activation.
--   • Branch 'activado': creates activacion + checklist only (NO doc8).
--     If p_id_parte is provided, updates doc8's id_activacion + km_inicio.
--   • Branch 'desactivado': closes activacion only.
--     If p_id_parte is provided, updates doc8's km_fin.
--   • Subestado branch: unchanged.
-- ==========================================================================

CREATE OR REPLACE FUNCTION rpc_actualizar_vehiculo(
  p_mutation_uuid  UUID,
  p_matricula      TEXT,
  p_estado_destino TEXT,
  p_tipo_servicio  TEXT   DEFAULT NULL,
  p_pilot          TEXT   DEFAULT NULL,
  p_carry          TEXT   DEFAULT NULL,
  p_km_inicio      INT    DEFAULT NULL,
  p_km_fin         INT    DEFAULT NULL,
  p_id_parte       UUID   DEFAULT NULL   -- optional: link shift doc to activation
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id_activacion  UUID;
  v_id_checklist   UUID;
  v_existing_id    UUID;
  v_estado_actual  TEXT;
BEGIN
  -- Idempotency
  SELECT id INTO v_existing_id
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;

  IF FOUND THEN
    -- Return current state
    SELECT estado_operativo INTO v_estado_actual
    FROM vehiculos WHERE matricula = p_matricula;
    RETURN jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', v_estado_actual,
      'noop',             TRUE
    );
  END IF;

  -- ── Branch: ACTIVADO ─────────────────────────────────────────────────────
  IF p_estado_destino = 'activado' THEN

    IF p_pilot IS NULL THEN
      RAISE EXCEPTION 'p_pilot required for activado';
    END IF;

    -- Create vehicle activation
    INSERT INTO activaciones_vehiculo(
      matricula,
      pilot,
      carry,
      tipo_servicio,
      km_inicio,
      timestamp_activacion
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

    -- Create Checklist360
    INSERT INTO doc_checklist360(
      id_activacion,
      timestamp_inicio
    )
    VALUES (v_id_activacion, NOW())
    RETURNING id_checklist INTO v_id_checklist;

    -- Update vehicle state
    UPDATE vehiculos
    SET
      estado_operativo    = 'activado',
      subestado_operativo = 'en_espera'
    WHERE matricula = p_matricula;

    -- If caller provided id_parte (shift doc exists), link activation to it
    IF p_id_parte IS NOT NULL THEN
      UPDATE doc8_partes_trabajo
      SET
        id_activacion = v_id_activacion,
        km_inicio     = p_km_inicio
      WHERE
        id_parte = p_id_parte
        AND estado = 'Abierto_En_Turno';
    END IF;

    -- Register idempotency
    INSERT INTO idempotency_keys(mutation_uuid, id)
    VALUES (p_mutation_uuid, v_id_activacion);

    RETURN jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'activado',
      'id_activacion',    v_id_activacion::TEXT,
      'id_checklist',     v_id_checklist::TEXT,
      'noop',             FALSE
    );
  END IF;

  -- ── Branch: DESACTIVADO ──────────────────────────────────────────────────
  IF p_estado_destino = 'desactivado' THEN

    -- Close current activation
    UPDATE activaciones_vehiculo
    SET
      km_fin                = COALESCE(p_km_fin, km_fin),
      timestamp_desactivacion = NOW()
    WHERE
      matricula = p_matricula
      AND timestamp_desactivacion IS NULL
    RETURNING id_activacion INTO v_id_activacion;

    -- Update vehicle state
    UPDATE vehiculos
    SET
      estado_operativo    = 'desactivado',
      subestado_operativo = NULL
    WHERE matricula = p_matricula;

    -- If caller provided id_parte, store km_fin in the shift doc too
    IF p_id_parte IS NOT NULL THEN
      UPDATE doc8_partes_trabajo
      SET km_fin = p_km_fin
      WHERE
        id_parte = p_id_parte
        AND estado = 'Abierto_En_Turno';
    END IF;

    INSERT INTO idempotency_keys(mutation_uuid, id)
    VALUES (p_mutation_uuid, COALESCE(v_id_activacion, gen_random_uuid()));

    RETURN jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'desactivado',
      'noop',             FALSE
    );
  END IF;

  -- ── Branch: SUBESTADO ────────────────────────────────────────────────────
  IF p_estado_destino IN ('en_espera', 'ruta', 'estacionado', 'alerta') THEN

    UPDATE vehiculos
    SET subestado_operativo = p_estado_destino::subestado_operativo
    WHERE matricula = p_matricula;

    INSERT INTO idempotency_keys(mutation_uuid, id)
    VALUES (p_mutation_uuid, gen_random_uuid());

    RETURN jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', (SELECT estado_operativo FROM vehiculos WHERE matricula = p_matricula),
      'subestado',        p_estado_destino,
      'noop',             FALSE
    );
  END IF;

  RAISE EXCEPTION 'Estado destino desconocido: %', p_estado_destino;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_actualizar_vehiculo(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, UUID)
  TO authenticated;

-- ── Part 7: rpc_checkin_vehiculo (retrocompat update) ─────────────────────

-- Update to use activado/desactivado values and NOT create doc8.
-- This RPC is used by the old VehiclePickerScreen flow.
-- Keep for backward compat; new flow uses rpc_actualizar_vehiculo.
CREATE OR REPLACE FUNCTION rpc_checkin_vehiculo(
  p_mutation_uuid UUID,
  p_matricula     TEXT,
  p_pilot         TEXT,
  p_carry         TEXT DEFAULT NULL,
  p_km_inicio     INT  DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id_activacion UUID;
  v_id_checklist  UUID;
BEGIN
  -- Idempotency
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid) THEN
    RETURN jsonb_build_object('noop', TRUE);
  END IF;

  INSERT INTO activaciones_vehiculo(
    matricula, pilot, carry, km_inicio, timestamp_activacion
  )
  VALUES (p_matricula, p_pilot, p_carry, p_km_inicio, NOW())
  RETURNING id_activacion INTO v_id_activacion;

  INSERT INTO doc_checklist360(id_activacion, timestamp_inicio)
  VALUES (v_id_activacion, NOW())
  RETURNING id_checklist INTO v_id_checklist;

  UPDATE vehiculos
  SET estado_operativo = 'activado', subestado_operativo = 'en_espera'
  WHERE matricula = p_matricula;

  INSERT INTO idempotency_keys(mutation_uuid, id)
  VALUES (p_mutation_uuid, v_id_activacion);

  RETURN jsonb_build_object(
    'id_activacion', v_id_activacion::TEXT,
    'id_checklist',  v_id_checklist::TEXT,
    'noop',          FALSE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_checkin_vehiculo(UUID, TEXT, TEXT, TEXT, INT) TO authenticated;

-- ── Part 8: Trigger update for doc7 — use 'critico' (already in 20260527000003) ──
-- (no changes needed here — already applied in previous migration)

COMMENT ON FUNCTION rpc_abrir_turno IS
  'Opens a shift Doc-8 for a worker at checkin time. Idempotent via mutation_uuid.';
COMMENT ON FUNCTION rpc_cerrar_turno IS
  'Closes the shift Doc-8 at worker checkout. Idempotent via mutation_uuid.';
COMMENT ON FUNCTION rpc_actualizar_vehiculo IS
  'Updates vehicle state (activado/desactivado/subestado). Does NOT create Doc-8. '
  'Pass p_id_parte to link shift doc to the vehicle activation.';
