-- ============================================================
--  ALPHA.2 — Seed: catalogo_items + plantillas_stock + vehiculos
--  Idempotente (ON CONFLICT DO NOTHING).
--  catalogo_items: 244 ítems (ya existen en producción).
--  plantillas_stock: 6 plantillas canónicas.
--  vehiculos: 49 vehículos de la flota.
-- ============================================================

-- ── 1. catalogo_items ────────────────────────────────────────
INSERT INTO catalogo_items (id_item, categoria, nombre, especificacion) VALUES
  -- Circulatorio: agujas
  (1,  'Circulatorio',             'Aguja de carga',                  '1,20x40 mm'),
  (2,  'Circulatorio',             'Aguja intramuscular',              '0,80x38 mm'),
  (3,  'Circulatorio',             'Aguja intramuscular',              '0,9x40 mm'),
  (4,  'Circulatorio',             'Aguja intravenosa',                '0,80x25 mm'),
  (5,  'Circulatorio',             'Aguja intravenosa',                '0,9x25 mm'),
  (6,  'Circulatorio',             'Aguja subcutánea/pediátrica',      '0,45x16 mm'),
  (7,  'Circulatorio',             'Aguja subcutánea/pediátrica',      '0,50x16 mm'),
  -- Antisépticos
  (8,  'Antisépticos',             'Agua oxigenada',                   '250ml'),
  (9,  'Antisépticos',             'Alcohol 96%',                      '250ml'),
  (10, 'Antisépticos',             'Clorhexidina',                     '250ml'),
  (11, 'Antisépticos',             'Esponja clorhexidina',             NULL),
  (12, 'Antisépticos',             'Povidona yodada',                  '125ml'),
  (13, 'Antisépticos',             'Spray frío instantáneo',           'Bote'),
  (14, 'Antisépticos',             'Suero fisiológico irrigación',     'Botella'),
  -- Material de curas: apósitos y vendajes menores
  (15, 'Material de curas',        'Apósito',                          '10x10'),
  (16, 'Material de curas',        'Apósito',                          '10x15 o 10x20'),
  (17, 'Material de curas',        'Apósito',                          '5x7 o 5x9'),
  (18, 'Material de curas',        'Apósito fijación vía',             NULL),
  (19, 'Material de curas',        'Steri-trip',                       '12mm x 100mm'),
  (20, 'Material de curas',        'Steri-trip',                       '3mm x 75mm'),
  (21, 'Material de curas',        'Tiritas clásicas',                 NULL),
  -- Residuos / material clínico
  (22, 'Residuos',                 'Bolsa de basura',                  'Amarilla y roja'),
  (23, 'Residuos',                 'Bolsa de basura',                  'Negra'),
  (24, 'Material clínico',         'Bolsa de diuresis',                NULL),
  (25, 'Material clínico',         'Botella orina',                    NULL),
  (26, 'Residuos',                 'Contenedor cortopunzantes',        NULL),
  (27, 'Material clínico',         'Cuña orina',                       NULL),
  (28, 'Material clínico',         'Empapadores',                      NULL),
  (29, 'Material de curas',        'Esparadrapo',                      'Hipoalergénico'),
  (30, 'Material de curas',        'Esparadrapo',                      'Tela o papel'),
  (31, 'Material de curas',        'Guantes',                          'L'),
  (32, 'Material de curas',        'Guantes',                          'M'),
  (33, 'Material de curas',        'Guantes',                          'S'),
  (34, 'Material de curas',        'Guantes',                          'XL'),
  -- Equipamiento asistencial
  (35, 'Equipamiento asistencial', 'Rasuradora desechable',            NULL),
  -- Circulatorio: catéteres
  (36, 'Circulatorio',             'Catéter',                          '14'),
  (37, 'Circulatorio',             'Catéter',                          '16'),
  (38, 'Circulatorio',             'Catéter',                          '18'),
  (39, 'Circulatorio',             'Catéter',                          '20'),
  (40, 'Circulatorio',             'Catéter',                          '22'),
  (41, 'Circulatorio',             'Catéter',                          '24'),
  -- Vía aérea: guedels e i-gel
  (42, 'Vía aérea',                'Cánula de guedel',                 '5'),
  (43, 'Vía aérea',                'Cánula de guedel',                 '6'),
  (44, 'Vía aérea',                'Cánula de guedel',                 '7'),
  (45, 'Vía aérea',                'Cánula de guedel',                 '8'),
  (46, 'Vía aérea',                'Cánula de guedel',                 '9'),
  (47, 'Vía aérea',                'Cánula de guedel',                 '10'),
  (48, 'Vía aérea',                'Cánula de guedel',                 '11'),
  (49, 'Vía aérea',                'Cánula de guedel',                 '12'),
  (50, 'Vía aérea',                'I-gel',                            '2'),
  (51, 'Vía aérea',                'I-gel',                            '3'),
  (52, 'Vía aérea',                'I-gel',                            '4'),
  (53, 'Vía aérea',                'I-gel',                            '5'),
  (54, 'Vía aérea',                'I-gel',                            '6'),
  -- Desfibrilación
  (55, 'Equipamiento asistencial', 'Aspirador de secreciones',         NULL),
  (56, 'Desfibrilación',           'DESA',                             NULL),
  (57, 'Desfibrilación',           'Parches desfibrilación',           'Adulto'),
  (58, 'Desfibrilación',           'Parches desfibrilación',           'Pediátrico'),
  -- Equipamiento de cabina de conducción
  (59, 'Equipamiento conducción',  'Adaptador mechero móvil',          '12v'),
  (60, 'Equipamiento conducción',  'Bayeta / trapo',                   NULL),
  (61, 'Equipamiento conducción',  'Cable cargador móvil',             NULL),
  (62, 'Equipamiento conducción',  'Cable conexión ambulancia',        '220v'),
  (63, 'Equipamiento conducción',  'Carpeta documentación',            NULL),
  (64, 'Equipamiento conducción',  'Chaleco de alta visibilidad',      NULL),
  (65, 'Equipamiento conducción',  'Extintor',                         NULL),
  (66, 'Equipamiento conducción',  'Limpiador desinfectante',          NULL),
  (67, 'Equipamiento conducción',  'Llave ampulario',                  NULL),
  (68, 'Equipamiento conducción',  'Tarjeta de combustible',           NULL),
  (69, 'Equipamiento conducción',  'Teléfono móvil unidad',            NULL),
  -- Equipamiento asistencial: diagnóstico y monitorización
  (70, 'Equipamiento asistencial', 'Calientasueros',                   NULL),
  (71, 'Equipamiento asistencial', 'Depresores de madera',             NULL),
  (72, 'Equipamiento asistencial', 'Esfigmomanómetro digital',         NULL),
  (73, 'Equipamiento asistencial', 'Esfigmomanómetro manual',          NULL),
  (74, 'Equipamiento asistencial', 'Fonendoscopio',                    NULL),
  (75, 'Equipamiento asistencial', 'Glucómetro',                       NULL),
  (76, 'Documentación',            'Informes clínicos',                NULL),
  (77, 'Equipamiento asistencial', 'Lancetas',                         NULL),
  (78, 'Equipamiento asistencial', 'Linterna de exploración',          NULL),
  (79, 'Equipamiento asistencial', 'Manta térmica',                    NULL),
  (80, 'Equipamiento asistencial', 'Pilas reposición',                 NULL),
  (81, 'Equipamiento asistencial', 'Pulsioxímetro',                    NULL),
  (82, 'Equipamiento asistencial', 'Termómetro digital',               NULL),
  (83, 'Equipamiento asistencial', 'Tijera cortaropa',                 NULL),
  (84, 'Equipamiento asistencial', 'Tiras reactivas de glucómetro',    NULL),
  -- Material de curas: gasas
  (85, 'Material de curas',        'Gasa estéril x10',                 '10x10'),
  (86, 'Material de curas',        'Gasa tocológica estéril x3',       '45x45'),
  -- Inmovilización y traslado
  (87, 'Inmovilización',           'Cabestrillo',                      NULL),
  (88, 'Inmovilización',           'Camilla de palas',                 NULL),
  (89, 'Inmovilización',           'Chaleco de extricación',           'Ferno ked'),
  (90, 'Inmovilización',           'Cinturón pélvico',                 NULL),
  (91, 'Inmovilización',           'Colchón de vacío',                 'Con bomba de vacío'),
  (92, 'Inmovilización',           'Collarín adulto',                  'Multitalla'),
  (93, 'Inmovilización',           'Correas camilla',                  'Kit 3 unidades'),
  (94, 'Inmovilización',           'Correas tipo araña',               NULL),
  (95, 'Inmovilización',           'Férula de tracción',               NULL),
  (96, 'Inmovilización',           'Férula digital',                   'Varios tamaños'),
  (97, 'Inmovilización',           'Férula sam splint',                NULL),
  (98, 'Inmovilización',           'Inmovilizador tetracameral',       'Dama de elche'),
  (99, 'Inmovilización',           'Kit contenciones mecánicas agitados', NULL),
  (100,'Inmovilización',           'Kit Férulas semirígidas/vacío',    NULL),
  (101,'Inmovilización',           'Lona de traslado',                 NULL),
  (102,'Inmovilización',           'Silla de evacuación evachair',     NULL),
  (103,'Inmovilización',           'Silla de traslado',                NULL),
  (104,'Inmovilización',           'Tabla rcp',                        NULL),
  (105,'Inmovilización',           'Tablero espinal',                  NULL),
  -- Circulatorio: jeringas + equipamiento asistencial
  (106,'Circulatorio',             'Jeringa',                          '10/12 ml'),
  (107,'Circulatorio',             'Jeringa',                          '2/3 ml'),
  (108,'Circulatorio',             'Jeringa',                          '20ml'),
  (109,'Circulatorio',             'Jeringa',                          '5/6 ml'),
  (110,'Circulatorio',             'Jeringa',                          '50ml'),
  (111,'Circulatorio',             'Jeringa',                          '1ml'),
  (112,'Equipamiento asistencial', 'Manta',                            NULL),
  (113,'Equipamiento asistencial', 'Sábana limpia',                    NULL),
  -- Vía aérea: mascarillas y oxigenoterapia
  (114,'Vía aérea',                'Gafas nasales',                    NULL),
  (115,'Vía aérea',                'Mascarilla nebulizador',           'Adulto'),
  (116,'Vía aérea',                'Mascarilla nebulizador',           'Pediátrico'),
  (117,'Vía aérea',                'Mascarilla reservorio',            'Adulto'),
  (118,'Vía aérea',                'Mascarilla reservorio',            'Pediátrico'),
  (119,'Vía aérea',                'Mascarilla ventimask',             'Adulto'),
  (120,'Vía aérea',                'Mascarilla ventimask',             'Pediátrico'),
  -- Vía aérea: intubación
  (121,'Vía aérea',                'Estilete de intubación',           'Adulto'),
  (122,'Vía aérea',                'Estilete de intubación',           'Pediátrico'),
  (123,'Vía aérea',                'Laringoscopio',                    NULL),
  (124,'Vía aérea',                'Palas laringoscopio',              NULL),
  (125,'Vía aérea',                'Pinzas magil',                     NULL),
  -- Medicación parenteral
  (126,'Medicación parenteral',    'Ácido Tranexámico 500mg',          'Amchafibrin'),
  (127,'Medicación parenteral',    'Actocortina 75mg',                 NULL),
  (128,'Medicación parenteral',    'Actrapid 100ul/ml',                'Insulina'),
  (129,'Medicación parenteral',    'Adenosina 6mg',                    'Adenocor'),
  (130,'Medicación parenteral',    'Adrenalina 1mg',                   NULL),
  (131,'Medicación parenteral',    'Amiodarona 150mg',                 'Trangorex'),
  (132,'Medicación parenteral',    'Atenolol 5mg',                     'Tenormin'),
  (133,'Medicación parenteral',    'Atropina 1mg',                     NULL),
  (134,'Medicación parenteral',    'Benadon 300mg',                    'Piridoxina'),
  (135,'Medicación parenteral',    'Benerva 100mg',                    'Tiamina'),
  (136,'Medicación parenteral',    'Bromuro de ipratropio 500mg',      'Atrovent'),
  (137,'Medicación parenteral',    'Budesonida 0,5mg',                 'Pulmicort'),
  (138,'Medicación parenteral',    'Buscapina 20mg',                   'Butilescopolamina'),
  (139,'Medicación parenteral',    'Dexketoprofeno 50mg',              'Enantyum'),
  (140,'Medicación parenteral',    'Diacepam 10mg',                    'Valium'),
  (141,'Medicación parenteral',    'Digoxina 0,5mg',                   NULL),
  (142,'Medicación parenteral',    'Dogmatil 100mg',                   'Sulpirida'),
  (143,'Medicación parenteral',    'Flumazenil 1mg',                   'Anexate'),
  (144,'Medicación parenteral',    'Flumil 300mg',                     'Acetilcisteína'),
  (145,'Medicación parenteral',    'Furosemida 20mg',                  'Seguril'),
  (146,'Medicación parenteral',    'Glucagen',                         'Glucosa inyectable'),
  (147,'Medicación parenteral',    'Glucosmon',                        'Glucosa oral'),
  (148,'Medicación parenteral',    'Labetalol 100mg',                  'Trandate'),
  (149,'Medicación parenteral',    'Lidocaína / Mepivacaína',          NULL),
  (150,'Medicación parenteral',    'Metamizol 2g',                     'Nolotil'),
  (151,'Medicación parenteral',    'Metilprednisolona 20mg/40mg',      'Urbason'),
  (152,'Medicación parenteral',    'Midazolam 45mg',                   NULL),
  (153,'Medicación parenteral',    'Naloxona 0,4mg',                   NULL),
  (154,'Medicación parenteral',    'Nitroglicerina 50mg',              'Solinitrina'),
  (155,'Medicación parenteral',    'Nitroglicerina spray',             'Trinispray'),
  (156,'Medicación parenteral',    'Noradrenalina 5mg',                NULL),
  (157,'Medicación parenteral',    'Pantoprazol 40mg',                 'Omeprazol'),
  (158,'Medicación parenteral',    'Paracetamol 1000mg',               NULL),
  (159,'Medicación parenteral',    'Polaramine 5mg',                   'Dexclorfeniramina'),
  (160,'Medicación parenteral',    'Primperam 10mg',                   'Metoclopramida'),
  (161,'Medicación parenteral',    'Salbutamol',                       'Ventolin'),
  (162,'Medicación parenteral',    'Salbutamol 2,5mg',                 NULL),
  (163,'Medicación parenteral',    'Stesolid 10mg',                    'Diacepam rectal'),
  -- Vía aérea: resucitación, O2, aspiración, intubación
  (164,'Vía aérea',                'Balón resucitador',                'Adulto'),
  (165,'Vía aérea',                'Balón resucitador',                'Pediátrico'),
  (166,'Vía aérea',                'Botella de oxígeno portátil',      '5 litros'),
  (167,'Vía aérea',                'Vaso humificador O2',              NULL),
  -- Material de curas: hemostasia y obstetricia
  (168,'Material de curas',        'Set de control de hemorragias',    NULL),
  (169,'Obstetricia',              'Set de partos',                    NULL),
  -- Vía aérea: sondas de aspiración
  (170,'Vía aérea',                'Sonda de aspiración',              '8'),
  (171,'Vía aérea',                'Sonda de aspiración',              '10'),
  (172,'Vía aérea',                'Sonda de aspiración',              '12'),
  (173,'Vía aérea',                'Sonda de aspiración',              '14'),
  (174,'Vía aérea',                'Sonda de aspiración',              '16'),
  (175,'Vía aérea',                'Sonda de aspiración',              '18'),
  -- Material de curas: sondas
  (176,'Material de curas',        'Sonda nasogástrica',               'nº10'),
  (177,'Material de curas',        'Sonda nasogástrica',               'nº12'),
  (178,'Material de curas',        'Sonda nasogástrica',               'nº14'),
  (179,'Material de curas',        'Sonda nasogástrica',               'nº16'),
  (180,'Material de curas',        'Sonda nasogástrica',               'nº18'),
  (181,'Material de curas',        'Sonda vesical / Foley',            'nº12'),
  (182,'Material de curas',        'Sonda vesical / Foley',            'nº14'),
  (183,'Material de curas',        'Sonda vesical / Foley',            'nº16'),
  (184,'Material de curas',        'Sonda vesical / Foley',            'nº18'),
  (185,'Material de curas',        'Sonda vesical / Foley',            'nº20'),
  (186,'Material de curas',        'Sonda vesical / Foley',            'nº22'),
  -- Vía aérea: tubos endotraqueales
  (187,'Vía aérea',                'Tubo endotraqueal',                '3'),
  (188,'Vía aérea',                'Tubo endotraqueal',                '4'),
  (189,'Vía aérea',                'Tubo endotraqueal',                '5'),
  (190,'Vía aérea',                'Tubo endotraqueal',                '6'),
  (191,'Vía aérea',                'Tubo endotraqueal',                '7'),
  (192,'Vía aérea',                'Tubo endotraqueal',                '8'),
  -- Circulatorio: fluidoterapia
  (193,'Circulatorio',             'Gelaspan 40mg/ml',                 '500ml'),
  (194,'Circulatorio',             'Suero fisiológico',                '1000ml'),
  (195,'Circulatorio',             'Suero fisiológico',                '100ml'),
  (196,'Circulatorio',             'Suero fisiológico',                '250ml'),
  (197,'Circulatorio',             'Suero fisiológico',                '500ml'),
  (198,'Circulatorio',             'Suero fisiológico',                '3ml'),
  (199,'Circulatorio',             'Suero glucosado al 5%',            '250ml'),
  -- Material de curas: material quirúrgico
  (200,'Material de curas',        'Bandeja desechable',               NULL),
  (201,'Material de curas',        'Caja instrumental',                NULL),
  (202,'Material de curas',        'Grapadora estéril',                NULL),
  (203,'Material de curas',        'Guante estéril',                   '6'),
  (204,'Material de curas',        'Guante estéril',                   '7'),
  (205,'Material de curas',        'Guante estéril',                   '8'),
  (206,'Material de curas',        'Hojas bisturí',                    NULL),
  (207,'Material de curas',        'Mango bisturí estéril',            NULL),
  (208,'Material de curas',        'Paño estéril',                     NULL),
  (209,'Material de curas',        'Pinza estéril',                    NULL),
  (210,'Material de curas',        'Portaagujas estéril',              NULL),
  (211,'Material de curas',        'Seda sutura',                      '2/0'),
  (212,'Material de curas',        'Seda sutura',                      '3/0'),
  (213,'Material de curas',        'Seda sutura',                      '4/0'),
  (214,'Material de curas',        'Seda sutura',                      '5/0'),
  (215,'Material de curas',        'Tijeras estéril',                  NULL),
  -- Medicación tópica
  (216,'Medicación tópica',        'Diclofenaco',                      'Antiinflamatoria'),
  (217,'Medicación tópica',        'Prometazina',                      'Fenergan'),
  (218,'Medicación tópica',        'Metilprednisolona',                'Lexxema'),
  (219,'Medicación tópica',        'Lubricante hidrosoluble',          NULL),
  (220,'Medicación tópica',        'Lubricante urológico',             NULL),
  (221,'Medicación tópica',        'Sulfadiazina de plata',            'Silvederma'),
  (222,'Medicación tópica',        'Vaselina pura',                    NULL),
  -- Material de curas: vendajes
  (223,'Material de curas',        'Venda algodón',                    NULL),
  (224,'Material de curas',        'Venda cohesiva',                   NULL),
  (225,'Material de curas',        'Venda elástica crepé',             '10x10'),
  (226,'Material de curas',        'Venda elástica crepé',             '10x4'),
  (227,'Material de curas',        'Venda elástica crepé',             '5x4 o 7x4'),
  (228,'Material de curas',        'Venda gasa orillada',              NULL),
  -- Medicación oral/enteral
  (229,'Medicación oral',          'Alprazolam',                       '0,5mg'),
  (230,'Medicación oral',          'Amlodipino',                       '5mg'),
  (231,'Medicación oral',          'Atenolol',                         '50mg'),
  (232,'Medicación oral',          'Captopril',                        '50mg/25mg'),
  (233,'Medicación oral',          'Clopidogrel',                      '75mg'),
  (234,'Medicación oral',          'Diacepam',                         '5mg'),
  (235,'Medicación oral',          'Diclofenaco',                      '50mg'),
  (236,'Medicación oral',          'Ibuprofeno',                       '600mg'),
  (237,'Medicación oral',          'Metamizol',                        '575mg'),
  (238,'Medicación oral',          'Paracetamol',                      '650mg/1g'),
  (239,'Medicación oral',          'Prednisona',                       '30mg'),
  -- Circulatorio: sistemas de infusión
  (240,'Circulatorio',             'Dial a flow',                      NULL),
  (241,'Circulatorio',             'Ligadura',                         NULL),
  (242,'Circulatorio',             'Llave de tres vías',               NULL),
  (243,'Circulatorio',             'Manguito de infusión a presión',   NULL),
  (244,'Circulatorio',             'Sistema de suero',                 NULL)
