-- Sprint 14+ / FASE 0 Security Gate
-- Revoca EXECUTE en funciones SECURITY DEFINER del sistema que Supabase provisiona
-- por defecto con ACL=PUBLIC. No afecta su invocación como event_trigger.
-- Soluciona advisories: anon_security_definer_function_executable
--                       authenticated_security_definer_function_executable
--
-- Guard IF EXISTS: la función sólo existe en Supabase Cloud, no en la imagen
-- Docker local usada por ci-database. La migración debe ser reproducible en ambos
-- entornos sin errores (D-18).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_proc     p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
    AND    p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
  END IF;
END;
$$;
