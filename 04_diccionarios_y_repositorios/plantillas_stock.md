# Plantillas de Stock

> Datos semilla para la tabla `plantillas_stock`.
> Los valores de `stock_objetivo` son provisionales — se ajustarán en la configuración inicial de la aplicación.
> Los campos `ID_item` referencian `catalogo_items`. Cada fila representa una entrada única `(plantilla_id, subgrupo, ID_item)`.

---

## Índice de plantillas

| plantilla_id | tipo | perfil | subgrupos |
|---|---|---|---|
| `plantilla_A1A2` | A1, A2 | No asistencial — transporte sin dotación médica | Cabina conducción · Cabina asistencial · Armario inm-mov · Ampulario · Vía aérea · Circulatorio · Curas y sutura · Mochila Roja · Mochila Azul · Mochila Amarilla |
| `plantilla_B` | B | Básica — Soporte Vital Básico (SVB) | Cabina conducción · Cabina asistencial · Armario inm-mov · Ampulario · Vía aérea · Circulatorio · Curas y sutura · Mochila Roja · Mochila Azul · Mochila Amarilla |
| `plantilla_C` | C | SVA — Soporte Vital Avanzado completo | Cabina conducción · Cabina asistencial · Armario inm-mov · Ampulario · Vía aérea · Circulatorio · Curas y sutura · Mochila Roja · Mochila Azul · Mochila Amarilla |
| `plantilla_VIR` | VIR | Intervención rápida — ampulario + 3 mochilas | Cabina conducción · Ampulario · Mochila Roja · Mochila Azul · Mochila Amarilla |
| `plantilla_Quad` | Quad | Solo mochilas | Mochila Roja · Mochila Azul · Mochila Amarilla |
| `plantilla_Backpack` | BKP1–BKP8 | Mochila individual DRP/PSA | Antisépticos · Curas y sutura · Vía venosa periférica · Vendajes y trauma · Diagnóstico · Vía aérea |

---

## plantilla_A1A2 — tipos A1, A2

> **No asistencial.** Vehículo de transporte programado sin personal sanitario asistencial. Sin medicación. Dotación mínima de seguridad, traslado y primeros auxilios básicos.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 59 | Adaptador mechero móvil | 12v | 1 |
| 60 | Bayeta / trapo | — | 2 |
| 61 | Cable cargador móvil | — | 1 |
| 62 | Cable conexión ambulancia | 220v | 1 |
| 63 | Carpeta documentación | — | 1 |
| 64 | Chaleco de alta visibilidad | — | 2 |
| 65 | Extintor | — | 1 |
| 66 | Limpiador desinfectante | — | 1 |
| 68 | Tarjeta de combustible | — | 1 |
| 69 | Teléfono móvil unidad | — | 1 |

### Cabina asistencial

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 28 | Empapadores | — | 5 |
| 76 | Informes clínicos | — | 20 |
| 79 | Manta térmica | — | 2 |
| 112 | Manta | — | 2 |
| 113 | Sábana limpia | — | 3 |

### Armario inm-mov

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 56 | DESA | — | 1 |
| 57 | Parches desfibrilación | Adulto | 1 |
| 88 | Camilla de palas | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 93 | Correas camilla | Kit 3 unidades | 1 |
| 101 | Lona de traslado | — | 1 |
| 102 | Silla de evacuación evachair | — | 1 |
| 103 | Silla de traslado | — | 1 |
| 105 | Tablero espinal | — | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 166 | Botella de oxígeno portátil | 5 litros | 1 |
| 167 | Vaso humificador O2 | — | 1 |

### Ampulario

> Sin medicación en vehículo no asistencial. Subgrupo vacío — reservado para coherencia estructural con el resto de tipos.

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 114 | Gafas nasales | — | 2 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 119 | Mascarilla ventimask | Adulto | 2 |

### Circulatorio

> Sin material de vía venosa en vehículo no asistencial. Subgrupo vacío.

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 9 | Alcohol 96% | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 12 | Povidona yodada | 125ml | 1 |
| 15 | Apósito | 10x10 | 3 |
| 17 | Apósito | 5x7 o 5x9 | 3 |
| 21 | Tiritas clásicas | — | 10 |
| 22 | Bolsa de basura | Amarilla y roja | 3 |
| 23 | Bolsa de basura | Negra | 3 |
| 26 | Contenedor cortopunzantes | — | 1 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Guantes | L | 5 |
| 32 | Guantes | M | 5 |
| 33 | Guantes | S | 3 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |

### Mochila Roja

> Bolsa de circulatorio y control de hemorragias básico.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 26 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | M | 4 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 168 | Set de control de hemorragias | — | 1 |

### Mochila Azul

> Bolsa de respiratorio y ventilación básica.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 32 | Guantes | M | 4 |
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 164 | Balón resucitador | Adulto | 1 |

### Mochila Amarilla

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 15 | Apósito | 10x10 | 3 |
| 21 | Tiritas clásicas | — | 5 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 32 | Guantes | M | 4 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 87 | Cabestrillo | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |

---

## plantilla_B — tipo B

> **Básica (SVB).** Soporte Vital Básico. Farmacología básica de BLS.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 59 | Adaptador mechero móvil | 12v | 1 |
| 60 | Bayeta / trapo | — | 2 |
| 61 | Cable cargador móvil | — | 1 |
| 62 | Cable conexión ambulancia | 220v | 1 |
| 63 | Carpeta documentación | — | 1 |
| 64 | Chaleco de alta visibilidad | — | 2 |
| 65 | Extintor | — | 1 |
| 66 | Limpiador desinfectante | — | 1 |
| 67 | Llave ampulario | — | 1 |
| 68 | Tarjeta de combustible | — | 1 |
| 69 | Teléfono móvil unidad | — | 1 |

### Cabina asistencial

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 28 | Empapadores | — | 5 |
| 35 | Rasuradora desechable | — | 2 |
| 71 | Depresores de madera | — | 10 |
| 72 | Esfigmomanómetro digital | — | 1 |
| 73 | Esfigmomanómetro manual | — | 1 |
| 74 | Fonendoscopio | — | 1 |
| 75 | Glucómetro | — | 1 |
| 76 | Informes clínicos | — | 20 |
| 77 | Lancetas | — | 10 |
| 78 | Linterna de exploración | — | 1 |
| 79 | Manta térmica | — | 2 |
| 80 | Pilas reposición | — | 4 |
| 81 | Pulsioxímetro | — | 1 |
| 82 | Termómetro digital | — | 1 |
| 83 | Tijera cortaropa | — | 1 |
| 84 | Tiras reactivas de glucómetro | — | 25 |
| 112 | Manta | — | 2 |
| 113 | Sábana limpia | — | 3 |

