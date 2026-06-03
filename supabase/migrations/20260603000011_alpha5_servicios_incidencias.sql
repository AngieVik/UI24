-- ============================================================
--  ALPHA.5 — servicios_planificados (extend) + tabla incidencias
--  Prerequisito: 000010_alpha5_permisos_fn (fn_tiene_permiso).
--  Idempotente (ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ── A5.1 — Extender servicios_planificados ──────────────────

ALTER TABLE servicios_planificados
  ADD COLUMN IF NOT EXISTS titulo              TEXT,
  ADD COLUMN IF NOT EXISTS nombre              TEXT,
  ADD COLUMN IF NOT EXISTS telefono            TEXT,
  ADD COLUMN IF NOT EXISTS direccion           TEXT,
  ADD COLUMN IF NOT EXISTS localidad           TEXT,
  ADD COLUMN IF NOT EXISTS coordenadas         TEXT,
  ADD COLUMN IF NOT EXISTS origen              TEXT,
  ADD COLUMN IF NOT EXISTS destino             TEXT,
  ADD COLUMN IF NOT EXISTS franjas_horarias    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS vehiculos_asignados JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS personal_asignado   JSONB NOT NULL DEFAULT '[]';

GRANT SELECT ON servicios_planificados TO authenticated;

-- Eliminar RPCs anteriores con firmas incompatibles
DROP FUNCTION IF EXISTS rpc_planificar_servicio(UUID, DATE, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS rpc_cancelar_servicio(UUID, UUID);
DROP FUNCTION IF EXISTS rpc_guardar_servicio_planificado(UUID, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

-- Nueva rpc_guardar_servicio_planificado (INSERT + UPDATE, usa fn_tiene_permiso)
CREATE OR REPLACE FUNCTION rpc_guardar_servicio_planificado(
  p_mutation_uuid        UUID,
  p_fecha                DATE,
  p_turno                TEXT,
  p_tipo_servicio        TEXT,
  p_id_servicio          UUID    DEFAULT NULL,
  p_titulo               TEXT    DEFAULT NULL,
  p_nombre               TEXT    DEFAULT NULL,
  p_telefono             TEXT    DEFAULT NULL,
  p_direccion            TEXT    DEFAULT NULL,
  p_localidad            TEXT    DEFAULT NULL,
  p_coordenadas          TEXT    DEFAULT NULL,
  p_origen               TEXT    DEFAULT NULL,
  p_destino              TEXT    DEFAULT NULL,
  p_franjas_horarias     JSONB   DEFAULT '[]',
  p_vehiculos_asignados  JSONB   DEFAULT '[]',
  p_personal_asignado    JSONB   DEFAULT '[]',
  p_notas                TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT fn_tiene_permiso('editar_servicios') THEN
    RAISE EXCEPTION 'ERR_SERVICIO_001: No tienes permiso para gestionar la planificación de servicios'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_id_servicio IS NOT NULL THEN
    -- Actualizar servicio existente
    UPDATE servicios_planificados SET
      fecha                = p_fecha,
      turno                = p_turno,
      tipo_servicio        = p_tipo_servicio,
      titulo               = p_titulo,
      nombre               = p_nombre,
      telefono             = p_telefono,
      direccion            = p_direccion,
      localidad            = p_localidad,
      coordenadas          = p_coordenadas,
      origen               = p_origen,
      destino              = p_destino,
      franjas_horarias     = COALESCE(p_franjas_horarias, '[]'),
      vehiculos_asignados  = COALESCE(p_vehiculos_asignados, '[]'),
      personal_asignado    = COALESCE(p_personal_asignado, '[]'),
      notas                = p_notas,
      updated_at           = NOW()
    WHERE id = p_id_servicio
    RETURNING id INTO v_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERR_SERVICIO_002: Servicio planificado no encontrado'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    -- Crear nuevo servicio
    INSERT INTO servicios_planificados (
      id, fecha, turno, id_nombre, tipo_servicio,
      titulo, nombre, telefono, direccion, localidad,
      coordenadas, origen, destino,
      franjas_horarias, vehiculos_asignados, personal_asignado,
      notas, mutation_uuid, estado
    ) VALUES (
      gen_random_uuid(),
      p_fecha, p_turno, auth_id_nombre_actual(), p_tipo_servicio,
      p_titulo, p_nombre, p_telefono, p_direccion, p_localidad,
      p_coordenadas, p_origen, p_destino,
      COALESCE(p_franjas_horarias, '[]'),
      COALESCE(p_vehiculos_asignados, '[]'),
      COALESCE(p_personal_asignado, '[]'),
      p_notas, p_mutation_uuid, 'Planificado'
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_guardar_servicio_planificado(UUID,DATE,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,JSONB,TEXT) TO authenticated;


-- rpc_eliminar_servicio_planificado (mantiene la firma existente, actualiza cuerpo)
CREATE OR REPLACE FUNCTION rpc_eliminar_servicio_planificado(
  p_id_servicio UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT fn_tiene_permiso('editar_servicios') THEN
    RAISE EXCEPTION 'ERR_SERVICIO_001: No tienes permiso para gestionar la planificación de servicios'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM servicios_planificados WHERE id = p_id_servicio;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_SERVICIO_002: Servicio planificado no encontrado'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_eliminar_servicio_planificado(UUID) TO authenticated;


-- ── A5.2 — Tabla incidencias ────────────────────────────────
-- Cola de trabajo de taller: se nutre de checklist fallidos, doc7,
-- doc11 y creación manual por flota/taller.

CREATE TABLE IF NOT EXISTS incidencias (
  id_incidencia         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula             TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE CASCADE,
  descripcion           TEXT,
  origen_tipo           TEXT        NOT NULL DEFAULT 'manual'
                                    CHECK (origen_tipo IN ('checklist','doc7','doc11','manual')),
  origen_id             UUID,
  prioridad             TEXT        NOT NULL DEFAULT 'normal'
                                    CHECK (prioridad IN ('baja','normal','alta','critica')),
  notas_taller          TEXT,
  anclada               BOOLEAN     NOT NULL DEFAULT FALSE,
  archivada             BOOLEAN     NOT NULL DEFAULT FALSE,
  id_nombre_registrador TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'incidencias' AND policyname = 'incidencias_select_flota'
  ) THEN
    CREATE POLICY "incidencias_select_flota" ON incidencias
      FOR SELECT TO authenticated USING (
        (auth.jwt() ->> 'rol') IN ('flota','responsable_flota','coordinacion','gerencia')
      );
  END IF;
END $$;

GRANT SELECT ON incidencias TO authenticated;


-- rpc_crear_incidencia
CREATE OR REPLACE FUNCTION rpc_crear_incidencia(
  p_matricula    TEXT,
  p_descripcion  TEXT DEFAULT NULL,
  p_origen_tipo  TEXT DEFAULT 'manual',
  p_origen_id    UUID DEFAULT NULL,
  p_prioridad    TEXT DEFAULT 'normal',
  p_notas_taller TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT fn_tiene_permiso('editar_incidencias') THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_001: Sin permiso para gestionar incidencias'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vehiculos WHERE matricula = p_matricula) THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_004: Vehículo no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO incidencias (
    matricula, descripcion, origen_tipo, origen_id,
    prioridad, notas_taller, id_nombre_registrador
  ) VALUES (
    p_matricula, p_descripcion,
    COALESCE(p_origen_tipo, 'manual'), p_origen_id,
    COALESCE(p_prioridad, 'normal'), p_notas_taller,
    auth_id_nombre_actual()
  )
  RETURNING id_incidencia INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_crear_incidencia(TEXT,TEXT,TEXT,UUID,TEXT,TEXT) TO authenticated;


-- rpc_editar_incidencia
CREATE OR REPLACE FUNCTION rpc_editar_incidencia(
  p_id_incidencia UUID,
  p_descripcion   TEXT DEFAULT NULL,
  p_prioridad     TEXT DEFAULT 'normal',
  p_notas_taller  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT fn_tiene_permiso('editar_incidencias') THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_001: Sin permiso para gestionar incidencias'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE incidencias
  SET descripcion  = p_descripcion,
      prioridad    = COALESCE(p_prioridad, 'normal'),
      notas_taller = p_notas_taller,
      updated_at   = NOW()
  WHERE id_incidencia = p_id_incidencia AND archivada = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_002: Incidencia no encontrada o archivada'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_editar_incidencia(UUID,TEXT,TEXT,TEXT) TO authenticated;


-- rpc_eliminar_incidencia (hard delete para duplicados)
CREATE OR REPLACE FUNCTION rpc_eliminar_incidencia(p_id_incidencia UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT fn_tiene_permiso('editar_incidencias') THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_001: Sin permiso para gestionar incidencias'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM incidencias WHERE id_incidencia = p_id_incidencia;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_002: Incidencia no encontrada'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_eliminar_incidencia(UUID) TO authenticated;


-- rpc_anclar_incidencia (toggle)
CREATE OR REPLACE FUNCTION rpc_anclar_incidencia(p_id_incidencia UUID, p_anclada BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT fn_tiene_permiso('anclar_incidencias') THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_001: Sin permiso para anclar incidencias'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE incidencias
  SET anclada = p_anclada, updated_at = NOW()
  WHERE id_incidencia = p_id_incidencia;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_002: Incidencia no encontrada'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_anclar_incidencia(UUID,BOOLEAN) TO authenticated;


-- rpc_actualizar_prioridad_incidencia
CREATE OR REPLACE FUNCTION rpc_actualizar_prioridad_incidencia(
  p_id_incidencia UUID,
  p_prioridad     TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT fn_tiene_permiso('editar_prioridad_incidencia') THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_001: Sin permiso para cambiar prioridad'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_prioridad NOT IN ('baja','normal','alta','critica') THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_003: Prioridad no válida. Usa: baja, normal, alta, critica'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE incidencias
  SET prioridad = p_prioridad, updated_at = NOW()
  WHERE id_incidencia = p_id_incidencia;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_INCIDENCIA_002: Incidencia no encontrada'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_actualizar_prioridad_incidencia(UUID,TEXT) TO authenticated;
