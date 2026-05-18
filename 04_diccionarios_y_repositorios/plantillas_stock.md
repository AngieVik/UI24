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
| 60 | Adaptador mechero móvil | 12v | 1 |
| 61 | Bayeta / trapo | — | 2 |
| 62 | Cable cargador móvil | — | 1 |
| 63 | Cable conexión ambulancia | 220v | 1 |
| 64 | Carpeta documentación | — | 1 |
| 65 | Chaleco de alta visibilidad | — | 2 |
| 66 | Extintor | — | 1 |
| 67 | Limpiador desinfectante | — | 1 |
| 69 | Tarjeta de combustible | — | 1 |
| 70 | Teléfono móvil unidad | — | 1 |

### Cabina asistencial

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 29 | Empapadores | — | 5 |
| 77 | Informes clínicos | — | 20 |
| 80 | Manta térmica | — | 2 |
| 113 | Manta | — | 2 |
| 114 | Sábana limpia | — | 3 |

### Armario inm-mov

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 57 | DESA | — | 1 |
| 58 | Parches desfibrilación | Adulto | 1 |
| 89 | Camilla de palas | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 94 | Correas camilla | Kit 3 unidades | 1 |
| 102 | Lona de traslado | — | 1 |
| 103 | Silla de evacuación evachair | — | 1 |
| 104 | Silla de traslado | — | 1 |
| 106 | Tablero espinal | — | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 167 | Botella de oxígeno portátil | 5 litros | 1 |
| 168 | Vaso humificador O2 | — | 1 |

### Ampulario

> Sin medicación en vehículo no asistencial. Subgrupo vacío — reservado para coherencia estructural con el resto de tipos.

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 115 | Gafas nasales | — | 2 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 120 | Mascarilla ventimask | Adulto | 2 |

### Circulatorio

> Sin material de vía venosa en vehículo no asistencial. Subgrupo vacío.

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 10 | Alcohol 96% | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 13 | Povidona yodada | 125ml | 1 |
| 16 | Apósito | 10x10 | 3 |
| 18 | Apósito | 5x7 o 5x9 | 3 |
| 22 | Tiritas clásicas | — | 10 |
| 23 | Bolsa de basura | Amarilla y roja | 3 |
| 24 | Bolsa de basura | Negra | 3 |
| 27 | Contenedor cortopunzantes | — | 1 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 32 | Guantes | L | 5 |
| 33 | Guantes | M | 5 |
| 34 | Guantes | S | 3 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |

### Mochila Roja

> Botiquín de emergencia básico para intervención hasta llegada de unidad asistencial.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 27 | Contenedor cortopunzantes | — | 1 |
| 33 | Guantes | M | 4 |
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 169 | Set de control de hemorragias | — | 1 |

### Mochila Azul

> Sin contenido en vehículo no asistencial. Subgrupo vacío.

### Mochila Amarilla

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 16 | Apósito | 10x10 | 3 |
| 22 | Tiritas clásicas | — | 5 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 33 | Guantes | M | 4 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 88 | Cabestrillo | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |

---

## plantilla_B — tipo B

> **Básica (SVB).** Soporte Vital Básico. Sin capacidad de intubación orotraqueal. Farmacología básica de BLS.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 60 | Adaptador mechero móvil | 12v | 1 |
| 61 | Bayeta / trapo | — | 2 |
| 62 | Cable cargador móvil | — | 1 |
| 63 | Cable conexión ambulancia | 220v | 1 |
| 64 | Carpeta documentación | — | 1 |
| 65 | Chaleco de alta visibilidad | — | 2 |
| 66 | Extintor | — | 1 |
| 67 | Limpiador desinfectante | — | 1 |
| 68 | Llave ampulario | — | 1 |
| 69 | Tarjeta de combustible | — | 1 |
| 70 | Teléfono móvil unidad | — | 1 |

### Cabina asistencial

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 29 | Empapadores | — | 5 |
| 36 | Rasuradora desechable | — | 2 |
| 72 | Depresores de madera | — | 10 |
| 73 | Esfigmomanómetro digital | — | 1 |
| 74 | Esfigmomanómetro manual | — | 1 |
| 75 | Fonendoscopio | — | 1 |
| 76 | Glucómetro | — | 1 |
| 77 | Informes clínicos | — | 20 |
| 78 | Lancetas | — | 10 |
| 79 | Linterna de exploración | — | 1 |
| 80 | Manta térmica | — | 2 |
| 81 | Pilas reposición | — | 4 |
| 82 | Pulsioxímetro | — | 1 |
| 83 | Termómetro digital | — | 1 |
| 84 | Tijera cortaropa | — | 1 |
| 85 | Tiras reactivas de glucómetro | — | 25 |
| 113 | Manta | — | 2 |
| 114 | Sábana limpia | — | 3 |

### Armario inm-mov

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 56 | Aspirador de secreciones | — | 1 |
| 57 | DESA | — | 1 |
| 58 | Parches desfibrilación | Adulto | 2 |
| 59 | Parches desfibrilación | Pediátrico | 1 |
| 88 | Cabestrillo | — | 2 |
| 89 | Camilla de palas | — | 1 |
| 93 | Collarín adulto | Multitalla | 2 |
| 94 | Correas camilla | Kit 3 unidades | 1 |
| 95 | Correas tipo araña | — | 1 |
| 97 | Férula digital | Varios tamaños | 4 |
| 98 | Férula sam splint | — | 2 |
| 102 | Lona de traslado | — | 1 |
| 103 | Silla de evacuación evachair | — | 1 |
| 104 | Silla de traslado | — | 1 |
| 105 | Tabla rcp | — | 1 |
| 106 | Tablero espinal | — | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 166 | Balón resucitador | Pediátrico | 1 |
| 167 | Botella de oxígeno portátil | 5 litros | 2 |
| 168 | Vaso humificador O2 | — | 2 |

### Ampulario