### Armario inm-mov

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 55 | Aspirador de secreciones | — | 1 |
| 56 | DESA | — | 1 |
| 57 | Parches desfibrilación | Adulto | 2 |
| 58 | Parches desfibrilación | Pediátrico | 1 |
| 87 | Cabestrillo | — | 2 |
| 88 | Camilla de palas | — | 1 |
| 92 | Collarín adulto | Multitalla | 2 |
| 93 | Correas camilla | Kit 3 unidades | 1 |
| 94 | Correas tipo araña | — | 1 |
| 96 | Férula digital | Varios tamaños | 4 |
| 97 | Férula sam splint | — | 2 |
| 101 | Lona de traslado | — | 1 |
| 102 | Silla de evacuación evachair | — | 1 |
| 103 | Silla de traslado | — | 1 |
| 104 | Tabla rcp | — | 1 |
| 105 | Tablero espinal | — | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 165 | Balón resucitador | Pediátrico | 1 |
| 166 | Botella de oxígeno portátil | 5 litros | 2 |
| 167 | Vaso humificador O2 | — | 2 |

### Ampulario

**Medicación parenteral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 130 | Adrenalina 1mg | — | 3 |
| 133 | Atropina 1mg | — | 2 |
| 136 | Bromuro de ipratropio 500mg | Atrovent | 3 |
| 137 | Budesonida 0,5mg | Pulmicort | 3 |
| 138 | Buscapina 20mg | Butilescopolamina | 3 |
| 139 | Dexketoprofeno 50mg | Enantyum | 3 |
| 140 | Diacepam 10mg | Valium | 2 |
| 145 | Furosemida 20mg | Seguril | 2 |
| 146 | Glucagen | Glucosa inyectable | 2 |
| 147 | Glucosmon | Glucosa oral | 5 |
| 150 | Metamizol 2g | Nolotil | 5 |
| 151 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 153 | Naloxona 0,4mg | — | 2 |
| 155 | Nitroglicerina spray | Trinispray | 2 |
| 158 | Paracetamol 1000mg | — | 5 |
| 160 | Primperam 10mg | Metoclopramida | 3 |
| 161 | Salbutamol | Ventolin | 3 |
| 162 | Salbutamol 2,5mg | — | 3 |
| 163 | Stesolid 10mg | Diacepam rectal | 2 |

**Vía enteral / oral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 232 | Captopril | 50mg/25mg | 3 |
| 234 | Diacepam | 5mg | 3 |
| 235 | Diclofenaco | 50mg | 3 |
| 236 | Ibuprofeno | 600mg | 5 |
| 237 | Metamizol | 575mg | 5 |
| 238 | Paracetamol | 650mg/1g | 5 |

**Tópicos**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 216 | Diclofenaco | Antiinflamatoria | 2 |
| 219 | Lubricante hidrosoluble | — | 2 |
| 220 | Lubricante urológico | — | 1 |
| 222 | Vaselina pura | — | 1 |

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 42 | Cánula de guedel | 5 | 2 |
| 43 | Cánula de guedel | 6 | 2 |
| 44 | Cánula de guedel | 7 | 2 |
| 45 | Cánula de guedel | 8 | 2 |
| 46 | Cánula de guedel | 9 | 2 |
| 47 | Cánula de guedel | 10 | 2 |
| 48 | Cánula de guedel | 11 | 2 |
| 49 | Cánula de guedel | 12 | 2 |
| 51 | I-gel | 3 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 54 | I-gel | 6 | 1 |
| 114 | Gafas nasales | — | 2 |
| 115 | Mascarilla nebulizador | Adulto | 2 |
| 116 | Mascarilla nebulizador | Pediátrico | 2 |
| 117 | Mascarilla reservorio | Adulto | 2 |
| 118 | Mascarilla reservorio | Pediátrico | 2 |
| 119 | Mascarilla ventimask | Adulto | 3 |
| 120 | Mascarilla ventimask | Pediátrico | 2 |
| 170 | Sonda de aspiración | 8 | 2 |
| 171 | Sonda de aspiración | 10 | 2 |
| 172 | Sonda de aspiración | 12 | 2 |
| 173 | Sonda de aspiración | 14 | 2 |
| 174 | Sonda de aspiración | 16 | 2 |

