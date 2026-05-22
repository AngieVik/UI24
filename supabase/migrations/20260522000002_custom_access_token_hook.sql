-- 20260522000002_custom_access_token_hook.sql
-- Fase B.1 del roadmap de reconstrucción del frontend (2026-05-22).
--
-- Custom Access Token Hook de Supabase Auth.
-- Supabase llama a esta función cada vez que se emite o refresca un JWT.
-- Inyecta en `claims.app_metadata`:
--   - rol        → rol_empleado de fichas_empleados, o 'sin_rol' / 'inactivo'
--   - id_nombre  → texto identificador del empleado (o JSON null)
--
-- Frontend lee: session.user.app_metadata.rol y .id_nombre.
--
-- Activación (manual, una sola vez):
--   Supabase Dashboard → Authentication → Hooks → Add a new hook
--     Type:     Custom Access Token
--     Function: public.custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_rol       public.rol_empleado;
  v_id_nombre text;
  v_activo    boolean;
  v_claims    jsonb;
  v_rol_out   text;
BEGIN
  v_user_id := (event ->> 'user_id')::uuid;
  v_claims  := COALESCE(event -> 'claims', '{}'::jsonb);

  SELECT rol, id_nombre, activo
    INTO v_rol, v_id_nombre, v_activo
    FROM public.fichas_empleados
   WHERE auth_user_id = v_user_id
   LIMIT 1;

  IF v_rol IS NULL THEN
    -- Sin ficha de empleado → claim defensivo. Cubre el bypass de dev y
    -- tokens de emergencia que no tienen ficha aún.
    v_rol_out   := 'sin_rol';
    v_id_nombre := NULL;
  ELSIF v_activo IS DISTINCT FROM TRUE THEN
    -- Ficha existe pero el empleado está dado de baja → frontend redirige
    -- a logout con mensaje "Sesión deshabilitada".
    v_rol_out := 'inactivo';
  ELSE
    v_rol_out := v_rol::text;
  END IF;

  -- Asegura app_metadata existe antes de jsonb_set en sub-claves.
  IF v_claims -> 'app_metadata' IS NULL THEN
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb, true);
  END IF;

  v_claims := jsonb_set(
    v_claims, '{app_metadata,rol}',
    to_jsonb(v_rol_out), true);

  -- COALESCE para evitar que SQL NULL haga jsonb_set devolver NULL entero.
  v_claims := jsonb_set(
    v_claims, '{app_metadata,id_nombre}',
    COALESCE(to_jsonb(v_id_nombre), 'null'::jsonb), true);

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- Permisos: ejecutable solo por supabase_auth_admin. Revoke explícito del
-- resto de roles (defensa en profundidad).
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- El hook lee fichas_empleados con SECURITY DEFINER (bypassa RLS), pero el
-- GRANT base es la línea de defensa por defecto.
GRANT SELECT ON public.fichas_empleados TO supabase_auth_admin;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Custom Access Token Hook de Supabase Auth. Inyecta app_metadata.rol y
   app_metadata.id_nombre en cada JWT a partir de public.fichas_empleados.
   Fallbacks: ''sin_rol'' (sin ficha) | ''inactivo'' (activo=false).
   Activar en Dashboard → Authentication → Hooks.
   Fase B.1, roadmap de reconstrucción del frontend, 2026-05-22.';