**Medicación parenteral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 131 | Adrenalina 1mg | — | 3 |
| 134 | Atropina 1mg | — | 2 |
| 137 | Bromuro de ipratropio 500mg | Atrovent | 3 |
| 138 | Budesonida 0,5mg | Pulmicort | 3 |
| 139 | Buscapina 20mg | Butilescopolamina | 3 |
| 140 | Dexketoprofeno 50mg | Enantyum | 3 |
| 141 | Diacepam 10mg | Valium | 2 |
| 146 | Furosemida 20mg | Seguril | 2 |
| 147 | Glucagen | Glucosa inyectable | 2 |
| 148 | Glucosmon | Glucosa oral | 5 |
| 151 | Metamizol 2g | Nolotil | 5 |
| 152 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 154 | Naloxona 0,4mg | — | 2 |
| 156 | Nitroglicerina spray | Trinispray | 2 |
| 159 | Paracetamol 1000mg | — | 5 |
| 161 | Primperam 10mg | Metoclopramida | 3 |
| 162 | Salbutamol | Ventolin | 3 |
| 163 | Salbutamol 2,5mg | — | 3 |
| 164 | Stesolid 10mg | Diacepam rectal | 2 |

**Vía enteral / oral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 233 | Captopril | 50mg/25mg | 3 |
| 235 | Diacepam | 5mg | 3 |
| 236 | Diclofenaco | 50mg | 3 |
| 237 | Ibuprofeno | 600mg | 5 |
| 238 | Metamizol | 575mg | 5 |
| 239 | Paracetamol | 650mg/1g | 5 |

**Tópicos**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 217 | Diclofenaco | Antiinflamatoria | 2 |
| 220 | Lubricante hidrosoluble | — | 2 |
| 221 | Lubricante urológico | — | 1 |
| 223 | Vaselina pura | — | 1 |

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 43 | Cánula de guedel | 5 | 2 |
| 44 | Cánula de guedel | 6 | 2 |
| 45 | Cánula de guedel | 7 | 2 |
| 46 | Cánula de guedel | 8 | 2 |
| 47 | Cánula de guedel | 9 | 2 |
| 48 | Cánula de guedel | 10 | 2 |
| 49 | Cánula de guedel | 11 | 2 |
| 50 | Cánula de guedel | 12 | 2 |
| 52 | I-gel | 3 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 55 | I-gel | 6 | 1 |
| 115 | Gafas nasales | — | 2 |
| 116 | Mascarilla nebulizador | Adulto | 2 |
| 117 | Mascarilla nebulizador | Pediátrico | 2 |
| 118 | Mascarilla reservorio | Adulto | 2 |
| 119 | Mascarilla reservorio | Pediátrico | 2 |
| 120 | Mascarilla ventimask | Adulto | 3 |
| 121 | Mascarilla ventimask | Pediátrico | 2 |
| 171 | Sonda de aspiración | 8 | 2 |
| 172 | Sonda de aspiración | 10 | 2 |
| 173 | Sonda de aspiración | 12 | 2 |
| 174 | Sonda de aspiración | 14 | 2 |
| 175 | Sonda de aspiración | 16 | 2 |

### Circulatorio

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 2 | Aguja de carga | 1,20x40 mm | 5 |
| 3 | Aguja intramuscular | 0,80x38 mm | 5 |
| 4 | Aguja intramuscular | 0,9x40 mm | 5 |
| 5 | Aguja intravenosa | 0,80x25 mm | 5 |
| 6 | Aguja intravenosa | 0,9x25 mm | 5 |
| 38 | Catéter | 16 | 2 |
| 39 | Catéter | 18 | 5 |
| 40 | Catéter | 20 | 5 |
| 41 | Catéter | 22 | 3 |
| 42 | Catéter | 24 | 2 |
| 107 | Jeringa | 10/12 ml | 10 |
| 108 | Jeringa | 2/3 ml | 10 |
| 109 | Jeringa | 20ml | 5 |
| 110 | Jeringa | 5/6 ml | 10 |
| 112 | Jeringa | 1ml | 5 |
| 169 | Set de control de hemorragias | — | 2 |
| 195 | Suero fisiológico | 1000ml | 3 |
| 196 | Suero fisiológico | 100ml | 5 |
| 197 | Suero fisiológico | 250ml | 3 |
| 198 | Suero fisiológico | 500ml | 3 |
| 199 | Suero fisiológico | 3ml | 10 |
| 242 | Ligadura | — | 5 |
| 243 | Llave de tres vías | — | 5 |
| 245 | Sistema de suero | — | 5 |

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 10 | Alcohol 96% | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 12 | Esponja clorhexidina | — | 5 |
| 13 | Povidona yodada | 125ml | 1 |
| 14 | Spray frío instantáneo | Bote | 2 |
| 15 | Suero fisiológico irrigación | Botella | 2 |
| 16 | Apósito | 10x10 | 5 |
| 17 | Apósito | 10x15 o 10x20 | 5 |
| 18 | Apósito | 5x7 o 5x9 | 5 |
| 19 | Apósito fijación vía | — | 5 |
| 20 | Steri-trip | 12mm x 100mm | 3 |
| 21 | Steri-trip | 3mm x 75mm | 3 |
| 22 | Tiritas clásicas | — | 10 |
| 23 | Bolsa de basura | Amarilla y roja | 5 |
| 24 | Bolsa de basura | Negra | 5 |
| 25 | Bolsa de diuresis | — | 1 |
| 27 | Contenedor cortopunzantes | — | 2 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Esparadrapo | Tela o papel | 1 |
| 32 | Guantes | L | 10 |
| 33 | Guantes | M | 10 |
| 34 | Guantes | S | 5 |
| 35 | Guantes | XL | 5 |
| 86 | Gasa estéril x10 | 10x10 | 5 |
| 87 | Gasa tocológica estéril x3 | 45x45 | 2 |
| 170 | Set de partos | — | 1 |
| 201 | Bandeja desechable | — | 2 |
| 204 | Guante estéril | 6 | 2 |
| 205 | Guante estéril | 7 | 2 |
| 206 | Guante estéril | 8 | 2 |
| 207 | Hojas bisturí | — | 3 |
| 209 | Paño estéril | — | 3 |
| 210 | Pinza estéril | — | 1 |
| 212 | Seda sutura | 2/0 | 2 |
| 213 | Seda sutura | 3/0 | 2 |
| 214 | Seda sutura | 4/0 | 2 |
| 224 | Venda algodón | — | 2 |
| 225 | Venda cohesiva | — | 3 |
| 226 | Venda elástica crepé | 10x10 | 3 |
| 227 | Venda elástica crepé | 10x4 | 3 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 3 |
| 229 | Venda gasa orillada | — | 3 |

