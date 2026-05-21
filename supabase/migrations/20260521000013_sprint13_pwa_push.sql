-- Sprint 13 — Push subscriptions
-- Almacena suscripciones Web Push por empleado (endpoint único).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nombre     TEXT         NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE,
  endpoint      TEXT         NOT NULL UNIQUE,
  p256dh        TEXT         NOT NULL,
  auth          TEXT         NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_id_nombre_idx ON push_subscriptions(id_nombre);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada empleado ve solo sus propias suscripciones
CREATE POLICY "empleado_ve_sus_push"
  ON push_subscriptions FOR SELECT
  USING (id_nombre = auth_id_nombre_actual());

-- ── RPCs ──────────────────────────────────────────────────────────────────

-- Registra o actualiza una suscripción push para el usuario autenticado.
CREATE OR REPLACE FUNCTION rpc_suscribir_push(
  p_endpoint   TEXT,
  p_p256dh     TEXT,
  p_auth       TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT := auth_id_nombre_actual();
BEGIN
  IF v_id_nombre IS NULL THEN
    RAISE EXCEPTION 'ERR_AUTH_REQUIRED';
  END IF;

  INSERT INTO push_subscriptions(id_nombre, endpoint, p256dh, auth, user_agent)
  VALUES (v_id_nombre, p_endpoint, p_p256dh, p_auth, p_user_agent)
  ON CONFLICT (endpoint) DO UPDATE SET
    p256dh     = EXCLUDED.p256dh,
    auth       = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent;
END;
$$;

-- Elimina una suscripción push del usuario autenticado.
CREATE OR REPLACE FUNCTION rpc_cancelar_push(p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id_nombre TEXT := auth_id_nombre_actual();
BEGIN
  IF v_id_nombre IS NULL THEN
    RAISE EXCEPTION 'ERR_AUTH_REQUIRED';
  END IF;

  DELETE FROM push_subscriptions
  WHERE endpoint = p_endpoint
    AND id_nombre = v_id_nombre;
END;
$$;

-- Devuelve las suscripciones de un empleado (uso interno por Edge Function).
-- Solo accesible desde service_role.
CREATE OR REPLACE FUNCTION rpc_push_subs_para(p_id_nombre TEXT)
RETURNS TABLE(endpoint TEXT, p256dh TEXT, auth TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM push_subscriptions ps
    WHERE ps.id_nombre = p_id_nombre;
END;
$$;
REVOKE ALL ON FUNCTION rpc_push_subs_para(TEXT) FROM PUBLIC;
-- Solo service_role puede llamar esta función.

COMMENT ON TABLE push_subscriptions IS 'Suscripciones Web Push por terminal (VAPID). Escritura solo via RPC.';
