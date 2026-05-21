-- ============================================================
--  U24 — Checklist360 + Triggers de integridad
--  Sprint 3, Tareas 3.4 · 3.5
--  Fecha: 2026-05-21
-- ============================================================

-- ============================================================
--  TAREA 3.4 — Tabla doc_checklist360
--
--  Revisión de 360° del vehículo al inicio del turno.
--  Cuando cerrado pasa FALSE→TRUE, el trigger genera doc7_averias
--  para cada ítem marcado con ok=false.
--
--  Estructura de items_revisados (JSONB):
--  {
--    "<sistema>": {
--      "ok": bool,
--      "descripcion": "texto libre",
--      "criticidad": "Leve" | "Moderada" | "Grave",   -- solo si ok=false
--      "sistema_afectado": "texto libre"               -- solo si ok=false
--    }
--  }
-- ============================================================

CREATE TABLE IF NOT EXISTS doc_checklist360 (
  id_checklist          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula             TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  id_activacion         UUID        NOT NULL REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  id_nombre_redactor    TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  timestamp_inicio      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_cierre      TIMESTAMPTZ,
  items_revisados       JSONB       NOT NULL DEFAULT '{}',
  cerrado               BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE doc_checklist360 IS
  'Revisión 360° del vehículo al inicio del turno. '
  'Al cerrar (cerrado TRUE), genera doc7_averias para ítems con ok=false.';

COMMENT ON COLUMN doc_checklist360.items_revisados IS
  'Mapa de sistemas revisados. Clave=sistema, valor={ok, descripcion, criticidad?, sistema_afectado?}';

CREATE INDEX IF NOT EXISTS idx_checklist360_matricula
  ON doc_checklist360 (matricula);

CREATE INDEX IF NOT EXISTS idx_checklist360_activacion
  ON doc_checklist360 (id_activacion);

ALTER TABLE doc_checklist360 ENABLE ROW LEVEL SECURITY;

-- Redactor ve sus propios checklists; roles de supervisión ven todos
CREATE POLICY "doc_checklist360 select"
  ON doc_checklist360 FOR SELECT
  TO authenticated
  USING (
    id_nombre_redactor = auth_id_nombre_actual()
    OR auth_rol_actual() IN ('responsable_flota', 'gerencia', 'coordinacion')
  );


-- ============================================================
--  TAREA 3.4 — Trigger: trg_checklist_genera_doc7
--
--  AFTER UPDATE en doc_checklist360.
--  Cuando cerrado pasa de FALSE a TRUE:
--    - Para cada sistema con ok=false en items_revisados:
--      - Inserta doc7_averias con nivel_criticidad y sistema_afectado
--    - Actualiza timestamp_cierre
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
BEGIN
  -- Solo actuar cuando cerrado pasa FALSE → TRUE
  IF OLD.cerrado = TRUE OR NEW.cerrado = FALSE THEN
    RETURN NEW;
  END IF;

  -- Registrar timestamp de cierre
  NEW.timestamp_cierre := NOW();

  -- Iterar sobre los sistemas revisados con ok=false
  FOR v_sistema, v_item IN
    SELECT key, value
    FROM jsonb_each(NEW.items_revisados)
    WHERE (value->>'ok')::BOOLEAN = FALSE
  LOOP
    -- Validar que criticidad está presente (requerida cuando ok=false)
    IF v_item->>'criticidad' IS NULL THEN
      RAISE EXCEPTION 'ERR_CHECKLIST_001: Sistema % marcado como fallido sin criticidad', v_sistema
        USING ERRCODE = 'P0001';
    END IF;

    -- Convertir string a enum (falla explícitamente si valor inválido)
    v_criticidad := (v_item->>'criticidad')::nivel_criticidad;

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
      v_item->>'descripcion',
      NOW(),
      NEW.id_nombre_redactor
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_checklist_genera_doc7
  BEFORE UPDATE ON doc_checklist360
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_checklist_genera_doc7();


-- ============================================================
--  TAREA 3.4 — Trigger: trg_doc7_cierre_evaluar_condicion
--
--  AFTER INSERT en doc7_averias.
--  Re-evalúa condicion_tecnica del vehículo según la peor avería:
--    - Grave → averiado_grave
--    - Moderada o Leve (sin Grave) → averiado_leve
--  No degrada si el vehículo ya está en 'dado_de_baja'.
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
  -- No tocar vehículos dados de baja
  SELECT condicion_tecnica INTO v_condicion_actual
  FROM vehiculos WHERE matricula = NEW.matricula;

  IF v_condicion_actual = 'dado_de_baja' THEN
    RETURN NEW;
  END IF;

  -- Comprobar averías graves activas
  SELECT EXISTS (
    SELECT 1 FROM doc7_averias
    WHERE matricula = NEW.matricula AND nivel_criticidad = 'Grave'
  ) INTO v_tiene_grave;

  IF v_tiene_grave THEN
    v_condicion_nueva := 'averiado_grave';
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

  -- Solo actualizar si hay cambio real (evita escrituras innecesarias)
  IF v_condicion_nueva != v_condicion_actual THEN
    UPDATE vehiculos
    SET condicion_tecnica = v_condicion_nueva
    WHERE matricula = NEW.matricula;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_doc7_cierre_evaluar_condicion
  AFTER INSERT ON doc7_averias
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_doc7_evaluar_condicion();


-- ============================================================
--  TAREA 3.5 — Triggers de integridad
-- ============================================================

-- ── 3.5.a — trg_validar_km
--
--  Valida que km_fin >= km_inicio siempre que ambos estén presentes,
--  tanto en activaciones_vehiculo como en doc8_partes_trabajo.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_validar_km()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.km_inicio IS NOT NULL AND NEW.km_fin IS NOT NULL
    AND NEW.km_fin < NEW.km_inicio THEN
    RAISE EXCEPTION 'ERR_KM_001: km_fin (%) no puede ser menor que km_inicio (%)',
      NEW.km_fin, NEW.km_inicio
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_km_activacion
  BEFORE INSERT OR UPDATE ON activaciones_vehiculo
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_validar_km();

CREATE TRIGGER trg_validar_km_parte
  BEFORE INSERT OR UPDATE ON doc8_partes_trabajo
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_validar_km();


-- ── 3.5.b — trg_audit_cambio_rol
--
--  Registra en auditoria_rbac cuando cambia fichas_empleados.rol.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_audit_cambio_rol()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.rol IS DISTINCT FROM NEW.rol THEN
    INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata)
    VALUES (
      'cambio_rol',
      NEW.id_nombre,
      jsonb_build_object('rol_anterior', OLD.rol, 'rol_nuevo', NEW.rol)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_cambio_rol
  AFTER UPDATE ON fichas_empleados
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_audit_cambio_rol();


-- ── 3.5.c — trg_audit_galleta_emitida / revocada
--
--  INSERT → galleta_emitida
--  UPDATE (revocado_at NULL→NOT NULL) → galleta_revocada
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_audit_galleta()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata)
    VALUES (
      'galleta_emitida',
      NEW.id_nombre,
      NEW.id_terminal,
      jsonb_build_object('tipo', NEW.tipo, 'id_galleta', NEW.id_galleta)
    );

  ELSIF TG_OP = 'UPDATE'
    AND OLD.revocado_at IS NULL
    AND NEW.revocado_at IS NOT NULL THEN

    INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata)
    VALUES (
      'galleta_revocada',
      NEW.id_nombre,
      NEW.id_terminal,
      jsonb_build_object('tipo', NEW.tipo, 'id_galleta', NEW.id_galleta)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_galleta_emitida
  AFTER INSERT ON galletas_terminales
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_audit_galleta();

CREATE TRIGGER trg_audit_galleta_revocada
  AFTER UPDATE ON galletas_terminales
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_audit_galleta();


-- ── 3.5.d — trg_purgar_plantillas_al_archivar
--
--  Cuando catalogo_items.archivado pasa FALSE→TRUE,
--  elimina las líneas de plantilla que referencian ese ítem.
--  Evita que ítems archivados contaminen plantillas activas.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_purgar_plantillas_al_archivar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.archivado = FALSE AND NEW.archivado = TRUE THEN
    DELETE FROM plantilla_lineas WHERE id_item = NEW.id_item;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purgar_plantillas_al_archivar
  AFTER UPDATE ON catalogo_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_purgar_plantillas_al_archivar();