### Mochila Roja

> Bolsa de emergencias vitales.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 27 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | L | 2 |
| 33 | Guantes | M | 4 |
| 39 | Catéter | 18 | 2 |
| 40 | Catéter | 20 | 2 |
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 107 | Jeringa | 10/12 ml | 3 |
| 108 | Jeringa | 2/3 ml | 5 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 119 | Mascarilla reservorio | Pediátrico | 1 |
| 131 | Adrenalina 1mg | — | 2 |
| 134 | Atropina 1mg | — | 2 |
| 141 | Diacepam 10mg | Valium | 2 |
| 147 | Glucagen | Glucosa inyectable | 1 |
| 148 | Glucosmon | Glucosa oral | 3 |
| 165 | Balón resucitador | Adulto | 1 |
| 166 | Balón resucitador | Pediátrico | 1 |
| 169 | Set de control de hemorragias | — | 1 |
| 199 | Suero fisiológico | 3ml | 5 |
| 242 | Ligadura | — | 2 |
| 243 | Llave de tres vías | — | 3 |

### Mochila Azul

> Bolsa de terapia intravenosa y medicación.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 2 | Aguja de carga | 1,20x40 mm | 5 |
| 3 | Aguja intramuscular | 0,80x38 mm | 5 |
| 4 | Aguja intramuscular | 0,9x40 mm | 5 |
| 5 | Aguja intravenosa | 0,80x25 mm | 5 |
| 6 | Aguja intravenosa | 0,9x25 mm | 5 |
| 19 | Apósito fijación vía | — | 3 |
| 27 | Contenedor cortopunzantes | — | 1 |
| 33 | Guantes | M | 4 |
| 38 | Catéter | 16 | 2 |
| 39 | Catéter | 18 | 3 |
| 40 | Catéter | 20 | 3 |
| 41 | Catéter | 22 | 2 |
| 107 | Jeringa | 10/12 ml | 5 |
| 108 | Jeringa | 2/3 ml | 5 |
| 110 | Jeringa | 5/6 ml | 5 |
| 140 | Dexketoprofeno 50mg | Enantyum | 2 |
| 151 | Metamizol 2g | Nolotil | 3 |
| 152 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 159 | Paracetamol 1000mg | — | 3 |
| 163 | Salbutamol 2,5mg | — | 2 |
| 196 | Suero fisiológico | 100ml | 3 |
| 197 | Suero fisiológico | 250ml | 2 |
| 242 | Ligadura | — | 3 |
| 243 | Llave de tres vías | — | 3 |
| 245 | Sistema de suero | — | 3 |

### Mochila Amarilla

> Bolsa de trauma, inmovilización y obstetricia.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 13 | Povidona yodada | 125ml | 1 |
| 16 | Apósito | 10x10 | 3 |
| 17 | Apósito | 10x15 o 10x20 | 3 |
| 18 | Apósito | 5x7 o 5x9 | 3 |
| 22 | Tiritas clásicas | — | 5 |
| 23 | Bolsa de basura | Amarilla y roja | 2 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Esparadrapo | Tela o papel | 1 |
| 33 | Guantes | M | 4 |
| 34 | Guantes | S | 2 |
| 35 | Guantes | XL | 2 |
| 86 | Gasa estéril x10 | 10x10 | 5 |
| 87 | Gasa tocológica estéril x3 | 45x45 | 1 |
| 88 | Cabestrillo | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 97 | Férula digital | Varios tamaños | 2 |
| 98 | Férula sam splint | — | 1 |
| 170 | Set de partos | — | 1 |
| 220 | Lubricante hidrosoluble | — | 1 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 10x4 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 229 | Venda gasa orillada | — | 2 |

---

## plantilla_C — tipo C

> **SVA (Soporte Vital Avanzado).** Dotación completa con capacidad de intubación orotraqueal, farmacología avanzada y equipo completo de inmovilización y extricación.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 60 | Adaptador mechero móvil | 12v | 1 |
| 61 | Bayeta / trapo | — | 2 |
| 62 | Cable cargador móvil | — | 1 |
| 63 | Cable conexión ambulancia | 220v | 1 |
| 64 | Carpeta documentación | — | 1 |
| 65 | Chaleco de alta visibilidad | — | 2 |
| 66 | Extintor | — | 1 |
| 67 | Limpiador desinfectante | — | 1 |
| 68 | Llave ampulario | — | 1 |
| 69 | Tarjeta de combustible | — | 1 |
| 70 | Teléfono móvil unidad | — | 1 |

### Cabina asistencial

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 29 | Empapadores | — | 5 |
| 36 | Rasuradora desechable | — | 2 |
| 71 | Calientasueros | — | 1 |
| 72 | Depresores de madera | — | 10 |
| 73 | Esfigmomanómetro digital | — | 1 |
| 74 | Esfigmomanómetro manual | — | 1 |
| 75 | Fonendoscopio | — | 1 |
| 76 | Glucómetro | — | 1 |
| 77 | Informes clínicos | — | 20 |
| 78 | Lancetas | — | 10 |
| 79 | Linterna de exploración | — | 1 |
| 80 | Manta térmica | — | 3 |
| 81 | Pilas reposición | — | 4 |
| 82 | Pulsioxímetro | — | 1 |
| 83 | Termómetro digital | — | 1 |
| 84 | Tijera cortaropa | — | 1 |
| 85 | Tiras reactivas de glucómetro | — | 25 |
| 113 | Manta | — | 2 |
| 114 | Sábana limpia | — | 3 |

