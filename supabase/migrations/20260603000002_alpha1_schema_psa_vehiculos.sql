-- ============================================================
--  ALPHA.1 — Schema: PSA, Filiación, Vehículos, Incidencias
--  Nota: enum 'Unidad Movil' y 'Logistica' ya existían en producción
--  (migración 20260527 d14b), por lo que no se añaden aquí.
-- ============================================================

-- ── 1. psa_sesiones — columnas faltantes ────────────────────
ALTER TABLE psa_sesiones
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'Abierta'
  CHECK (estado IN ('Abierta', 'Cerrada', 'Archivada'));

ALTER TABLE psa_sesiones
  ADD COLUMN IF NOT EXISTS id_nombre_responsable TEXT
  REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT;

-- ── 2. filiacion_sesiones — columnas faltantes ───────────────
ALTER TABLE filiacion_sesiones
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'Abierta'
  CHECK (estado IN ('Abierta', 'Cerrada', 'Archivada'));

ALTER TABLE filiacion_sesiones
  ADD COLUMN IF NOT EXISTS id_nombre_responsable TEXT
  REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT;

-- ── 3. vehiculos — vehiculo_id y nombre_display ──────────────
ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS vehiculo_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehiculos_vehiculo_id
  ON vehiculos (vehiculo_id)
  WHERE vehiculo_id IS NOT NULL;

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS nombre_display TEXT;

-- ── 4. eventos_fisicos_vehiculo — anclada ────────────────────
ALTER TABLE eventos_fisicos_vehiculo
  ADD COLUMN IF NOT EXISTS anclada BOOLEAN NOT NULL DEFAULT FALSE;
