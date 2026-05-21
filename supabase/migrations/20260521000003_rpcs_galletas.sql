-- ============================================================
--  U24 — RPCs de autenticación y galletas de terminal
--  Sprint 3, Tarea 3.1
--  Fecha: 2026-05-21
--
--  ADR-010: step-up PBKDF2-SHA256 para rpc_revocar_y_reemitir_galleta
--  ADR-009: timebox sesión 7 días; galleta permanente sobrevive al browser
--  Convención errores: ADR-006 — códigos en inglés ERRCODE='P0001'
-- ============================================================

-- ============================================================
--  FUNCIONES HELPER DE STEP-UP
--
--  Centraliza la verificación de PIN step-up y el rate-limit
--  de intentos fallidos para todas las RPCs que lo requieran.
-- ============================================================

CREATE OR REPLACE FUNCTION _verificar_stepup(
  p_id_nombre      TEXT,
  p_stepup_hash    TEXT,
  p_id_terminal    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash_almacenado TEXT;
  v_bloqueado_hasta TIMESTAMPTZ;
  v_intentos        INT;
  v_ventana         TIMESTAMPTZ;
BEGIN
  -- Comprobar bloqueo activo
  SELECT bloqueado_hasta INTO v_bloqueado_hasta
  FROM pin_intentos_fallidos
  WHERE id_terminal = COALESCE(p_id_terminal, p_id_nombre)
    AND bloqueado_hasta > NOW()
  ORDER BY bloqueado_hasta DESC
  LIMIT 1;

  IF FOUND AND v_bloqueado_hasta IS NOT NULL THEN
    RAISE EXCEPTION 'ERR_STEPUP_001: Step-up bloqueado hasta %', v_bloqueado_hasta
      USING ERRCODE = 'P0001';
  END IF;

  -- Obtener hash almacenado
  SELECT pin_stepup_hash INTO v_hash_almacenado
  FROM fichas_empleados
  WHERE id_nombre = p_id_nombre AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_STEPUP_002: Empleado no encontrado o inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_hash_almacenado IS NULL THEN
    RAISE EXCEPTION 'ERR_STEPUP_003: PIN step-up no configurado para este rol'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar hash
  IF v_hash_almacenado != p_stepup_hash THEN
    -- Registrar intento fallido en ventana de 10 minutos
    v_ventana := date_trunc('minute', NOW()) - ((EXTRACT(MINUTE FROM NOW())::INT % 10) * INTERVAL '1 minute');

    INSERT INTO pin_intentos_fallidos (id_terminal, ventana_inicio, intentos, bloqueado_hasta)
    VALUES (COALESCE(p_id_terminal, p_id_nombre), v_ventana, 1, NULL)
    ON CONFLICT (id_terminal, ventana_inicio)
    DO UPDATE SET intentos = pin_intentos_fallidos.intentos + 1;

    -- Obtener total de intentos en esta ventana
    SELECT intentos INTO v_intentos
    FROM pin_intentos_fallidos
    WHERE id_terminal = COALESCE(p_id_terminal, p_id_nombre)
      AND ventana_inicio = v_ventana;

    -- Bloquear tras 3 intentos fallidos
    IF v_intentos >= 3 THEN
      UPDATE pin_intentos_fallidos
      SET bloqueado_hasta = NOW() + INTERVAL '15 minutes'
      WHERE id_terminal = COALESCE(p_id_terminal, p_id_nombre)
        AND ventana_inicio = v_ventana;

      INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata)
      VALUES ('step_up_fallido', p_id_nombre, p_id_terminal,
              jsonb_build_object('motivo', 'bloqueo_por_intentos', 'intentos', v_intentos));

      RAISE EXCEPTION 'ERR_STEPUP_004: Demasiados intentos fallidos. Bloqueado 15 minutos'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata)
    VALUES ('step_up_fallido', p_id_nombre, p_id_terminal,
            jsonb_build_object('intentos_ventana', v_intentos));

    RAISE EXCEPTION 'ERR_STEPUP_005: PIN step-up incorrecto'
      USING ERRCODE = 'P0001';
  END IF;

  -- Hash correcto — limpiar ventana de intentos si existía
  DELETE FROM pin_intentos_fallidos
  WHERE id_terminal = COALESCE(p_id_terminal, p_id_nombre)
    AND bloqueado_hasta IS NULL;

  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal)
  VALUES ('step_up_exitoso', p_id_nombre, p_id_terminal);