### Circulatorio

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 1 | Aguja de carga | 1,20x40 mm | 5 |
| 2 | Aguja intramuscular | 0,80x38 mm | 5 |
| 3 | Aguja intramuscular | 0,9x40 mm | 5 |
| 4 | Aguja intravenosa | 0,80x25 mm | 5 |
| 5 | Aguja intravenosa | 0,9x25 mm | 5 |
| 37 | Catéter | 16 | 2 |
| 38 | Catéter | 18 | 5 |
| 39 | Catéter | 20 | 5 |
| 40 | Catéter | 22 | 3 |
| 41 | Catéter | 24 | 2 |
| 106 | Jeringa | 10/12 ml | 10 |
| 107 | Jeringa | 2/3 ml | 10 |
| 108 | Jeringa | 20ml | 5 |
| 109 | Jeringa | 5/6 ml | 10 |
| 111 | Jeringa | 1ml | 5 |
| 168 | Set de control de hemorragias | — | 2 |
| 194 | Suero fisiológico | 1000ml | 3 |
| 195 | Suero fisiológico | 100ml | 5 |
| 196 | Suero fisiológico | 250ml | 3 |
| 197 | Suero fisiológico | 500ml | 3 |
| 198 | Suero fisiológico | 3ml | 10 |
| 241 | Ligadura | — | 5 |
| 242 | Llave de tres vías | — | 5 |
| 244 | Sistema de suero | — | 5 |

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 9 | Alcohol 96% | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 11 | Esponja clorhexidina | — | 5 |
| 12 | Povidona yodada | 125ml | 1 |
| 13 | Spray frío instantáneo | Bote | 2 |
| 14 | Suero fisiológico irrigación | Botella | 2 |
| 15 | Apósito | 10x10 | 5 |
| 16 | Apósito | 10x15 o 10x20 | 5 |
| 17 | Apósito | 5x7 o 5x9 | 5 |
| 18 | Apósito fijación vía | — | 5 |
| 19 | Steri-trip | 12mm x 100mm | 3 |
| 20 | Steri-trip | 3mm x 75mm | 3 |
| 21 | Tiritas clásicas | — | 10 |
| 22 | Bolsa de basura | Amarilla y roja | 5 |
| 23 | Bolsa de basura | Negra | 5 |
| 24 | Bolsa de diuresis | — | 1 |
| 26 | Contenedor cortopunzantes | — | 2 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 30 | Esparadrapo | Tela o papel | 1 |
| 31 | Guantes | L | 10 |
| 32 | Guantes | M | 10 |
| 33 | Guantes | S | 5 |
| 34 | Guantes | XL | 5 |
| 85 | Gasa estéril x10 | 10x10 | 5 |
| 86 | Gasa tocológica estéril x3 | 45x45 | 2 |
| 169 | Set de partos | — | 1 |
| 200 | Bandeja desechable | — | 2 |
| 203 | Guante estéril | 6 | 2 |
| 204 | Guante estéril | 7 | 2 |
| 205 | Guante estéril | 8 | 2 |
| 206 | Hojas bisturí | — | 3 |
| 208 | Paño estéril | — | 3 |
| 209 | Pinza estéril | — | 1 |
| 211 | Seda sutura | 2/0 | 2 |
| 212 | Seda sutura | 3/0 | 2 |
| 213 | Seda sutura | 4/0 | 2 |
| 223 | Venda algodón | — | 2 |
| 224 | Venda cohesiva | — | 3 |
| 225 | Venda elástica crepé | 10x10 | 3 |
| 226 | Venda elástica crepé | 10x4 | 3 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 3 |
| 228 | Venda gasa orillada | — | 3 |

### Mochila Roja

> Bolsa de circulatorio, accesos vasculares y fármacos de emergencia.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 26 | Contenedor cortopunzantes | — | 1 |
| 31 | Guantes | L | 2 |
| 32 | Guantes | M | 4 |
| 1 | Aguja de carga | 1,20x40 mm | 5 |
| 2 | Aguja intramuscular | 0,80x38 mm | 5 |
| 3 | Aguja intramuscular | 0,9x40 mm | 5 |
| 4 | Aguja intravenosa | 0,80x25 mm | 5 |
| 5 | Aguja intravenosa | 0,9x25 mm | 5 |
| 18 | Apósito fijación vía | — | 3 |
| 38 | Catéter | 18 | 2 |
| 39 | Catéter | 20 | 2 |
| 106 | Jeringa | 10/12 ml | 3 |
| 107 | Jeringa | 2/3 ml | 5 |
| 109 | Jeringa | 5/6 ml | 5 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 168 | Set de control de hemorragias | — | 1 |
| 195 | Suero fisiológico | 100ml | 3 |
| 196 | Suero fisiológico | 250ml | 2 |
| 241 | Ligadura | — | 2 |
| 242 | Llave de tres vías | — | 3 |
| 244 | Sistema de suero | — | 3 |
| 130 | Adrenalina 1mg | — | 2 |
| 133 | Atropina 1mg | — | 2 |
| 140 | Diacepam 10mg | Valium | 2 |
| 146 | Glucagen | Glucosa inyectable | 1 |
| 147 | Glucosmon | Glucosa oral | 3 |
| 139 | Dexketoprofeno 50mg | Enantyum | 2 |
| 150 | Metamizol 2g | Nolotil | 3 |
| 158 | Paracetamol 1000mg | — | 3 |

### Mochila Azul

> Bolsa de respiratorio, manejo de vía aérea y ventilación.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 31 | Guantes | L | 2 |
| 32 | Guantes | M | 4 |
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 118 | Mascarilla reservorio | Pediátrico | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 165 | Balón resucitador | Pediátrico | 1 |
| 198 | Suero fisiológico | 3ml | 5 |
| 151 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 162 | Salbutamol 2,5mg | — | 2 |

### Mochila Amarilla

> Bolsa de trauma, inmovilización y obstetricia.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 12 | Povidona yodada | 125ml | 1 |
| 15 | Apósito | 10x10 | 3 |
| 16 | Apósito | 10x15 o 10x20 | 3 |
| 17 | Apósito | 5x7 o 5x9 | 3 |
| 21 | Tiritas clásicas | — | 5 |
| 22 | Bolsa de basura | Amarilla y roja | 2 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 30 | Esparadrapo | Tela o papel | 1 |
| 32 | Guantes | M | 4 |
| 33 | Guantes | S | 2 |
| 34 | Guantes | XL | 2 |
| 85 | Gasa estéril x10 | 10x10 | 5 |
| 86 | Gasa tocológica estéril x3 | 45x45 | 1 |
| 87 | Cabestrillo | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 96 | Férula digital | Varios tamaños | 2 |
| 97 | Férula sam splint | — | 1 |
| 169 | Set de partos | — | 1 |
| 219 | Lubricante hidrosoluble | — | 1 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 226 | Venda elástica crepé | 10x4 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 228 | Venda gasa orillada | — | 2 |

---

## plantilla_C — tipo C

> **SVA (Soporte Vital Avanzado).** Dotación completa con capacidad de intubación orotraqueal, farmacología avanzada y equipo completo de inmovilización y extricación.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 59 | Adaptador mechero móvil | 12v | 1 |
| 60 | Bayeta / trapo | — | 2 |
| 61 | Cable cargador móvil | — | 1 |
| 62 | Cable conexión ambulancia | 220v | 1 |
| 63 | Carpeta documentación | — | 1 |
| 64 | Chaleco de alta visibilidad | — | 2 |
| 65 | Extintor | — | 1 |
| 66 | Limpiador desinfectante | — | 1 |
| 67 | Llave ampulario | — | 1 |
| 68 | Tarjeta de combustible | — | 1 |
| 69 | Teléfono móvil unidad | — | 1 |

