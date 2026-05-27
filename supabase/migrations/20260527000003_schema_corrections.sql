-- ============================================================
--  U24 — Correcciones de esquema (estado, condicion, tipo, RPC)
--  Fecha: 2026-05-27
--
--  1. Backport de 20260527000001 con guardas IF NOT EXISTS.
--  2. Corrige enums: estado_operativo, condicion_tecnica,
--     tipo_vehiculo, tipo_servicio.
--  3. Nuevo enum + columna: subestado_operativo.
--  4. Migra datos existentes.
--  5. Crea rpc_actualizar_vehiculo (la RPC que faltaba).
--  6. Actualiza rpc_checkin_vehiculo para nuevos valores.
--  7. Actualiza trigger trg_fn_doc7_evaluar_condicion.
-- ============================================================

-- ============================================================
--  PARTE 1 — Backport de 20260527000001 con guardas
-- ============================================================

ALTER TABLE doc8_partes_trabajo
  ADD COLUMN IF NOT EXISTS notas TEXT;

COMMENT ON COLUMN doc8_partes_trabajo.notas IS
  'Anotaciones libres del turno (incidencias, anomalías, observaciones). '
  'Editable mientras estado = Abierto_En_Turno.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'doc8_partes_trabajo'
      AND policyname = 'doc8: authenticated puede SELECT'
  ) THEN
    EXECUTE $inner$
      CREATE POLICY "doc8: authenticated puede SELECT"
        ON doc8_partes_trabajo FOR SELECT
        TO authenticated
        USING (TRUE)
    $inner$;
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON doc8_partes_trabajo TO service_role;

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
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado FROM doc8_partes_trabajo WHERE id_parte = p_id_parte;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_DOC8_001: Parte de trabajo no encontrado' USING ERRCODE = 'P0001';
  END IF;
  IF v_estado != 'Abierto_En_Turno' THEN
    RAISE EXCEPTION 'ERR_DOC8_002: El parte ya está cerrado y no admite anotaciones' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_anotar_parte', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  UPDATE doc8_partes_trabajo SET notas = p_notas WHERE id_parte = p_id_parte;

  v_resultado := jsonb_build_object('id_parte', p_id_parte, 'notas', p_notas);
  UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_anotar_parte(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
--  PARTE 2 — Correcciones de enums (ADD VALUE IF NOT EXISTS)
-- ============================================================

-- 2.1  estado_operativo: añadir activado / desactivado
--  Los valores viejos (inactivo, activo) se mantienen en el enum
--  para no romper RPCs antiguas; se migran los datos en Parte 3.
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'activado';
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'desactivado';

-- 2.2  condicion_tecnica: añadir critico (unifica averiado_grave +
--  en_taller + dado_de_baja en un único estado de máxima gravedad)
ALTER TYPE condicion_tecnica ADD VALUE IF NOT EXISTS 'critico';

-- 2.3  tipo_vehiculo: añadir Unidad Movil y Logistica (reemplaza BKP)
ALTER TYPE tipo_vehiculo ADD VALUE IF NOT EXISTS 'Unidad Movil';
ALTER TYPE tipo_vehiculo ADD VALUE IF NOT EXISTS 'Logistica';

-- 2.4  tipo_servicio: añadir los valores reales que usa el frontend
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'dispositivo';
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'guardia_urgencias';
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'drp';
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'privado';
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'simulacro';
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'formacion';
ALTER TYPE tipo_servicio ADD VALUE IF NOT EXISTS 'sin_asignar';

-- ============================================================
--  PARTE 3 — Migraciones de datos
-- ============================================================

-- estado_operativo: inactivo → desactivado / activo → activado
-- (en_drp se deja intacto — módulo DRP lo usa)
UPDATE vehiculos
SET estado_operativo = 'desactivado'
WHERE estado_operativo = 'inactivo';

UPDATE vehiculos
SET estado_operativo = 'activado'
WHERE estado_operativo = 'activo';

-- condicion_tecnica: todo lo grave/taller/baja → critico
UPDATE vehiculos
SET condicion_tecnica = 'critico'
WHERE condicion_tecnica IN ('averiado_grave', 'en_taller', 'dado_de_baja');

-- tipo: BKP → Logistica
UPDATE vehiculos
SET tipo = 'Logistica'
WHERE tipo = 'BKP';

-- Ajustar DEFAULT de tipo_servicio en activaciones_vehiculo
--  (El viejo DEFAULT puede ser 'urgente' u otro; lo ponemos a 'sin_asignar')
ALTER TABLE activaciones_vehiculo
  ALTER COLUMN tipo_servicio SET DEFAULT 'sin_asignar';

-- ============================================================
--  PARTE 4 — Nuevo enum subestado_operativo + columna vehiculos
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subestado_operativo') THEN
    CREATE TYPE subestado_operativo AS ENUM (
      'en_espera',
      'ruta',
      'estacionado',
      'alerta'
    );
  END IF;
END;
$$;

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS subestado_operativo subestado_operativo DEFAULT NULL;

COMMENT ON COLUMN vehiculos.subestado_operativo IS
  'Subestado operativo cuando el vehículo está activado. '
  'NULL cuando desactivado o en_drp.';

-- Inicializar en_espera para vehículos que ya estén activados
UPDATE vehiculos
SET subestado_operativo = 'en_espera'
WHERE estado_operativo = 'activado' AND subestado_operativo IS NULL;

-- ============================================================
--  PARTE 5 — rpc_actualizar_vehiculo
--
--  RPC unificada para VehiculosScreen. Gestiona tres transiciones:
--    'activado'               → abre activacion + Doc-8 + checklist
--    'desactivado'            → cierra activacion + Doc-8
--    'en_espera'|'ruta'|...   → cambia subestado_operativo
--
--  Idempotente via ledger idempotency_keys (ADR-012).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_actualizar_vehiculo(
  p_mutation_uuid  UUID,
  p_matricula      TEXT,
  p_estado_destino TEXT,
  p_tipo_servicio  TEXT    DEFAULT NULL,
  p_pilot          TEXT    DEFAULT NULL,
  p_carry          TEXT    DEFAULT NULL,
  p_km_inicio      INTEGER DEFAULT NULL,
  p_km_fin         INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_nombre     TEXT;
  v_estado_op     TEXT;
  v_condicion     condicion_tecnica;
  v_id_activacion UUID;
  v_id_parte      UUID;
  v_id_checklist  UUID;
  v_resultado     JSONB;
BEGIN
  -- ── Idempotencia ────────────────────────────────────────────
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN
    RETURN v_resultado;
  END IF;

  -- ── Identificar sesión ──────────────────────────────────────
  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Leer estado actual del vehículo ─────────────────────────
  SELECT estado_operativo::TEXT, condicion_tecnica
  INTO v_estado_op, v_condicion
  FROM vehiculos WHERE matricula = p_matricula;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_VEHICULO_003: Vehículo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── Registrar en ledger ─────────────────────────────────────
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_actualizar_vehiculo', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- ════════════════════════════════════════════════════════════
  IF p_estado_destino = 'activado' THEN
  -- ── ACTIVAR ─────────────────────────────────────────────────
    IF v_estado_op NOT IN ('desactivado', 'inactivo') THEN
      RAISE EXCEPTION 'ERR_VEHICULO_006: El vehículo no está disponible (estado: %)', v_estado_op
        USING ERRCODE = 'P0001';
    END IF;
    IF v_condicion = 'critico' THEN
      RAISE EXCEPTION 'ERR_VEHICULO_007: Condición técnica impide activación (critico)'
        USING ERRCODE = 'P0001';
    END IF;
    IF p_pilot IS NULL THEN
      RAISE EXCEPTION 'ERR_PILOT_001: pilot requerido para activar'
        USING ERRCODE = 'P0001';
    END IF;
    IF p_km_inicio IS NULL OR p_km_inicio < 0 THEN
      RAISE EXCEPTION 'ERR_KM_002: km_inicio requerido y no puede ser negativo'
        USING ERRCODE = 'P0001';
    END IF;

    -- Crear activación
    INSERT INTO activaciones_vehiculo (matricula, pilot, carry, km_inicio, tipo_servicio)
    VALUES (
      p_matricula,
      p_pilot,
      p_carry,
      p_km_inicio,
      COALESCE(p_tipo_servicio::tipo_servicio, 'sin_asignar'::tipo_servicio)
    )
    RETURNING id_activacion INTO v_id_activacion;

    -- Abrir Doc-8
    INSERT INTO doc8_partes_trabajo (id_activacion, km_inicio, estado)
    VALUES (v_id_activacion, p_km_inicio, 'Abierto_En_Turno')
    RETURNING id_parte INTO v_id_parte;

    -- Crear Checklist360 inicial
    INSERT INTO doc_checklist360 (matricula, id_activacion, id_nombre_redactor)
    VALUES (p_matricula, v_id_activacion, v_id_nombre)
    RETURNING id_checklist INTO v_id_checklist;

    -- Marcar vehículo activado con subestado inicial
    UPDATE vehiculos
    SET estado_operativo    = 'activado',
        subestado_operativo = 'en_espera'
    WHERE matricula = p_matricula;

    v_resultado := jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'activado',
      'id_activacion',    v_id_activacion,
      'id_parte',         v_id_parte,
      'id_checklist',     v_id_checklist
    );

  -- ════════════════════════════════════════════════════════════
  ELSIF p_estado_destino = 'desactivado' THEN
  -- ── DESACTIVAR ──────────────────────────────────────────────
    IF v_estado_op NOT IN ('activado', 'activo', 'en_drp') THEN
      RAISE EXCEPTION 'ERR_VEHICULO_008: El vehículo no está activado (estado: %)', v_estado_op
        USING ERRCODE = 'P0001';
    END IF;

    -- Localizar activación abierta
    SELECT id_activacion INTO v_id_activacion
    FROM activaciones_vehiculo
    WHERE matricula = p_matricula AND timestamp_cierre IS NULL
    ORDER BY timestamp_apertura DESC
    LIMIT 1;

    IF v_id_activacion IS NOT NULL THEN
      -- Localizar parte abierto
      SELECT id_parte INTO v_id_parte
      FROM doc8_partes_trabajo
      WHERE id_activacion = v_id_activacion
        AND estado = 'Abierto_En_Turno'
      LIMIT 1;

      -- Cerrar parte
      IF v_id_parte IS NOT NULL THEN
        UPDATE doc8_partes_trabajo
        SET estado  = 'Enviado_Cerrado',
            km_fin  = p_km_fin
        WHERE id_parte = v_id_parte;
      END IF;

      -- Cerrar activación
      UPDATE activaciones_vehiculo
      SET km_fin           = p_km_fin,
          timestamp_cierre = NOW()
      WHERE id_activacion = v_id_activacion;
    END IF;

    -- Desactivar vehículo
    UPDATE vehiculos
    SET estado_operativo    = 'desactivado',
        subestado_operativo = NULL
    WHERE matricula = p_matricula;

    v_resultado := jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'desactivado'
    );

  -- ════════════════════════════════════════════════════════════
  ELSE
  -- ── CAMBIO DE SUBESTADO ─────────────────────────────────────
    IF v_estado_op NOT IN ('activado', 'activo') THEN
      RAISE EXCEPTION 'ERR_VEHICULO_009: El vehículo no está activado para cambiar subestado'
        USING ERRCODE = 'P0001';
    END IF;
    IF p_estado_destino NOT IN ('en_espera', 'ruta', 'estacionado', 'alerta') THEN
      RAISE EXCEPTION 'ERR_VEHICULO_010: Subestado no válido: %', p_estado_destino
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE vehiculos
    SET subestado_operativo = p_estado_destino::subestado_operativo
    WHERE matricula = p_matricula;

    v_resultado := jsonb_build_object(
      'matricula',        p_matricula,
      'estado_operativo', 'activado',
      'subestado',        p_estado_destino
    );
  END IF;
  -- ════════════════════════════════════════════════════════════

  UPDATE idempotency_keys SET resultado = v_resultado
  WHERE mutation_uuid = p_mutation_uuid;

  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_actualizar_vehiculo(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO authenticated;

-- ============================================================
--  PARTE 6 — Actualizar rpc_checkin_vehiculo
--  (usa 'inactivo'/'activo' → actualizar a 'desactivado'/'activado')
--  Se mantiene para compatibilidad con VehiclePickerScreen (Sprint 9).
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
  SELECT resultado INTO v_resultado
  FROM idempotency_keys WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND AND v_resultado IS NOT NULL THEN RETURN v_resultado; END IF;

  SELECT id_nombre INTO v_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid() AND activo = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_AUTH_001: Sesión no reconocida' USING ERRCODE = 'P0001';
  END IF;

  SELECT estado_operativo, condicion_tecnica
  INTO v_estado_op, v_condicion
  FROM vehiculos WHERE matricula = p_matricula;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_VEHICULO_003: Vehículo no encontrado' USING ERRCODE = 'P0001';
  END IF;

  -- Aceptar tanto el valor viejo como el nuevo (migración progresiva)
  IF v_estado_op NOT IN ('desactivado', 'inactivo') THEN
    RAISE EXCEPTION 'ERR_VEHICULO_006: El vehículo no está disponible (estado: %)', v_estado_op
      USING ERRCODE = 'P0001';
  END IF;

  IF v_condicion = 'critico' THEN
    RAISE EXCEPTION 'ERR_VEHICULO_007: Condición técnica impide activación: %', v_condicion
      USING ERRCODE = 'P0001';
  END IF;

  IF p_km_inicio < 0 THEN
    RAISE EXCEPTION 'ERR_KM_002: km_inicio no puede ser negativo' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
  VALUES (p_mutation_uuid, 'rpc_checkin_vehiculo', v_id_nombre)
  ON CONFLICT (mutation_uuid) DO NOTHING;

  INSERT INTO activaciones_vehiculo (matricula, pilot, carry, km_inicio)
  VALUES (p_matricula, v_id_nombre, p_carry, p_km_inicio)
  RETURNING id_activacion INTO v_id_activacion;

  INSERT INTO doc8_partes_trabajo (id_activacion, km_inicio, estado)
  VALUES (v_id_activacion, p_km_inicio, 'Abierto_En_Turno')
  RETURNING id_parte INTO v_id_parte;

  INSERT INTO doc_checklist360 (matricula, id_activacion, id_nombre_redactor)
  VALUES (p_matricula, v_id_activacion, v_id_nombre)
  RETURNING id_checklist INTO v_id_checklist;

  -- Usar el nuevo valor 'activado'
  UPDATE vehiculos
  SET estado_operativo    = 'activado',
      subestado_operativo = 'en_espera'
  WHERE matricula = p_matricula;

  v_resultado := jsonb_build_object(
    'id_activacion', v_id_activacion,
    'id_parte',      v_id_parte,
    'id_checklist',  v_id_checklist,
    'matricula',     p_matricula
  );

  UPDATE idempotency_keys SET resultado = v_resultado WHERE mutation_uuid = p_mutation_uuid;
  RETURN v_resultado;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_checkin_vehiculo(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- ============================================================
--  PARTE 7 — Actualizar trigger trg_fn_doc7_evaluar_condicion
--  'averiado_grave' → 'critico' en la lógica de evaluación.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_doc7_evaluar_condicion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_condicion_actual    condicion_tecnica;
  v_tiene_grave         BOOLEAN;
  v_tiene_moderada_leve BOOLEAN;
  v_condicion_nueva     condicion_tecnica;
BEGIN
  SELECT condicion_tecnica INTO v_condicion_actual
  FROM vehiculos WHERE matricula = NEW.matricula;

  -- No degradar un vehículo que ya está en estado crítico
  IF v_condicion_actual = 'critico' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM doc7_averias
    WHERE matricula = NEW.matricula AND nivel_criticidad = 'Grave'
  ) INTO v_tiene_grave;

  IF v_tiene_grave THEN
    v_condicion_nueva := 'critico';
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM doc7_averias
      WHERE matricula = NEW.matricula
        AND nivel_criticidad IN ('Moderada', 'Leve')
    ) INTO v_tiene_moderada_leve;

    v_condicion_nueva := CASE
      WHEN v_tiene_moderada_leve THEN 'averiado_leve'
      ELSE 'operativo'
    END;
  END IF;

  IF v_condicion_nueva IS DISTINCT FROM v_condicion_actual THEN
    UPDATE vehiculos
    SET condicion_tecnica = v_condicion_nueva
    WHERE matricula = NEW.matricula;
  END IF;

  RETURN NEW;
