-- ============================================================
--  ALPHA.4 — RPCs de logística: catálogo, subinventarios,
--             plantillas de stock y confirmación de envíos.
--  Idempotente (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ── Tabla subinventarios (crea si no existe) ────────────────
CREATE TABLE IF NOT EXISTS subinventarios (
  id_subinventario UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT        NOT NULL,
  tipo_plantilla   TEXT        NOT NULL DEFAULT 'box',
  location_id      TEXT        REFERENCES locations(location_id) ON DELETE SET NULL,
  activo           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Añadir columnas si la tabla ya existía con schema diferente
ALTER TABLE subinventarios ADD COLUMN IF NOT EXISTS nombre         TEXT;
ALTER TABLE subinventarios ADD COLUMN IF NOT EXISTS tipo_plantilla TEXT;
ALTER TABLE subinventarios ADD COLUMN IF NOT EXISTS location_id   TEXT;
ALTER TABLE subinventarios ADD COLUMN IF NOT EXISTS activo        BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE subinventarios ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE subinventarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subinventarios' AND policyname = 'subinventarios_auth_select'
  ) THEN
    CREATE POLICY "subinventarios_auth_select" ON subinventarios
      FOR SELECT TO authenticated USING (TRUE);
  END IF;
END $$;

GRANT SELECT ON subinventarios TO authenticated;


-- ── A4.2 — RPCs subinventarios ──────────────────────────────

CREATE OR REPLACE FUNCTION rpc_crear_subinventario(
  p_nombre         TEXT,
  p_tipo_plantilla TEXT,
  p_location_id    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
  v_id  UUID;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('logistica', 'responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_SUBINV_001: Sin permiso para gestionar inventarios dinámicos'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_tipo_plantilla NOT IN ('box', 'sub_drp', 'event_backpack') THEN
    RAISE EXCEPTION 'ERR_SUBINV_003: Tipo de subinventario no válido'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO subinventarios (nombre, tipo_plantilla, location_id)
  VALUES (p_nombre, p_tipo_plantilla, p_location_id)
  RETURNING id_subinventario INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_crear_subinventario(TEXT, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION rpc_editar_subinventario(
  p_id_subinventario UUID,
  p_nombre           TEXT,
  p_tipo_plantilla   TEXT,
  p_location_id      TEXT    DEFAULT NULL,
  p_activo           BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('logistica', 'responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_SUBINV_001: Sin permiso para gestionar inventarios dinámicos'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE subinventarios
  SET nombre         = p_nombre,
      tipo_plantilla = p_tipo_plantilla,
      location_id    = p_location_id,
      activo         = p_activo
  WHERE id_subinventario = p_id_subinventario;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_SUBINV_002: Subinventario no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_editar_subinventario(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;


CREATE OR REPLACE FUNCTION rpc_desactivar_subinventario(
  p_id_subinventario UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('logistica', 'responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_SUBINV_001: Sin permiso para gestionar inventarios dinámicos'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE subinventarios
  SET activo = FALSE
  WHERE id_subinventario = p_id_subinventario;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_SUBINV_002: Subinventario no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_desactivar_subinventario(UUID) TO authenticated;


-- ── A4.3 — RPCs catálogo de ítems ───────────────────────────

CREATE OR REPLACE FUNCTION rpc_crear_catalogo_item(
  p_nombre         TEXT,
  p_categoria      TEXT,
  p_especificacion TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
  v_id  INT;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_CATALOGO_001: Sin permiso para gestionar el catálogo'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO catalogo_items (nombre, categoria, especificacion, archivado)
  VALUES (trim(p_nombre), trim(p_categoria), nullif(trim(coalesce(p_especificacion,'')), ''), FALSE)
  RETURNING id_item INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_crear_catalogo_item(TEXT, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION rpc_editar_catalogo_item(
  p_id_item        INT,
  p_nombre         TEXT,
  p_categoria      TEXT,
  p_especificacion TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_CATALOGO_001: Sin permiso para gestionar el catálogo'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE catalogo_items
  SET nombre         = trim(p_nombre),
      categoria      = trim(p_categoria),
      especificacion = nullif(trim(coalesce(p_especificacion,'')), '')
  WHERE id_item = p_id_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CATALOGO_002: Ítem no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_editar_catalogo_item(INT, TEXT, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION rpc_archivar_catalogo_item(
  p_id_item  INT,
  p_archivar BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_CATALOGO_001: Sin permiso para gestionar el catálogo'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE catalogo_items
  SET archivado = p_archivar
  WHERE id_item = p_id_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_CATALOGO_002: Ítem no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_archivar_catalogo_item(INT, BOOLEAN) TO authenticated;


-- ── A4.5 — umbral_alerta en plantilla_lineas ────────────────

ALTER TABLE plantilla_lineas
  ADD COLUMN IF NOT EXISTS umbral_alerta INT;

COMMENT ON COLUMN plantilla_lineas.umbral_alerta IS
  'Umbral de alerta de stock. NULL = stock_objetivo / 2 en runtime.';

GRANT SELECT ON plantilla_lineas TO authenticated;


CREATE OR REPLACE FUNCTION rpc_actualizar_plantilla_linea(
  p_plantilla_id   TEXT,
  p_subgrupo       TEXT,
  p_id_item        INT,
  p_stock_objetivo INT,
  p_umbral_alerta  INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('responsable_logistica', 'gerencia') THEN
    RAISE EXCEPTION 'ERR_PLANTILLA_001: Sin permiso para editar plantillas'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_stock_objetivo < 0 THEN
    RAISE EXCEPTION 'ERR_PLANTILLA_003: El stock objetivo debe ser mayor o igual a cero'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE plantilla_lineas
  SET stock_objetivo = p_stock_objetivo,
      umbral_alerta  = p_umbral_alerta
  WHERE plantilla_id = p_plantilla_id
    AND subgrupo     = p_subgrupo
    AND id_item      = p_id_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_PLANTILLA_002: Línea de plantilla no encontrada'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_actualizar_plantilla_linea(TEXT, TEXT, INT, INT, INT) TO authenticated;


-- ── A4.7 — Confirmar recepción de envío ─────────────────────

CREATE OR REPLACE FUNCTION rpc_confirmar_envio(
  p_id_envio UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol    rol_empleado;
  v_estado TEXT;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('logistica', 'responsable_logistica', 'gerencia', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_ENVIO_001: Sin permiso para confirmar envíos'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT estado INTO v_estado
  FROM envios_material WHERE id_envio = p_id_envio;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ENVIO_002: Envío no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_estado NOT IN ('En_Transito', 'Entregado') THEN
    RAISE EXCEPTION 'ERR_ENVIO_003: El envío no puede confirmarse en su estado actual'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE envios_material
  SET estado            = 'Recibido',
      timestamp_llegada = NOW()
  WHERE id_envio = p_id_envio;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_confirmar_envio(UUID) TO authenticated;
