-- ============================================================
--  ALPHA.2 — Seed: plantilla_lineas
--  Idempotente (ON CONFLICT DO NOTHING).
--  Requiere: catalogo_items (000006) y plantillas_stock (000006).
--  ~886 filas en 6 plantillas.
--  Nota: plantilla_Backpack Vía aérea usa 171 (sonda 10) y
--  172 (sonda 12), corrigiendo una errata del documento fuente.
-- ============================================================

-- ── plantilla_A1A2 ───────────────────────────────────────────

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Cabina conducción', 59, 1),
  ('plantilla_A1A2','Cabina conducción', 60, 2),
  ('plantilla_A1A2','Cabina conducción', 61, 1),
  ('plantilla_A1A2','Cabina conducción', 62, 1),
  ('plantilla_A1A2','Cabina conducción', 63, 1),
  ('plantilla_A1A2','Cabina conducción', 64, 2),
  ('plantilla_A1A2','Cabina conducción', 65, 1),
  ('plantilla_A1A2','Cabina conducción', 66, 1),
  ('plantilla_A1A2','Cabina conducción', 68, 1),
  ('plantilla_A1A2','Cabina conducción', 69, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Cabina asistencial', 28, 5),
  ('plantilla_A1A2','Cabina asistencial', 76, 20),
  ('plantilla_A1A2','Cabina asistencial', 79, 2),
  ('plantilla_A1A2','Cabina asistencial',112, 2),
  ('plantilla_A1A2','Cabina asistencial',113, 3)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Armario inm-mov', 56, 1),
  ('plantilla_A1A2','Armario inm-mov', 57, 1),
  ('plantilla_A1A2','Armario inm-mov', 88, 1),
  ('plantilla_A1A2','Armario inm-mov', 92, 1),
  ('plantilla_A1A2','Armario inm-mov', 93, 1),
  ('plantilla_A1A2','Armario inm-mov',101, 1),
  ('plantilla_A1A2','Armario inm-mov',102, 1),
  ('plantilla_A1A2','Armario inm-mov',103, 1),
  ('plantilla_A1A2','Armario inm-mov',105, 1),
  ('plantilla_A1A2','Armario inm-mov',164, 1),
  ('plantilla_A1A2','Armario inm-mov',166, 1),
  ('plantilla_A1A2','Armario inm-mov',167, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Vía aérea', 43, 1),
  ('plantilla_A1A2','Vía aérea', 44, 1),
  ('plantilla_A1A2','Vía aérea', 45, 1),
  ('plantilla_A1A2','Vía aérea',114, 2),
  ('plantilla_A1A2','Vía aérea',117, 1),
  ('plantilla_A1A2','Vía aérea',119, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Curas y sutura',  8, 1),
  ('plantilla_A1A2','Curas y sutura',  9, 1),
  ('plantilla_A1A2','Curas y sutura', 10, 1),
  ('plantilla_A1A2','Curas y sutura', 12, 1),
  ('plantilla_A1A2','Curas y sutura', 15, 3),
  ('plantilla_A1A2','Curas y sutura', 17, 3),
  ('plantilla_A1A2','Curas y sutura', 21,10),
  ('plantilla_A1A2','Curas y sutura', 22, 3),
  ('plantilla_A1A2','Curas y sutura', 23, 3),
  ('plantilla_A1A2','Curas y sutura', 26, 1),
  ('plantilla_A1A2','Curas y sutura', 29, 1),
  ('plantilla_A1A2','Curas y sutura', 31, 5),
  ('plantilla_A1A2','Curas y sutura', 32, 5),
  ('plantilla_A1A2','Curas y sutura', 33, 3),
  ('plantilla_A1A2','Curas y sutura', 85, 3),
  ('plantilla_A1A2','Curas y sutura',224, 2),
  ('plantilla_A1A2','Curas y sutura',225, 2),
  ('plantilla_A1A2','Curas y sutura',227, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Mochila Roja', 26, 1),
  ('plantilla_A1A2','Mochila Roja', 32, 4),
  ('plantilla_A1A2','Mochila Roja', 85, 3),
  ('plantilla_A1A2','Mochila Roja',168, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Mochila Azul', 32, 4),
  ('plantilla_A1A2','Mochila Azul', 43, 1),
  ('plantilla_A1A2','Mochila Azul', 44, 1),
  ('plantilla_A1A2','Mochila Azul', 45, 1),
  ('plantilla_A1A2','Mochila Azul',117, 1),
  ('plantilla_A1A2','Mochila Azul',164, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_A1A2','Mochila Amarilla',  8, 1),
  ('plantilla_A1A2','Mochila Amarilla', 10, 1),
  ('plantilla_A1A2','Mochila Amarilla', 15, 3),
  ('plantilla_A1A2','Mochila Amarilla', 21, 5),
  ('plantilla_A1A2','Mochila Amarilla', 29, 1),
  ('plantilla_A1A2','Mochila Amarilla', 32, 4),
  ('plantilla_A1A2','Mochila Amarilla', 85, 3),
  ('plantilla_A1A2','Mochila Amarilla', 87, 1),
  ('plantilla_A1A2','Mochila Amarilla', 92, 1),
  ('plantilla_A1A2','Mochila Amarilla',224, 2),
  ('plantilla_A1A2','Mochila Amarilla',225, 2),
  ('plantilla_A1A2','Mochila Amarilla',227, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- ── plantilla_B ──────────────────────────────────────────────

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Cabina conducción', 59, 1),
  ('plantilla_B','Cabina conducción', 60, 2),
  ('plantilla_B','Cabina conducción', 61, 1),
  ('plantilla_B','Cabina conducción', 62, 1),
  ('plantilla_B','Cabina conducción', 63, 1),
  ('plantilla_B','Cabina conducción', 64, 2),
  ('plantilla_B','Cabina conducción', 65, 1),
  ('plantilla_B','Cabina conducción', 66, 1),
  ('plantilla_B','Cabina conducción', 67, 1),
  ('plantilla_B','Cabina conducción', 68, 1),
  ('plantilla_B','Cabina conducción', 69, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Cabina asistencial', 28, 5),
  ('plantilla_B','Cabina asistencial', 35, 2),
  ('plantilla_B','Cabina asistencial', 71,10),
  ('plantilla_B','Cabina asistencial', 72, 1),
  ('plantilla_B','Cabina asistencial', 73, 1),
  ('plantilla_B','Cabina asistencial', 74, 1),
  ('plantilla_B','Cabina asistencial', 75, 1),
  ('plantilla_B','Cabina asistencial', 76,20),
  ('plantilla_B','Cabina asistencial', 77,10),
  ('plantilla_B','Cabina asistencial', 78, 1),
  ('plantilla_B','Cabina asistencial', 79, 2),
  ('plantilla_B','Cabina asistencial', 80, 4),
  ('plantilla_B','Cabina asistencial', 81, 1),
  ('plantilla_B','Cabina asistencial', 82, 1),
  ('plantilla_B','Cabina asistencial', 83, 1),
  ('plantilla_B','Cabina asistencial', 84,25),
  ('plantilla_B','Cabina asistencial',112, 2),
  ('plantilla_B','Cabina asistencial',113, 3)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Armario inm-mov', 55, 1),
  ('plantilla_B','Armario inm-mov', 56, 1),
  ('plantilla_B','Armario inm-mov', 57, 2),
  ('plantilla_B','Armario inm-mov', 58, 1),
  ('plantilla_B','Armario inm-mov', 87, 2),
  ('plantilla_B','Armario inm-mov', 88, 1),
  ('plantilla_B','Armario inm-mov', 92, 2),
  ('plantilla_B','Armario inm-mov', 93, 1),
  ('plantilla_B','Armario inm-mov', 94, 1),
  ('plantilla_B','Armario inm-mov', 96, 4),
  ('plantilla_B','Armario inm-mov', 97, 2),
  ('plantilla_B','Armario inm-mov',101, 1),
  ('plantilla_B','Armario inm-mov',102, 1),
  ('plantilla_B','Armario inm-mov',103, 1),
  ('plantilla_B','Armario inm-mov',104, 1),
  ('plantilla_B','Armario inm-mov',105, 1),
  ('plantilla_B','Armario inm-mov',164, 1),
  ('plantilla_B','Armario inm-mov',165, 1),
  ('plantilla_B','Armario inm-mov',166, 2),
  ('plantilla_B','Armario inm-mov',167, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Ampulario',130, 3),
  ('plantilla_B','Ampulario',133, 2),
  ('plantilla_B','Ampulario',136, 3),
  ('plantilla_B','Ampulario',137, 3),
  ('plantilla_B','Ampulario',138, 3),
  ('plantilla_B','Ampulario',139, 3),
  ('plantilla_B','Ampulario',140, 2),
  ('plantilla_B','Ampulario',145, 2),
  ('plantilla_B','Ampulario',146, 2),
  ('plantilla_B','Ampulario',147, 5),
  ('plantilla_B','Ampulario',150, 5),
  ('plantilla_B','Ampulario',151, 2),
  ('plantilla_B','Ampulario',153, 2),
  ('plantilla_B','Ampulario',155, 2),
  ('plantilla_B','Ampulario',158, 5),
  ('plantilla_B','Ampulario',160, 3),
  ('plantilla_B','Ampulario',161, 3),
  ('plantilla_B','Ampulario',162, 3),
  ('plantilla_B','Ampulario',163, 2),
  ('plantilla_B','Ampulario',232, 3),
  ('plantilla_B','Ampulario',234, 3),
  ('plantilla_B','Ampulario',235, 3),
  ('plantilla_B','Ampulario',236, 5),
  ('plantilla_B','Ampulario',237, 5),
  ('plantilla_B','Ampulario',238, 5),
  ('plantilla_B','Ampulario',216, 2),
  ('plantilla_B','Ampulario',219, 2),
  ('plantilla_B','Ampulario',220, 1),
  ('plantilla_B','Ampulario',222, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Vía aérea', 42, 2),
  ('plantilla_B','Vía aérea', 43, 2),
  ('plantilla_B','Vía aérea', 44, 2),
  ('plantilla_B','Vía aérea', 45, 2),
  ('plantilla_B','Vía aérea', 46, 2),
  ('plantilla_B','Vía aérea', 47, 2),
  ('plantilla_B','Vía aérea', 48, 2),
  ('plantilla_B','Vía aérea', 49, 2),
  ('plantilla_B','Vía aérea', 51, 1),
  ('plantilla_B','Vía aérea', 52, 1),
  ('plantilla_B','Vía aérea', 53, 1),
  ('plantilla_B','Vía aérea', 54, 1),
  ('plantilla_B','Vía aérea',114, 2),
  ('plantilla_B','Vía aérea',115, 2),
  ('plantilla_B','Vía aérea',116, 2),
  ('plantilla_B','Vía aérea',117, 2),
  ('plantilla_B','Vía aérea',118, 2),
  ('plantilla_B','Vía aérea',119, 3),
  ('plantilla_B','Vía aérea',120, 2),
  ('plantilla_B','Vía aérea',170, 2),
  ('plantilla_B','Vía aérea',171, 2),
  ('plantilla_B','Vía aérea',172, 2),
  ('plantilla_B','Vía aérea',173, 2),
  ('plantilla_B','Vía aérea',174, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Circulatorio',  1, 5),
  ('plantilla_B','Circulatorio',  2, 5),
  ('plantilla_B','Circulatorio',  3, 5),
  ('plantilla_B','Circulatorio',  4, 5),
  ('plantilla_B','Circulatorio',  5, 5),
  ('plantilla_B','Circulatorio', 37, 2),
  ('plantilla_B','Circulatorio', 38, 5),
  ('plantilla_B','Circulatorio', 39, 5),
  ('plantilla_B','Circulatorio', 40, 3),
  ('plantilla_B','Circulatorio', 41, 2),
  ('plantilla_B','Circulatorio',106,10),
  ('plantilla_B','Circulatorio',107,10),
  ('plantilla_B','Circulatorio',108, 5),
  ('plantilla_B','Circulatorio',109,10),
  ('plantilla_B','Circulatorio',111, 5),
  ('plantilla_B','Circulatorio',168, 2),
  ('plantilla_B','Circulatorio',194, 3),
  ('plantilla_B','Circulatorio',195, 5),
  ('plantilla_B','Circulatorio',196, 3),
  ('plantilla_B','Circulatorio',197, 3),
  ('plantilla_B','Circulatorio',198,10),
  ('plantilla_B','Circulatorio',241, 5),
  ('plantilla_B','Circulatorio',242, 5),
  ('plantilla_B','Circulatorio',244, 5)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Curas y sutura',  8, 1),
  ('plantilla_B','Curas y sutura',  9, 1),
  ('plantilla_B','Curas y sutura', 10, 1),
  ('plantilla_B','Curas y sutura', 11, 5),
  ('plantilla_B','Curas y sutura', 12, 1),
  ('plantilla_B','Curas y sutura', 13, 2),
  ('plantilla_B','Curas y sutura', 14, 2),
  ('plantilla_B','Curas y sutura', 15, 5),
  ('plantilla_B','Curas y sutura', 16, 5),
  ('plantilla_B','Curas y sutura', 17, 5),
  ('plantilla_B','Curas y sutura', 18, 5),
  ('plantilla_B','Curas y sutura', 19, 3),
  ('plantilla_B','Curas y sutura', 20, 3),
  ('plantilla_B','Curas y sutura', 21,10),
  ('plantilla_B','Curas y sutura', 22, 5),
  ('plantilla_B','Curas y sutura', 23, 5),
  ('plantilla_B','Curas y sutura', 24, 1),
  ('plantilla_B','Curas y sutura', 26, 2),
  ('plantilla_B','Curas y sutura', 29, 1),
  ('plantilla_B','Curas y sutura', 30, 1),
  ('plantilla_B','Curas y sutura', 31,10),
  ('plantilla_B','Curas y sutura', 32,10),
  ('plantilla_B','Curas y sutura', 33, 5),
  ('plantilla_B','Curas y sutura', 34, 5),
  ('plantilla_B','Curas y sutura', 85, 5),
  ('plantilla_B','Curas y sutura', 86, 2),
  ('plantilla_B','Curas y sutura',169, 1),
  ('plantilla_B','Curas y sutura',200, 2),
  ('plantilla_B','Curas y sutura',203, 2),
  ('plantilla_B','Curas y sutura',204, 2),
  ('plantilla_B','Curas y sutura',205, 2),
  ('plantilla_B','Curas y sutura',206, 3),
  ('plantilla_B','Curas y sutura',208, 3),
  ('plantilla_B','Curas y sutura',209, 1),
  ('plantilla_B','Curas y sutura',211, 2),
  ('plantilla_B','Curas y sutura',212, 2),
  ('plantilla_B','Curas y sutura',213, 2),
  ('plantilla_B','Curas y sutura',223, 2),
  ('plantilla_B','Curas y sutura',224, 3),
  ('plantilla_B','Curas y sutura',225, 3),
  ('plantilla_B','Curas y sutura',226, 3),
  ('plantilla_B','Curas y sutura',227, 3),
  ('plantilla_B','Curas y sutura',228, 3)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Mochila Roja', 26, 1),
  ('plantilla_B','Mochila Roja', 31, 2),
  ('plantilla_B','Mochila Roja', 32, 4),
  ('plantilla_B','Mochila Roja',  1, 5),
  ('plantilla_B','Mochila Roja',  2, 5),
  ('plantilla_B','Mochila Roja',  3, 5),
  ('plantilla_B','Mochila Roja',  4, 5),
  ('plantilla_B','Mochila Roja',  5, 5),
  ('plantilla_B','Mochila Roja', 18, 3),
  ('plantilla_B','Mochila Roja', 38, 2),
  ('plantilla_B','Mochila Roja', 39, 2),
  ('plantilla_B','Mochila Roja',106, 3),
  ('plantilla_B','Mochila Roja',107, 5),
  ('plantilla_B','Mochila Roja',109, 5),
  ('plantilla_B','Mochila Roja', 85, 3),
  ('plantilla_B','Mochila Roja',168, 1),
  ('plantilla_B','Mochila Roja',195, 3),
  ('plantilla_B','Mochila Roja',196, 2),
  ('plantilla_B','Mochila Roja',241, 2),
  ('plantilla_B','Mochila Roja',242, 3),
  ('plantilla_B','Mochila Roja',244, 3),
  ('plantilla_B','Mochila Roja',130, 2),
  ('plantilla_B','Mochila Roja',133, 2),
  ('plantilla_B','Mochila Roja',140, 2),
  ('plantilla_B','Mochila Roja',146, 1),
  ('plantilla_B','Mochila Roja',147, 3),
  ('plantilla_B','Mochila Roja',139, 2),
  ('plantilla_B','Mochila Roja',150, 3),
  ('plantilla_B','Mochila Roja',158, 3)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Mochila Azul', 31, 2),
  ('plantilla_B','Mochila Azul', 32, 4),
  ('plantilla_B','Mochila Azul', 43, 1),
  ('plantilla_B','Mochila Azul', 44, 1),
  ('plantilla_B','Mochila Azul', 45, 1),
  ('plantilla_B','Mochila Azul', 52, 1),
  ('plantilla_B','Mochila Azul', 53, 1),
  ('plantilla_B','Mochila Azul',117, 1),
  ('plantilla_B','Mochila Azul',118, 1),
  ('plantilla_B','Mochila Azul',164, 1),
  ('plantilla_B','Mochila Azul',165, 1),
  ('plantilla_B','Mochila Azul',198, 5),
  ('plantilla_B','Mochila Azul',151, 2),
  ('plantilla_B','Mochila Azul',162, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_B','Mochila Amarilla',  8, 1),
  ('plantilla_B','Mochila Amarilla', 10, 1),
  ('plantilla_B','Mochila Amarilla', 12, 1),
  ('plantilla_B','Mochila Amarilla', 15, 3),
  ('plantilla_B','Mochila Amarilla', 16, 3),
  ('plantilla_B','Mochila Amarilla', 17, 3),
  ('plantilla_B','Mochila Amarilla', 21, 5),
  ('plantilla_B','Mochila Amarilla', 22, 2),
  ('plantilla_B','Mochila Amarilla', 29, 1),
  ('plantilla_B','Mochila Amarilla', 30, 1),
  ('plantilla_B','Mochila Amarilla', 32, 4),
  ('plantilla_B','Mochila Amarilla', 33, 2),
  ('plantilla_B','Mochila Amarilla', 34, 2),
  ('plantilla_B','Mochila Amarilla', 85, 5),
  ('plantilla_B','Mochila Amarilla', 86, 1),
  ('plantilla_B','Mochila Amarilla', 87, 1),
  ('plantilla_B','Mochila Amarilla', 92, 1),
  ('plantilla_B','Mochila Amarilla', 96, 2),
  ('plantilla_B','Mochila Amarilla', 97, 1),
  ('plantilla_B','Mochila Amarilla',169, 1),
  ('plantilla_B','Mochila Amarilla',219, 1),
  ('plantilla_B','Mochila Amarilla',224, 2),
  ('plantilla_B','Mochila Amarilla',225, 2),
  ('plantilla_B','Mochila Amarilla',226, 2),
  ('plantilla_B','Mochila Amarilla',227, 2),
  ('plantilla_B','Mochila Amarilla',228, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- ── plantilla_C ──────────────────────────────────────────────

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Cabina conducción', 59, 1),
  ('plantilla_C','Cabina conducción', 60, 2),
  ('plantilla_C','Cabina conducción', 61, 1),
  ('plantilla_C','Cabina conducción', 62, 1),
  ('plantilla_C','Cabina conducción', 63, 1),
  ('plantilla_C','Cabina conducción', 64, 2),
  ('plantilla_C','Cabina conducción', 65, 1),
  ('plantilla_C','Cabina conducción', 66, 1),
  ('plantilla_C','Cabina conducción', 67, 1),
  ('plantilla_C','Cabina conducción', 68, 1),
  ('plantilla_C','Cabina conducción', 69, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Cabina asistencial', 28, 5),
  ('plantilla_C','Cabina asistencial', 35, 2),
  ('plantilla_C','Cabina asistencial', 70, 1),
  ('plantilla_C','Cabina asistencial', 71,10),
  ('plantilla_C','Cabina asistencial', 72, 1),
  ('plantilla_C','Cabina asistencial', 73, 1),
  ('plantilla_C','Cabina asistencial', 74, 1),
  ('plantilla_C','Cabina asistencial', 75, 1),
  ('plantilla_C','Cabina asistencial', 76,20),
  ('plantilla_C','Cabina asistencial', 77,10),
  ('plantilla_C','Cabina asistencial', 78, 1),
  ('plantilla_C','Cabina asistencial', 79, 3),
  ('plantilla_C','Cabina asistencial', 80, 4),
  ('plantilla_C','Cabina asistencial', 81, 1),
  ('plantilla_C','Cabina asistencial', 82, 1),
  ('plantilla_C','Cabina asistencial', 83, 1),
  ('plantilla_C','Cabina asistencial', 84,25),
  ('plantilla_C','Cabina asistencial',112, 2),
  ('plantilla_C','Cabina asistencial',113, 3)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Armario inm-mov', 55, 1),
  ('plantilla_C','Armario inm-mov', 56, 1),
  ('plantilla_C','Armario inm-mov', 57, 2),
  ('plantilla_C','Armario inm-mov', 58, 1),
  ('plantilla_C','Armario inm-mov', 87, 2),
  ('plantilla_C','Armario inm-mov', 88, 1),
  ('plantilla_C','Armario inm-mov', 89, 1),
  ('plantilla_C','Armario inm-mov', 90, 1),
  ('plantilla_C','Armario inm-mov', 91, 1),
  ('plantilla_C','Armario inm-mov', 92, 2),
  ('plantilla_C','Armario inm-mov', 93, 1),
  ('plantilla_C','Armario inm-mov', 94, 1),
  ('plantilla_C','Armario inm-mov', 95, 1),
  ('plantilla_C','Armario inm-mov', 96, 4),
  ('plantilla_C','Armario inm-mov', 97, 2),
  ('plantilla_C','Armario inm-mov', 98, 1),
  ('plantilla_C','Armario inm-mov', 99, 1),
  ('plantilla_C','Armario inm-mov',100, 1),
  ('plantilla_C','Armario inm-mov',101, 1),
  ('plantilla_C','Armario inm-mov',102, 1),
  ('plantilla_C','Armario inm-mov',103, 1),
  ('plantilla_C','Armario inm-mov',104, 1),
  ('plantilla_C','Armario inm-mov',105, 1),
  ('plantilla_C','Armario inm-mov',164, 1),
  ('plantilla_C','Armario inm-mov',165, 1),
  ('plantilla_C','Armario inm-mov',166, 2),
  ('plantilla_C','Armario inm-mov',167, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Ampulario',126, 2),
  ('plantilla_C','Ampulario',127, 2),
  ('plantilla_C','Ampulario',128, 2),
  ('plantilla_C','Ampulario',129, 2),
  ('plantilla_C','Ampulario',130, 5),
  ('plantilla_C','Ampulario',131, 3),
  ('plantilla_C','Ampulario',132, 2),
  ('plantilla_C','Ampulario',133, 3),
  ('plantilla_C','Ampulario',134, 2),
  ('plantilla_C','Ampulario',135, 2),
  ('plantilla_C','Ampulario',136, 3),
  ('plantilla_C','Ampulario',137, 3),
  ('plantilla_C','Ampulario',138, 3),
  ('plantilla_C','Ampulario',139, 3),
  ('plantilla_C','Ampulario',140, 3),
  ('plantilla_C','Ampulario',141, 2),
  ('plantilla_C','Ampulario',142, 2),
  ('plantilla_C','Ampulario',143, 2),
  ('plantilla_C','Ampulario',144, 2),
  ('plantilla_C','Ampulario',145, 3),
  ('plantilla_C','Ampulario',146, 2),
  ('plantilla_C','Ampulario',147, 5),
  ('plantilla_C','Ampulario',148, 2),
  ('plantilla_C','Ampulario',149, 2),
  ('plantilla_C','Ampulario',150, 5),
  ('plantilla_C','Ampulario',151, 3),
  ('plantilla_C','Ampulario',152, 2),
  ('plantilla_C','Ampulario',153, 2),
  ('plantilla_C','Ampulario',154, 2),
  ('plantilla_C','Ampulario',155, 2),
  ('plantilla_C','Ampulario',156, 2),
  ('plantilla_C','Ampulario',157, 2),
  ('plantilla_C','Ampulario',158, 5),
  ('plantilla_C','Ampulario',159, 2),
  ('plantilla_C','Ampulario',160, 3),
  ('plantilla_C','Ampulario',161, 3),
  ('plantilla_C','Ampulario',162, 3),
  ('plantilla_C','Ampulario',163, 2),
  ('plantilla_C','Ampulario',229, 2),
  ('plantilla_C','Ampulario',230, 2),
  ('plantilla_C','Ampulario',231, 2),
  ('plantilla_C','Ampulario',232, 3),
  ('plantilla_C','Ampulario',233, 2),
  ('plantilla_C','Ampulario',234, 3),
  ('plantilla_C','Ampulario',235, 3),
  ('plantilla_C','Ampulario',236, 5),
  ('plantilla_C','Ampulario',237, 5),
  ('plantilla_C','Ampulario',238, 5),
  ('plantilla_C','Ampulario',239, 2),
  ('plantilla_C','Ampulario',216, 2),
  ('plantilla_C','Ampulario',217, 2),
  ('plantilla_C','Ampulario',218, 1),
  ('plantilla_C','Ampulario',219, 2),
  ('plantilla_C','Ampulario',220, 1),
  ('plantilla_C','Ampulario',221, 1),
  ('plantilla_C','Ampulario',222, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Vía aérea', 42, 2),
  ('plantilla_C','Vía aérea', 43, 2),
  ('plantilla_C','Vía aérea', 44, 2),
  ('plantilla_C','Vía aérea', 45, 2),
  ('plantilla_C','Vía aérea', 46, 2),
  ('plantilla_C','Vía aérea', 47, 2),
  ('plantilla_C','Vía aérea', 48, 2),
  ('plantilla_C','Vía aérea', 49, 2),
  ('plantilla_C','Vía aérea', 50, 1),
  ('plantilla_C','Vía aérea', 51, 1),
  ('plantilla_C','Vía aérea', 52, 1),
  ('plantilla_C','Vía aérea', 53, 1),
  ('plantilla_C','Vía aérea', 54, 1),
  ('plantilla_C','Vía aérea',114, 2),
  ('plantilla_C','Vía aérea',115, 2),
  ('plantilla_C','Vía aérea',116, 2),
  ('plantilla_C','Vía aérea',117, 2),
  ('plantilla_C','Vía aérea',118, 2),
  ('plantilla_C','Vía aérea',119, 3),
  ('plantilla_C','Vía aérea',120, 2),
  ('plantilla_C','Vía aérea',121, 2),
  ('plantilla_C','Vía aérea',122, 1),
  ('plantilla_C','Vía aérea',123, 1),
  ('plantilla_C','Vía aérea',124, 4),
  ('plantilla_C','Vía aérea',125, 1),
  ('plantilla_C','Vía aérea',170, 2),
  ('plantilla_C','Vía aérea',171, 2),
  ('plantilla_C','Vía aérea',172, 2),
  ('plantilla_C','Vía aérea',173, 2),
  ('plantilla_C','Vía aérea',174, 2),
  ('plantilla_C','Vía aérea',175, 2),
  ('plantilla_C','Vía aérea',187, 1),
  ('plantilla_C','Vía aérea',188, 1),
  ('plantilla_C','Vía aérea',189, 1),
  ('plantilla_C','Vía aérea',190, 1),
  ('plantilla_C','Vía aérea',191, 2),
  ('plantilla_C','Vía aérea',192, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Circulatorio',  1, 5),
  ('plantilla_C','Circulatorio',  2, 5),
  ('plantilla_C','Circulatorio',  3, 5),
  ('plantilla_C','Circulatorio',  4, 5),
  ('plantilla_C','Circulatorio',  5, 5),
  ('plantilla_C','Circulatorio',  6, 3),
  ('plantilla_C','Circulatorio',  7, 3),
  ('plantilla_C','Circulatorio', 36, 2),
  ('plantilla_C','Circulatorio', 37, 3),
  ('plantilla_C','Circulatorio', 38, 5),
  ('plantilla_C','Circulatorio', 39, 5),
  ('plantilla_C','Circulatorio', 40, 3),
  ('plantilla_C','Circulatorio', 41, 2),
  ('plantilla_C','Circulatorio',106,10),
  ('plantilla_C','Circulatorio',107,10),
  ('plantilla_C','Circulatorio',108, 5),
  ('plantilla_C','Circulatorio',109,10),
  ('plantilla_C','Circulatorio',110, 3),
  ('plantilla_C','Circulatorio',111, 5),
  ('plantilla_C','Circulatorio',168, 2),
  ('plantilla_C','Circulatorio',193, 3),
  ('plantilla_C','Circulatorio',194, 3),
  ('plantilla_C','Circulatorio',195, 5),
  ('plantilla_C','Circulatorio',196, 3),
  ('plantilla_C','Circulatorio',197, 3),
  ('plantilla_C','Circulatorio',198,10),
  ('plantilla_C','Circulatorio',199, 2),
  ('plantilla_C','Circulatorio',240, 2),
  ('plantilla_C','Circulatorio',241, 5),
  ('plantilla_C','Circulatorio',242, 5),
  ('plantilla_C','Circulatorio',243, 1),
  ('plantilla_C','Circulatorio',244, 5)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Curas y sutura',  8, 1),
  ('plantilla_C','Curas y sutura',  9, 1),
  ('plantilla_C','Curas y sutura', 10, 1),
  ('plantilla_C','Curas y sutura', 11, 5),
  ('plantilla_C','Curas y sutura', 12, 1),
  ('plantilla_C','Curas y sutura', 13, 2),
  ('plantilla_C','Curas y sutura', 14, 2),
  ('plantilla_C','Curas y sutura', 15, 5),
  ('plantilla_C','Curas y sutura', 16, 5),
  ('plantilla_C','Curas y sutura', 17, 5),
  ('plantilla_C','Curas y sutura', 18, 5),
  ('plantilla_C','Curas y sutura', 19, 3),
  ('plantilla_C','Curas y sutura', 20, 3),
  ('plantilla_C','Curas y sutura', 21,10),
  ('plantilla_C','Curas y sutura', 22, 5),
  ('plantilla_C','Curas y sutura', 23, 5),
  ('plantilla_C','Curas y sutura', 24, 1),
  ('plantilla_C','Curas y sutura', 25, 1),
  ('plantilla_C','Curas y sutura', 26, 2),
  ('plantilla_C','Curas y sutura', 27, 1),
  ('plantilla_C','Curas y sutura', 29, 1),
  ('plantilla_C','Curas y sutura', 30, 1),
  ('plantilla_C','Curas y sutura', 31,10),
  ('plantilla_C','Curas y sutura', 32,10),
  ('plantilla_C','Curas y sutura', 33, 5),
  ('plantilla_C','Curas y sutura', 34, 5),
  ('plantilla_C','Curas y sutura', 85, 5),
  ('plantilla_C','Curas y sutura', 86, 2),
  ('plantilla_C','Curas y sutura',169, 1),
  ('plantilla_C','Curas y sutura',176, 1),
  ('plantilla_C','Curas y sutura',177, 1),
  ('plantilla_C','Curas y sutura',178, 1),
  ('plantilla_C','Curas y sutura',179, 1),
  ('plantilla_C','Curas y sutura',180, 1),
  ('plantilla_C','Curas y sutura',181, 1),
  ('plantilla_C','Curas y sutura',182, 1),
  ('plantilla_C','Curas y sutura',183, 1),
  ('plantilla_C','Curas y sutura',184, 1),
  ('plantilla_C','Curas y sutura',185, 1),
  ('plantilla_C','Curas y sutura',186, 1),
  ('plantilla_C','Curas y sutura',200, 2),
  ('plantilla_C','Curas y sutura',201, 1),
  ('plantilla_C','Curas y sutura',202, 1),
  ('plantilla_C','Curas y sutura',203, 2),
  ('plantilla_C','Curas y sutura',204, 2),
  ('plantilla_C','Curas y sutura',205, 2),
  ('plantilla_C','Curas y sutura',206, 3),
  ('plantilla_C','Curas y sutura',207, 1),
  ('plantilla_C','Curas y sutura',208, 3),
  ('plantilla_C','Curas y sutura',209, 1),
  ('plantilla_C','Curas y sutura',210, 1),
  ('plantilla_C','Curas y sutura',211, 2),
  ('plantilla_C','Curas y sutura',212, 2),
  ('plantilla_C','Curas y sutura',213, 2),
  ('plantilla_C','Curas y sutura',214, 1),
  ('plantilla_C','Curas y sutura',215, 1),
  ('plantilla_C','Curas y sutura',223, 2),
  ('plantilla_C','Curas y sutura',224, 3),
  ('plantilla_C','Curas y sutura',225, 3),
  ('plantilla_C','Curas y sutura',226, 3),
  ('plantilla_C','Curas y sutura',227, 3),
  ('plantilla_C','Curas y sutura',228, 3)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- plantilla_C Mochila Roja (idéntica a plantilla_VIR Mochila Roja)
INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Mochila Roja', 26, 1),
  ('plantilla_C','Mochila Roja', 31, 2),
  ('plantilla_C','Mochila Roja', 32, 4),
  ('plantilla_C','Mochila Roja',  1, 5),
  ('plantilla_C','Mochila Roja',  2, 5),
  ('plantilla_C','Mochila Roja',  3, 5),
  ('plantilla_C','Mochila Roja',  4, 5),
  ('plantilla_C','Mochila Roja',  5, 5),
  ('plantilla_C','Mochila Roja', 18, 3),
  ('plantilla_C','Mochila Roja', 36, 1),
  ('plantilla_C','Mochila Roja', 37, 2),
  ('plantilla_C','Mochila Roja', 38, 3),
  ('plantilla_C','Mochila Roja', 39, 3),
  ('plantilla_C','Mochila Roja', 40, 2),
  ('plantilla_C','Mochila Roja', 41, 1),
  ('plantilla_C','Mochila Roja',106, 5),
  ('plantilla_C','Mochila Roja',107, 5),
  ('plantilla_C','Mochila Roja',108, 3),
  ('plantilla_C','Mochila Roja',109, 5),
  ('plantilla_C','Mochila Roja',110, 2),
  ('plantilla_C','Mochila Roja',111, 3),
  ('plantilla_C','Mochila Roja', 85, 3),
  ('plantilla_C','Mochila Roja',168, 1),
  ('plantilla_C','Mochila Roja',195, 3),
  ('plantilla_C','Mochila Roja',196, 2),
  ('plantilla_C','Mochila Roja',197, 2),
  ('plantilla_C','Mochila Roja',240, 1),
  ('plantilla_C','Mochila Roja',241, 3),
  ('plantilla_C','Mochila Roja',242, 3),
  ('plantilla_C','Mochila Roja',244, 3),
  ('plantilla_C','Mochila Roja',129, 2),
  ('plantilla_C','Mochila Roja',130, 3),
  ('plantilla_C','Mochila Roja',131, 2),
  ('plantilla_C','Mochila Roja',133, 2),
  ('plantilla_C','Mochila Roja',140, 2),
  ('plantilla_C','Mochila Roja',146, 1),
  ('plantilla_C','Mochila Roja',147, 3),
  ('plantilla_C','Mochila Roja',152, 1),
  ('plantilla_C','Mochila Roja',153, 1),
  ('plantilla_C','Mochila Roja',139, 2),
  ('plantilla_C','Mochila Roja',145, 2),
  ('plantilla_C','Mochila Roja',150, 3),
  ('plantilla_C','Mochila Roja',158, 3),
  ('plantilla_C','Mochila Roja',160, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Mochila Azul', 31, 2),
  ('plantilla_C','Mochila Azul', 32, 4),
  ('plantilla_C','Mochila Azul', 43, 1),
  ('plantilla_C','Mochila Azul', 44, 1),
  ('plantilla_C','Mochila Azul', 45, 1),
  ('plantilla_C','Mochila Azul', 52, 1),
  ('plantilla_C','Mochila Azul', 53, 1),
  ('plantilla_C','Mochila Azul',117, 1),
  ('plantilla_C','Mochila Azul',118, 1),
  ('plantilla_C','Mochila Azul',164, 1),
  ('plantilla_C','Mochila Azul',165, 1),
  ('plantilla_C','Mochila Azul',198, 5),
  ('plantilla_C','Mochila Azul',136, 2),
  ('plantilla_C','Mochila Azul',137, 2),
  ('plantilla_C','Mochila Azul',151, 2),
  ('plantilla_C','Mochila Azul',162, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_C','Mochila Amarilla',  8, 1),
  ('plantilla_C','Mochila Amarilla', 10, 1),
  ('plantilla_C','Mochila Amarilla', 12, 1),
  ('plantilla_C','Mochila Amarilla', 15, 3),
  ('plantilla_C','Mochila Amarilla', 16, 3),
  ('plantilla_C','Mochila Amarilla', 17, 3),
  ('plantilla_C','Mochila Amarilla', 21, 5),
  ('plantilla_C','Mochila Amarilla', 22, 2),
  ('plantilla_C','Mochila Amarilla', 29, 1),
  ('plantilla_C','Mochila Amarilla', 30, 1),
  ('plantilla_C','Mochila Amarilla', 32, 4),
  ('plantilla_C','Mochila Amarilla', 33, 2),
  ('plantilla_C','Mochila Amarilla', 34, 2),
  ('plantilla_C','Mochila Amarilla', 85, 5),
  ('plantilla_C','Mochila Amarilla', 86, 1),
  ('plantilla_C','Mochila Amarilla', 87, 1),
  ('plantilla_C','Mochila Amarilla', 92, 1),
  ('plantilla_C','Mochila Amarilla', 96, 2),
  ('plantilla_C','Mochila Amarilla', 97, 1),
  ('plantilla_C','Mochila Amarilla',169, 1),
  ('plantilla_C','Mochila Amarilla',219, 1),
  ('plantilla_C','Mochila Amarilla',224, 2),
  ('plantilla_C','Mochila Amarilla',225, 2),
  ('plantilla_C','Mochila Amarilla',226, 2),
  ('plantilla_C','Mochila Amarilla',227, 2),
  ('plantilla_C','Mochila Amarilla',228, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- ── plantilla_VIR ────────────────────────────────────────────

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_VIR','Cabina conducción', 59, 1),
  ('plantilla_VIR','Cabina conducción', 61, 1),
  ('plantilla_VIR','Cabina conducción', 63, 1),
  ('plantilla_VIR','Cabina conducción', 64, 2),
  ('plantilla_VIR','Cabina conducción', 65, 1),
  ('plantilla_VIR','Cabina conducción', 66, 1),
  ('plantilla_VIR','Cabina conducción', 67, 1),
  ('plantilla_VIR','Cabina conducción', 68, 1),
  ('plantilla_VIR','Cabina conducción', 69, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_VIR','Ampulario',129, 2),
  ('plantilla_VIR','Ampulario',130, 3),
  ('plantilla_VIR','Ampulario',131, 2),
  ('plantilla_VIR','Ampulario',133, 2),
  ('plantilla_VIR','Ampulario',136, 2),
  ('plantilla_VIR','Ampulario',137, 2),
  ('plantilla_VIR','Ampulario',138, 2),
  ('plantilla_VIR','Ampulario',139, 2),
  ('plantilla_VIR','Ampulario',140, 2),
  ('plantilla_VIR','Ampulario',145, 2),
  ('plantilla_VIR','Ampulario',146, 1),
  ('plantilla_VIR','Ampulario',147, 3),
  ('plantilla_VIR','Ampulario',150, 3),
  ('plantilla_VIR','Ampulario',151, 2),
  ('plantilla_VIR','Ampulario',152, 1),
  ('plantilla_VIR','Ampulario',153, 1),
  ('plantilla_VIR','Ampulario',155, 1),
  ('plantilla_VIR','Ampulario',158, 3),
  ('plantilla_VIR','Ampulario',160, 2),
  ('plantilla_VIR','Ampulario',162, 2),
  ('plantilla_VIR','Ampulario',163, 1),
  ('plantilla_VIR','Ampulario',232, 2),
  ('plantilla_VIR','Ampulario',234, 2),
  ('plantilla_VIR','Ampulario',236, 3),
  ('plantilla_VIR','Ampulario',237, 3),
  ('plantilla_VIR','Ampulario',238, 3),
  ('plantilla_VIR','Ampulario',219, 1),
  ('plantilla_VIR','Ampulario',222, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- VIR Mochila Roja = idéntica a plantilla_C Mochila Roja
INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo)
  SELECT 'plantilla_VIR', subgrupo, id_item, stock_objetivo
  FROM plantilla_lineas
  WHERE plantilla_id = 'plantilla_C' AND subgrupo = 'Mochila Roja'
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- VIR Mochila Azul = idéntica a plantilla_C Mochila Azul
INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo)
  SELECT 'plantilla_VIR', subgrupo, id_item, stock_objetivo
  FROM plantilla_lineas
  WHERE plantilla_id = 'plantilla_C' AND subgrupo = 'Mochila Azul'
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- VIR Mochila Amarilla = idéntica a plantilla_C Mochila Amarilla
INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo)
  SELECT 'plantilla_VIR', subgrupo, id_item, stock_objetivo
  FROM plantilla_lineas
  WHERE plantilla_id = 'plantilla_C' AND subgrupo = 'Mochila Amarilla'
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- ── plantilla_Quad ───────────────────────────────────────────

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Quad','Mochila Roja', 26, 1),
  ('plantilla_Quad','Mochila Roja', 32, 4),
  ('plantilla_Quad','Mochila Roja',  4, 3),
  ('plantilla_Quad','Mochila Roja',  2, 3),
  ('plantilla_Quad','Mochila Roja', 18, 2),
  ('plantilla_Quad','Mochila Roja', 37, 1),
  ('plantilla_Quad','Mochila Roja', 38, 3),
  ('plantilla_Quad','Mochila Roja', 39, 3),
  ('plantilla_Quad','Mochila Roja', 40, 1),
  ('plantilla_Quad','Mochila Roja',106, 3),
  ('plantilla_Quad','Mochila Roja',107, 3),
  ('plantilla_Quad','Mochila Roja',109, 3),
  ('plantilla_Quad','Mochila Roja',168, 1),
  ('plantilla_Quad','Mochila Roja',195, 2),
  ('plantilla_Quad','Mochila Roja',196, 1),
  ('plantilla_Quad','Mochila Roja',241, 2),
  ('plantilla_Quad','Mochila Roja',242, 2),
  ('plantilla_Quad','Mochila Roja',244, 2),
  ('plantilla_Quad','Mochila Roja',130, 2),
  ('plantilla_Quad','Mochila Roja',133, 1),
  ('plantilla_Quad','Mochila Roja',147, 2),
  ('plantilla_Quad','Mochila Roja',139, 1),
  ('plantilla_Quad','Mochila Roja',150, 2),
  ('plantilla_Quad','Mochila Roja',158, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Quad','Mochila Azul', 32, 4),
  ('plantilla_Quad','Mochila Azul', 43, 1),
  ('plantilla_Quad','Mochila Azul', 44, 1),
  ('plantilla_Quad','Mochila Azul', 45, 1),
  ('plantilla_Quad','Mochila Azul', 52, 1),
  ('plantilla_Quad','Mochila Azul', 53, 1),
  ('plantilla_Quad','Mochila Azul',117, 1),
  ('plantilla_Quad','Mochila Azul',164, 1),
  ('plantilla_Quad','Mochila Azul',198, 3),
  ('plantilla_Quad','Mochila Azul',162, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Quad','Mochila Amarilla',  8, 1),
  ('plantilla_Quad','Mochila Amarilla', 10, 1),
  ('plantilla_Quad','Mochila Amarilla', 15, 3),
  ('plantilla_Quad','Mochila Amarilla', 17, 3),
  ('plantilla_Quad','Mochila Amarilla', 21, 5),
  ('plantilla_Quad','Mochila Amarilla', 29, 1),
  ('plantilla_Quad','Mochila Amarilla', 32, 4),
  ('plantilla_Quad','Mochila Amarilla', 85, 3),
  ('plantilla_Quad','Mochila Amarilla', 87, 1),
  ('plantilla_Quad','Mochila Amarilla', 92, 1),
  ('plantilla_Quad','Mochila Amarilla', 96, 1),
  ('plantilla_Quad','Mochila Amarilla',224, 2),
  ('plantilla_Quad','Mochila Amarilla',225, 2),
  ('plantilla_Quad','Mochila Amarilla',227, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

-- ── plantilla_Backpack ───────────────────────────────────────

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Backpack','Antisépticos',  8, 1),
  ('plantilla_Backpack','Antisépticos',  9, 1),
  ('plantilla_Backpack','Antisépticos', 10, 1),
  ('plantilla_Backpack','Antisépticos', 11, 3),
  ('plantilla_Backpack','Antisépticos', 12, 1),
  ('plantilla_Backpack','Antisépticos', 13, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Backpack','Curas y sutura', 15, 3),
  ('plantilla_Backpack','Curas y sutura', 16, 3),
  ('plantilla_Backpack','Curas y sutura', 17, 3),
  ('plantilla_Backpack','Curas y sutura', 19, 2),
  ('plantilla_Backpack','Curas y sutura', 20, 2),
  ('plantilla_Backpack','Curas y sutura', 21,10),
  ('plantilla_Backpack','Curas y sutura', 22, 2),
  ('plantilla_Backpack','Curas y sutura', 26, 1),
  ('plantilla_Backpack','Curas y sutura', 29, 1),
  ('plantilla_Backpack','Curas y sutura', 30, 1),
  ('plantilla_Backpack','Curas y sutura', 31, 5),
  ('plantilla_Backpack','Curas y sutura', 32, 5),
  ('plantilla_Backpack','Curas y sutura', 33, 3),
  ('plantilla_Backpack','Curas y sutura', 85, 3),
  ('plantilla_Backpack','Curas y sutura',200, 1),
  ('plantilla_Backpack','Curas y sutura',203, 1),
  ('plantilla_Backpack','Curas y sutura',204, 1),
  ('plantilla_Backpack','Curas y sutura',205, 1),
  ('plantilla_Backpack','Curas y sutura',208, 2),
  ('plantilla_Backpack','Curas y sutura',209, 1),
  ('plantilla_Backpack','Curas y sutura',211, 1),
  ('plantilla_Backpack','Curas y sutura',212, 1),
  ('plantilla_Backpack','Curas y sutura',213, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Backpack','Vía venosa periférica',  1, 3),
  ('plantilla_Backpack','Vía venosa periférica',  2, 3),
  ('plantilla_Backpack','Vía venosa periférica',  4, 3),
  ('plantilla_Backpack','Vía venosa periférica', 18, 3),
  ('plantilla_Backpack','Vía venosa periférica', 37, 2),
  ('plantilla_Backpack','Vía venosa periférica', 38, 3),
  ('plantilla_Backpack','Vía venosa periférica', 39, 3),
  ('plantilla_Backpack','Vía venosa periférica', 40, 2),
  ('plantilla_Backpack','Vía venosa periférica',106, 5),
  ('plantilla_Backpack','Vía venosa periférica',107, 5),
  ('plantilla_Backpack','Vía venosa periférica',109, 5),
  ('plantilla_Backpack','Vía venosa periférica',195, 2),
  ('plantilla_Backpack','Vía venosa periférica',198, 5),
  ('plantilla_Backpack','Vía venosa periférica',241, 3),
  ('plantilla_Backpack','Vía venosa periférica',242, 3),
  ('plantilla_Backpack','Vía venosa periférica',244, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Backpack','Vendajes y trauma', 87, 1),
  ('plantilla_Backpack','Vendajes y trauma', 92, 1),
  ('plantilla_Backpack','Vendajes y trauma', 96, 2),
  ('plantilla_Backpack','Vendajes y trauma', 97, 1),
  ('plantilla_Backpack','Vendajes y trauma',168, 1),
  ('plantilla_Backpack','Vendajes y trauma',223, 1),
  ('plantilla_Backpack','Vendajes y trauma',224, 2),
  ('plantilla_Backpack','Vendajes y trauma',225, 2),
  ('plantilla_Backpack','Vendajes y trauma',226, 2),
  ('plantilla_Backpack','Vendajes y trauma',227, 2),
  ('plantilla_Backpack','Vendajes y trauma',228, 2)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Backpack','Diagnóstico', 72, 1),
  ('plantilla_Backpack','Diagnóstico', 75, 1),
  ('plantilla_Backpack','Diagnóstico', 77, 5),
  ('plantilla_Backpack','Diagnóstico', 78, 1),
  ('plantilla_Backpack','Diagnóstico', 80, 2),
  ('plantilla_Backpack','Diagnóstico', 81, 1),
  ('plantilla_Backpack','Diagnóstico', 82, 1),
  ('plantilla_Backpack','Diagnóstico', 84,10)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;

INSERT INTO plantilla_lineas (plantilla_id, subgrupo, id_item, stock_objetivo) VALUES
  ('plantilla_Backpack','Vía aérea', 43, 1),
  ('plantilla_Backpack','Vía aérea', 44, 1),
  ('plantilla_Backpack','Vía aérea', 45, 1),
  ('plantilla_Backpack','Vía aérea', 52, 1),
  ('plantilla_Backpack','Vía aérea', 53, 1),
  ('plantilla_Backpack','Vía aérea',114, 1),
  ('plantilla_Backpack','Vía aérea',117, 1),
  ('plantilla_Backpack','Vía aérea',118, 1),
  ('plantilla_Backpack','Vía aérea',119, 1),
  ('plantilla_Backpack','Vía aérea',164, 1),
  ('plantilla_Backpack','Vía aérea',171, 1),
  ('plantilla_Backpack','Vía aérea',172, 1)
ON CONFLICT (plantilla_id, subgrupo, id_item) DO NOTHING;
