-- ============================================================
--  U24 — RPCs de vehículos e inventario
--  Sprint 3, Tareas 3.2 · 3.3
--  Fecha: 2026-05-21
--
--  ADR-012: idempotencia via ledger idempotency_keys en RPCs encolables
--  ADR-006: errores en inglés (ERRCODE='P0001'), UI en español
-- ============================================================

-- Extender el ENUM con el evento de alta de vehículo.
-- ADD VALUE IF NOT EXISTS es idempotente (db reset seguro).
ALTER TYPE tipo_evento_rbac ADD VALUE IF NOT EXISTS 'alta_vehiculo';

-- ============================================================
--  3.2.a — rpc_alta_vehiculo
--
--  Registra un vehículo nuevo en vehiculos Y en locations
--  (location_id = matricula, tipo = 'vehiculo').
--  Solo gerencia/responsable_flota pueden dar de alta vehículos.
--  No es encolable offline (ADR-003: requiere confirmación atómica).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_alta_vehiculo(
  p_matricula       TEXT,
  p_tipo            tipo_vehiculo,
  p_nombre_location TEXT DEFAULT NULL
)
RETURNS JSONB
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

  IF v_rol NOT IN ('gerencia', 'responsable_flota') THEN
    RAISE EXCEPTION 'ERR_VEHICULO_001: Rol insuficiente para dar de alta un vehículo'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM vehiculos WHERE matricula = p_matricula) THEN
    RAISE EXCEPTION 'ERR_VEHICULO_002: Ya existe un vehículo con esa matrícula'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO vehiculos (matricula, tipo, condicion_tecnica, estado_operativo)
  VALUES (p_matricula, p_tipo, 'operativo', 'inactivo');

  -- El location_id de un vehículo es su matrícula (comentario en schema)
  INSERT INTO locations (location_id, nombre, tipo)
  VALUES (
    p_matricula,
    COALESCE(p_nombre_location, p_matricula),
    'vehiculo'
  );

  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata)
  VALUES ('alta_vehiculo', v_id_nombre,
          jsonb_build_object('matricula', p_matricula, 'tipo', p_tipo));

  RETURN jsonb_build_object('matricula', p_matricula, 'tipo', p_tipo);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_alta_vehiculo(TEXT, tipo_vehiculo, TEXT)
  TO authenticated;


-- ============================================================
--  3.2.b — rpc_baja_vehiculo
--
--  Da de baja un vehículo. Guard: rechaza si hay un DRP activo
--  que incluya el vehículo (dotaciones_drp sin timestamp_salida).
--  Marca condicion_tecnica = 'dado_de_baja' y estado_operativo = 'inactivo'.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_baja_vehiculo(
  p_matricula TEXT,
  p_motivo    TEXT DEFAULT NULL
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

  IF v_rol NOT IN ('gerencia', 'responsable_flota') THEN
    RAISE EXCEPTION 'ERR_VEHICULO_001: Rol insuficiente para dar de baja un vehículo'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vehiculos WHERE matricula = p_matricula) THEN
    RAISE EXCEPTION 'ERR_VEHICULO_003: Vehículo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard: DRP activo que incluye este vehículo
  IF EXISTS (
    SELECT 1 FROM dotaciones_drp
    WHERE matricula = p_matricula
      AND timestamp_salida IS NULL
  ) THEN
    RAISE EXCEPTION 'ERR_VEHICULO_004: El vehículo está asignado a un DRP activo y no puede darse de baja'
      USING ERRCODE = 'P0001';
  END IF;

  -- Guard: activación abierta
  IF EXISTS (
    SELECT 1 FROM activaciones_vehiculo
    WHERE matricula = p_matricula
      AND timestamp_cierre IS NULL
  ) THEN
    RAISE EXCEPTION 'ERR_VEHICULO_005: El vehículo tiene una activación abierta'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE vehiculos
  SET condicion_tecnica = 'dado_de_baja',
      estado_operativo  = 'inactivo'
  WHERE matricula = p_matricula;

  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata)
  VALUES ('baja_vehiculo', v_id_nombre,
          jsonb_build_object('matricula', p_matricula, 'motivo', p_motivo));
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_baja_vehiculo(TEXT, TEXT)
  TO authenticated;


