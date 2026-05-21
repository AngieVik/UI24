-- ============================================================
--  U24 — Step-up auth + Idempotencia de cola offline
--  Sprint 2, Tareas 2.5 · 2.6
--  Fecha: 2026-05-21
-- ============================================================

-- ============================================================
--  BLOQUE 1 — Tarea 2.5: Step-up auth (ADR-010)
--
--  Hallazgo G-01: las columnas pin_stepup_hash y pin_stepup_salt
--  estaban ausentes de fichas_empleados.
--  El ENUM tipo_evento_rbac carecía de los valores de step-up.
--
--  ADD VALUE IF NOT EXISTS: idempotente — reejecutar esta
--  migración (p.ej. en db reset) no produce error.
--  NOTA: ADD VALUE no es transaccional en PG < 14; en PG 14+
--  el valor queda visible tras COMMIT. En db reset esto es inerte.
-- ============================================================

ALTER TABLE fichas_empleados
  ADD COLUMN IF NOT EXISTS pin_stepup_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_stepup_salt TEXT;

COMMENT ON COLUMN fichas_empleados.pin_stepup_hash IS
  'PBKDF2-SHA256 del PIN de step-up. NULL si el empleado no tiene step-up configurado.';
COMMENT ON COLUMN fichas_empleados.pin_stepup_salt IS
  'Salt aleatorio (hex) para la derivación PBKDF2 del PIN de step-up.';

ALTER TYPE tipo_evento_rbac ADD VALUE IF NOT EXISTS 'step_up_exitoso';
ALTER TYPE tipo_evento_rbac ADD VALUE IF NOT EXISTS 'step_up_fallido';


-- ============================================================
--  BLOQUE 2 — Tarea 2.6: Idempotencia de cola offline (ADR-012)
--
--  Patrón elegido: ledger central idempotency_keys.
--  Ver ADR-012 para la justificación completa.
--
--  Invariante: el cliente genera mutation_uuid antes de encolar.
--  La RPC comprueba el ledger antes de ejecutar. Si ya existe
--  y resultado IS NOT NULL, devuelve el resultado cacheado sin
--  re-ejecutar la mutación.
-- ============================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  mutation_uuid  UUID        PRIMARY KEY,
  rpc_name       TEXT        NOT NULL,
  id_nombre      TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE,
  resultado      JSONB,
  -- NULL = en progreso (o sin resultado relevante que devolver)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

COMMENT ON TABLE idempotency_keys IS
  'Ledger central de idempotencia para la cola offline (ADR-012). '
  'El cron ef-cron-cleanup-orphans purga entradas expiradas.';

COMMENT ON COLUMN idempotency_keys.resultado IS
  'Resultado serializado de la RPC. Devuelto en reintentos sin re-ejecutar.';

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
  ON idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_id_nombre
  ON idempotency_keys (id_nombre);

-- RLS: el cliente nunca accede directamente al ledger.
-- Las RPCs SECURITY DEFINER consultan e insertan con privilegio
-- de función, no con el rol authenticated.
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idempotency_keys deny select"
  ON idempotency_keys FOR SELECT
  USING (FALSE);

CREATE POLICY "idempotency_keys deny insert"
  ON idempotency_keys FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "idempotency_keys deny update"
  ON idempotency_keys FOR UPDATE
  USING (FALSE);

CREATE POLICY "idempotency_keys deny delete"
  ON idempotency_keys FOR DELETE
  USING (FALSE);
