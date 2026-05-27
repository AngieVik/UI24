-- ============================================================
--  U24 — D.1.4 Doc-8 Parte de trabajo
--  Fecha: 2026-05-27
--
--  1. Nueva columna notas en doc8_partes_trabajo.
--  2. Policy SELECT para authenticated.
--  3. GRANTs service_role para acceso directo (consistente con D-12).
--  4. RPC rpc_anotar_parte — actualiza notas del parte activo.
-- ============================================================

-- ── 1. Columna notas ─────────────────────────────────────────
ALTER TABLE doc8_partes_trabajo
  ADD COLUMN IF NOT EXISTS notas TEXT;

COMMENT ON COLUMN doc8_partes_trabajo.notas IS
  'Anotaciones libres del turno (incidencias, anomalías, observaciones). '
  'Editable mientras estado = Abierto_En_Turno.';

-- ── 2. RLS SELECT ─────────────────────────────────────────────
--  Cualquier usuario autenticado puede leer su parte de trabajo.
--  La restricción operativa se gestiona en el frontend (solo se
--  muestra el id_parte del useActivacionStore del terminal).
CREATE POLICY "doc8: authenticated puede SELECT"
  ON doc8_partes_trabajo
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- ── 3. GRANTs service_role ────────────────────────────────────
--  Necesarios para que los RPCs SECURITY DEFINER (que corren
--  como supabase_auth_admin / service_role) puedan operar la tabla.
GRANT SELECT, INSERT, UPDATE ON doc8_partes_trabajo TO service_role;

-- ── 4. RPC rpc_anotar_parte ───────────────────────────────────
--
--  Guarda una anotación libre en el campo notas del parte activo.
--  Idempotente via ledger idempotency_keys (ADR-012).
--  Solo permite anotar en partes con estado Abierto_En_Turno.
--
--  Parámetros:
--    p_mutation_uuid  UUID — clave de idempotencia
--    p_id_parte       UUID — id del Doc-8 a anotar
--    p_notas          TEXT — contenido de la anotación (vacío = borrar)
--
--  Retorna: JSONB { id_parte, notas }
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_anotar_parte(
  p_mutation_uuid UUID,
  p_id_parte      UUID,
  p_notas         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_estado    estado_parte;
  v_resultado JSONB;
BEGIN
  -- Idempotencia
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN
    RETURN v_resultado;
  END IF;

  -- Identificar al operador por sesión del terminal
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar que el parte existe y está abierto
  SELECT estado INTO v_estado
  FROM doc8_partes_trabajo
  WHERE id_parte = p_id_parte;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DOC8_001: Parte de trabajo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado != 'Abierto_En_Turno' THEN
    RAISE EXCEPTION 'ERR_DOC8_002: El parte ya está cerrado y no admite anotaciones'
      USING ERRCODE = 'P0001';
  END IF;

  -- Registrar en ledger antes de mutar
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_anotar_parte', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Actualizar notas
  UPDATE doc8_partes_trabajo
  SET notas = p_notas
  WHERE id_parte = p_id_parte;

  v_resultado := jsonb_build_object(
    'id_parte', p_id_parte,
    'notas',    p_notas
  );

  UPDATE idempotency_keys
  SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_anotar_parte(UUID, UUID, TEXT)
  TO authenticated;
