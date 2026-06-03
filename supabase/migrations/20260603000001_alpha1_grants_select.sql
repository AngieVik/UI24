-- ============================================================
--  ALPHA.1 — GRANT SELECT faltantes (patrón §8.4 CLAUDE.md)
--
--  PostgreSQL evalúa GRANTs ANTES que RLS. Sin GRANT SELECT a
--  'authenticated' el usuario recibe "permission denied" aunque
--  la política RLS diga USING(TRUE).
--
--  Las 6 tablas siguientes tenían RLS activo + política SELECT
--  correcta, pero nunca se emitió GRANT SELECT a 'authenticated'.
-- ============================================================

GRANT SELECT ON doc8_partes_trabajo       TO authenticated;
GRANT SELECT ON doc_checklist360          TO authenticated;
GRANT SELECT ON tablon_anuncios           TO authenticated;
GRANT SELECT ON doc_solicitudes_vacaciones TO authenticated;
GRANT SELECT ON descuadres_inventario     TO authenticated;
GRANT SELECT ON inventario_en_transito    TO authenticated;

-- Asegurar también psa_sesiones y filiacion_sesiones que tienen
-- política USING(TRUE) para Realtime (Sprint 2.4) pero sin GRANT explícito.
GRANT SELECT ON psa_sesiones              TO authenticated;
GRANT SELECT ON psa_pacientes             TO authenticated;
GRANT SELECT ON filiacion_sesiones        TO authenticated;
GRANT SELECT ON filiacion_pacientes       TO authenticated;
GRANT SELECT ON filiacion_eventos         TO authenticated;

-- Tablas de cuadrantes y RRHH que pueden tener el mismo problema.
GRANT SELECT ON doc_solicitudes_vacaciones TO authenticated;
GRANT SELECT ON cuadrante_turnos          TO authenticated;
GRANT SELECT ON cuadrante_patrones        TO authenticated;
GRANT SELECT ON cuadrante_grupos          TO authenticated;
GRANT SELECT ON cuadrante_grupo_miembros  TO authenticated;
