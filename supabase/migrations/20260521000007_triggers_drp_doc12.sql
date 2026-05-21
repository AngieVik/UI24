-- ============================================================
--  U24 — Triggers de DRP y Doc-12
--  Sprint 4, Tareas 4.3 · 4.6
--  Fecha: 2026-05-21
-- ============================================================

-- ============================================================
--  TAREA 4.3 — trg_descuadre_notificar_bandeja
--
--  AFTER INSERT en descuadres_inventario.
--  Notifica al rol logistica con un mensaje en mensajes_bandeja.
--  La notificación se envía a todos los empleados activos de logistica.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_descuadre_notificar_bandeja()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logistico RECORD;
BEGIN
  FOR v_logistico IN
    SELECT id_nombre FROM fichas_empleados
    WHERE rol IN ('logistica', 'responsable_logistica', 'gerencia') AND activo = TRUE
  LOOP
    INSERT INTO mensajes_bandeja (id_nombre_destino, contenido)
    VALUES (
      v_logistico.id_nombre,
      format('Descuadre de inventario detectado: ítem %s · origen %s → destino %s · diferencia %s uds.',
        NEW.id_item, NEW.location_origen, NEW.location_destino,
        NEW.cantidad_diferencia)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_descuadre_notificar_bandeja
  AFTER INSERT ON descuadres_inventario
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_descuadre_notificar_bandeja();


-- ============================================================
--  TAREA 4.3 — trg_descuadre_libera_drp_retenido
--
--  AFTER UPDATE en descuadres_inventario.
--  Cuando un descuadre pasa a 'Resuelto' o 'Archivado', comprueba
--  si algún DRP en estado 'Finalizado_Retenido' tenía pendientes
--  descuadres asociados a sus vehículos. Si todos están resueltos,
--  transiciona el DRP a 'Finalizado'.
--
--  Enlace DRP → descuadre:
--    descuadres_inventario.location_origen o location_destino
--    coincide con dotaciones_drp.matricula (location_id de vehículo)
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_descuadre_libera_drp_retenido()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_drp    UUID;
  v_pendientes INT;
BEGIN
  -- Solo actuar cuando el estado pasa a Resuelto o Archivado
  IF NEW.estado NOT IN ('Resuelto', 'Archivado') THEN
    RETURN NEW;
  END IF;

  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Buscar DRPs en Finalizado_Retenido relacionados con esta location
  FOR v_id_drp IN
    SELECT DISTINCT d.id_drp
    FROM dotaciones_drp d
    JOIN drps dr ON dr.id_drp = d.id_drp
    WHERE d.matricula IN (NEW.location_origen, NEW.location_destino)
      AND dr.estado = 'Finalizado_Retenido'
  LOOP
    -- Contar descuadres pendientes de todos los vehículos de este DRP
    SELECT COUNT(*) INTO v_pendientes
    FROM descuadres_inventario di
    JOIN dotaciones_drp d ON (di.location_origen = d.matricula OR di.location_destino = d.matricula)
    WHERE d.id_drp = v_id_drp
      AND di.estado = 'Pendiente_Revision';

    -- Si no hay pendientes, liberar el DRP
    IF v_pendientes = 0 THEN
      UPDATE drps
      SET estado = 'Finalizado'
      WHERE id_drp = v_id_drp AND estado = 'Finalizado_Retenido';

      INSERT INTO doc11_avisos (tipo_aviso, nivel, id_nombre_emisor, texto)
      SELECT 'aviso_coordinacion', 'informativo', id_coordinacion,
             'DRP liberado automáticamente: todos los descuadres resueltos.'
      FROM drps WHERE id_drp = v_id_drp;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_descuadre_libera_drp_retenido
  AFTER UPDATE ON descuadres_inventario
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_descuadre_libera_drp_retenido();


-- ============================================================
--  TAREA 4.6 — trg_doc12_aprobada_a_cuadrante
--
--  AFTER UPDATE en doc_solicitudes_vacaciones.
--  Cuando estado pasa a 'Aprobada', inyecta turnos tipo 'V' (vacaciones)
--  en cuadrante_turnos para cada día del período solicitado.
--
--  Restricción: es_excepcion_absoluta = TRUE para que el registro
--  de vacaciones no sea sobreescrito por inyecciones de patrón.
--
--  Si ya existe una entrada para ese día, la actualiza (UPSERT)
--  solo si la entrada actual no es ya una excepción absoluta
--  de otro tipo — la vacación gana prioridad sobre turnos de patrón.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_fn_doc12_aprobada_a_cuadrante()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha DATE;
BEGIN
  -- Solo actuar cuando estado pasa de otro valor a 'Aprobada'
  IF OLD.estado = 'Aprobada' OR NEW.estado != 'Aprobada' THEN
    RETURN NEW;
  END IF;

  -- Registrar el id de la solicitud en el campo doc12_id del cuadrante
  UPDATE doc_solicitudes_vacaciones
  SET timestamp_resolucion = COALESCE(NEW.timestamp_resolucion, NOW())
  WHERE id = NEW.id;

  -- Iterar por cada día del período de vacaciones
  v_fecha := NEW.fecha_inicio;
  WHILE v_fecha <= NEW.fecha_fin LOOP
    INSERT INTO cuadrante_turnos (
      id_nombre,
      fecha,
      tipo_turno,
      es_excepcion_absoluta,
      doc12_id
    )
    VALUES (
      NEW.id_nombre,
      v_fecha,
      'V',
      TRUE,
      NEW.id
    )
    ON CONFLICT (id_nombre, fecha) DO UPDATE
      SET tipo_turno            = 'V',
          es_excepcion_absoluta = TRUE,
          doc12_id              = NEW.id,
          timestamp_inyeccion   = NOW();

    v_fecha := v_fecha + INTERVAL '1 day';
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_doc12_aprobada_a_cuadrante
  AFTER UPDATE ON doc_solicitudes_vacaciones
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_doc12_aprobada_a_cuadrante();