### Cabina asistencial

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 28 | Empapadores | — | 5 |
| 35 | Rasuradora desechable | — | 2 |
| 70 | Calientasueros | — | 1 |
| 71 | Depresores de madera | — | 10 |
| 72 | Esfigmomanómetro digital | — | 1 |
| 73 | Esfigmomanómetro manual | — | 1 |
| 74 | Fonendoscopio | — | 1 |
| 75 | Glucómetro | — | 1 |
| 76 | Informes clínicos | — | 20 |
| 77 | Lancetas | — | 10 |
| 78 | Linterna de exploración | — | 1 |
| 79 | Manta térmica | — | 3 |
| 80 | Pilas reposición | — | 4 |
| 81 | Pulsioxímetro | — | 1 |
| 82 | Termómetro digital | — | 1 |
| 83 | Tijera cortaropa | — | 1 |
| 84 | Tiras reactivas de glucómetro | — | 25 |
| 112 | Manta | — | 2 |
| 113 | Sábana limpia | — | 3 |

### Armario inm-mov

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 55 | Aspirador de secreciones | — | 1 |
| 56 | DESA | — | 1 |
| 57 | Parches desfibrilación | Adulto | 2 |
| 58 | Parches desfibrilación | Pediátrico | 1 |
| 87 | Cabestrillo | — | 2 |
| 88 | Camilla de palas | — | 1 |
| 89 | Chaleco de extricación | Ferno ked | 1 |
| 90 | Cinturón pélvico | — | 1 |
| 91 | Colchón de vacío | Con bomba de vacío | 1 |
| 92 | Collarín adulto | Multitalla | 2 |
| 93 | Correas camilla | Kit 3 unidades | 1 |
| 94 | Correas tipo araña | — | 1 |
| 95 | Férula de tracción | — | 1 |
| 96 | Férula digital | Varios tamaños | 4 |
| 97 | Férula sam splint | — | 2 |
| 98 | Inmovilizador tetracameral | Dama de elche | 1 |
| 99 | Kit contenciones mecánicas agitados | — | 1 |
| 100 | Kit Férulas semirígidas/vacío | — | 1 |
| 101 | Lona de traslado | — | 1 |
| 102 | Silla de evacuación evachair | — | 1 |
| 103 | Silla de traslado | — | 1 |
| 104 | Tabla rcp | — | 1 |
| 105 | Tablero espinal | — | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 165 | Balón resucitador | Pediátrico | 1 |
| 166 | Botella de oxígeno portátil | 5 litros | 2 |
| 167 | Vaso humificador O2 | — | 2 |

### Ampulario

**Medicación parenteral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 126 | Ácido Tranexámico 500mg | Amchafibrin | 2 |
| 127 | Actocortina 75mg | — | 2 |
| 128 | Actrapid 100ul/ml | Insulina | 2 |
| 129 | Adenosina 6mg | Adenocor | 2 |
| 130 | Adrenalina 1mg | — | 5 |
| 131 | Amiodarona 150mg | Trangorex | 3 |
| 132 | Atenolol 5mg | Tenormin | 2 |
| 133 | Atropina 1mg | — | 3 |
| 134 | Benadon 300mg | Piridoxina | 2 |
| 135 | Benerva 100mg | Tiamina | 2 |
| 136 | Bromuro de ipratropio 500mg | Atrovent | 3 |
| 137 | Budesonida 0,5mg | Pulmicort | 3 |
| 138 | Buscapina 20mg | Butilescopolamina | 3 |
| 139 | Dexketoprofeno 50mg | Enantyum | 3 |
| 140 | Diacepam 10mg | Valium | 3 |
| 141 | Digoxina 0,5mg | — | 2 |
| 142 | Dogmatil 100mg | Sulpirida | 2 |
| 143 | Flumazenil 1mg | Anexate | 2 |
| 144 | Flumil 300mg | Acetilcisteína | 2 |
| 145 | Furosemida 20mg | Seguril | 3 |
| 146 | Glucagen | Glucosa inyectable | 2 |
| 147 | Glucosmon | Glucosa oral | 5 |
| 148 | Labetalol 100mg | Trandate | 2 |
| 149 | Lidocaína / Mepivacaína | — | 2 |
| 150 | Metamizol 2g | Nolotil | 5 |
| 151 | Metilprednisolona 20mg/40mg | Urbason | 3 |
| 152 | Midazolam 45mg | — | 2 |
| 153 | Naloxona 0,4mg | — | 2 |
| 154 | Nitroglicerina 50mg | Solinitrina | 2 |
| 155 | Nitroglicerina spray | Trinispray | 2 |
| 156 | Noradrenalina 5mg | — | 2 |
| 157 | Pantoprazol 40mg | Omeprazol | 2 |
| 158 | Paracetamol 1000mg | — | 5 |
| 159 | Polaramine 5mg | Dexclorfeniramina | 2 |
| 160 | Primperam 10mg | Metoclopramida | 3 |
| 161 | Salbutamol | Ventolin | 3 |
| 162 | Salbutamol 2,5mg | — | 3 |
| 163 | Stesolid 10mg | Diacepam rectal | 2 |

**Vía enteral / oral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 229 | Alprazolam | 0,5mg | 2 |
| 230 | Amlodipino | 5mg | 2 |
| 231 | Atenolol | 50mg | 2 |
| 232 | Captopril | 50mg/25mg | 3 |
| 233 | Clopidogrel | 75mg | 2 |
| 234 | Diacepam | 5mg | 3 |
| 235 | Diclofenaco | 50mg | 3 |
| 236 | Ibuprofeno | 600mg | 5 |
| 237 | Metamizol | 575mg | 5 |
| 238 | Paracetamol | 650mg/1g | 5 |
| 239 | Prednisona | 30mg | 2 |