ON CONFLICT (id_item) DO NOTHING;

-- ── 2. plantillas_stock ──────────────────────────────────────
INSERT INTO plantillas_stock (plantilla_id, tipo, perfil) VALUES
  ('plantilla_A1A2',    'A1, A2', 'No asistencial — transporte sin dotación médica'),
  ('plantilla_B',       'B',      'Básica — Soporte Vital Básico (SVB)'),
  ('plantilla_C',       'C',      'SVA — Soporte Vital Avanzado completo'),
  ('plantilla_VIR',     'VIR',    'Intervención rápida — ampulario + 3 mochilas'),
  ('plantilla_Quad',    'Quad',   'Solo mochilas'),
  ('plantilla_Backpack','BKP',    'Mochila individual DRP/PSA')
ON CONFLICT (plantilla_id) DO NOTHING;

-- ── 3. vehiculos (49 unidades) ───────────────────────────────
-- A1 (2 vehículos)
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display, plantilla_id) VALUES
  ('0301UI', 'A1', '301', 'Ambulancia 301 tipo A1', 'plantilla_A1A2'),
  ('0302UI', 'A1', '302', 'Ambulancia 302 tipo A1', 'plantilla_A1A2')
ON CONFLICT (matricula) DO NOTHING;

-- A2 (10 vehículos)
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display, plantilla_id) VALUES
  ('0401UI', 'A2', '401', 'Ambulancia 401 tipo A2', 'plantilla_A1A2'),
  ('0402UI', 'A2', '402', 'Ambulancia 402 tipo A2', 'plantilla_A1A2'),
  ('0403UI', 'A2', '403', 'Ambulancia 403 tipo A2', 'plantilla_A1A2'),
  ('0404UI', 'A2', '404', 'Ambulancia 404 tipo A2', 'plantilla_A1A2'),
  ('0405UI', 'A2', '405', 'Ambulancia 405 tipo A2', 'plantilla_A1A2'),
  ('0406UI', 'A2', '406', 'Ambulancia 406 tipo A2', 'plantilla_A1A2'),
  ('0407UI', 'A2', '407', 'Ambulancia 407 tipo A2', 'plantilla_A1A2'),
  ('0408UI', 'A2', '408', 'Ambulancia 408 tipo A2', 'plantilla_A1A2'),
  ('0409UI', 'A2', '409', 'Ambulancia 409 tipo A2', 'plantilla_A1A2'),
  ('0410UI', 'A2', '410', 'Ambulancia 410 tipo A2', 'plantilla_A1A2')
