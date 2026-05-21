-- ============================================================
--  U24 — RPCs de DRP, RGPD y gestión de roles
--  Sprint 4, Tareas 4.1 · 4.3 · 4.5
--  Fecha: 2026-05-21
--
--  ADR-006: errores en inglés (ERRCODE='P0001'), UI en español
-- ============================================================

-- ============================================================
--  TAREA 4.1 — rpc_cambiar_rol
--
--  Solo gerencia o rrhh pueden cambiar el rol de un empleado.
--  El trigger trg_audit_cambio_rol (migration 5) registra el
--  evento en auditoria_rbac automáticamente.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_cambiar_rol(
  p_id_nombre_target TEXT,
  p_rol_nuevo        rol_empleado
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

  IF v_rol NOT IN ('gerencia', 'rrhh') THEN
    RAISE EXCEPTION 'ERR_RBAC_001: Solo gerencia o RRHH pueden cambiar roles'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM fichas_empleados WHERE id_nombre = p_id_nombre_target AND activo = TRUE
  ) THEN
    RAISE EXCEPTION 'ERR_RBAC_002: Empleado no encontrado o inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  -- El trigger trg_audit_cambio_rol registra el cambio en auditoria_rbac.
  UPDATE fichas_empleados
  SET rol = p_rol_nuevo
  WHERE id_nombre = p_id_nombre_target;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cambiar_rol(TEXT, rol_empleado) TO authenticated;


-- ============================================================
--  TAREA 4.3 — rpc_cancelar_drp
--
--  Transición completa al estado 'Cancelado':
--    - FOR UPDATE evita condiciones de carrera con otras operaciones
--    - Libera dotaciones, personal a pie, mochilas y filiaciones
--    - Publica doc11_aviso nivel 'aviso'
--
--  Solo coordinacion o gerencia pueden cancelar un DRP.
--  El DRP nunca entra ni finaliza automáticamente (logic.md §1.4).
-- ============================================================

ALTER TYPE tipo_evento_rbac ADD VALUE IF NOT EXISTS 'drp_cancelado';

