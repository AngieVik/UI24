-- 20260524000001_resolve_d10_d11.sql
-- Fase C del roadmap de reconstrucción del frontend (2026-05-24).
-- Cierra D-10 (teléfono en fichas) y D-11 (tipo_servicio en activaciones).
--
-- Decisiones de modelado consensuadas en sesión (ver
-- 05_interfaz_y_desarrollo/diseño_chupiwachi.md §15 changelog 2026-05-24):
--
--   D-10 teléfono → columna nullable (no bloqueamos registros existentes).
--   D-10 estado del personal en turno → derivado en hook (sin columna BD).
--   D-11 tipo_servicio → enum ('urgente','programado','evento','traslado')
--                       en activaciones_vehiculo, NOT NULL DEFAULT 'urgente'.

-- ─── D-10: teléfono en fichas_empleados ────────────────────────────────
ALTER TABLE public.fichas_empleados
  ADD COLUMN IF NOT EXISTS telefono TEXT;

COMMENT ON COLUMN public.fichas_empleados.telefono IS
  'Teléfono de contacto del empleado. Nullable — registros antiguos pueden no tenerlo.';


-- ─── D-11: tipo_servicio en activaciones_vehiculo ──────────────────────
-- Enum nuevo. Si ya existe (migración reintentada), no falla.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_servicio') THEN
    CREATE TYPE public.tipo_servicio AS ENUM (
      'urgente',
      'programado',
      'evento',
      'traslado'
    );
  END IF;
END
$$;

ALTER TABLE public.activaciones_vehiculo
  ADD COLUMN IF NOT EXISTS tipo_servicio public.tipo_servicio
  NOT NULL DEFAULT 'urgente';

COMMENT ON COLUMN public.activaciones_vehiculo.tipo_servicio IS
  'Tipo de servicio operativo de la activación: urgente | programado | evento | traslado. Default urgente porque cubre la mayoría de activaciones SVB.';