### Armario inm-mov

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 56 | Aspirador de secreciones | — | 1 |
| 57 | DESA | — | 1 |
| 58 | Parches desfibrilación | Adulto | 2 |
| 59 | Parches desfibrilación | Pediátrico | 1 |
| 88 | Cabestrillo | — | 2 |
| 89 | Camilla de palas | — | 1 |
| 90 | Chaleco de extricación | Ferno ked | 1 |
| 91 | Cinturón pélvico | — | 1 |
| 92 | Colchón de vacío | Con bomba de vacío | 1 |
| 93 | Collarín adulto | Multitalla | 2 |
| 94 | Correas camilla | Kit 3 unidades | 1 |
| 95 | Correas tipo araña | — | 1 |
| 96 | Férula de tracción | — | 1 |
| 97 | Férula digital | Varios tamaños | 4 |
| 98 | Férula sam splint | — | 2 |
| 99 | Inmovilizador tetracameral | Dama de elche | 1 |
| 100 | Kit contenciones mecánicas agitados | — | 1 |
| 101 | Kit Férulas semirígidas/vacío | — | 1 |
| 102 | Lona de traslado | — | 1 |
| 103 | Silla de evacuación evachair | — | 1 |
| 104 | Silla de traslado | — | 1 |
| 105 | Tabla rcp | — | 1 |
| 106 | Tablero espinal | — | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 166 | Balón resucitador | Pediátrico | 1 |
| 167 | Botella de oxígeno portátil | 5 litros | 2 |
| 168 | Vaso humificador O2 | — | 2 |

### Ampulario

**Medicación parenteral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 127 | Ácido Tranexámico 500mg | Amchafibrin | 2 |
| 128 | Actocortina 75mg | — | 2 |
| 129 | Actrapid 100ul/ml | Insulina | 2 |
| 130 | Adenosina 6mg | Adenocor | 2 |
| 131 | Adrenalina 1mg | — | 5 |
| 132 | Amiodarona 150mg | Trangorex | 3 |
| 133 | Atenolol 5mg | Tenormin | 2 |
| 134 | Atropina 1mg | — | 3 |
| 135 | Benadon 300mg | Piridoxina | 2 |
| 136 | Benerva 100mg | Tiamina | 2 |
| 137 | Bromuro de ipratropio 500mg | Atrovent | 3 |
| 138 | Budesonida 0,5mg | Pulmicort | 3 |
| 139 | Buscapina 20mg | Butilescopolamina | 3 |
| 140 | Dexketoprofeno 50mg | Enantyum | 3 |
| 141 | Diacepam 10mg | Valium | 3 |
| 142 | Digoxina 0,5mg | — | 2 |
| 143 | Dogmatil 100mg | Sulpirida | 2 |
| 144 | Flumazenil 1mg | Anexate | 2 |
| 145 | Flumil 300mg | Acetilcisteína | 2 |
| 146 | Furosemida 20mg | Seguril | 3 |
| 147 | Glucagen | Glucosa inyectable | 2 |
| 148 | Glucosmon | Glucosa oral | 5 |
| 149 | Labetalol 100mg | Trandate | 2 |
| 150 | Lidocaína / Mepivacaína | — | 2 |
| 151 | Metamizol 2g | Nolotil | 5 |
| 152 | Metilprednisolona 20mg/40mg | Urbason | 3 |
| 153 | Midazolam 45mg | — | 2 |
| 154 | Naloxona 0,4mg | — | 2 |
| 155 | Nitroglicerina 50mg | Solinitrina | 2 |
| 156 | Nitroglicerina spray | Trinispray | 2 |
| 157 | Noradrenalina 5mg | — | 2 |
| 158 | Pantoprazol 40mg | Omeprazol | 2 |
| 159 | Paracetamol 1000mg | — | 5 |
| 160 | Polaramine 5mg | Dexclorfeniramina | 2 |
| 161 | Primperam 10mg | Metoclopramida | 3 |
| 162 | Salbutamol | Ventolin | 3 |
| 163 | Salbutamol 2,5mg | — | 3 |
| 164 | Stesolid 10mg | Diacepam rectal | 2 |

**Vía enteral / oral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 230 | Alprazolam | 0,5mg | 2 |
| 231 | Amlodipino | 5mg | 2 |
| 232 | Atenolol | 50mg | 2 |
| 233 | Captopril | 50mg/25mg | 3 |
| 234 | Clopidogrel | 75mg | 2 |
| 235 | Diacepam | 5mg | 3 |
| 236 | Diclofenaco | 50mg | 3 |
| 237 | Ibuprofeno | 600mg | 5 |
| 238 | Metamizol | 575mg | 5 |
| 239 | Paracetamol | 650mg/1g | 5 |
| 240 | Prednisona | 30mg | 2 |

**Tópicos**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 217 | Diclofenaco | Antiinflamatoria | 2 |
| 218 | Prometazina | Fenergan | 2 |
| 219 | Metilprednisolona | Lexxema | 1 |
| 220 | Lubricante hidrosoluble | — | 2 |
| 221 | Lubricante urológico | — | 1 |
| 222 | Sulfadiazina de plata | Silvederma | 1 |
| 223 | Vaselina pura | — | 1 |

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 43 | Cánula de guedel | 5 | 2 |
| 44 | Cánula de guedel | 6 | 2 |
| 45 | Cánula de guedel | 7 | 2 |
| 46 | Cánula de guedel | 8 | 2 |
| 47 | Cánula de guedel | 9 | 2 |
| 48 | Cánula de guedel | 10 | 2 |
| 49 | Cánula de guedel | 11 | 2 |
| 50 | Cánula de guedel | 12 | 2 |
| 51 | I-gel | 2 | 1 |
| 52 | I-gel | 3 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 55 | I-gel | 6 | 1 |
| 115 | Gafas nasales | — | 2 |
| 116 | Mascarilla nebulizador | Adulto | 2 |
| 117 | Mascarilla nebulizador | Pediátrico | 2 |
| 118 | Mascarilla reservorio | Adulto | 2 |
| 119 | Mascarilla reservorio | Pediátrico | 2 |
| 120 | Mascarilla ventimask | Adulto | 3 |
| 121 | Mascarilla ventimask | Pediátrico | 2 |
| 122 | Estilete de intubación | Adulto | 2 |
| 123 | Estilete de intubación | Pediátrico | 1 |
| 124 | Laringoscopio | — | 1 |
| 125 | Palas laringoscopio | — | 4 |
| 126 | Pinzas magil | — | 1 |
| 171 | Sonda de aspiración | 8 | 2 |
| 172 | Sonda de aspiración | 10 | 2 |
| 173 | Sonda de aspiración | 12 | 2 |
| 174 | Sonda de aspiración | 14 | 2 |
| 175 | Sonda de aspiración | 16 | 2 |
| 176 | Sonda de aspiración | 18 | 2 |
| 188 | Tubo endotraqueal | 3 | 1 |
| 189 | Tubo endotraqueal | 4 | 1 |
| 190 | Tubo endotraqueal | 5 | 1 |
| 191 | Tubo endotraqueal | 6 | 1 |
| 192 | Tubo endotraqueal | 7 | 2 |
| 193 | Tubo endotraqueal | 8 | 2 |

