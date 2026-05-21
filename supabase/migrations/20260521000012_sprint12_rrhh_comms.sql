-- ============================================================
--  U24 — Sprint 12: RRHH, Cuadrantes y Comunicación
--  Fecha: 2026-05-21
--
--  Cubre:
--    • RLS para cuadrante_turnos, cuadrante_patrones/grupos,
--      doc_solicitudes_vacaciones, mochilas_backpack
--    • rpc_marcar_aviso_leido
--    • rpc_marcar_mensaje_leido
--    • rpc_enviar_solicitud_vacaciones
--    • rpc_resolver_solicitud_vacaciones
--    • rpc_set_system_config
-- ============================================================


-- ============================================================
--  BLOQUE 1 — RLS
-- ============================================================

-- cuadrante_turnos: cada empleado ve sus propios turnos;
--   rrhh y gerencia ven todos.
CREATE POLICY cuadrante_turnos_select
  ON cuadrante_turnos FOR SELECT
  USING (
    id_nombre = auth_id_nombre_actual()
    OR auth_rol_actual() IN ('rrhh', 'gerencia')
  );

-- cuadrante_patrones y grupos: solo rrhh/gerencia
CREATE POLICY cuadrante_patrones_select
  ON cuadrante_patrones FOR SELECT
  USING (auth_rol_actual() IN ('rrhh', 'gerencia'));

CREATE POLICY cuadrante_grupos_select
  ON cuadrante_grupos FOR SELECT
  USING (auth_rol_actual() IN ('rrhh', 'gerencia'));

CREATE POLICY cuadrante_grupo_miembros_select
  ON cuadrante_grupo_miembros FOR SELECT
  USING (auth_rol_actual() IN ('rrhh', 'gerencia'));

-- doc_solicitudes_vacaciones: cada empleado ve las suyas;
--   rrhh y gerencia ven todas.
CREATE POLICY vacaciones_select
  ON doc_solicitudes_vacaciones FOR SELECT
  USING (
    id_nombre = auth_id_nombre_actual()
    OR auth_rol_actual() IN ('rrhh', 'gerencia')
  );

-- mochilas_backpack: logistica, coordinacion y gerencia
CREATE POLICY mochilas_select
  ON mochilas_backpack FOR SELECT
  USING (
    auth_rol_actual() IN ('coordinacion', 'gerencia', 'logistica', 'responsable_logistica', 'rrhh')
  );


