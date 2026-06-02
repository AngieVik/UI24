-- 20260601000002_sync_vehiculos_schema.sql
--
-- Paso 2/2: Crea el tipo subestado_operativo, añade la columna en vehiculos
-- y actualiza el DEFAULT de estado_operativo.
-- Depende de 000001 (los valores de enum deben existir antes de usarse).
-- Idempotente via IF NOT EXISTS / DO $$ BEGIN ... END $$.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'subestado_operativo'
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE TYPE public.subestado_operativo AS ENUM (
      'en_espera',
      'ruta',
      'estacionado',
      'alerta'
    );
  END IF;
END
$$;

ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS subestado_operativo public.subestado_operativo NULL;

ALTER TABLE public.vehiculos
  ALTER COLUMN estado_operativo SET DEFAULT 'desactivado';