### Circulatorio

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 2 | Aguja de carga | 1,20x40 mm | 5 |
| 3 | Aguja intramuscular | 0,80x38 mm | 5 |
| 4 | Aguja intramuscular | 0,9x40 mm | 5 |
| 5 | Aguja intravenosa | 0,80x25 mm | 5 |
| 6 | Aguja intravenosa | 0,9x25 mm | 5 |
| 7 | Aguja subcutánea/pediátrica | 0,45x16 mm | 3 |
| 8 | Aguja subcutánea/pediátrica | 0,50x16 mm | 3 |
| 37 | Catéter | 14 | 2 |
| 38 | Catéter | 16 | 3 |
| 39 | Catéter | 18 | 5 |
| 40 | Catéter | 20 | 5 |
| 41 | Catéter | 22 | 3 |
| 42 | Catéter | 24 | 2 |
| 107 | Jeringa | 10/12 ml | 10 |
| 108 | Jeringa | 2/3 ml | 10 |
| 109 | Jeringa | 20ml | 5 |
| 110 | Jeringa | 5/6 ml | 10 |
| 111 | Jeringa | 50ml | 3 |
| 112 | Jeringa | 1ml | 5 |
| 169 | Set de control de hemorragias | — | 2 |
| 194 | Gelaspan 40mg/ml | 500ml | 3 |
| 195 | Suero fisiológico | 1000ml | 3 |
| 196 | Suero fisiológico | 100ml | 5 |
| 197 | Suero fisiológico | 250ml | 3 |
| 198 | Suero fisiológico | 500ml | 3 |
| 199 | Suero fisiológico | 3ml | 10 |
| 200 | Suero glucosado al 5% | 250ml | 2 |
| 241 | Dial a flow | — | 2 |
| 242 | Ligadura | — | 5 |
| 243 | Llave de tres vías | — | 5 |
| 244 | Manguito de infusión a presión | — | 1 |
| 245 | Sistema de suero | — | 5 |

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 10 | Alcohol 96% | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 12 | Esponja clorhexidina | — | 5 |
| 13 | Povidona yodada | 125ml | 1 |
| 14 | Spray frío instantáneo | Bote | 2 |
| 15 | Suero fisiológico irrigación | Botella | 2 |
| 16 | Apósito | 10x10 | 5 |
| 17 | Apósito | 10x15 o 10x20 | 5 |
| 18 | Apósito | 5x7 o 5x9 | 5 |
| 19 | Apósito fijación vía | — | 5 |
| 20 | Steri-trip | 12mm x 100mm | 3 |
| 21 | Steri-trip | 3mm x 75mm | 3 |
| 22 | Tiritas clásicas | — | 10 |
| 23 | Bolsa de basura | Amarilla y roja | 5 |
| 24 | Bolsa de basura | Negra | 5 |
| 25 | Bolsa de diuresis | — | 1 |
| 26 | Botella orina | — | 1 |
| 27 | Contenedor cortopunzantes | — | 2 |
| 28 | Cuña orina | — | 1 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Esparadrapo | Tela o papel | 1 |
| 32 | Guantes | L | 10 |
| 33 | Guantes | M | 10 |
| 34 | Guantes | S | 5 |
| 35 | Guantes | XL | 5 |
| 86 | Gasa estéril x10 | 10x10 | 5 |
| 87 | Gasa tocológica estéril x3 | 45x45 | 2 |
| 170 | Set de partos | — | 1 |
| 177 | Sonda nasogástrica | nº10 | 1 |
| 178 | Sonda nasogástrica | nº12 | 1 |
| 179 | Sonda nasogástrica | nº14 | 1 |
| 180 | Sonda nasogástrica | nº16 | 1 |
| 181 | Sonda nasogástrica | nº18 | 1 |
| 182 | Sonda vesical / Foley | nº12 | 1 |
| 183 | Sonda vesical / Foley | nº14 | 1 |
| 184 | Sonda vesical / Foley | nº16 | 1 |
| 185 | Sonda vesical / Foley | nº18 | 1 |
| 186 | Sonda vesical / Foley | nº20 | 1 |
| 187 | Sonda vesical / Foley | nº22 | 1 |
| 201 | Bandeja desechable | — | 2 |
| 202 | Caja instrumental | — | 1 |
| 203 | Grapadora estéril | — | 1 |
| 204 | Guante estéril | 6 | 2 |
| 205 | Guante estéril | 7 | 2 |
| 206 | Guante estéril | 8 | 2 |
| 207 | Hojas bisturí | — | 3 |
| 208 | Mango bisturí estéril | — | 1 |
| 209 | Paño estéril | — | 3 |
| 210 | Pinza estéril | — | 1 |
| 211 | Portaagujas estéril | — | 1 |
| 212 | Seda sutura | 2/0 | 2 |
| 213 | Seda sutura | 3/0 | 2 |
| 214 | Seda sutura | 4/0 | 2 |
| 215 | Seda sutura | 5/0 | 1 |
| 216 | Tijeras estéril | — | 1 |
| 224 | Venda algodón | — | 2 |
| 225 | Venda cohesiva | — | 3 |
| 226 | Venda elástica crepé | 10x10 | 3 |
| 227 | Venda elástica crepé | 10x4 | 3 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 3 |
| 229 | Venda gasa orillada | — | 3 |

### Mochila Roja

