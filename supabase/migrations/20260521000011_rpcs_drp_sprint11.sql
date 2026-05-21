-- ============================================================
--  U24 — RPCs de gestión de DRP (ciclo de vida completo)
--  Sprint 11, Tareas 11.1 · 11.2 · 11.3
--  Fecha: 2026-05-21
--
--  ADR-006: errores en inglés (ERRCODE='P0001'), UI en español
--  ADR-003: operaciones DRP solo online (no se encolan)
-- ============================================================


-- ============================================================
--  TAREA 11.1 — rpc_crear_drp
--
--  Crea un nuevo DRP en estado 'En_espera'.
--  Solo coordinacion o gerencia pueden crear DRPs.
--  El coordinador queda como id_coordinacion.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_crear_drp(
  p_mutation_uuid UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_rol        rol_empleado;
  v_id_drp     UUID;
BEGIN
  -- Idempotencia (ADR-012)
  SELECT resultado::UUID INTO v_id_drp
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND THEN RETURN v_id_drp; END IF;

  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('coordinacion', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_DRP_001: Solo coordinación o gerencia pueden crear un DRP'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO drps (id_coordinacion)
  VALUES (v_id_nombre)
  RETURNING id_drp INTO v_id_drp;

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_crear_drp', v_id_nombre, v_id_drp::TEXT);

  RETURN v_id_drp;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_crear_drp(UUID) TO authenticated;


-- ============================================================
--  TAREA 11.1 — rpc_transicionar_drp
--
--  Avanza el estado de un DRP según la máquina de estados:
--    En_espera → En_preparacion → En_curso → Finalizado
--    En_curso  → Finalizado_Retenido (si hay descuadres pendientes)
--
--  El cliente indica la transición deseada ('preparar'|'iniciar'|
--  'finalizar'|'archivar'). La función valida que sea legal.
--  Solo coordinacion o gerencia pueden ejecutar esta RPC.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_transicionar_drp(
  p_id_drp    UUID,
  p_accion    TEXT   -- 'preparar' | 'iniciar' | 'finalizar' | 'archivar'
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_rol           rol_empleado;
  v_estado        estado_drp;
  v_nuevo_estado  estado_drp;
  v_descuadres    INT;
BEGIN
  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('coordinacion', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_DRP_001: Solo coordinación o gerencia pueden transicionar un DRP'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado
  FROM drps
  WHERE id_drp = p_id_drp
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DRP_002: DRP no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  -- Máquina de estados
  CASE p_accion
    WHEN 'preparar' THEN
      IF v_estado != 'En_espera' THEN
        RAISE EXCEPTION 'ERR_DRP_008: El DRP debe estar En_espera para preparar (actual: %)', v_estado
          USING ERRCODE = 'P0001';
      END IF;
      v_nuevo_estado := 'En_preparacion';

    WHEN 'iniciar' THEN
      IF v_estado != 'En_preparacion' THEN
        RAISE EXCEPTION 'ERR_DRP_009: El DRP debe estar En_preparacion para iniciar (actual: %)', v_estado
          USING ERRCODE = 'P0001';
      END IF;
      v_nuevo_estado := 'En_curso';

    WHEN 'finalizar' THEN
      IF v_estado NOT IN ('En_curso') THEN
        RAISE EXCEPTION 'ERR_DRP_010: El DRP debe estar En_curso para finalizar (actual: %)', v_estado
          USING ERRCODE = 'P0001';
      END IF;
      -- Verificar descuadres pendientes → Finalizado_Retenido
      SELECT COUNT(*) INTO v_descuadres
      FROM descuadres_inventario di
      JOIN dotaciones_drp d ON (di.location_origen = d.matricula OR di.location_destino = d.matricula)
      WHERE d.id_drp = p_id_drp
        AND di.estado = 'Pendiente_Revision';

      IF v_descuadres > 0 THEN
        v_nuevo_estado := 'Finalizado_Retenido';
      ELSE
        v_nuevo_estado := 'Finalizado';
      END IF;

    WHEN 'archivar' THEN
      IF v_estado NOT IN ('Finalizado', 'Cancelado') THEN
        RAISE EXCEPTION 'ERR_DRP_011: Solo se pueden archivar DRPs Finalizados o Cancelados (actual: %)', v_estado
          USING ERRCODE = 'P0001';
      END IF;
      v_nuevo_estado := 'Archivado';

    ELSE
      RAISE EXCEPTION 'ERR_DRP_012: Acción no válida: %', p_accion
        USING ERRCODE = 'P0001';
  END CASE;

  UPDATE drps
  SET estado                 = v_nuevo_estado,
      timestamp_preparacion  = CASE WHEN v_nuevo_estado = 'En_preparacion' THEN NOW() ELSE timestamp_preparacion END,
      timestamp_inicio       = CASE WHEN v_nuevo_estado = 'En_curso'       THEN NOW() ELSE timestamp_inicio END,
      timestamp_fin          = CASE WHEN v_nuevo_estado IN ('Finalizado','Finalizado_Retenido') THEN NOW() ELSE timestamp_fin END,
      timestamp_archivado    = CASE WHEN v_nuevo_estado = 'Archivado'      THEN NOW() ELSE timestamp_archivado END
  WHERE id_drp = p_id_drp;

  RETURN v_nuevo_estado::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_transicionar_drp(UUID, TEXT) TO authenticated;


-- ============================================================
--  TAREA 11.1 — rpc_agregar_dotacion_drp
--
--  Agrega un vehículo como dotación activa a un DRP.
--  El vehículo debe estar operativo y no estar ya en otro DRP
--  (uq_vehiculo_drp_activo lo garantiza a nivel de índice).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_agregar_dotacion_drp(
  p_mutation_uuid UUID,
  p_id_drp        UUID,
  p_matricula     TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_rol           rol_empleado;
  v_estado_drp    estado_drp;
  v_estado_veh    estado_operativo;
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

  IF v_rol NOT IN ('coordinacion', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_DRP_001: Rol insuficiente para modificar un DRP'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado_drp
  FROM drps
  WHERE id_drp = p_id_drp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DRP_002: DRP no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado_drp IN ('Finalizado','Finalizado_Retenido','Archivado','Cancelado') THEN
    RAISE EXCEPTION 'ERR_DRP_013: No se pueden agregar dotaciones a un DRP en estado %', v_estado_drp
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado_operativo INTO v_estado_veh
  FROM vehiculos
  WHERE matricula = p_matricula
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_VEH_001: Vehículo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado_veh NOT IN ('inactivo', 'activo') THEN
    RAISE EXCEPTION 'ERR_VEH_003: El vehículo no está disponible (estado: %)', v_estado_veh
      USING ERRCODE = 'P0001';
  END IF;

  -- uq_vehiculo_drp_activo garantiza unicidad por índice parcial
  INSERT INTO dotaciones_drp (id_drp, matricula)
  VALUES (p_id_drp, p_matricula);

  UPDATE vehiculos
  SET estado_operativo = 'en_drp'
  WHERE matricula = p_matricula;

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_agregar_dotacion_drp', v_id_nombre, p_matricula);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_agregar_dotacion_drp(UUID, UUID, TEXT) TO authenticated;


-- ============================================================
--  TAREA 11.1 — rpc_agregar_personal_pie_drp
--
--  Agrega un empleado como personal a pie en un DRP activo.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_agregar_personal_pie_drp(
  p_mutation_uuid UUID,
  p_id_drp        UUID,
  p_id_nombre     TEXT,
  p_zona          TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre_caller TEXT;
  v_rol              rol_empleado;
  v_estado_drp       estado_drp;
BEGIN
  -- Idempotencia
  IF EXISTS (SELECT 1 FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid) THEN
    RETURN;
  END IF;

  SELECT id_nombre, rol INTO v_id_nombre_caller, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('coordinacion', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_DRP_001: Rol insuficiente para modificar un DRP'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado_drp
  FROM drps WHERE id_drp = p_id_drp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DRP_002: DRP no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado_drp IN ('Finalizado','Finalizado_Retenido','Archivado','Cancelado') THEN
    RAISE EXCEPTION 'ERR_DRP_013: No se puede agregar personal a un DRP en estado %', v_estado_drp
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM fichas_empleados WHERE id_nombre = p_id_nombre AND activo = TRUE) THEN
    RAISE EXCEPTION 'ERR_EMP_001: Empleado no encontrado o inactivo'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO drp_personal_a_pie (id_drp, id_nombre, zona_asignada)
  VALUES (p_id_drp, p_id_nombre, p_zona);

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_agregar_personal_pie_drp', v_id_nombre_caller, p_id_nombre);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_agregar_personal_pie_drp(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
--  TAREA 11.2 — rpc_actualizar_gps
--
--  El cliente (pilot activo en el vehículo) publica su posición
--  GPS. Solo el pilot de la activación activa puede actualizar
--  el GPS de su vehículo.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_actualizar_gps(
  p_matricula TEXT,
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION
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

  -- Solo el pilot de la activación activa puede actualizar GPS
  IF NOT EXISTS (
    SELECT 1
    FROM activaciones_vehiculo
    WHERE matricula = p_matricula
      AND pilot = v_id_nombre
      AND timestamp_cierre IS NULL
  ) THEN
    RAISE EXCEPTION 'ERR_GPS_001: No autorizado para actualizar el GPS de este vehículo'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE vehiculos
  SET lat           = p_lat,
      lng           = p_lng,
      gps_timestamp = NOW()
  WHERE matricula = p_matricula;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_actualizar_gps(TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;


-- ============================================================
--  TAREA 11.3 — rpc_resolver_descuadre
--
--  Logistica o responsable_logistica resuelven un descuadre
--  de inventario pendiente. El trigger
--  trg_descuadre_libera_drp_retenido (migration 7) verifica
--  si esto libera un DRP en Finalizado_Retenido.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_resolver_descuadre(
  p_mutation_uuid     UUID,
  p_id_descuadre      UUID,
  p_resolucion        TEXT,  -- 'Resuelto' | 'Archivado'
  p_notas             TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT;
  v_rol       rol_empleado;
  v_estado    TEXT;
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

  IF v_rol NOT IN ('logistica', 'responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_INV_001: Solo logística o gerencia pueden resolver descuadres'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_resolucion NOT IN ('Resuelto', 'Archivado') THEN
    RAISE EXCEPTION 'ERR_INV_002: Resolución no válida: %. Use Resuelto o Archivado', p_resolucion
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado
  FROM descuadres_inventario
  WHERE id = p_id_descuadre
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INV_003: Descuadre no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado != 'Pendiente_Revision' THEN
    RAISE EXCEPTION 'ERR_INV_004: El descuadre no está pendiente de revisión (estado: %)', v_estado
      USING ERRCODE = 'P0001';
  END IF;

  -- El trigger trg_descuadre_libera_drp_retenido actúa automáticamente
  UPDATE descuadres_inventario
  SET estado = p_resolucion,
      notas  = COALESCE(p_notas, notas)
  WHERE id = p_id_descuadre;

  INSERT INTO idempotency_keys (mutation_uuid, rpc, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_resolver_descuadre', v_id_nombre, p_resolucion);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_resolver_descuadre(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
--  RLS — drps, dotaciones_drp, drp_personal_a_pie
--
--  Lectura: coordinacion, gerencia ven todo.
--           medico, due, piloto ven DRPs en curso (solo lectura).
--  Escritura: solo vía RPC (SECURITY DEFINER).
-- ============================================================

-- drps
CREATE POLICY drps_select_coordinacion ON drps
  FOR SELECT
  USING (
    (SELECT rol FROM fichas_empleados
      WHERE auth_user_id = auth.uid() AND activo = TRUE)
    IN ('coordinacion', 'gerencia', 'medico', 'due', 'logistica', 'responsable_logistica', 'rrhh')
  );

-- dotaciones_drp
CREATE POLICY dotaciones_drp_select ON dotaciones_drp
  FOR SELECT
  USING (
    (SELECT rol FROM fichas_empleados
      WHERE auth_user_id = auth.uid() AND activo = TRUE)
    IN ('coordinacion', 'gerencia', 'medico', 'due', 'logistica', 'responsable_logistica', 'rrhh')
  );

-- drp_personal_a_pie
CREATE POLICY drp_personal_select ON drp_personal_a_pie
  FOR SELECT
  USING (
    (SELECT rol FROM fichas_empleados
      WHERE auth_user_id = auth.uid() AND activo = TRUE)
    IN ('coordinacion', 'gerencia', 'logistica', 'responsable_logistica', 'rrhh')
  );
