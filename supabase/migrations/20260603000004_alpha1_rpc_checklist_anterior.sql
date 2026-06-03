-- ============================================================
--  ALPHA.1 — rpc_obtener_checklist_anterior
--  Existía en los tipos locales pero nunca se había desplegado
--  en producción. Usada por useChecklist360Anterior para la
--  herencia fail-safe de incidencias entre turnos.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_obtener_checklist_anterior(
  p_matricula TEXT
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(items_revisados, '{}'::jsonb)
  FROM doc_checklist360
  WHERE matricula = p_matricula
    AND cerrado = TRUE
  ORDER BY timestamp_cierre DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION rpc_obtener_checklist_anterior(TEXT) TO authenticated;