> Bolsa de emergencias vitales. Se porta al lugar del paciente en intervenciones críticas.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 27 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | L | 2 |
| 33 | Guantes | M | 4 |
| 39 | Catéter | 18 | 2 |
| 40 | Catéter | 20 | 2 |
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 107 | Jeringa | 10/12 ml | 3 |
| 108 | Jeringa | 2/3 ml | 5 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 119 | Mascarilla reservorio | Pediátrico | 1 |
| 130 | Adenosina 6mg | Adenocor | 2 |
| 131 | Adrenalina 1mg | — | 3 |
| 132 | Amiodarona 150mg | Trangorex | 2 |
| 134 | Atropina 1mg | — | 2 |
| 141 | Diacepam 10mg | Valium | 2 |
| 147 | Glucagen | Glucosa inyectable | 1 |
| 148 | Glucosmon | Glucosa oral | 3 |
| 153 | Midazolam 45mg | — | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 166 | Balón resucitador | Pediátrico | 1 |
| 169 | Set de control de hemorragias | — | 1 |
| 199 | Suero fisiológico | 3ml | 5 |
| 242 | Ligadura | — | 2 |
| 243 | Llave de tres vías | — | 3 |

### Mochila Azul

> Bolsa de terapia intravenosa y medicación avanzada.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 2 | Aguja de carga | 1,20x40 mm | 5 |
| 3 | Aguja intramuscular | 0,80x38 mm | 5 |
| 4 | Aguja intramuscular | 0,9x40 mm | 5 |
| 5 | Aguja intravenosa | 0,80x25 mm | 5 |
| 6 | Aguja intravenosa | 0,9x25 mm | 5 |
| 19 | Apósito fijación vía | — | 3 |
| 27 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | L | 2 |
| 33 | Guantes | M | 4 |
| 37 | Catéter | 14 | 1 |
| 38 | Catéter | 16 | 2 |
| 39 | Catéter | 18 | 3 |
| 40 | Catéter | 20 | 3 |
| 41 | Catéter | 22 | 2 |
| 42 | Catéter | 24 | 1 |
| 107 | Jeringa | 10/12 ml | 5 |
| 108 | Jeringa | 2/3 ml | 5 |
| 109 | Jeringa | 20ml | 3 |
| 110 | Jeringa | 5/6 ml | 5 |
| 111 | Jeringa | 50ml | 2 |
| 112 | Jeringa | 1ml | 3 |
| 137 | Bromuro de ipratropio 500mg | Atrovent | 2 |
| 138 | Budesonida 0,5mg | Pulmicort | 2 |
| 140 | Dexketoprofeno 50mg | Enantyum | 2 |
| 146 | Furosemida 20mg | Seguril | 2 |
| 151 | Metamizol 2g | Nolotil | 3 |
| 152 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 154 | Naloxona 0,4mg | — | 1 |
| 159 | Paracetamol 1000mg | — | 3 |
| 161 | Primperam 10mg | Metoclopramida | 2 |
| 163 | Salbutamol 2,5mg | — | 2 |
| 196 | Suero fisiológico | 100ml | 3 |
| 197 | Suero fisiológico | 250ml | 2 |
| 198 | Suero fisiológico | 500ml | 2 |
| 241 | Dial a flow | — | 1 |
| 242 | Ligadura | — | 3 |
| 243 | Llave de tres vías | — | 3 |
| 245 | Sistema de suero | — | 3 |

### Mochila Amarilla

> Bolsa de trauma, inmovilización y obstetricia.

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 13 | Povidona yodada | 125ml | 1 |
| 16 | Apósito | 10x10 | 3 |
| 17 | Apósito | 10x15 o 10x20 | 3 |
| 18 | Apósito | 5x7 o 5x9 | 3 |
| 22 | Tiritas clásicas | — | 5 |
| 23 | Bolsa de basura | Amarilla y roja | 2 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Esparadrapo | Tela o papel | 1 |
| 33 | Guantes | M | 4 |
| 34 | Guantes | S | 2 |
| 35 | Guantes | XL | 2 |
| 86 | Gasa estéril x10 | 10x10 | 5 |
| 87 | Gasa tocológica estéril x3 | 45x45 | 1 |
| 88 | Cabestrillo | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 97 | Férula digital | Varios tamaños | 2 |
| 98 | Férula sam splint | — | 1 |
| 170 | Set de partos | — | 1 |
| 220 | Lubricante hidrosoluble | — | 1 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 10x4 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 229 | Venda gasa orillada | — | 2 |

---

## plantilla_VIR — tipo VIR

> **Vehículo de Intervención Rápida.** Sin camilla. Dotación completa de mochilas y ampulario compacto para primera respuesta rápida con capacidad SVA.

### Cabina conducción

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 60 | Adaptador mechero móvil | 12v | 1 |
| 62 | Cable cargador móvil | — | 1 |
| 64 | Carpeta documentación | — | 1 |
| 65 | Chaleco de alta visibilidad | — | 2 |
| 66 | Extintor | — | 1 |
| 67 | Limpiador desinfectante | — | 1 |
| 68 | Llave ampulario | — | 1 |
| 69 | Tarjeta de combustible | — | 1 |
| 70 | Teléfono móvil unidad | — | 1 |

### Ampulario

**Medicación parenteral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 130 | Adenosina 6mg | Adenocor | 2 |
| 131 | Adrenalina 1mg | — | 3 |
| 132 | Amiodarona 150mg | Trangorex | 2 |
| 134 | Atropina 1mg | — | 2 |
| 137 | Bromuro de ipratropio 500mg | Atrovent | 2 |
| 138 | Budesonida 0,5mg | Pulmicort | 2 |
| 139 | Buscapina 20mg | Butilescopolamina | 2 |
| 140 | Dexketoprofeno 50mg | Enantyum | 2 |
| 141 | Diacepam 10mg | Valium | 2 |
| 146 | Furosemida 20mg | Seguril | 2 |
| 147 | Glucagen | Glucosa inyectable | 1 |
| 148 | Glucosmon | Glucosa oral | 3 |
| 151 | Metamizol 2g | Nolotil | 3 |
| 152 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 153 | Midazolam 45mg | — | 1 |
| 154 | Naloxona 0,4mg | — | 1 |
| 156 | Nitroglicerina spray | Trinispray | 1 |
| 159 | Paracetamol 1000mg | — | 3 |
| 161 | Primperam 10mg | Metoclopramida | 2 |
| 163 | Salbutamol 2,5mg | — | 2 |
| 164 | Stesolid 10mg | Diacepam rectal | 1 |

