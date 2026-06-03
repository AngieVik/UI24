-- ============================================================
--  ALPHA.1 — D-15 y D-16: columnas faltantes + RPCs CRUD
--
--  Las tablas servicios_planificados y repositorio_documentos ya
--  existen en producción (migraciones d15/d16 del 20260527).
--  Aquí se añaden las columnas que faltaban y los RPCs CRUD.
-- ============================================================

-- ── D-15: servicios_planificados — columnas faltantes ────────
ALTER TABLE servicios_planificados
  ADD COLUMN IF NOT EXISTS notas TEXT;

ALTER TABLE servicios_planificados
  ADD COLUMN IF NOT EXISTS mutation_uuid UUID UNIQUE;

ALTER TABLE servicios_planificados
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_servicios_planificados_fecha
  ON servicios_planificados (fecha);

CREATE OR REPLACE FUNCTION rpc_guardar_servicio_planificado(
  p_mutation_uuid UUID,
  p_fecha         DATE,
  p_turno         TEXT,
  p_id_nombre     TEXT,
  p_tipo_servicio TEXT,
  p_matricula     TEXT    DEFAULT NULL,
  p_notas         TEXT    DEFAULT NULL,
  p_id_servicio   UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor TEXT := auth_id_nombre_actual();
  v_rol      rol_empleado;
  v_id       UUID;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  IF v_rol NOT IN ('rrhh', 'gerencia', 'responsable_flota', 'responsable_logistica', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_SERVICIO_001: Sin permiso para planificar servicios'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_id FROM servicios_planificados WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND THEN RETURN v_id; END IF;

  IF p_id_servicio IS NOT NULL THEN
    UPDATE servicios_planificados
    SET fecha = p_fecha, turno = p_turno, id_nombre = p_id_nombre,
        tipo_servicio = p_tipo_servicio, matricula = p_matricula,
        notas = p_notas, updated_at = NOW()
    WHERE id = p_id_servicio
    RETURNING id INTO v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_SERVICIO_002: Servicio no encontrado'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    INSERT INTO servicios_planificados
      (id, fecha, turno, id_nombre, tipo_servicio, matricula, notas, mutation_uuid)
    VALUES
      (gen_random_uuid(), p_fecha, p_turno, p_id_nombre, p_tipo_servicio,
       p_matricula, p_notas, p_mutation_uuid)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_guardar_servicio_planificado(UUID, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION rpc_eliminar_servicio_planificado(
  p_id_servicio UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('rrhh', 'gerencia', 'responsable_flota', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_SERVICIO_001: Sin permiso para eliminar servicios'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM servicios_planificados WHERE id = p_id_servicio;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_SERVICIO_002: Servicio no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_eliminar_servicio_planificado(UUID) TO authenticated;


-- ── D-16: repositorio_documentos — columnas faltantes ────────
-- Schema producción: id, nombre, categoria, descripcion, url, version, fecha_alta, activo
ALTER TABLE repositorio_documentos
  ADD COLUMN IF NOT EXISTS mutation_uuid UUID UNIQUE;

ALTER TABLE repositorio_documentos
  ADD COLUMN IF NOT EXISTS id_nombre_autor TEXT
  REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_repositorio_categoria
  ON repositorio_documentos (categoria);

CREATE OR REPLACE FUNCTION rpc_guardar_documento_repositorio(
  p_mutation_uuid UUID,
  p_nombre        TEXT,
  p_categoria     TEXT,
  p_descripcion   TEXT    DEFAULT NULL,
  p_url           TEXT    DEFAULT NULL,
  p_version       TEXT    DEFAULT NULL,
  p_id_documento  UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor TEXT := auth_id_nombre_actual();
  v_rol      rol_empleado;
  v_id       UUID;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  IF v_rol NOT IN ('rrhh', 'gerencia', 'coordinacion', 'responsable_flota', 'responsable_logistica') THEN
    RAISE EXCEPTION 'ERR_REPO_001: Sin permiso para gestionar el repositorio'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_id FROM repositorio_documentos WHERE mutation_uuid = p_mutation_uuid;
  IF FOUND THEN RETURN v_id; END IF;

  IF p_id_documento IS NOT NULL THEN
    UPDATE repositorio_documentos
    SET nombre = p_nombre, categoria = p_categoria,
        descripcion = p_descripcion, url = p_url, version = p_version
    WHERE id = p_id_documento
    RETURNING id INTO v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_REPO_002: Documento no encontrado'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    INSERT INTO repositorio_documentos
      (id, nombre, categoria, descripcion, url, version, id_nombre_autor, mutation_uuid)
    VALUES
      (gen_random_uuid(), p_nombre, p_categoria, p_descripcion,
       p_url, p_version, v_ejecutor, p_mutation_uuid)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_guardar_documento_repositorio(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION rpc_archivar_documento_repositorio(
  p_id_documento UUID,
  p_archivar     BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol NOT IN ('rrhh', 'gerencia', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_REPO_001: Sin permiso para archivar documentos'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE repositorio_documentos
  SET activo = NOT p_archivar
  WHERE id = p_id_documento;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_REPO_002: Documento no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_archivar_documento_repositorio(UUID, BOOLEAN) TO authenticated;
