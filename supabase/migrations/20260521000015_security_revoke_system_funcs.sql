-- Sprint 14+ / FASE 0 Security Gate
-- Revoca EXECUTE en funciones SECURITY DEFINER del sistema que Supabase provisiona
-- por defecto con ACL=PUBLIC. No afecta su invocación como event_trigger.
-- Soluciona advisories: anon_security_definer_function_executable
--                       authenticated_security_definer_function_executable

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
