-- ============================================================
--  U24 — RPCs de operativa diaria (Sprint 10)
--  10.1 Filiación / Sala de espera (Realtime)
--  10.2 Informes clínicos Doc-2 SVB
--  Fecha: 2026-05-21
--
--  ADR-012: idempotencia via ledger idempotency_keys
--  Realtime: filiacion_pacientes replicación habilitada en config
-- ============================================================

-- ============================================================
--  10.1.a — rpc_abrir_sesion_filiacion
--
--  Crea una nueva sesión de filiación (DRP o independiente).
--  Idempotente: devuelve el id_sesion ya creado si mutation_uuid repite.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_abrir_sesion_filiacion(
  p_mutation_uuid UUID,
  p_id_drp        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_id_sesion UUID;
  v_resultado JSONB;
BEGIN
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  -- Validar DRP si se indica
  IF p_id_drp IS NOT NULL AND NOT EXISTS (SELECT 1 FROM drps WHERE id_drp = p_id_drp) THEN
    RAISE EXCEPTION 'ERR_DRP_001: DRP no encontrado' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_abrir_sesion_filiacion', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  INSERT INTO filiacion_sesiones (id_drp)
  VALUES (p_id_drp)
  RETURNING id_sesion INTO v_id_sesion;

  v_resultado := jsonb_build_object('id_sesion', v_id_sesion);

  UPDATE idempotency_keys SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_abrir_sesion_filiacion(UUID, UUID) TO authenticated;


-- ============================================================
--  10.1.b — rpc_admitir_paciente
--
--  Registra un nuevo paciente en la sesión de filiación.
--  Idempotente: mutation_uuid garantiza que la admisión es única.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_admitir_paciente(
  p_mutation_uuid UUID,
  p_id_sesion     UUID,
  p_datos         JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_id_paciente UUID;
  v_resultado  JSONB;
BEGIN
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM filiacion_sesiones
    WHERE id_sesion = p_id_sesion AND timestamp_cierre IS NULL
  ) THEN
    RAISE EXCEPTION 'ERR_FILIACION_001: Sesión no encontrada o ya cerrada' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_admitir_paciente', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  INSERT INTO filiacion_pacientes (id_sesion)
  VALUES (p_id_sesion)
  RETURNING id_paciente INTO v_id_paciente;

  INSERT INTO filiacion_eventos (filiacion_id, paciente_id, tipo_evento, id_nombre_actor)
  VALUES (p_id_sesion, v_id_paciente, 'admision', v_id_nombre);

  v_resultado := jsonb_build_object(
    'id_paciente', v_id_paciente,
    'id_sesion',   p_id_sesion,
    'datos',       p_datos
  );

  UPDATE idempotency_keys SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_admitir_paciente(UUID, UUID, JSONB) TO authenticated;


-- ============================================================
--  10.1.c — rpc_actualizar_estado_paciente
--
--  Transiciona el estado de un paciente de filiación.
--  estados: en_espera → en_consulta → alta
--  Idempotente: una misma transición no se duplica.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_actualizar_estado_paciente(
  p_mutation_uuid UUID,
  p_id_paciente   UUID,
  p_nuevo_estado  estado_paciente_filiacion
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre   TEXT;
  v_estado_prev estado_paciente_filiacion;
  v_id_sesion   UUID;
  v_resultado   JSONB;
BEGIN
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  SELECT estado, id_sesion INTO v_estado_prev, v_id_sesion
  FROM filiacion_pacientes
  WHERE id_paciente = p_id_paciente;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_FILIACION_002: Paciente no encontrado' USING ERRCODE = 'P0001';
  END IF;

  -- Guardia de transición: solo avanzar, nunca retroceder
  IF (v_estado_prev = 'alta') THEN
    RAISE EXCEPTION 'ERR_FILIACION_003: El paciente ya tiene el estado alta' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_actualizar_estado_paciente', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  UPDATE filiacion_pacientes
  SET
    estado = p_nuevo_estado,
    timestamp_inicio_consulta = CASE WHEN p_nuevo_estado = 'en_consulta' THEN NOW() ELSE timestamp_inicio_consulta END,
    timestamp_fin_consulta    = CASE WHEN p_nuevo_estado = 'alta'        THEN NOW() ELSE timestamp_fin_consulta END
  WHERE id_paciente = p_id_paciente;

  INSERT INTO filiacion_eventos (filiacion_id, paciente_id, tipo_evento, id_nombre_actor)
  VALUES (v_id_sesion, p_id_paciente, p_nuevo_estado::TEXT, v_id_nombre);

  v_resultado := jsonb_build_object(
    'id_paciente',  p_id_paciente,
    'nuevo_estado', p_nuevo_estado
  );

  UPDATE idempotency_keys SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_actualizar_estado_paciente(UUID, UUID, estado_paciente_filiacion) TO authenticated;


-- ============================================================
--  10.2.a — rpc_crear_informe_svb
--
--  Crea un informe asistencial Doc-2 (SVB) en estado borrador.
--  Encolable offline (ADR-012).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_crear_informe_svb(
  p_mutation_uuid UUID,
  p_id_activacion UUID,
  p_datos_paciente JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_id_doc    UUID;
  v_resultado JSONB;
BEGIN
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM activaciones_vehiculo WHERE id_activacion = p_id_activacion) THEN
    RAISE EXCEPTION 'ERR_ACTIVACION_001: Activación no encontrada' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_crear_informe_svb', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  INSERT INTO doc2_informes_svb (
    id_activacion, id_nombre_redactor, auth_uid_redactor, datos_paciente
  )
  VALUES (p_id_activacion, v_id_nombre, auth.uid(), p_datos_paciente)
  RETURNING id_doc INTO v_id_doc;

  v_resultado := jsonb_build_object(
    'id_doc',       v_id_doc,
    'id_activacion', p_id_activacion,
    'tipo_doc',     'svb'
  );

  UPDATE idempotency_keys SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_crear_informe_svb(UUID, UUID, JSONB) TO authenticated;


-- ============================================================
--  10.2.b — rpc_cerrar_informe_svb
--
--  Cierra (finaliza) un informe Doc-2. Encolable offline.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_cerrar_informe_svb(
  p_mutation_uuid UUID,
  p_id_doc        UUID,
  p_datos_paciente JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_resultado JSONB;
BEGIN
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM doc2_informes_svb
    WHERE id_doc = p_id_doc
      AND estado = 'borrador'
      AND (id_nombre_redactor = v_id_nombre
           OR auth_rol_actual() IN ('coordinacion', 'gerencia'))
  ) THEN
    RAISE EXCEPTION 'ERR_INFORME_001: Informe no encontrado, ya cerrado o sin permisos' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_cerrar_informe_svb', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  UPDATE doc2_informes_svb
  SET
    estado = 'cerrado',
    datos_paciente = COALESCE(p_datos_paciente, datos_paciente)
  WHERE id_doc = p_id_doc;

  v_resultado := jsonb_build_object('id_doc', p_id_doc, 'estado', 'cerrado');

  UPDATE idempotency_keys SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cerrar_informe_svb(UUID, UUID, JSONB) TO authenticated;
