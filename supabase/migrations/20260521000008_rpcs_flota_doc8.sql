-- ============================================================
--  U24 — RPCs de flota y Doc-8
--  Sprint 9, Tareas 9.1 · 9.2 · 9.3
--  Fecha: 2026-05-21
--
--  ADR-012: idempotencia via ledger idempotency_keys
--  ADR-002: imágenes como Blob a Storage, nunca Base64
-- ============================================================

-- ============================================================
--  9.1 + 9.2 — rpc_checkin_vehiculo
--
--  Valida el vehículo, crea activacion + doc8 + checklist360
--  en transacción atómica. Encolable offline (ADR-012).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_checkin_vehiculo(
  p_mutation_uuid UUID,
  p_matricula     TEXT,
  p_km_inicio     INTEGER,
  p_carry         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_estado_op     estado_operativo;
  v_condicion     condicion_tecnica;
  v_id_activacion UUID;
  v_id_parte      UUID;
  v_id_checklist  UUID;
  v_resultado     JSONB;
BEGIN
  -- Idempotencia
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN
    RETURN v_resultado;
  END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Validar vehículo
  SELECT estado_operativo, condicion_tecnica
  INTO v_estado_op, v_condicion
  FROM vehiculos
  WHERE matricula = p_matricula;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_VEHICULO_003: Vehículo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado_op != 'inactivo' THEN
    RAISE EXCEPTION 'ERR_VEHICULO_006: El vehículo no está disponible (estado: %)', v_estado_op
      USING ERRCODE = 'P0001';
  END IF;

  IF v_condicion IN ('dado_de_baja', 'en_taller') THEN
    RAISE EXCEPTION 'ERR_VEHICULO_007: Condición técnica impide activación: %', v_condicion
      USING ERRCODE = 'P0001';
  END IF;

  IF p_km_inicio < 0 THEN
    RAISE EXCEPTION 'ERR_KM_002: km_inicio no puede ser negativo'
      USING ERRCODE = 'P0001';
  END IF;

  -- Registrar ledger
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_checkin_vehiculo', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Crear activación
  INSERT INTO activaciones_vehiculo (matricula, pilot, carry, km_inicio)
  VALUES (p_matricula, v_id_nombre, p_carry, p_km_inicio)
  RETURNING id_activacion INTO v_id_activacion;

  -- Abrir Doc-8
  INSERT INTO doc8_partes_trabajo (id_activacion, km_inicio, estado)
  VALUES (v_id_activacion, p_km_inicio, 'Abierto_En_Turno')
  RETURNING id_parte INTO v_id_parte;

  -- Crear checklist360 inicial (abierto)
  INSERT INTO doc_checklist360 (matricula, id_activacion, id_nombre_redactor)
  VALUES (p_matricula, v_id_activacion, v_id_nombre)
  RETURNING id_checklist INTO v_id_checklist;

  -- Marcar vehículo activo
  UPDATE vehiculos
  SET estado_operativo = 'activo'
  WHERE matricula = p_matricula;

  v_resultado := jsonb_build_object(
    'id_activacion', v_id_activacion,
    'id_parte',      v_id_parte,
    'id_checklist',  v_id_checklist,
    'matricula',     p_matricula
  );

  UPDATE idempotency_keys
  SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_checkin_vehiculo(UUID, TEXT, INTEGER, TEXT)
  TO authenticated;


-- ============================================================
--  9.2 — rpc_cerrar_checklist
--
--  Actualiza items_revisados y cierra el checklist (cerrado=true).
--  El trigger trg_checklist_genera_doc7 genera doc7 auto.
--  Encolable offline (ADR-012).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_cerrar_checklist(
  p_mutation_uuid   UUID,
  p_id_checklist    UUID,
  p_items_revisados JSONB
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_resultado  JSONB;
BEGIN
  -- Idempotencia
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN
    RETURN v_resultado;
  END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar que el checklist pertenece al redactor (o es coordinación/flota)
  IF NOT EXISTS (
    SELECT 1 FROM doc_checklist360
    WHERE id_checklist = p_id_checklist
      AND cerrado = FALSE
      AND (
        id_nombre_redactor = v_id_nombre
        OR auth_rol_actual() IN ('responsable_flota', 'gerencia', 'coordinacion')
      )
  ) THEN
    RAISE EXCEPTION 'ERR_CHECKLIST_002: Checklist no encontrado, ya cerrado o sin permisos'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_cerrar_checklist', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- El trigger trg_checklist_genera_doc7 actúa en este UPDATE
  UPDATE doc_checklist360
  SET items_revisados = p_items_revisados,
      cerrado         = TRUE
  WHERE id_checklist = p_id_checklist;

  v_resultado := jsonb_build_object(
    'id_checklist', p_id_checklist,
    'cerrado',      TRUE
  );

  UPDATE idempotency_keys
  SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cerrar_checklist(UUID, UUID, JSONB)
  TO authenticated;


-- ============================================================
--  9.3 — rpc_registrar_averia
--
--  Inserta manualmente en doc7_averias (informe de avería fuera
--  de checklist). La imagen llega como URL de Storage (ADR-002).
--  Encolable offline (ADR-012). El trigger auto-actualiza
--  condicion_tecnica del vehículo.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_registrar_averia(
  p_mutation_uuid    UUID,
  p_matricula        TEXT,
  p_sistema_afectado TEXT,
  p_nivel_criticidad nivel_criticidad,
  p_descripcion      TEXT     DEFAULT NULL,
  p_imagen_url       TEXT     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_id_averia UUID;
  v_resultado JSONB;
BEGIN
  -- Idempotencia
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN
    RETURN v_resultado;
  END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vehiculos WHERE matricula = p_matricula) THEN
    RAISE EXCEPTION 'ERR_VEHICULO_003: Vehículo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_registrar_averia', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  INSERT INTO doc7_averias (
    matricula,
    nivel_criticidad,
    sistema_afectado,
    descripcion_detallada,
    imagen_url,
    id_nombre_redactor
  )
  VALUES (
    p_matricula,
    p_nivel_criticidad,
    p_sistema_afectado,
    p_descripcion,
    p_imagen_url,
    v_id_nombre
  )
  RETURNING id_averia INTO v_id_averia;

  v_resultado := jsonb_build_object(
    'id_averia',          v_id_averia,
    'matricula',          p_matricula,
    'nivel_criticidad',   p_nivel_criticidad,
    'sistema_afectado',   p_sistema_afectado
  );

  UPDATE idempotency_keys
  SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_registrar_averia(UUID, TEXT, TEXT, nivel_criticidad, TEXT, TEXT)
  TO authenticated;