-- ============================================================
--  3.3.a — rpc_ajuste_manual_stock
--
--  Ajusta el stock de un ítem en un location (vehículo o base).
--  Solo logistica/gerencia/responsable_logistica.
--  Encolable offline → ADR-012 idempotencia.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_ajuste_manual_stock(
  p_mutation_uuid UUID,
  p_location_id   TEXT,
  p_id_item       INTEGER,
  p_cantidad_nueva INT,
  p_motivo        TEXT DEFAULT NULL,
  p_subgrupo      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre      TEXT;
  v_rol            rol_empleado;
  v_tipo_location  tipo_location;
  v_stock_anterior INT;
  v_delta          INT;
  v_resultado      JSONB;
BEGIN
  -- Idempotencia: comprobar si ya fue procesada
  SELECT resultado INTO v_resultado
  FROM idempotency_keys
  WHERE mutation_uuid = p_mutation_uuid;

  IF FOUND AND v_resultado IS NOT NULL THEN
    RETURN v_resultado;
  END IF;

  SELECT id_nombre, rol INTO v_id_nombre, v_rol
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_rol NOT IN ('logistica', 'gerencia', 'responsable_logistica') THEN
    RAISE EXCEPTION 'ERR_INVENTARIO_001: Rol insuficiente para ajuste manual de stock'
      USING ERRCODE = 'P0001';
  END IF;

  -- Registrar entrada "en progreso" en el ledger
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_ajuste_manual_stock', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Resolver tipo de location
  SELECT tipo INTO v_tipo_location
  FROM locations
  WHERE location_id = p_location_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVENTARIO_002: Location no encontrada: %', p_location_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_tipo_location = 'vehiculo' THEN
    IF p_subgrupo IS NULL THEN
      RAISE EXCEPTION 'ERR_INVENTARIO_003: Se requiere subgrupo para ajuste en vehículo'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT stock_real INTO v_stock_anterior
    FROM inventario_vehiculo
    WHERE matricula = p_location_id AND id_item = p_id_item AND subgrupo = p_subgrupo;

    IF NOT FOUND THEN
      -- Insertar fila si no existe (alta de ítem en vehículo)
      INSERT INTO inventario_vehiculo (matricula, id_item, subgrupo, stock_real)
      VALUES (p_location_id, p_id_item, p_subgrupo, p_cantidad_nueva);
      v_stock_anterior := 0;
    ELSE
      UPDATE inventario_vehiculo
      SET stock_real = p_cantidad_nueva, ultima_actualizacion = NOW()
      WHERE matricula = p_location_id AND id_item = p_id_item AND subgrupo = p_subgrupo;
    END IF;

  ELSE
    -- base / almacen / punto_drp
    SELECT stock_real INTO v_stock_anterior
    FROM inventario_base
    WHERE location_id = p_location_id AND id_item = p_id_item;

    IF NOT FOUND THEN
      INSERT INTO inventario_base (location_id, id_item, stock_real)
      VALUES (p_location_id, p_id_item, p_cantidad_nueva);
      v_stock_anterior := 0;
    ELSE
      UPDATE inventario_base
      SET stock_real = p_cantidad_nueva
      WHERE location_id = p_location_id AND id_item = p_id_item;
    END IF;
  END IF;

  v_delta := p_cantidad_nueva - v_stock_anterior;

  INSERT INTO auditoria_inventario (
    tipo_movimiento, id_item, cantidad_delta,
    location_origen, id_nombre_operador, rpc_ejecutada, motivo
  )
  VALUES (
    'ajuste', p_id_item, v_delta,
    p_location_id, v_id_nombre, 'rpc_ajuste_manual_stock', p_motivo
  );

  v_resultado := jsonb_build_object(
    'location_id',     p_location_id,
    'id_item',         p_id_item,
    'stock_anterior',  v_stock_anterior,
    'stock_nuevo',     p_cantidad_nueva,
    'delta',           v_delta
  );

  UPDATE idempotency_keys
  SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_ajuste_manual_stock(UUID, TEXT, INTEGER, INT, TEXT, TEXT)
  TO authenticated;


-- ============================================================
--  3.3.b — rpc_deducir_material
--
--  Deduce material del inventario de un vehículo. Cualquier
--  empleado autenticado puede deducir (lo registra la activación).
--  Encolable offline → ADR-012 idempotencia.
--  Crea doc6_deducciones y registra en auditoria_inventario.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_deducir_material(
  p_mutation_uuid UUID,
  p_matricula     TEXT,
  p_id_item       INTEGER,
  p_cantidad      INT,
  p_subgrupo      TEXT,
  p_id_activacion UUID DEFAULT NULL,
  p_motivo        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_stock_actual  INT;
  v_id_deduccion  UUID;
  v_resultado     JSONB;
BEGIN
  -- Idempotencia: comprobar si ya fue procesada
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

  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'ERR_INVENTARIO_004: La cantidad a deducir debe ser mayor que cero'
      USING ERRCODE = 'P0001';
  END IF;

  -- Registrar entrada "en progreso"
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_deducir_material', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- Verificar stock suficiente (la constraint CHECK stock_real >= 0 actúa de red de seguridad)
  SELECT stock_real INTO v_stock_actual
  FROM inventario_vehiculo
  WHERE matricula = p_matricula AND id_item = p_id_item AND subgrupo = p_subgrupo
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INVENTARIO_005: Ítem % no encontrado en vehículo %', p_id_item, p_matricula
      USING ERRCODE = 'P0001';
  END IF;

  IF v_stock_actual < p_cantidad THEN
    RAISE EXCEPTION 'ERR_INVENTARIO_006: Stock insuficiente. Disponible: %, solicitado: %',
      v_stock_actual, p_cantidad
      USING ERRCODE = 'P0001';
  END IF;

  -- Reducir stock
  UPDATE inventario_vehiculo
  SET stock_real = stock_real - p_cantidad,
      ultima_actualizacion = NOW()
  WHERE matricula = p_matricula AND id_item = p_id_item AND subgrupo = p_subgrupo;

  -- Crear doc6
  INSERT INTO doc6_deducciones (matricula, id_item, cantidad, id_activacion, id_nombre_operador)
  VALUES (p_matricula, p_id_item, p_cantidad, p_id_activacion, v_id_nombre)
  RETURNING id_deduccion INTO v_id_deduccion;

  -- Auditoría
  INSERT INTO auditoria_inventario (
    tipo_movimiento, id_item, cantidad_delta,
    location_origen, id_nombre_operador, rpc_ejecutada, motivo
  )
  VALUES (
    'deduccion', p_id_item, -p_cantidad,
    p_matricula, v_id_nombre, 'rpc_deducir_material', p_motivo
  );

  v_resultado := jsonb_build_object(
    'id_deduccion',  v_id_deduccion,
    'matricula',     p_matricula,
    'id_item',       p_id_item,
    'cantidad',      p_cantidad,
    'stock_restante', v_stock_actual - p_cantidad
  );

  UPDATE idempotency_keys
  SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_deducir_material(UUID, TEXT, INTEGER, INT, TEXT, UUID, TEXT)
  TO authenticated;