END;
$$;

-- El trigger ya existe (creado en 20260521000005) — solo reemplazamos la función.

-- ============================================================
--  PARTE 8 — Actualizar trigger trg_fn_checklist_genera_doc7
--  Sincronizar con la nueva versión de D.1.5
--  (si 20260527000002 aún no se aplicó, esta versión la incluye)
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_checklist_genera_doc7()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id    TEXT;
  v_item_data  JSONB;
  v_estado_val TEXT;
  v_criticidad nivel_criticidad;
BEGIN
  -- Solo actuar cuando cerrado pasa FALSE → TRUE
  IF OLD.cerrado = TRUE OR NEW.cerrado = FALSE THEN
    RETURN NEW;
  END IF;

  NEW.timestamp_cierre := NOW();

  FOR v_item_id, v_item_data IN
    SELECT key, value FROM jsonb_each(NEW.items_revisados)
  LOOP
    -- Soporte doble formato: {estado: "OK"|"OBSERVACION"|...} (nuevo)
    -- o {ok: false} (formato antiguo — retrocompat)
    v_estado_val := COALESCE(
      v_item_data->>'estado',
      CASE WHEN (v_item_data->>'ok')::BOOLEAN = FALSE THEN 'INOPERATIVO' ELSE 'OK' END
    );

    IF v_estado_val IN ('OBSERVACION', 'INOPERATIVO') THEN
      -- Mapear estado a nivel_criticidad
      v_criticidad := CASE v_estado_val
        WHEN 'OBSERVACION' THEN 'Leve'::nivel_criticidad
        WHEN 'INOPERATIVO' THEN 'Grave'::nivel_criticidad
        ELSE 'Leve'::nivel_criticidad
      END;

      INSERT INTO doc7_averias (
        matricula,
        nivel_criticidad,
        sistema_afectado,
        descripcion_detallada,
        timestamp_incidencia,
        id_nombre_redactor
      )
      VALUES (
        NEW.matricula,
        v_criticidad,
        v_item_id,
        COALESCE(
          v_item_data->'campos_extra'->>'descripcion',
          v_item_data->>'descripcion',
          v_item_id
        ),
        NOW(),
        NEW.id_nombre_redactor
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