**Vía enteral / oral**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 233 | Captopril | 50mg/25mg | 2 |
| 235 | Diacepam | 5mg | 2 |
| 237 | Ibuprofeno | 600mg | 3 |
| 238 | Metamizol | 575mg | 3 |
| 239 | Paracetamol | 650mg/1g | 3 |

**Tópicos**

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 220 | Lubricante hidrosoluble | — | 1 |
| 223 | Vaselina pura | — | 1 |

### Mochila Roja

*Idéntica a `plantilla_C → Mochila Roja`.*

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 27 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | L | 2 |
| 33 | Guantes | M | 4 |
| 39 | Catéter | 18 | 2 |
| 40 | Catéter | 20 | 2 |
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 107 | Jeringa | 10/12 ml | 3 |
| 108 | Jeringa | 2/3 ml | 5 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 119 | Mascarilla reservorio | Pediátrico | 1 |
| 130 | Adenosina 6mg | Adenocor | 2 |
| 131 | Adrenalina 1mg | — | 3 |
| 132 | Amiodarona 150mg | Trangorex | 2 |
| 134 | Atropina 1mg | — | 2 |
| 141 | Diacepam 10mg | Valium | 2 |
| 147 | Glucagen | Glucosa inyectable | 1 |
| 148 | Glucosmon | Glucosa oral | 3 |
| 153 | Midazolam 45mg | — | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 166 | Balón resucitador | Pediátrico | 1 |
| 169 | Set de control de hemorragias | — | 1 |
| 199 | Suero fisiológico | 3ml | 5 |
| 242 | Ligadura | — | 2 |
| 243 | Llave de tres vías | — | 3 |

### Mochila Azul

*Idéntica a `plantilla_C → Mochila Azul`.*

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 2 | Aguja de carga | 1,20x40 mm | 5 |
| 3 | Aguja intramuscular | 0,80x38 mm | 5 |
| 4 | Aguja intramuscular | 0,9x40 mm | 5 |
| 5 | Aguja intravenosa | 0,80x25 mm | 5 |
| 6 | Aguja intravenosa | 0,9x25 mm | 5 |
| 19 | Apósito fijación vía | — | 3 |
| 27 | Contenedor cortopunzantes | — | 1 |
| 32 | Guantes | L | 2 |
| 33 | Guantes | M | 4 |
| 37 | Catéter | 14 | 1 |
| 38 | Catéter | 16 | 2 |
| 39 | Catéter | 18 | 3 |
| 40 | Catéter | 20 | 3 |
| 41 | Catéter | 22 | 2 |
| 42 | Catéter | 24 | 1 |
| 107 | Jeringa | 10/12 ml | 5 |
| 108 | Jeringa | 2/3 ml | 5 |
| 109 | Jeringa | 20ml | 3 |
| 110 | Jeringa | 5/6 ml | 5 |
| 111 | Jeringa | 50ml | 2 |
| 112 | Jeringa | 1ml | 3 |
| 137 | Bromuro de ipratropio 500mg | Atrovent | 2 |
| 138 | Budesonida 0,5mg | Pulmicort | 2 |
| 140 | Dexketoprofeno 50mg | Enantyum | 2 |
| 146 | Furosemida 20mg | Seguril | 2 |
| 151 | Metamizol 2g | Nolotil | 3 |
| 152 | Metilprednisolona 20mg/40mg | Urbason | 2 |
| 154 | Naloxona 0,4mg | — | 1 |
| 159 | Paracetamol 1000mg | — | 3 |
| 161 | Primperam 10mg | Metoclopramida | 2 |
| 163 | Salbutamol 2,5mg | — | 2 |
| 196 | Suero fisiológico | 100ml | 3 |
| 197 | Suero fisiológico | 250ml | 2 |
| 198 | Suero fisiológico | 500ml | 2 |
| 241 | Dial a flow | — | 1 |
| 242 | Ligadura | — | 3 |
| 243 | Llave de tres vías | — | 3 |
| 245 | Sistema de suero | — | 3 |

### Mochila Amarilla

*Idéntica a `plantilla_C → Mochila Amarilla`.*

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 13 | Povidona yodada | 125ml | 1 |
| 16 | Apósito | 10x10 | 3 |
| 17 | Apósito | 10x15 o 10x20 | 3 |
| 18 | Apósito | 5x7 o 5x9 | 3 |
| 22 | Tiritas clásicas | — | 5 |
| 23 | Bolsa de basura | Amarilla y roja | 2 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Esparadrapo | Tela o papel | 1 |
| 33 | Guantes | M | 4 |
| 34 | Guantes | S | 2 |
| 35 | Guantes | XL | 2 |
| 86 | Gasa estéril x10 | 10x10 | 5 |
| 87 | Gasa tocológica estéril x3 | 45x45 | 1 |
| 88 | Cabestrillo | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 97 | Férula digital | Varios tamaños | 2 |
| 98 | Férula sam splint | — | 1 |
| 170 | Set de partos | — | 1 |
| 220 | Lubricante hidrosoluble | — | 1 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 10x4 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 229 | Venda gasa orillada | — | 2 |

---

## plantilla_Quad — tipo Quad

> **Quad de intervención.** Solo lleva las tres mochilas, sin ampulario fijo ni espacio de cabina asistencial.

### Mochila Roja

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 27 | Contenedor cortopunzantes | — | 1 |
| 33 | Guantes | M | 4 |
| 39 | Catéter | 18 | 2 |
| 40 | Catéter | 20 | 2 |
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 107 | Jeringa | 10/12 ml | 3 |
| 108 | Jeringa | 2/3 ml | 3 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 131 | Adrenalina 1mg | — | 2 |
| 134 | Atropina 1mg | — | 1 |
| 148 | Glucosmon | Glucosa oral | 2 |
| 165 | Balón resucitador | Adulto | 1 |
| 169 | Set de control de hemorragias | — | 1 |
| 199 | Suero fisiológico | 3ml | 3 |
| 242 | Ligadura | — | 2 |
| 243 | Llave de tres vías | — | 2 |