ON CONFLICT (matricula) DO NOTHING;

-- B (10 vehículos)
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display, plantilla_id) VALUES
  ('0201UI', 'B', '201', 'Ambulancia 201 tipo B', 'plantilla_B'),
  ('0202UI', 'B', '202', 'Ambulancia 202 tipo B', 'plantilla_B'),
  ('0203UI', 'B', '203', 'Ambulancia 203 tipo B', 'plantilla_B'),
  ('0204UI', 'B', '204', 'Ambulancia 204 tipo B', 'plantilla_B'),
  ('0205UI', 'B', '205', 'Ambulancia 205 tipo B', 'plantilla_B'),
  ('0206UI', 'B', '206', 'Ambulancia 206 tipo B', 'plantilla_B'),
  ('0207UI', 'B', '207', 'Ambulancia 207 tipo B', 'plantilla_B'),
  ('0208UI', 'B', '208', 'Ambulancia 208 tipo B', 'plantilla_B'),
  ('0209UI', 'B', '209', 'Ambulancia 209 tipo B', 'plantilla_B'),
  ('0210UI', 'B', '210', 'Ambulancia 210 tipo B', 'plantilla_B')
ON CONFLICT (matricula) DO NOTHING;

-- C (20 vehículos)
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display, plantilla_id) VALUES
  ('0101UI', 'C', '101', 'Ambulancia 101 tipo C', 'plantilla_C'),
  ('0102UI', 'C', '102', 'Ambulancia 102 tipo C', 'plantilla_C'),
  ('0103UI', 'C', '103', 'Ambulancia 103 tipo C', 'plantilla_C'),
  ('0104UI', 'C', '104', 'Ambulancia 104 tipo C', 'plantilla_C'),
  ('0105UI', 'C', '105', 'Ambulancia 105 tipo C', 'plantilla_C'),
  ('0106UI', 'C', '106', 'Ambulancia 106 tipo C', 'plantilla_C'),
  ('0107UI', 'C', '107', 'Ambulancia 107 tipo C', 'plantilla_C'),
  ('0108UI', 'C', '108', 'Ambulancia 108 tipo C', 'plantilla_C'),
  ('0109UI', 'C', '109', 'Ambulancia 109 tipo C', 'plantilla_C'),
  ('0110UI', 'C', '110', 'Ambulancia 110 tipo C', 'plantilla_C'),
  ('0111UI', 'C', '111', 'Ambulancia 111 tipo C', 'plantilla_C'),
  ('0112UI', 'C', '112', 'Ambulancia 112 tipo C', 'plantilla_C'),
  ('0113UI', 'C', '113', 'Ambulancia 113 tipo C', 'plantilla_C'),
  ('0114UI', 'C', '114', 'Ambulancia 114 tipo C', 'plantilla_C'),
  ('0115UI', 'C', '115', 'Ambulancia 115 tipo C', 'plantilla_C'),
  ('0116UI', 'C', '116', 'Ambulancia 116 tipo C', 'plantilla_C'),
  ('0117UI', 'C', '117', 'Ambulancia 117 tipo C', 'plantilla_C'),
  ('0118UI', 'C', '118', 'Ambulancia 118 tipo C', 'plantilla_C'),
  ('0119UI', 'C', '119', 'Ambulancia 119 tipo C', 'plantilla_C'),
  ('0120UI', 'C', '120', 'Ambulancia 120 tipo C', 'plantilla_C')