**Tópicos**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 216 | Diclofenaco | Antiinflamatoria | 2 |
| 217 | Prometazina | Fenergan | 2 |
| 218 | Metilprednisolona | Lexxema | 1 |
| 219 | Lubricante hidrosoluble | — | 2 |
| 220 | Lubricante urológico | — | 1 |
| 221 | Sulfadiazina de plata | Silvederma | 1 |
| 222 | Vaselina pura | — | 1 |

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 42 | Cánula de guedel | 5 | 2 |
| 43 | Cánula de guedel | 6 | 2 |
| 44 | Cánula de guedel | 7 | 2 |
| 45 | Cánula de guedel | 8 | 2 |
| 46 | Cánula de guedel | 9 | 2 |
| 47 | Cánula de guedel | 10 | 2 |
| 48 | Cánula de guedel | 11 | 2 |
| 49 | Cánula de guedel | 12 | 2 |
| 50 | I-gel | 2 | 1 |
| 51 | I-gel | 3 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 54 | I-gel | 6 | 1 |
| 114 | Gafas nasales | — | 2 |
| 115 | Mascarilla nebulizador | Adulto | 2 |
| 116 | Mascarilla nebulizador | Pediátrico | 2 |
| 117 | Mascarilla reservorio | Adulto | 2 |
| 118 | Mascarilla reservorio | Pediátrico | 2 |
| 119 | Mascarilla ventimask | Adulto | 3 |
| 120 | Mascarilla ventimask | Pediátrico | 2 |
| 121 | Estilete de intubación | Adulto | 2 |
| 122 | Estilete de intubación | Pediátrico | 1 |
| 123 | Laringoscopio | — | 1 |
| 124 | Palas laringoscopio | — | 4 |
| 125 | Pinzas magil | — | 1 |
| 170 | Sonda de aspiración | 8 | 2 |
| 171 | Sonda de aspiración | 10 | 2 |
| 172 | Sonda de aspiración | 12 | 2 |
| 173 | Sonda de aspiración | 14 | 2 |
| 174 | Sonda de aspiración | 16 | 2 |
| 175 | Sonda de aspiración | 18 | 2 |
| 187 | Tubo endotraqueal | 3 | 1 |
| 188 | Tubo endotraqueal | 4 | 1 |
| 189 | Tubo endotraqueal | 5 | 1 |
| 190 | Tubo endotraqueal | 6 | 1 |
| 191 | Tubo endotraqueal | 7 | 2 |
| 192 | Tubo endotraqueal | 8 | 2 |

### Circulatorio

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 1 | Aguja de carga | 1,20x40 mm | 5 |
| 2 | Aguja intramuscular | 0,80x38 mm | 5 |
| 3 | Aguja intramuscular | 0,9x40 mm | 5 |
| 4 | Aguja intravenosa | 0,80x25 mm | 5 |
| 5 | Aguja intravenosa | 0,9x25 mm | 5 |
| 6 | Aguja subcutánea/pediátrica | 0,45x16 mm | 3 |
| 7 | Aguja subcutánea/pediátrica | 0,50x16 mm | 3 |
| 36 | Catéter | 14 | 2 |
| 37 | Catéter | 16 | 3 |
| 38 | Catéter | 18 | 5 |
| 39 | Catéter | 20 | 5 |
| 40 | Catéter | 22 | 3 |
| 41 | Catéter | 24 | 2 |
| 106 | Jeringa | 10/12 ml | 10 |
| 107 | Jeringa | 2/3 ml | 10 |
| 108 | Jeringa | 20ml | 5 |
| 109 | Jeringa | 5/6 ml | 10 |
| 110 | Jeringa | 50ml | 3 |
| 111 | Jeringa | 1ml | 5 |
| 168 | Set de control de hemorragias | — | 2 |
| 193 | Gelaspan 40mg/ml | 500ml | 3 |
| 194 | Suero fisiológico | 1000ml | 3 |
| 195 | Suero fisiológico | 100ml | 5 |
| 196 | Suero fisiológico | 250ml | 3 |
| 197 | Suero fisiológico | 500ml | 3 |
| 198 | Suero fisiológico | 3ml | 10 |
| 199 | Suero glucosado al 5% | 250ml | 2 |
| 240 | Dial a flow | — | 2 |
| 241 | Ligadura | — | 5 |
| 242 | Llave de tres vías | — | 5 |
| 243 | Manguito de infusión a presión | — | 1 |
| 244 | Sistema de suero | — | 5 |

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 9 | Alcohol 96% | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 11 | Esponja clorhexidina | — | 5 |
| 12 | Povidona yodada | 125ml | 1 |
| 13 | Spray frío instantáneo | Bote | 2 |
| 14 | Suero fisiológico irrigación | Botella | 2 |
| 15 | Apósito | 10x10 | 5 |
| 16 | Apósito | 10x15 o 10x20 | 5 |
| 17 | Apósito | 5x7 o 5x9 | 5 |
| 18 | Apósito fijación vía | — | 5 |
| 19 | Steri-trip | 12mm x 100mm | 3 |
| 20 | Steri-trip | 3mm x 75mm | 3 |
| 21 | Tiritas clásicas | — | 10 |
| 22 | Bolsa de basura | Amarilla y roja | 5 |
| 23 | Bolsa de basura | Negra | 5 |
| 24 | Bolsa de diuresis | — | 1 |
| 25 | Botella orina | — | 1 |
| 26 | Contenedor cortopunzantes | — | 2 |
| 27 | Cuña orina | — | 1 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 30 | Esparadrapo | Tela o papel | 1 |
| 31 | Guantes | L | 10 |
| 32 | Guantes | M | 10 |
| 33 | Guantes | S | 5 |
| 34 | Guantes | XL | 5 |
| 85 | Gasa estéril x10 | 10x10 | 5 |
| 86 | Gasa tocológica estéril x3 | 45x45 | 2 |
| 169 | Set de partos | — | 1 |
| 176 | Sonda nasogástrica | nº10 | 1 |
| 177 | Sonda nasogástrica | nº12 | 1 |
| 178 | Sonda nasogástrica | nº14 | 1 |
| 179 | Sonda nasogástrica | nº16 | 1 |
| 180 | Sonda nasogástrica | nº18 | 1 |
| 181 | Sonda vesical / Foley | nº12 | 1 |
| 182 | Sonda vesical / Foley | nº14 | 1 |
| 183 | Sonda vesical / Foley | nº16 | 1 |
| 184 | Sonda vesical / Foley | nº18 | 1 |
| 185 | Sonda vesical / Foley | nº20 | 1 |
| 186 | Sonda vesical / Foley | nº22 | 1 |
| 200 | Bandeja desechable | — | 2 |
| 201 | Caja instrumental | — | 1 |
| 202 | Grapadora estéril | — | 1 |
| 203 | Guante estéril | 6 | 2 |
| 204 | Guante estéril | 7 | 2 |
| 205 | Guante estéril | 8 | 2 |
| 206 | Hojas bisturí | — | 3 |
| 207 | Mango bisturí estéril | — | 1 |
| 208 | Paño estéril | — | 3 |
| 209 | Pinza estéril | — | 1 |
| 210 | Portaagujas estéril | — | 1 |
| 211 | Seda sutura | 2/0 | 2 |
| 212 | Seda sutura | 3/0 | 2 |
| 213 | Seda sutura | 4/0 | 2 |
| 214 | Seda sutura | 5/0 | 1 |
| 215 | Tijeras estéril | — | 1 |
| 223 | Venda algodón | — | 2 |
| 224 | Venda cohesiva | — | 3 |
| 225 | Venda elástica crepé | 10x10 | 3 |
| 226 | Venda elástica crepé | 10x4 | 3 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 3 |
| 228 | Venda gasa orillada | — | 3 |