### Mochila Azul

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 3 | Aguja intramuscular | 0,80x38 mm | 3 |
| 5 | Aguja intravenosa | 0,80x25 mm | 3 |
| 19 | Apósito fijación vía | — | 2 |
| 27 | Contenedor cortopunzantes | — | 1 |
| 33 | Guantes | M | 4 |
| 38 | Catéter | 16 | 1 |
| 39 | Catéter | 18 | 3 |
| 40 | Catéter | 20 | 3 |
| 41 | Catéter | 22 | 1 |
| 107 | Jeringa | 10/12 ml | 3 |
| 108 | Jeringa | 2/3 ml | 3 |
| 110 | Jeringa | 5/6 ml | 3 |
| 140 | Dexketoprofeno 50mg | Enantyum | 1 |
| 151 | Metamizol 2g | Nolotil | 2 |
| 159 | Paracetamol 1000mg | — | 2 |
| 163 | Salbutamol 2,5mg | — | 1 |
| 196 | Suero fisiológico | 100ml | 2 |
| 197 | Suero fisiológico | 250ml | 1 |
| 242 | Ligadura | — | 2 |
| 243 | Llave de tres vías | — | 2 |
| 245 | Sistema de suero | — | 2 |

### Mochila Amarilla

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 16 | Apósito | 10x10 | 3 |
| 18 | Apósito | 5x7 o 5x9 | 3 |
| 22 | Tiritas clásicas | — | 5 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 33 | Guantes | M | 4 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 88 | Cabestrillo | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 97 | Férula digital | Varios tamaños | 1 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |

---

## plantilla_Backpack — tipos BKP1–BKP8

> **Mochila individual de intervención rápida** para DRP/PSA. Sin vehículo asociado. Dotación ligera orientada a primeros auxilios y SVB básico.

### Antisépticos

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 9 | Agua oxigenada | 250ml | 1 |
| 10 | Alcohol 96% | 250ml | 1 |
| 11 | Clorhexidina | 250ml | 1 |
| 12 | Esponja clorhexidina | — | 3 |
| 13 | Povidona yodada | 125ml | 1 |
| 14 | Spray frío instantáneo | Bote | 1 |

### Curas y sutura

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 16 | Apósito | 10x10 | 3 |
| 17 | Apósito | 10x15 o 10x20 | 3 |
| 18 | Apósito | 5x7 o 5x9 | 3 |
| 19 | Apósito fijación vía | — | 3 |
| 20 | Steri-trip | 12mm x 100mm | 2 |
| 21 | Steri-trip | 3mm x 75mm | 2 |
| 22 | Tiritas clásicas | — | 10 |
| 23 | Bolsa de basura | Amarilla y roja | 2 |
| 27 | Contenedor cortopunzantes | — | 1 |
| 30 | Esparadrapo | Hipoalergénico | 1 |
| 31 | Esparadrapo | Tela o papel | 1 |
| 32 | Guantes | L | 5 |
| 33 | Guantes | M | 5 |
| 34 | Guantes | S | 3 |
| 86 | Gasa estéril x10 | 10x10 | 3 |
| 201 | Bandeja desechable | — | 1 |
| 204 | Guante estéril | 6 | 1 |
| 205 | Guante estéril | 7 | 1 |
| 206 | Guante estéril | 8 | 1 |
| 209 | Paño estéril | — | 2 |
| 210 | Pinza estéril | — | 1 |
| 212 | Seda sutura | 2/0 | 1 |
| 213 | Seda sutura | 3/0 | 1 |
| 214 | Seda sutura | 4/0 | 1 |

### Vía venosa periférica

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 2 | Aguja de carga | 1,20x40 mm | 3 |
| 3 | Aguja intramuscular | 0,80x38 mm | 3 |
| 5 | Aguja intravenosa | 0,80x25 mm | 3 |
| 38 | Catéter | 16 | 2 |
| 39 | Catéter | 18 | 3 |
| 40 | Catéter | 20 | 3 |
| 41 | Catéter | 22 | 2 |
| 107 | Jeringa | 10/12 ml | 5 |
| 108 | Jeringa | 2/3 ml | 5 |
| 110 | Jeringa | 5/6 ml | 5 |
| 196 | Suero fisiológico | 100ml | 2 |
| 199 | Suero fisiológico | 3ml | 5 |
| 242 | Ligadura | — | 3 |
| 243 | Llave de tres vías | — | 3 |
| 245 | Sistema de suero | — | 2 |

### Vendajes y trauma

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 88 | Cabestrillo | — | 1 |
| 93 | Collarín adulto | Multitalla | 1 |
| 97 | Férula digital | Varios tamaños | 2 |
| 98 | Férula sam splint | — | 1 |
| 169 | Set de control de hemorragias | — | 1 |
| 224 | Venda algodón | — | 1 |
| 225 | Venda cohesiva | — | 2 |
| 226 | Venda elástica crepé | 10x10 | 2 |
| 227 | Venda elástica crepé | 10x4 | 2 |
| 228 | Venda elástica crepé | 5x4 o 7x4 | 2 |
| 229 | Venda gasa orillada | — | 2 |

### Diagnóstico

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 73 | Esfigmomanómetro digital | — | 1 |
| 76 | Glucómetro | — | 1 |
| 78 | Lancetas | — | 5 |
| 79 | Linterna de exploración | — | 1 |
| 81 | Pilas reposición | — | 2 |
| 82 | Pulsioxímetro | — | 1 |
| 83 | Termómetro digital | — | 1 |
| 85 | Tiras reactivas de glucómetro | — | 10 |

### Vía aérea

| ID_item | nombre | especificación | stock_objetivo |
|---|---|---|---|
| 44 | Cánula de guedel | 6 | 1 |
| 45 | Cánula de guedel | 7 | 1 |
| 46 | Cánula de guedel | 8 | 1 |
| 53 | I-gel | 4 | 1 |
| 54 | I-gel | 5 | 1 |
| 115 | Gafas nasales | — | 1 |
| 118 | Mascarilla reservorio | Adulto | 1 |
| 119 | Mascarilla reservorio | Pediátrico | 1 |
| 120 | Mascarilla ventimask | Adulto | 1 |
| 165 | Balón resucitador | Adulto | 1 |
| 171 | Sonda de aspiración | 10 | 1 |
| 172 | Sonda de aspiración | 12 | 1 |
