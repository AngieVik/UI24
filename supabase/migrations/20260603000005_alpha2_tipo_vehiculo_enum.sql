-- ============================================================
--  ALPHA.2 — Enum tipo_vehiculo: Unidad Movil + Logistica
--  Idempotente (IF NOT EXISTS). Ya existen en producción
--  (migración d14b). Necesario para entorno local.
--  Separado del seed (000006) porque ADD VALUE no puede
--  usarse en la misma transacción en que se referencian
--  los nuevos valores.
-- ============================================================

ALTER TYPE tipo_vehiculo ADD VALUE IF NOT EXISTS 'Unidad Movil';
ALTER TYPE tipo_vehiculo ADD VALUE IF NOT EXISTS 'Logistica';
