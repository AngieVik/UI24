-- ============================================================
--  Seed 03 — Vehículos demo (5 unidades fijas)
--  Fuente: er_y_seeds.md §2.1
-- ============================================================

INSERT INTO vehiculos (matricula, tipo, condicion_tecnica, estado_operativo, plantilla_id) VALUES
  ('1111-DEMO', 'A1',  'operativo', 'inactivo', 'plantilla_A1A2'),
  ('1112-DEMO', 'A1',  'operativo', 'inactivo', 'plantilla_A1A2'),
  ('2222-DEMO', 'B',   'operativo', 'inactivo', 'plantilla_B'),
  ('3333-DEMO', 'C',   'operativo', 'inactivo', 'plantilla_C'),
  ('4444-DEMO', 'VIR', 'operativo', 'inactivo', 'plantilla_VIR')
ON CONFLICT (matricula) DO NOTHING;

-- Location del almacén central demo (location_id = UUID textual fijo)
INSERT INTO locations (location_id, nombre, tipo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Almacén Central Demo', 'almacen')
ON CONFLICT (location_id) DO NOTHING;

-- Locations vehiculares (location_id = matricula)
INSERT INTO locations (location_id, nombre, tipo) VALUES
  ('1111-DEMO', 'Ambulancia 1111-DEMO', 'vehiculo'),
  ('1112-DEMO', 'Ambulancia 1112-DEMO', 'vehiculo'),
  ('2222-DEMO', 'Ambulancia 2222-DEMO', 'vehiculo'),
  ('3333-DEMO', 'Ambulancia 3333-DEMO', 'vehiculo'),
  ('4444-DEMO', 'VIR 4444-DEMO',        'vehiculo')
ON CONFLICT (location_id) DO NOTHING;
