-- ============================================================
--  Fix: GRANT SELECT faltante en versiones_cliente
--
--  La política RLS "authenticated puede leer versiones_cliente"
--  (USING TRUE, TO authenticated) fue creada correctamente en
--  20260519000001_init_schema.sql, pero el GRANT SELECT de tabla
--  nunca se emitió para el rol 'authenticated'.
--
--  Sin el GRANT, PostgreSQL devuelve "permission denied for table
--  versiones_cliente" antes de evaluar siquiera la RLS. Esto causa:
--    • SystemConfigScreen → "Error inesperado. Contacta con soporte."
--    • useForceUpdateCheck (App.tsx) → falla silenciosamente y nunca
--      activa el banner de actualización obligatoria.
--
--  Evidencia: system_config (misma migración de origen) sí tenía
--  SELECT para 'authenticated' en producción; versiones_cliente no.
-- ============================================================

GRANT SELECT ON versiones_cliente TO authenticated;
