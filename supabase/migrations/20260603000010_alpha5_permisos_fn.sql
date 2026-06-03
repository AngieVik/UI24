-- ============================================================
--  ALPHA.5 — Tabla permisos_rol + fn_tiene_permiso() helper
--  Prerrequisito para todas las RPCs de Alpha.5.
--  Idempotente (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ── Tabla permisos_rol ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS permisos_rol (
  id        SERIAL       PRIMARY KEY,
  rol       rol_empleado NOT NULL,
  accion    TEXT         NOT NULL,
  permitido BOOLEAN      NOT NULL DEFAULT TRUE,
  UNIQUE (rol, accion)
);

ALTER TABLE permisos_rol ENABLE ROW LEVEL SECURITY;

-- El acceso directo está bloqueado; los datos se exponen vía RPCs SECURITY DEFINER
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'permisos_rol' AND policyname = 'permisos_rol_deny_direct'
  ) THEN
    CREATE POLICY "permisos_rol_deny_direct" ON permisos_rol
      FOR SELECT TO authenticated USING (FALSE);
  END IF;
END $$;


-- ── Función helper fn_tiene_permiso() ───────────────────────
-- Usada internamente por todas las RPCs de A5.
-- gerencia siempre retorna TRUE (inmutable por diseño).

CREATE OR REPLACE FUNCTION fn_tiene_permiso(p_accion TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol       TEXT;
  v_permitido BOOLEAN;
BEGIN
  SELECT rol::TEXT INTO v_rol
  FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol IS NULL THEN RETURN FALSE; END IF;
  IF v_rol = 'gerencia' THEN RETURN TRUE; END IF;

  SELECT permitido INTO v_permitido
  FROM permisos_rol
  WHERE rol::TEXT = v_rol AND accion = p_accion;

  RETURN COALESCE(v_permitido, FALSE);
END;
$$;


-- ── RPCs de gestión de permisos ─────────────────────────────

-- rpc_verificar_permiso: el frontend lo llama para mostrar/ocultar elementos UI
CREATE OR REPLACE FUNCTION rpc_verificar_permiso(p_accion TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN fn_tiene_permiso(p_accion);
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_verificar_permiso(TEXT) TO authenticated;


-- rpc_obtener_permisos_rol: devuelve la matriz completa (gerencia y coordinacion)
CREATE OR REPLACE FUNCTION rpc_obtener_permisos_rol()
RETURNS TABLE(rol TEXT, accion TEXT, permitido BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol_actual TEXT;
BEGIN
  SELECT fichas_empleados.rol::TEXT INTO v_rol_actual
  FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol_actual NOT IN ('gerencia', 'coordinacion') THEN
    RAISE EXCEPTION 'ERR_PERMISO_001: Sin permiso para consultar la matriz de permisos'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT pr.rol::TEXT, pr.accion, pr.permitido
  FROM permisos_rol pr
  ORDER BY pr.accion, pr.rol;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_obtener_permisos_rol() TO authenticated;


-- rpc_actualizar_permiso_rol: toggle individual (solo gerencia)
CREATE OR REPLACE FUNCTION rpc_actualizar_permiso_rol(
  p_rol       TEXT,
  p_accion    TEXT,
  p_permitido BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rol_actual TEXT;
BEGIN
  SELECT fichas_empleados.rol::TEXT INTO v_rol_actual
  FROM fichas_empleados
  WHERE id_nombre = auth_id_nombre_actual() AND activo = TRUE;

  IF v_rol_actual != 'gerencia' THEN
    RAISE EXCEPTION 'ERR_PERMISO_002: Solo gerencia puede modificar permisos'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_rol = 'gerencia' THEN
    RAISE EXCEPTION 'ERR_PERMISO_003: No se pueden modificar los permisos de gerencia'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE permisos_rol
  SET permitido = p_permitido
  WHERE rol::TEXT = p_rol AND accion = p_accion;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_PERMISO_004: Permiso no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_actualizar_permiso_rol(TEXT, TEXT, BOOLEAN) TO authenticated;


-- ── Seed matrix de permisos por defecto ─────────────────────

INSERT INTO permisos_rol (rol, accion, permitido)
SELECT
  r.rol::rol_empleado,
  a.accion,
  CASE a.accion
    WHEN 'ver_incidencias'             THEN r.rol IN ('flota','responsable_flota','coordinacion','gerencia')
    WHEN 'editar_incidencias'          THEN r.rol IN ('flota','responsable_flota','gerencia')
    WHEN 'anclar_incidencias'          THEN r.rol IN ('flota','responsable_flota','gerencia')
    WHEN 'editar_prioridad_incidencia' THEN r.rol IN ('flota','responsable_flota','gerencia')
    WHEN 'ver_logistica'               THEN r.rol IN ('logistica','responsable_logistica','coordinacion','gerencia')
    WHEN 'editar_logistica'            THEN r.rol IN ('logistica','responsable_logistica','gerencia')
    WHEN 'ver_servicios'               THEN r.rol IN ('tes','due','medico','flota','responsable_flota','coordinacion','rrhh','gerencia')
    WHEN 'editar_servicios'            THEN r.rol IN ('coordinacion','rrhh','gerencia')
    WHEN 'ver_cuadrantes'              THEN r.rol IN ('tes','due','medico','flota','responsable_flota','coordinacion','logistica','responsable_logistica','rrhh','gerencia')
    WHEN 'editar_cuadrantes'           THEN r.rol IN ('coordinacion','rrhh','gerencia')
    WHEN 'ver_fichas'                  THEN r.rol IN ('rrhh','gerencia')
    WHEN 'gestionar_empleados'         THEN r.rol IN ('rrhh','gerencia')
    WHEN 'ver_tablon'                  THEN TRUE
    WHEN 'gestionar_tablon'            THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'gestionar_marquesina'        THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'ver_drp'                     THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'gestionar_drp'               THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'forzar_checkout'             THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'ver_system_config'           THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'editar_system_config'        THEN r.rol IN ('gerencia')
    WHEN 'gestionar_vehiculos'         THEN r.rol IN ('flota','responsable_flota','gerencia')
    WHEN 'ver_rbac'                    THEN r.rol IN ('coordinacion','gerencia')
    WHEN 'editar_roles'                THEN r.rol IN ('gerencia')
    WHEN 'editar_permisos'             THEN r.rol IN ('gerencia')
    WHEN 'ver_repositorio'             THEN TRUE
    ELSE FALSE
  END AS permitido
FROM
  (VALUES
    ('tes'),('due'),('medico'),('flota'),('responsable_flota'),
    ('coordinacion'),('logistica'),('responsable_logistica'),
    ('personal_externo'),('gerencia'),('rrhh'),('invitado')
  ) AS r(rol)
  CROSS JOIN
  (VALUES
    ('ver_incidencias'),('editar_incidencias'),('anclar_incidencias'),('editar_prioridad_incidencia'),
    ('ver_logistica'),('editar_logistica'),
    ('ver_servicios'),('editar_servicios'),
    ('ver_cuadrantes'),('editar_cuadrantes'),
    ('ver_fichas'),('gestionar_empleados'),
    ('ver_tablon'),('gestionar_tablon'),('gestionar_marquesina'),
    ('ver_drp'),('gestionar_drp'),('forzar_checkout'),
    ('ver_system_config'),('editar_system_config'),
    ('gestionar_vehiculos'),
    ('ver_rbac'),('editar_roles'),('editar_permisos'),
    ('ver_repositorio')
  ) AS a(accion)
ON CONFLICT (rol, accion) DO UPDATE SET permitido = EXCLUDED.permitido;