ON CONFLICT (matricula) DO NOTHING;

-- VIR (2 vehículos)
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display, plantilla_id) VALUES
  ('VIR1UI', 'VIR', 'VIR1', 'VIR 1', 'plantilla_VIR'),
  ('VIR2UI', 'VIR', 'VIR2', 'VIR 2', 'plantilla_VIR')
ON CONFLICT (matricula) DO NOTHING;

-- Quad (2 vehículos)
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display, plantilla_id) VALUES
  ('QAD1UI', 'Quad', 'QAD1', 'Quad 1', 'plantilla_Quad'),
  ('QAD2UI', 'Quad', 'QAD2', 'Quad 2', 'plantilla_Quad')
ON CONFLICT (matricula) DO NOTHING;

-- Unidad Movil (2 vehículos) — matrícula placeholder, sin plantilla fija
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display) VALUES
  ('UM01UI', 'Unidad Movil', 'UM1', 'Unidad Móvil 1'),
  ('UM02UI', 'Unidad Movil', 'UM2', 'Unidad Móvil 2')
ON CONFLICT (matricula) DO NOTHING;

-- Logistica (1 vehículo) — matrícula placeholder, sin plantilla fija
INSERT INTO vehiculos (matricula, tipo, vehiculo_id, nombre_display) VALUES
  ('LOG1UI', 'Logistica', 'LOG1', 'Logística 1')
ON CONFLICT (matricula) DO NOTHING;
