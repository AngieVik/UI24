-- Migración 20260602000003
-- Fix: añade ::tipo_servicio al INSERT de activaciones_vehiculo en
-- rpc_actualizar_vehiculo. Sin el cast explícito PostgreSQL lanza
-- "column tipo_servicio is of type tipo_servicio but expression is of type text"
-- cuando el valor viene del parámetro p_tipo_servicio (text).

CREATE OR REPLACE FUNCTION public.rpc_actualizar_vehiculo(
  p_mutation_uuid  uuid,
  p_matricula      text,
  p_estado_destino text,
  p_tipo_servicio  text    DEFAULT NULL::text,
  p_pilot          text    DEFAULT NULL::text,
  p_carry          text    DEFAULT NULL::text,
  p_km_inicio      integer DEFAULT NULL::integer,
  p_km_fin         integer DEFAULT NULL::integer,
  p_id_parte       uuid    DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      COALESCE(p_tipo_servicio, 'sin_asignar')::tipo_servicio,
      p_km_inicio,
      NOW()
    )
    RETURNING id_activacion INTO v_id_activacion;

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

    UPDATE vehiculos
    SET estado_operativo    = 'activado',
        subestado_operativo = 'en_espera'
    WHERE matricula = p_matricula;

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

    UPDATE activaciones_vehiculo
    SET km_fin           = COALESCE(p_km_fin, km_fin),
        timestamp_cierre = NOW()
    WHERE matricula         = p_matricula
      AND timestamp_cierre IS NULL
    RETURNING id_activacion INTO v_id_activacion;

    UPDATE vehiculos
    SET estado_operativo    = 'desactivado',
        subestado_operativo = NULL
    WHERE matricula = p_matricula;

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
