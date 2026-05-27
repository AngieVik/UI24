-- ============================================================
--  U24 — Checklist360 V2: trigger actualizado + RPC herencia
--  D.1.5 — Checklist360Screen
--  Fecha: 2026-05-27
--
--  Cambios:
--  1. Trigger trg_fn_checklist_genera_doc7 actualizado para
--     entender el nuevo formato JSONB (estado: OK|OBSERVACION|
--     INOPERATIVO|NO_APLICA) además del formato antiguo (ok: bool).
--
--  2. Nueva función rpc_obtener_checklist_anterior(p_matricula)
--     SECURITY DEFINER para la lógica de herencia de incidencias.
--     Devuelve items_revisados del último checklist cerrado del
--     vehículo. Devuelve '{}' si no hay historial (fail-safe).
--
--  3. GRANTs service_role (D-12 hardening pattern).
-- ============================================================

-- ============================================================
--  1. Trigger actualizado — trg_fn_checklist_genera_doc7
--
--  Formato nuevo:
--    "<item_id>": {
--      "estado":               "OK"|"OBSERVACION"|"INOPERATIVO"|"NO_APLICA",
--      "campos_extra":         {},
--      "es_incidencia_heredada": false
--    }
--  Mapa: INOPERATIVO → criticidad 'Grave'; OBSERVACION → 'Leve'
--
--  Formato antiguo (retrocompatibilidad):
--    "<sistema>": { "ok": bool, "criticidad": "...", ... }
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_checklist_genera_doc7()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sistema    TEXT;
  v_item       JSONB;
  v_criticidad nivel_criticidad;
  v_descripcion TEXT;
  v_es_nuevo_formato BOOLEAN;
BEGIN
  -- Solo actuar cuando cerrado pasa FALSE → TRUE
  IF OLD.cerrado = TRUE OR NEW.cerrado = FALSE THEN
    RETURN NEW;
  END IF;

  -- Registrar timestamp de cierre
  NEW.timestamp_cierre := NOW();

  -- Iterar sobre todos los ítems revisados
  FOR v_sistema, v_item IN
    SELECT key, value FROM jsonb_each(NEW.items_revisados)
  LOOP
    -- Detectar formato (nuevo: tiene clave 'estado'; antiguo: tiene clave 'ok')
    v_es_nuevo_formato := v_item ? 'estado';

    IF v_es_nuevo_formato THEN
      -- Formato nuevo: solo procesar OBSERVACION e INOPERATIVO
      CONTINUE WHEN v_item->>'estado' NOT IN ('OBSERVACION', 'INOPERATIVO');

      v_criticidad := CASE v_item->>'estado'
        WHEN 'INOPERATIVO' THEN 'Grave'::nivel_criticidad
        ELSE                    'Leve'::nivel_criticidad  -- OBSERVACION
      END;

      -- Descripción: primer valor de campos_extra o texto genérico
      v_descripcion := COALESCE(
        (SELECT string_agg(val::text, ', ')
         FROM jsonb_each_text(v_item->'campos_extra') AS t(key, val)
         LIMIT 3),
        v_item->>'estado'
      );

    ELSE
      -- Formato antiguo: omitir ítems con ok=true
      CONTINUE WHEN (v_item->>'ok')::BOOLEAN = TRUE;
      CONTINUE WHEN v_item->>'criticidad' IS NULL;

      v_criticidad  := (v_item->>'criticidad')::nivel_criticidad;
      v_descripcion := v_item->>'descripcion';
    END IF;

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
      COALESCE(v_item->>'sistema_afectado', v_sistema),
      v_descripcion,
      NOW(),
      NEW.id_nombre_redactor
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- El trigger ya existe (Sprint 9), DROP + CREATE para actualizarlo
DROP TRIGGER IF EXISTS trg_checklist_genera_doc7 ON doc_checklist360;
CREATE TRIGGER trg_checklist_genera_doc7
  BEFORE UPDATE ON doc_checklist360
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_checklist_genera_doc7();


-- ============================================================
--  2. rpc_obtener_checklist_anterior
--
--  SECURITY DEFINER: accede al último checklist cerrado del
--  vehículo independientemente del redactor (para herencia).
--  Devuelve items_revisados como JSONB o '{}' si no hay historial.
--  Nunca falla — fail-safe per doc spec (doc. § "no-obstrucción").
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_obtener_checklist_anterior(
  p_matricula TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSONB;
BEGIN
  SELECT items_revisados
  INTO   v_items
  FROM   doc_checklist360
  WHERE  matricula = p_matricula
    AND  cerrado   = TRUE
  ORDER  BY timestamp_cierre DESC NULLS LAST
  LIMIT  1;

  RETURN COALESCE(v_items, '{}'::JSONB);
EXCEPTION WHEN OTHERS THEN
  -- Fail-safe: si falla por cualquier motivo, devolver vacío
  RETURN '{}'::JSONB;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_obtener_checklist_anterior(TEXT)
  TO authenticated;


-- ============================================================
--  3. GRANTs service_role (D-12 hardening pattern)
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON doc_checklist360 TO service_role;