END;
$$;


-- ============================================================
--  3.1.a — rpc_revocar_y_reemitir_galleta
--
--  Revoca la galleta activa de un terminal y emite una nueva.
--  Requiere step-up (ADR-010).
--  Solo gerencia/rrhh/coordinacion pueden actuar sobre otro usuario;
--  cualquier rol puede revocar y reemitir su propia galleta.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_revocar_y_reemitir_galleta(
  p_id_terminal      TEXT,
  p_id_nombre_target TEXT,
  p_tipo_galleta     tipo_galleta,
  p_stepup_hash      TEXT,
  p_expires_at       TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre_actor TEXT;
  v_rol_actor       rol_empleado;
  v_id_galleta_new  UUID;
BEGIN
  -- Resolver actor desde JWT
  SELECT id_nombre, rol INTO v_id_nombre_actor, v_rol_actor
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Si el actor actúa sobre otro usuario, exige privilegio
  IF v_id_nombre_actor != p_id_nombre_target
    AND v_rol_actor NOT IN ('gerencia', 'rrhh', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_AUTH_002: Rol insuficiente para actuar sobre otro usuario'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar step-up con el PIN del actor (no del target)
  PERFORM _verificar_stepup(v_id_nombre_actor, p_stepup_hash, p_id_terminal);

  -- Revocar galleta activa existente para ese terminal + usuario
  -- El trigger trg_audit_galleta_revocada (migration 5) registra el evento automáticamente.
  UPDATE galletas_terminales
  SET revocado_at = NOW()
  WHERE id_terminal = p_id_terminal
    AND id_nombre   = p_id_nombre_target
    AND revocado_at IS NULL;

  -- Emitir nueva galleta
  -- El trigger trg_audit_galleta_emitida (migration 5) registra el evento automáticamente.
  INSERT INTO galletas_terminales (id_terminal, tipo, id_nombre, expires_at, ultima_activacion_at)
  VALUES (p_id_terminal, p_tipo_galleta, p_id_nombre_target, p_expires_at, NOW())
  RETURNING id_galleta INTO v_id_galleta_new;

  RETURN jsonb_build_object(
    'id_galleta',      v_id_galleta_new,
    'id_terminal',     p_id_terminal,
    'id_nombre',       p_id_nombre_target,
    'tipo',            p_tipo_galleta,
    'expires_at',      p_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_revocar_y_reemitir_galleta(TEXT, TEXT, tipo_galleta, TEXT, TIMESTAMPTZ)
  TO authenticated;


-- ============================================================
--  3.1.b — rpc_transferir_galleta
--
--  Transfiere la galleta permanente de un usuario a un nuevo
--  terminal (cambio de dispositivo físico). No requiere step-up:
--  el usuario solo puede transferir su propia galleta, y la
--  validación de identidad viene del JWT activo.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_transferir_galleta(
  p_id_terminal_nuevo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre       TEXT;
  v_id_galleta_old  UUID;
  v_id_terminal_old TEXT;
  v_id_galleta_new  UUID;
BEGIN
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Localizar galleta activa permanente del usuario
  SELECT id_galleta, id_terminal INTO v_id_galleta_old, v_id_terminal_old
  FROM galletas_terminales
  WHERE id_nombre   = v_id_nombre
    AND tipo        = 'permanente'
    AND revocado_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_003: No existe galleta permanente activa para transferir'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_id_terminal_old = p_id_terminal_nuevo THEN
    RAISE EXCEPTION 'ERR_AUTH_004: El terminal destino es el mismo que el origen'
      USING ERRCODE = 'P0001';
  END IF;

  -- Revocar galleta antigua.
  -- El trigger trg_audit_galleta_revocada (migration 5) registra el evento automáticamente.
  UPDATE galletas_terminales
  SET revocado_at = NOW()
  WHERE id_galleta = v_id_galleta_old;

  -- Emitir galleta en nuevo terminal.
  -- El trigger trg_audit_galleta_emitida (migration 5) registra el evento automáticamente.
  INSERT INTO galletas_terminales (id_terminal, tipo, id_nombre, ultima_activacion_at)
  VALUES (p_id_terminal_nuevo, 'permanente', v_id_nombre, NOW())
  RETURNING id_galleta INTO v_id_galleta_new;

  RETURN jsonb_build_object(
    'id_galleta',          v_id_galleta_new,
    'id_terminal_nuevo',   p_id_terminal_nuevo,
    'id_terminal_anterior', v_id_terminal_old
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_transferir_galleta(TEXT)
  TO authenticated;


-- ============================================================
--  3.1.c — rpc_solicitar_desbloqueo
--
--  El empleado solicita desbloqueo de step-up tras superar
--  el límite de intentos. Coordinación/gerencia deben aprobar.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_solicitar_desbloqueo(
  p_id_terminal TEXT,
  p_motivo      TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_id_solicitud UUID;
BEGIN
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Solo se permite una solicitud pendiente por terminal
  IF EXISTS (
    SELECT 1 FROM solicitudes_desbloqueo
    WHERE id_terminal = p_id_terminal
      AND estado = 'pendiente'
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'ERR_DESBLOQUEO_001: Ya existe una solicitud pendiente para este terminal'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO solicitudes_desbloqueo (
    id_terminal,
    id_nombre_solicitante,
    motivo,
    estado,
    expires_at
  )
  VALUES (
    p_id_terminal,
    v_id_nombre,
    p_motivo,
    'pendiente',
    NOW() + INTERVAL '1 hour'
  )
  RETURNING id_solicitud INTO v_id_solicitud;

  RETURN v_id_solicitud;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_solicitar_desbloqueo(TEXT, TEXT)
  TO authenticated;


-- ============================================================
--  3.1.d — rpc_aprobar_desbloqueo
--
--  Coordinación o gerencia aprueba la solicitud y limpia
--  el registro de intentos fallidos para ese terminal.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_aprobar_desbloqueo(
  p_id_solicitud UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre_revisor TEXT;
  v_rol_revisor       rol_empleado;
  v_id_terminal       TEXT;
  v_id_nombre_target  TEXT;
BEGIN
  SELECT id_nombre, rol INTO v_id_nombre_revisor, v_rol_revisor
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol_revisor NOT IN ('gerencia', 'coordinacion', 'rrhh') THEN
    RAISE EXCEPTION 'ERR_DESBLOQUEO_002: Rol insuficiente para aprobar desbloqueos'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id_terminal, id_nombre_solicitante
  INTO v_id_terminal, v_id_nombre_target
  FROM solicitudes_desbloqueo
  WHERE id_solicitud = p_id_solicitud AND estado = 'pendiente' AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DESBLOQUEO_003: Solicitud no encontrada, ya resuelta o expirada'
      USING ERRCODE = 'P0001';
  END IF;

  -- Actualizar solicitud
  UPDATE solicitudes_desbloqueo
  SET estado = 'aprobada', id_nombre_revisor = v_id_nombre_revisor
  WHERE id_solicitud = p_id_solicitud;

  -- Limpiar intentos fallidos para ese terminal
  DELETE FROM pin_intentos_fallidos
  WHERE id_terminal = v_id_terminal;

  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata)
  VALUES ('desbloqueo_aprobado', v_id_nombre_target, v_id_terminal,
          jsonb_build_object('revisor', v_id_nombre_revisor));
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_aprobar_desbloqueo(UUID)
  TO authenticated;


-- ============================================================
--  3.1.e — rpc_rechazar_desbloqueo
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_rechazar_desbloqueo(
  p_id_solicitud UUID,
  p_motivo       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre_revisor TEXT;
  v_rol_revisor       rol_empleado;
  v_id_terminal       TEXT;
  v_id_nombre_target  TEXT;
BEGIN
  SELECT id_nombre, rol INTO v_id_nombre_revisor, v_rol_revisor
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol_revisor NOT IN ('gerencia', 'coordinacion', 'rrhh') THEN
    RAISE EXCEPTION 'ERR_DESBLOQUEO_002: Rol insuficiente para rechazar desbloqueos'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id_terminal, id_nombre_solicitante
  INTO v_id_terminal, v_id_nombre_target
  FROM solicitudes_desbloqueo
  WHERE id_solicitud = p_id_solicitud AND estado = 'pendiente' AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DESBLOQUEO_003: Solicitud no encontrada, ya resuelta o expirada'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE solicitudes_desbloqueo
  SET estado = 'rechazada', id_nombre_revisor = v_id_nombre_revisor
  WHERE id_solicitud = p_id_solicitud;

  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata)
  VALUES ('desbloqueo_rechazado', v_id_nombre_target, v_id_terminal,
          jsonb_build_object('revisor', v_id_nombre_revisor, 'motivo', p_motivo));
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_rechazar_desbloqueo(UUID, TEXT)
  TO authenticated;