CREATE OR REPLACE FUNCTION rpc_cancelar_drp(
  p_id_drp UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_id_persona UUID;
  v_rol        rol_empleado;
  v_estado     estado_drp;
BEGIN
  SELECT id_nombre, id_persona, rol INTO v_id_nombre, v_id_persona, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('coordinacion', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_DRP_001: Solo coordinación o gerencia pueden cancelar un DRP'
      USING ERRCODE = 'P0001';
  END IF;

  -- Lock con FOR UPDATE para evitar cancelaciones concurrentes
  SELECT estado INTO v_estado
  FROM drps
  WHERE id_drp = p_id_drp
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DRP_002: DRP no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado IN ('Finalizado', 'Finalizado_Retenido', 'Archivado', 'Cancelado') THEN
    RAISE EXCEPTION 'ERR_DRP_003: El DRP está en estado "%" y no puede cancelarse', v_estado
      USING ERRCODE = 'P0001';
  END IF;

  -- Cancelar DRP
  UPDATE drps
  SET estado               = 'Cancelado',
      timestamp_cancelacion = NOW(),
      cancelado_por_id      = v_id_persona
  WHERE id_drp = p_id_drp;

  -- Registrar salida de dotaciones de vehículos
  UPDATE dotaciones_drp
  SET timestamp_salida = NOW()
  WHERE id_drp = p_id_drp AND timestamp_salida IS NULL;

  -- Poner vehículos liberados de vuelta a inactivo
  UPDATE vehiculos v
  SET estado_operativo = 'inactivo'
  FROM dotaciones_drp d
  WHERE d.id_drp = p_id_drp AND d.matricula = v.matricula
    AND v.estado_operativo = 'en_drp';

  -- Registrar salida de personal a pie
  UPDATE drp_personal_a_pie
  SET timestamp_salida = NOW()
  WHERE id_drp = p_id_drp AND timestamp_salida IS NULL;

  -- Liberar mochilas BKP
  UPDATE mochilas_backpack
  SET estado = 'disponible', id_drp_activo = NULL
  WHERE id_drp_activo = p_id_drp;

  -- Cerrar sesiones de filiación vinculadas
  UPDATE filiacion_sesiones
  SET timestamp_cierre = NOW()
  WHERE id_drp = p_id_drp AND timestamp_cierre IS NULL;

  -- Marcar pacientes de filiación como cancelados
  UPDATE filiacion_pacientes fp
  SET estado = 'cancelado_por_drp'
  FROM filiacion_sesiones fs
  WHERE fs.id_drp = p_id_drp
    AND fp.id_sesion = fs.id_sesion
    AND fp.estado NOT IN ('alta', 'exitus');

  -- Publicar aviso en doc11
  INSERT INTO doc11_avisos (tipo_aviso, nivel, id_nombre_emisor, texto)
  VALUES (
    'drp_cancelado',
    'aviso',
    v_id_nombre,
    format('DRP cancelado por %s. Motivo: %s',
      v_id_nombre,
      COALESCE(p_motivo, 'Sin especificar'))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cancelar_drp(UUID, TEXT) TO authenticated;


-- ============================================================
--  TAREA 4.3 — rpc_asignar_mochila_a_drp
--
--  Asigna una mochila BKP a un DRP activo.
--  La mochila debe estar en estado 'disponible'.
--  El DRP debe estar en estado activo (no Finalizado/Cancelado/Archivado).
--
--  Nota: el límite de encadenamientos de subinventarios (logic.md §7.1.3)
--  se implementará en Sprint 11 cuando se añada la tabla de snapshots.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_asignar_mochila_a_drp(
  p_id_mochila UUID,
  p_id_drp     UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre    TEXT;
  v_rol          rol_empleado;
  v_estado_drp   estado_drp;
  v_estado_mochila estado_mochila;
BEGIN
  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('coordinacion', 'gerencia', 'logistica', 'responsable_logistica') THEN
    RAISE EXCEPTION 'ERR_DRP_004: Rol insuficiente para asignar mochila a DRP'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar estado de la mochila con lock
  SELECT estado INTO v_estado_mochila
  FROM mochilas_backpack
  WHERE id_mochila = p_id_mochila
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DRP_005: Mochila no encontrada'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado_mochila != 'disponible' THEN
    RAISE EXCEPTION 'ERR_DRP_006: La mochila no está disponible (estado: %)', v_estado_mochila
      USING ERRCODE = 'P0001';
  END IF;

  -- Verificar estado del DRP
  SELECT estado INTO v_estado_drp
  FROM drps
  WHERE id_drp = p_id_drp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DRP_002: DRP no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado_drp IN ('Finalizado', 'Finalizado_Retenido', 'Archivado', 'Cancelado') THEN
    RAISE EXCEPTION 'ERR_DRP_007: El DRP está en estado "%" — no se pueden asignar mochilas', v_estado_drp
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE mochilas_backpack
  SET estado = 'desplegada', id_drp_activo = p_id_drp
  WHERE id_mochila = p_id_mochila;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_asignar_mochila_a_drp(UUID, UUID) TO authenticated;


-- ============================================================
--  TAREA 4.5 — rpc_solicitar_borrado_rgpd
--
--  Cualquier empleado autenticado puede abrir una solicitud de
--  borrado RGPD. El procesamiento es responsabilidad de gerencia/rrhh.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_solicitar_borrado_rgpd(
  p_tipo_solicitud TEXT,   -- 'borrado_clinico' | 'borrado_empleado'
  p_identificador  TEXT,   -- id_nombre (empleado) o id_activacion (clínico)
  p_motivo         TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_id_solicitud UUID;
BEGIN
  IF p_tipo_solicitud NOT IN ('borrado_clinico', 'borrado_empleado') THEN
    RAISE EXCEPTION 'ERR_RGPD_001: Tipo de solicitud no válido: %', p_tipo_solicitud
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- Evitar duplicados de solicitudes pendientes para el mismo identificador
  IF EXISTS (
    SELECT 1 FROM solicitudes_rgpd
    WHERE identificador = p_identificador
      AND tipo_solicitud = p_tipo_solicitud
      AND estado = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'ERR_RGPD_002: Ya existe una solicitud pendiente para este identificador'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO solicitudes_rgpd (
    tipo_solicitud, identificador, motivo, solicitado_por, estado
  )
  VALUES (p_tipo_solicitud, p_identificador, p_motivo, v_id_nombre, 'pendiente')
  RETURNING id INTO v_id_solicitud;

  RETURN v_id_solicitud;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_solicitar_borrado_rgpd(TEXT, TEXT, TEXT) TO authenticated;


-- ============================================================
--  TAREA 4.5 — rpc_procesar_borrado_rgpd
--
--  Solo gerencia o rrhh pueden procesar solicitudes RGPD.
--  Estrategia: anonimización, nunca DELETE (los FKs son ON DELETE RESTRICT).
--
--  borrado_empleado (p_identificador = id_nombre):
--    - fichas_empleados: nombre_real → '[ANONIMIZADO]', dni → NULL
--    - auth.users: email → anon-{id}@rgpd.invalid  (via auth schema)
--    - Mantiene auth_user_id para no romper referencias históricas
--
--  borrado_clinico (p_identificador = id_activacion UUID):
--    - doc2, doc3: datos_paciente → '{}'
--    - doc4: tipo_consentimiento → '[ANONIMIZADO]'
--    - doc5: motivo_rechazo → '[ANONIMIZADO]'
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_procesar_borrado_rgpd(
  p_id_solicitud UUID,
  p_notas        TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_rol           rol_empleado;
  v_solicitud     solicitudes_rgpd%ROWTYPE;
  v_id_activacion UUID;
BEGIN
  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('gerencia', 'rrhh') THEN
    RAISE EXCEPTION 'ERR_RGPD_003: Solo gerencia o RRHH pueden procesar solicitudes RGPD'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_solicitud
  FROM solicitudes_rgpd
  WHERE id = p_id_solicitud AND estado = 'pendiente'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_RGPD_004: Solicitud no encontrada o ya procesada'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_solicitud.tipo_solicitud = 'borrado_empleado' THEN
    -- Anonimizar datos personales del empleado (no DELETE — FKs RESTRICT)
    UPDATE fichas_empleados
    SET nombre_real = '[ANONIMIZADO]',
        dni         = NULL
    WHERE id_nombre = v_solicitud.identificador;

    -- Anonimizar email en auth.users (acceso directo desde SECURITY DEFINER/postgres)
    UPDATE auth.users
    SET email = format('rgpd-%s@anon.invalid', gen_random_uuid()),
        email_confirmed_at = NULL
    WHERE id = (
      SELECT auth_user_id FROM fichas_empleados WHERE id_nombre = v_solicitud.identificador
    );

  ELSIF v_solicitud.tipo_solicitud = 'borrado_clinico' THEN
    -- p_identificador es el id_activacion (UUID texto)
    v_id_activacion := v_solicitud.identificador::UUID;

    -- Vaciar datos clínicos del paciente en documentos
    UPDATE doc2_informes_svb
    SET datos_paciente = '{}'
    WHERE id_activacion = v_id_activacion;

    UPDATE doc3_informes_sva
    SET datos_paciente = '{}'
    WHERE id_activacion = v_id_activacion;

    UPDATE doc4_consentimientos
    SET tipo_consentimiento = '[ANONIMIZADO]'
    WHERE id_activacion = v_id_activacion;

    UPDATE doc5_rechazos_alta
    SET motivo_rechazo = '[ANONIMIZADO]'
    WHERE id_activacion = v_id_activacion;
  END IF;

  -- Marcar solicitud como procesada
  UPDATE solicitudes_rgpd
  SET estado              = 'procesada',
      procesado_por       = v_id_nombre,
      timestamp_procesado = NOW(),
      notas_procesamiento = p_notas
  WHERE id = p_id_solicitud;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_procesar_borrado_rgpd(UUID, TEXT) TO authenticated;