### Mochila Roja

> Bolsa de circulatorio, accesos vasculares, fluidoterapia y soporte cardiovascular.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 26 | Contenedor cortopunzantes | — | 1 |
| 31 | Guantes | L | 2 |
| 32 | Guantes | M | 4 |
| 1 | Aguja de carga | 1,20x40 mm | 5 |
| 2 | Aguja intramuscular | 0,80x38 mm | 5 |
| 3 | Aguja intramuscular | 0,9x40 mm | 5 |
| 4 | Aguja intravenosa | 0,80x25 mm | 5 |
| 5 | Aguja intravenosa | 0,9x25 mm | 5 |
| 18 | Apósito fijación vía | — | 3 |
| 36 | Catéter | 14 | 1 |
| 37 | Catéter | 16 | 2 |
| 38 | Catéter | 18 | 3 |
| 39 | Catéter | 20 | 3 |
| 40 | Catéter | 22 | 2 |
| 41 | Catéter | 24 | 1 |
| 106 | Jeringa | 10/12 ml | 5 |
| 107 | Jeringa | 2/3 ml | 5 |
| 108 | Jeringa | 20ml | 3 |
| 109 | Jeringa | 5/6 ml | 5 |
| 110 | Jeringa | 50ml | 2 |
| 111 | Jeringa | 1ml | 3 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 168 | Set de control de hemorragias | — | 1 |
| 195 | Suero fisiológico | 100ml | 3 |
| 196 | Suero fisiológico | 250ml | 2 |
| 197 | Suero fisiológico | 500ml | 2 |
| 240 | Dial a flow | — | 1 |
| 241 | Ligadura | — | 3 |
| 242 | Llave de tres vías | — | 3 |
| 244 | Sistema de suero | — | 3 |
| 129 | Adenosina 6mg | Adenocor | 2 |
| 130 | Adrenalina 1mg | — | 3 |
| 131 | Amiodarona 150mg | Trangorex | 2 |
| 133 | Atropina 1mg | — | 2 |
| 140 | Diacepam 10mg | Valium | 2 |
| 146 | Glucagen | Glucosa inyectable | 1 |
| 147 | Glucosmon | Glucosa oral | 3 |
| 152 | Midazolam 45mg | — | 1 |
| 153 | Naloxona 0,4mg | — | 1 |
| 139 | Dexketoprofeno 50mg | Enantyum | 2 |
| 145 | Furosemida 20mg | Seguril | 2 |
| 150 | Metamizol 2g | Nolotil | 3 |
| 158 | Paracetamol 1000mg | — | 3 |
| 160 | Primperam 10mg | Metoclopramida | 2 |

### Mochila Azul

> Bolsa de respiratorio, aislamiento de vía aérea, oxigenoterapia y ventilación.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 31 | Guantes | L | 2 |
| 32 | Guantes | M | 4 |
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 118 | Mascarilla reservorio | Pediátrico | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 165 | Balón resucitador | Pediátrico | 1 |
| 198 | Suero fisiológico | 3ml | 5 |
| 136 | Bromuro de ipratropio 500mg | Atrovent | 2 |
| 137 | Budesonida 0,5mg | Pulmicort | 2 |
| 151 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 162 | Salbutamol 2,5mg | — | 2 |

### Mochila Amarilla

> Bolsa de trauma, inmovilización y obstetricia.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 12 | Povidona yodada | 125ml | 1 |
| 15 | Apósito | 10x10 | 3 |
| 16 | Apósito | 10x15 o 10x20 | 3 |
| 17 | Apósito | 5x7 o 5x9 | 3 |
| 21 | Tiritas clásicas | — | 5 |
| 22 | Bolsa de basura | Amarilla y roja | 2 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 30 | Esparadrapo | Tela o papel | 1 |
| 32 | Guantes | M | 4 |
| 33 | Guantes | S | 2 |
| 34 | Guantes | XL | 2 |
| 85 | Gasa estéril x10 | 10x10 | 5 |
| 86 | Gasa tocológica estéril x3 | 45x45 | 1 |
| 87 | Cabestrillo | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 96 | Férula digital | Varios tamaños | 2 |
| 97 | Férula sam splint | — | 1 |
| 169 | Set de partos | — | 1 |
| 219 | Lubricante hidrosoluble | — | 1 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 226 | Venda elástica crepé | 10x4 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 228 | Venda gasa orillada | — | 2 |

---

## plantilla_VIR — tipo VIR

> **Vehículo de Intervención Rápida.** Sin camilla. Dotación completa de mochilas y ampulario compacto para primera respuesta rápida con capacidad SVA.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 59 | Adaptador mechero móvil | 12v | 1 |
| 61 | Cable cargador móvil | — | 1 |
| 63 | Carpeta documentación | — | 1 |
| 64 | Chaleco de alta visibilidad | — | 2 |
| 65 | Extintor | — | 1 |
| 66 | Limpiador desinfectante | — | 1 |
| 67 | Llave ampulario | — | 1 |
| 68 | Tarjeta de combustible | — | 1 |
| 69 | Teléfono móvil unidad | — | 1 |

### Ampulario

