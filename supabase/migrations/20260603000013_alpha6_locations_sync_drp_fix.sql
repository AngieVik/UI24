-- ============================================================
--  ALPHA.6 — Locations sync + fix rpc_crear_drp
--  1. Borrar locations demo obsoletas
--  2. Sincronizar vehiculos → locations (upsert)
--  3. Insertar Almacén Central real
--  4. Corregir rpc_crear_drp (resultado cast + rpc_name + to_jsonb)
-- ============================================================

-- ── 1. Borrar demo locations ─────────────────────────────────
DELETE FROM locations
WHERE location_id IN (
  '00000000-0000-0000-0000-000000000001',
  '1111-DEMO',
  '1112-DEMO',
  '2222-DEMO',
  '3333-DEMO',
  '4444-DEMO'
);

-- ── 2. Upsert vehiculos → locations ──────────────────────────
INSERT INTO locations (location_id, nombre, tipo)
SELECT
  matricula                                   AS location_id,
  COALESCE(nombre_display, matricula)         AS nombre,
  'vehiculo'::tipo_location                   AS tipo
FROM vehiculos
ON CONFLICT (location_id)
  DO UPDATE SET nombre = EXCLUDED.nombre;

-- ── 3. Almacén Central real ───────────────────────────────────
INSERT INTO locations (location_id, nombre, tipo)
VALUES ('almacen_central', 'Almacén Central', 'almacen')
ON CONFLICT (location_id) DO NOTHING;

-- ── 4. Fix rpc_crear_drp ──────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_crear_drp(
  p_mutation_uuid UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id_nombre  TEXT;
  v_rol        rol_empleado;
  v_id_drp     UUID;
BEGIN
  -- Idempotencia: resultado es JSONB → extraer texto sin comillas → cast a UUID
  SELECT (resultado #>> '{}')::UUID INTO v_id_drp
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

  -- Guardar en idempotency_keys con columna correcta (rpc_name) y valor JSONB
  INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre, resultado)
  VALUES (p_mutation_uuid, 'rpc_crear_drp', v_id_nombre, to_jsonb(v_id_drp::TEXT));

  RETURN v_id_drp;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_crear_drp(UUID) TO authenticated;
