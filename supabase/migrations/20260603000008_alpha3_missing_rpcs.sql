-- ============================================================
--  ALPHA.3 — RPCs faltantes para pantallas operativas
--
--  5 RPCs que los screens referencian pero que no existían
--  en producción. Sin ellos las pantallas fallaban en runtime.
--
--  1. psa_sesiones.matricula → nullable (PSA puede ser estática)
--  2. rpc_abrir_sesion_psa
--  3. rpc_cerrar_sesion_psa
--  4. rpc_publicar_anuncio
--  5. rpc_archivar_anuncio
--  6. rpc_forzar_checkout
-- ============================================================

-- ── 1. psa_sesiones: matricula opcional ──────────────────────
-- El módulo PSA puede operar sin vehículo asignado (punto estático).
ALTER TABLE psa_sesiones ALTER COLUMN matricula DROP NOT NULL;

-- ── 2. rpc_abrir_sesion_psa ──────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_abrir_sesion_psa(
  p_mutation_uuid UUID,
  p_id_drp        UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor TEXT := auth_id_nombre_actual();
  v_rol      rol_empleado;
  v_id_sesion UUID;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  IF v_rol NOT IN ('gerencia', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_PSA_001: Sin permiso para abrir sesión PSA'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO psa_sesiones (id_sesion, estado, id_nombre_responsable, timestamp_apertura)
  VALUES (gen_random_uuid(), 'Abierta', v_ejecutor, NOW())
  RETURNING id_sesion INTO v_id_sesion;

  RETURN jsonb_build_object('id_sesion', v_id_sesion);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_abrir_sesion_psa(UUID, UUID) TO authenticated;

-- ── 3. rpc_cerrar_sesion_psa ─────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_cerrar_sesion_psa(
  p_mutation_uuid UUID,
  p_id_sesion     UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor TEXT := auth_id_nombre_actual();
  v_rol      rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  -- Gerencia/coordinación pueden cerrar cualquier sesión.
  -- El responsable puede cerrar su propia sesión.
  IF v_rol NOT IN ('gerencia', 'coordinacion') THEN
    IF NOT EXISTS (
      SELECT 1 FROM psa_sesiones
      WHERE id_sesion = p_id_sesion
        AND id_nombre_responsable = v_ejecutor
    ) THEN
      RAISE EXCEPTION 'ERR_PSA_002: Sin permiso para cerrar esta sesión PSA'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE psa_sesiones
  SET estado = 'Cerrada', timestamp_cierre = NOW()
  WHERE id_sesion = p_id_sesion AND estado = 'Abierta';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_PSA_003: Sesión PSA no encontrada o ya cerrada'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cerrar_sesion_psa(UUID, UUID) TO authenticated;

-- ── 4. rpc_publicar_anuncio ──────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_publicar_anuncio(
  p_mutation_uuid UUID,
  p_seccion       TEXT,
  p_titulo        TEXT,
  p_contenido     TEXT
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

  IF v_rol NOT IN ('gerencia', 'coordinacion', 'rrhh') THEN
    RAISE EXCEPTION 'ERR_TABLON_001: Sin permiso para publicar anuncios'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_titulo IS NULL OR trim(p_titulo) = '' THEN
    RAISE EXCEPTION 'ERR_TABLON_002: El título no puede estar vacío'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO tablon_anuncios (
    id_anuncio, seccion, titulo, contenido, estado, id_nombre_autor
  ) VALUES (
    gen_random_uuid(),
    p_seccion::seccion_tablon,
    trim(p_titulo),
    trim(p_contenido),
    'activo'::estado_tablon,
    v_ejecutor
  )
  RETURNING id_anuncio INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_publicar_anuncio(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ── 5. rpc_archivar_anuncio ──────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_archivar_anuncio(
  p_mutation_uuid UUID,
  p_id_anuncio    UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor TEXT := auth_id_nombre_actual();
  v_rol      rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  IF v_rol NOT IN ('gerencia', 'coordinacion', 'rrhh') THEN
    RAISE EXCEPTION 'ERR_TABLON_001: Sin permiso para archivar anuncios'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE tablon_anuncios
  SET estado = 'archivado'::estado_tablon,
      timestamp_ultima_edicion = NOW()
  WHERE id_anuncio = p_id_anuncio;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_TABLON_003: Anuncio no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_archivar_anuncio(UUID, UUID) TO authenticated;

-- ── 6. rpc_forzar_checkout ───────────────────────────────────
-- Cierra el turno del trabajador objetivo y elimina su presencia.
-- Solo gerencia/coordinación. La llamada a rpc_cerrar_turno_por_nombre
-- es noop si el trabajador no tiene turno abierto (idempotente).
CREATE OR REPLACE FUNCTION rpc_forzar_checkout(
  p_mutation_uuid    UUID,
  p_id_nombre_target TEXT,
  p_id_terminal      TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ejecutor TEXT := auth_id_nombre_actual();
  v_rol      rol_empleado;
BEGIN
  SELECT rol INTO v_rol FROM fichas_empleados
  WHERE id_nombre = v_ejecutor AND activo = TRUE;

  IF v_rol NOT IN ('gerencia', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_FORZAR_001: Sin permiso para forzar checkout'
      USING ERRCODE = 'P0001';
  END IF;

  -- Cerrar turno (noop si no hay turno abierto).
  -- Usamos un UUID fresco para no colisionar con el mutation_uuid del forzar.
  PERFORM rpc_cerrar_turno_por_nombre(
    gen_random_uuid(),
    p_id_nombre_target,
    NULL,
    'Checkout forzado por ' || v_ejecutor
  );

  -- Eliminar presencia activa del terminal.
  DELETE FROM presencias_activas_terminal
  WHERE id_nombre = p_id_nombre_target
    AND id_terminal = p_id_terminal;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_forzar_checkout(UUID, TEXT, TEXT) TO authenticated;
