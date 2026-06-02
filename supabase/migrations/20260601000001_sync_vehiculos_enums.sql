-- 20260601000001_sync_vehiculos_enums.sql
--
-- Paso 1/2: Añade valores a enums existentes.
-- Los ALTER TYPE ADD VALUE no pueden usarse en la misma transacción en que se
-- referencian → se separa del DDL que usa los valores (ver 000002).
-- Idempotente via IF NOT EXISTS.

ALTER TYPE condicion_tecnica ADD VALUE IF NOT EXISTS 'critico';

ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'desactivado';
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'en_espera';
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'activado';
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'ruta';
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'estacionado';
ALTER TYPE estado_operativo ADD VALUE IF NOT EXISTS 'alerta';