**Medicación parenteral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 129 | Adenosina 6mg | Adenocor | 2 |
| 130 | Adrenalina 1mg | — | 3 |
| 131 | Amiodarona 150mg | Trangorex | 2 |
| 133 | Atropina 1mg | — | 2 |
| 136 | Bromuro de ipratropio 500mg | Atrovent | 2 |
| 137 | Budesonida 0,5mg | Pulmicort | 2 |
| 138 | Buscapina 20mg | Butilescopolamina | 2 |
| 139 | Dexketoprofeno 50mg | Enantyum | 2 |
| 140 | Diacepam 10mg | Valium | 2 |
| 145 | Furosemida 20mg | Seguril | 2 |
| 146 | Glucagen | Glucosa inyectable | 1 |
| 147 | Glucosmon | Glucosa oral | 3 |
| 150 | Metamizol 2g | Nolotil | 3 |
| 151 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 152 | Midazolam 45mg | — | 1 |
| 153 | Naloxona 0,4mg | — | 1 |
| 155 | Nitroglicerina spray | Trinispray | 1 |
| 158 | Paracetamol 1000mg | — | 3 |
| 160 | Primperam 10mg | Metoclopramida | 2 |
| 162 | Salbutamol 2,5mg | — | 2 |
| 163 | Stesolid 10mg | Diacepam rectal | 1 |

**Vía enteral / oral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 232 | Captopril | 50mg/25mg | 2 |
| 234 | Diacepam | 5mg | 2 |
| 236 | Ibuprofeno | 600mg | 3 |
| 237 | Metamizol | 575mg | 3 |
| 238 | Paracetamol | 650mg/1g | 3 |

**Tópicos**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 219 | Lubricante hidrosoluble | — | 1 |
| 222 | Vaselina pura | — | 1 |

### Mochila Roja

*Idéntica a `plantilla_C → Mochila Roja` (Circulatorio y accesos vasculares).*

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 26 | Contenedor cortopunzantes | — | 1 |
| 31 | Guantes | L | 2 |
| 32 | Guantes | M | 4 |
| 1 | Aguja de carga | 1,20x40 mm | 5 |
| 2 | Aguja intramuscular | 0,80x38 mm | 5 |
| 3 | Aguja intramuscular | 0,9x40 mm | 5 |
| 4 | Aguja intravenosa | 0,80x25 mm | 5 |
| 5 | Aguja intravenosa | 0,9x25 mm | 5 |
| 18 | Apósito fijación vía | — | 3 |
| 36 | Catéter | 14 | 1 |
| 37 | Catéter | 16 | 2 |
| 38 | Catéter | 18 | 3 |
| 39 | Catéter | 20 | 3 |
| 40 | Catéter | 22 | 2 |
| 41 | Catéter | 24 | 1 |
| 106 | Jeringa | 10/12 ml | 5 |
| 107 | Jeringa | 2/3 ml | 5 |
| 108 | Jeringa | 20ml | 3 |
| 109 | Jeringa | 5/6 ml | 5 |
| 110 | Jeringa | 50ml | 2 |
| 111 | Jeringa | 1ml | 3 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 168 | Set de control de hemorragias | — | 1 |
| 195 | Suero fisiológico | 100ml | 3 |
| 196 | Suero fisiológico | 250ml | 2 |
| 197 | Suero fisiológico | 500ml | 2 |
| 240 | Dial a flow | — | 1 |
| 241 | Ligadura | — | 3 |
| 242 | Llave de tres vías | — | 3 |
| 244 | Sistema de suero | — | 3 |
| 129 | Adenosina 6mg | Adenocor | 2 |
| 130 | Adrenalina 1mg | — | 3 |
| 131 | Amiodarona 150mg | Trangorex | 2 |
| 133 | Atropina 1mg | — | 2 |
| 140 | Diacepam 10mg | Valium | 2 |
| 146 | Glucagen | Glucosa inyectable | 1 |
| 147 | Glucosmon | Glucosa oral | 3 |
| 152 | Midazolam 45mg | — | 1 |
| 153 | Naloxona 0,4mg | — | 1 |
| 139 | Dexketoprofeno 50mg | Enantyum | 2 |
| 145 | Furosemida 20mg | Seguril | 2 |
| 150 | Metamizol 2g | Nolotil | 3 |
| 158 | Paracetamol 1000mg | — | 3 |
| 160 | Primperam 10mg | Metoclopramida | 2 |

### Mochila Azul

*Idéntica a `plantilla_C → Mochila Azul` (Respiratorio y manejo de vía aérea).*

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 31 | Guantes | L | 2 |
| 32 | Guantes | M | 4 |
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 118 | Mascarilla reservorio | Pediátrico | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 165 | Balón resucitador | Pediátrico | 1 |
| 198 | Suero fisiológico | 3ml | 5 |
| 136 | Bromuro de ipratropio 500mg | Atrovent | 2 |
| 137 | Budesonida 0,5mg | Pulmicort | 2 |
| 151 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 162 | Salbutamol 2,5mg | — | 2 |

### Mochila Amarilla

*Idéntica a `plantilla_C → Mochila Amarilla`.*

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 12 | Povidona yodada | 125ml | 1 |
| 15 | Apósito | 10x10 | 3 |
| 16 | Apósito | 10x15 o 10x20 | 3 |
| 17 | Apósito | 5x7 o 5x9 | 3 |
| 21 | Tiritas classics | — | 5 |
| 22 | Bolsa de basura | Amarilla y roja | 2 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 30 | Esparadrapo | Tela o papel | 1 |
| 32 | Guantes | M | 4 |
| 33 | Guantes | S | 2 |
| 34 | Guantes | XL | 2 |
| 85 | Gasa estéril x10 | 10x10 | 5 |
| 86 | Gasa tocológica estéril x3 | 45x45 | 1 |
| 87 | Cabestrillo | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 96 | Férula digital | Varios tamaños | 2 |
| 97 | Férula sam splint | — | 1 |
| 169 | Set de partos | — | 1 |
| 219 | Lubricante hidrosoluble | — | 1 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 226 | Venda elástica crepé | 10x4 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 228 | Venda gasa orillada | — | 2 |

---

## plantilla_Quad — tipo Quad

> **Quad de intervención.** Solo lleva las tres mochilas, sin ampulario fijo ni espacio de cabina asistencial.

### Mochila Roja