-- ============================================================
--  BLOQUE 2 — rpc_marcar_aviso_leido
--
--  Añade el id_nombre del usuario al array JSONB leido_por
--  si no estaba ya. Idempotente por diseño.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_marcar_aviso_leido(
  p_id_aviso UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
BEGIN
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE doc11_avisos
  SET leido_por = CASE
    WHEN leido_por @> to_jsonb(v_id_nombre) THEN leido_por
    ELSE leido_por || to_jsonb(v_id_nombre)
  END
  WHERE id_aviso = p_id_aviso;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AVISO_001: Aviso no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_marcar_aviso_leido(UUID) TO authenticated;


-- ============================================================
--  BLOQUE 3 — rpc_marcar_mensaje_leido
--
--  Marca un mensaje de la bandeja como leído.
--  Solo el destinatario puede marcarlo.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_marcar_mensaje_leido(
  p_mutation_uuid UUID,
  p_id_mensaje    UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
BEGIN
  -- Idempotencia
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid) THEN
    RETURN;
  END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE mensajes_bandeja
  SET estado           = 'leido',
      timestamp_lectura = NOW()
  WHERE id_mensaje = p_id_mensaje
    AND id_nombre_destino = v_id_nombre
    AND estado = 'no_leido';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_marcar_mensaje_leido', v_id_nombre, p_id_mensaje::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_marcar_mensaje_leido(UUID, UUID) TO authenticated;


-- ============================================================
--  BLOQUE 4 — rpc_enviar_solicitud_vacaciones
--
--  Crea una solicitud de vacaciones en estado Pendiente_Aprobacion.
--  El propio empleado puede solicitar para sí mismo.
--  p_fecha_inicio y p_fecha_fin: format 'YYYY-MM-DD'.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_enviar_solicitud_vacaciones(
  p_mutation_uuid UUID,
  p_periodo_anual TEXT,
  p_fecha_inicio  DATE,
  p_fecha_fin     DATE,
  p_preferencia   preferencia_vacaciones DEFAULT 'opcion_1',
  p_observaciones TEXT                   DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_id_sol     UUID;
BEGIN
  -- Idempotencia
  SELECT resultado::UUID INTO v_id_sol
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND THEN RETURN v_id_sol; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_fecha_fin < p_fecha_inicio THEN
    RAISE EXCEPTION 'ERR_VAC_001: La fecha de fin debe ser >= fecha de inicio'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_fecha_inicio < CURRENT_DATE THEN
    RAISE EXCEPTION 'ERR_VAC_002: No se pueden solicitar vacaciones en fechas pasadas'
      USING ERRCODE = 'P0001';
  END IF;

  -- Comprobar solapamiento con otra solicitud activa del mismo empleado
  IF EXISTS (
    SELECT 1 FROM doc_solicitudes_vacaciones
    WHERE id_nombre = v_id_nombre
      AND periodo_anual = p_periodo_anual
      AND estado IN ('Pendiente_Aprobacion', 'Aprobada')
      AND fecha_inicio <= p_fecha_fin
      AND fecha_fin   >= p_fecha_inicio
  ) THEN
    RAISE EXCEPTION 'ERR_VAC_003: Ya existe una solicitud aprobada o pendiente que se solapa con las fechas indicadas'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO doc_solicitudes_vacaciones (
    id_nombre, periodo_anual, fecha_inicio, fecha_fin,
    preferencia_seleccion, observaciones, estado
  )
  VALUES (
    v_id_nombre, p_periodo_anual, p_fecha_inicio, p_fecha_fin,
    p_preferencia, p_observaciones, 'Pendiente_Aprobacion'
  )
  RETURNING id INTO v_id_sol;

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_enviar_solicitud_vacaciones', v_id_nombre, v_id_sol::TEXT);

  RETURN v_id_sol;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_enviar_solicitud_vacaciones(UUID, TEXT, DATE, DATE, preferencia_vacaciones, TEXT) TO authenticated;


-- ============================================================
--  BLOQUE 5 — rpc_resolver_solicitud_vacaciones
--
--  RRHH o gerencia aprueban o deniegan una solicitud pendiente.
--  Si se aprueba, el trigger trg_doc12_aprobada_a_cuadrante
--  inyecta los turnos en cuadrante_turnos automáticamente.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_resolver_solicitud_vacaciones(
  p_mutation_uuid UUID,
  p_id_solicitud  UUID,
  p_decision      TEXT,   -- 'Aprobada' | 'Denegada'
  p_notas         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_rol        rol_empleado;
  v_estado     estado_solicitud_vacaciones;
BEGIN
  -- Idempotencia
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid) THEN
    RETURN;
  END IF;

  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('rrhh', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_VAC_004: Solo RRHH o gerencia pueden resolver solicitudes de vacaciones'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_decision NOT IN ('Aprobada', 'Denegada') THEN
    RAISE EXCEPTION 'ERR_VAC_005: Decisión no válida: %. Use Aprobada o Denegada', p_decision
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado
  FROM doc_solicitudes_vacaciones
  WHERE id = p_id_solicitud
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_VAC_006: Solicitud no encontrada'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado != 'Pendiente_Aprobacion' THEN
    RAISE EXCEPTION 'ERR_VAC_007: La solicitud no está pendiente (estado: %)', v_estado
      USING ERRCODE = 'P0001';
  END IF;

  -- trg_doc12_aprobada_a_cuadrante se dispara para 'Aprobada'
  UPDATE doc_solicitudes_vacaciones
  SET estado               = p_decision::estado_solicitud_vacaciones,
      resolucion_rrhh      = p_notas,
      id_nombre_resolutor  = v_id_nombre,
      timestamp_resolucion = NOW()
  WHERE id = p_id_solicitud;

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_resolver_solicitud_vacaciones', v_id_nombre, p_decision);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_resolver_solicitud_vacaciones(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
--  BLOQUE 6 — rpc_set_system_config
--
--  Solo gerencia puede modificar system_config.
--  El step-up lo aplica la UI (useStepUp); la RPC verifica el rol.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_set_system_config(
  p_clave TEXT,
  p_valor JSONB
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_rol       rol_empleado;
BEGIN
  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol != 'gerencia' THEN
    RAISE EXCEPTION 'ERR_CFG_001: Solo gerencia puede modificar la configuración del sistema'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO system_config (clave, valor, id_nombre_modificador, updated_at)
  VALUES (p_clave, p_valor, v_id_nombre, NOW())
  ON CONFLICT (clave) DO UPDATE
    SET valor                = EXCLUDED.valor,
        id_nombre_modificador = EXCLUDED.id_nombre_modificador,
        updated_at           = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_set_system_config(TEXT, JSONB) TO authenticated;