> Bolsa de circulatorio, accesos vasculares y control de hemorragias.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 26 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | M | 4 |
| 4 | Aguja intravenosa | 0,80x25 mm | 3 |
| 2 | Aguja intramuscular | 0,80x38 mm | 3 |
| 18 | Apósito fijación vía | — | 2 |
| 37 | Catéter | 16 | 1 |
| 38 | Catéter | 18 | 3 |
| 39 | Catéter | 20 | 3 |
| 40 | Catéter | 22 | 1 |
| 106 | Jeringa | 10/12 ml | 3 |
| 107 | Jeringa | 2/3 ml | 3 |
| 109 | Jeringa | 5/6 ml | 3 |
| 168 | Set de control de hemorragias | — | 1 |
| 195 | Suero fisiológico | 100ml | 2 |
| 196 | Suero fisiológico | 250ml | 1 |
| 241 | Ligadura | — | 2 |
| 242 | Llave de tres vías | — | 2 |
| 244 | Sistema de suero | — | 2 |
| 130 | Adrenalina 1mg | — | 2 |
| 133 | Atropina 1mg | — | 1 |
| 147 | Glucosmon | Glucosa oral | 2 |
| 139 | Dexketoprofeno 50mg | Enantyum | 1 |
| 150 | Metamizol 2g | Nolotil | 2 |
| 158 | Paracetamol 1000mg | — | 2 |

### Mochila Azul

> Bolsa de respiratorio, vía aérea y ventilación.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 32 | Guantes | M | 4 |
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 198 | Suero fisiológico | 3ml | 3 |
| 162 | Salbutamol 2,5mg | — | 1 |

### Mochila Amarilla

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 15 | Apósito | 10x10 | 3 |
| 17 | Apósito | 5x7 o 5x9 | 3 |
| 21 | Tiritas clásicas | — | 5 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 32 | Guantes | M | 4 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 87 | Cabestrillo | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 96 | Férula digital | Varios tamaños | 1 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |

---

## plantilla_Backpack — tipos BKP1–BKP8

> **Mochila individual de intervención rápida** para DRP/PSA. Sin vehículo asociado. Dotación ligera orientada a primeros auxilios y SVB básico.

### Antisépticos

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 8 | Agua oxigenada | 250ml | 1 |
| 9 | Alcohol 96% | 250ml | 1 |
| 10 | Clorhexidina | 250ml | 1 |
| 11 | Esponja clorhexidina | — | 3 |
| 12 | Povidona yodada | 125ml | 1 |
| 13 | Spray frío instantáneo | Bote | 1 |

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 15 | Apósito | 10x10 | 3 |
| 16 | Apósito | 10x15 o 10x20 | 3 |
| 17 | Apósito | 5x7 o 5x9 | 3 |
| 19 | Steri-trip | 12mm x 100mm | 2 |
| 20 | Steri-trip | 3mm x 75mm | 2 |
| 21 | Tiritas clásicas | — | 10 |
| 22 | Bolsa de basura | Amarilla y roja | 2 |
| 26 | Contenedor cortopunzantes | — | 1 |
| 29 | Esparadrapo | Hipoalergénico | 1 |
| 30 | Esparadrapo | Tela o papel | 1 |
| 31 | Guantes | L | 5 |
| 32 | Guantes | M | 5 |
| 33 | Guantes | S | 3 |
| 85 | Gasa estéril x10 | 10x10 | 3 |
| 200 | Bandeja desechable | — | 1 |
| 203 | Guante estéril | 6 | 1 |
| 204 | Guante estéril | 7 | 1 |
| 205 | Guante estéril | 8 | 1 |
| 208 | Paño estéril | — | 2 |
| 209 | Pinza estéril | — | 1 |
| 211 | Seda sutura | 2/0 | 1 |
| 212 | Seda sutura | 3/0 | 1 |
| 213 | Seda sutura | 4/0 | 1 |

### Vía venosa periférica

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 1 | Aguja de carga | 1,20x40 mm | 3 |
| 2 | Aguja intramuscular | 0,80x38 mm | 3 |
| 4 | Aguja intravenosa | 0,80x25 mm | 3 |
| 18 | Apósito fijación vía | — | 3 |
| 37 | Catéter | 16 | 2 |
| 38 | Catéter | 18 | 3 |
| 39 | Catéter | 20 | 3 |
| 40 | Catéter | 22 | 2 |
| 106 | Jeringa | 10/12 ml | 5 |
| 107 | Jeringa | 2/3 ml | 5 |
| 109 | Jeringa | 5/6 ml | 5 |
| 195 | Suero fisiológico | 100ml | 2 |
| 198 | Suero fisiológico | 3ml | 5 |
| 241 | Ligadura | — | 3 |
| 242 | Llave de tres vías | — | 3 |
| 244 | Sistema de suero | — | 2 |

### Vendajes y trauma

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 87 | Cabestrillo | — | 1 |
| 92 | Collarín adulto | Multitalla | 1 |
| 96 | Férula digital | Varios tamaños | 2 |
| 97 | Férula sam splint | — | 1 |
| 168 | Set de control de hemorragias | — | 1 |
| 223 | Venda algodón | — | 1 |
| 224 | Venda cohesiva | — | 2 |
| 225 | Venda elástica crepé | 10x10 | 2 |
| 226 | Venda elástica crepé | 10x4 | 2 |
| 227 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 228 | Venda gasa orillada | — | 2 |

### Diagnóstico

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 72 | Esfigmomanómetro digital | — | 1 |
| 75 | Glucómetro | — | 1 |
| 77 | Lancetas | — | 5 |
| 78 | Linterna de exploración | — | 1 |
| 80 | Pilas reposición | — | 2 |
| 81 | Pulsioxímetro | — | 1 |
| 82 | Termómetro digital | — | 1 |
| 84 | Tiras reactivas de glucómetro | — | 10 |

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 43 | Cánula de guedel | 6 | 1 |
| 44 | Cánula de guedel | 7 | 1 |
| 45 | Cánula de guedel | 8 | 1 |
| 52 | I-gel | 4 | 1 |
| 53 | I-gel | 5 | 1 |
| 114 | Gafas nasales | — | 1 |
| 117 | Mascarilla reservorio | Adulto | 1 |
| 118 | Mascarilla reservorio | Pediátrico | 1 |
| 119 | Mascarilla ventimask | Adulto | 1 |
| 164 | Balón resucitador | Adulto | 1 |
| 170 | Sonda de aspiración | 10 | 1 |
| 171 | Sonda de aspiración | 12 | 1 |
