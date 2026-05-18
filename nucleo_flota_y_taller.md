# nucleo_flota_y_taller

* RBAC: `gerencia`, `flota`, `responsable_flota`.
* `responsable_flota` tiene todos los permisos de `flota`
  más la edición de registros de mantenimiento preventivo
  y la configuración de umbrales de alerta.
* Cualquier rol operativo puede crear un Doc-7 desde su terminal.
  Solo `flota`, `responsable_flota` y `gerencia` pueden anclar,
  editar, archivar y modificar su estado.

---

## incidencias_ancladas

* Lista de incidencias marcadas como prioritarias.
* Cada fila muestra resumen — clic abre modal superpuesto
  con el informe completo.
* Acciones: Desanclar | Editar | Archivar | Modificar estado.

---

## ultimas_incidencias

* Lista de las 10 incidencias más recientes.
* Cada fila muestra resumen — clic abre modal superpuesto.
* Campo de búsqueda/filtro por texto.
* Acciones: Anclar | Editar | Archivar | Modificar estado
  | Añadir nueva incidencia.

---

## Flujo Doc-7 criticidad Grave

* Al guardar un Doc-7 con nivel `Grave`:
  1. El vehículo afectado cambia automáticamente a estado
     `Averiado` en el selector (informativo, no bloquea activación).
  2. Se genera un Doc-11 automático dirigido a `flota` y `coordinación`
     con los datos del Doc-7.
* `timestamp_incidencia` registrado automáticamente al guardar.
* `timestamp_cambio_estado` registrado en cada transición:
  `Reportada_Pendiente` → `En_Proceso_Taller` → `Reparada_Operativa`.

---

## bandeja_entrada_flota

* Recibe Doc-7 (averías) y Doc-11 (avisos urgentes).
* Flujo de estados y acciones: ver `componentes.md → flujos_transicion`.

---

## vehiculos_metadata

* Selector de vehículo — muestra todos los vehículos del sistema.
* Acceso desde `black_column → Flota y taller → Metadata vehículo`.
* Edición: `flota`, `responsable_flota`, `gerencia`.

### Sección: Documentación y dispositivo

| Campo | Descripción |
|---|---|
| `ITV` | Fecha de vencimiento |
| `ITS` | Fecha de vencimiento |
| `Seguro` | Fecha de vencimiento |
| `N_telefono` | Número del dispositivo embarcado |
| `PIN` | PIN del dispositivo embarcado |
| `PUK` | PUK del dispositivo embarcado |

### Sección: Kilometraje general

| Campo | Tipo | Descripción |
|---|---|---|
| `km_actuales` | number (manual) | Kilómetros actuales del vehículo según odómetro |
| `km_proxima_revision` | number (opcional) | Km a los que está programada la próxima revisión general |
| `notas_revision` | texto libre | Observaciones generales sobre revisiones |

### Sección: Aceite

| Campo | Tipo | Obligatorio |
|---|---|---|
| `aceite_fecha_ultimo` | date | Al actualizar |
| `aceite_km_ultimo` | number | Al actualizar |
| `aceite_fecha_proximo` | date | Opcional — activa alerta por fecha |
| `aceite_km_proximo` | number | Opcional — activa alerta por km |
| `aceite_notas` | texto libre | — |

### Sección: Frenos

| Campo | Tipo | Obligatorio |
|---|---|---|
| `frenos_fecha_ultimo` | date | Al actualizar |
| `frenos_km_ultimo` | number | Al actualizar |
| `frenos_fecha_proximo` | date | Opcional — activa alerta por fecha |
| `frenos_km_proximo` | number | Opcional — activa alerta por km |
| `frenos_notas` | texto libre | — |

### Sección: Neumáticos

Tres grupos de seguimiento independientes: **Delanteros**, **Traseros** y **Rueda de repuesto**.
Cada uno tiene los mismos campos:

| Campo | Tipo | Obligatorio |
|---|---|---|
| `[grupo]_fecha_cambio` | date | Al actualizar |
| `[grupo]_km_cambio` | number | Al actualizar |
| `[grupo]_fecha_proximo` | date | Opcional — activa alerta por fecha |
| `[grupo]_km_proximo` | number | Opcional — activa alerta por km |
| `[grupo]_notas` | texto libre | — |

Donde `[grupo]` es: `neumaticos_delanteros`, `neumaticos_traseros`, `rueda_repuesto`.

**Acción "Actualizar todos los neumáticos":**
Atajo que rellena `neumaticos_delanteros` y `neumaticos_traseros` con
los mismos valores simultáneamente (para cambios de juego completo).
La rueda de repuesto se actualiza de forma independiente.

### Comportamiento de edición

* Botón `Editar metadata` → abre todos los campos en modo edición.
* Guardar | Cancelar.
* Cada guardado registra `timestamp_edicion` e `ID_nombre_editor` en auditoría.
* Los campos opcionales (`_fecha_proximo`, `_km_proximo`) activan
  sus respectivas alertas en `visor_mantenimiento` al ser rellenados.

---

## visor_mantenimiento

* Vista de estado de mantenimiento de toda la flota.
* Acceso desde `black_column → Flota y taller → Mantenimiento flota`.
* RBAC lectura: `flota`, `responsable_flota`, `gerencia`.
* RBAC edición: `responsable_flota`, `gerencia`.

### Tabla principal

Cada fila es un vehículo. Columnas visibles:

| Columna | Contenido |
|---|---|
| `ID_vehiculo` | Identificador y matrícula |
| `Tipo` | Tipo de vehículo |
| `Km actuales` | `km_actuales` (manual) |
| `Km próx. revisión` | `km_proxima_revision` — delta: `km_proximo - km_actuales` |
| `Aceite` | Badge de estado + fecha próxima y/o km restantes |
| `Frenos` | Badge de estado + fecha próxima y/o km restantes |
| `Neumáticos del.` | Badge de estado |
| `Neumáticos tras.` | Badge de estado |
| `Rueda repuesto` | Badge de estado |

### Badges de estado (por ítem de mantenimiento)

El badge se calcula a partir del campo opcional `_fecha_proximo` y/o `_km_proximo`.
Si ninguno está relleno, el badge no se muestra (sin alerta configurada).

| Badge | Color | Condición |
|---|---|---|
| `OK` | 🟢 Verde | Margen > 20 % del intervalo o > 2 semanas |
| `Próximo` | 🟡 Amarillo | Margen ≤ 20 % del intervalo o ≤ 2 semanas |
| `Urgente` | 🔴 Rojo | Km superados o fecha pasada |
| `Sin datos` | ⚪ Gris | Sin `_fecha_proximo` ni `_km_proximo` rellenados |

El badge muestra **el peor estado** entre la alerta por fecha y la alerta por km.

### Filtros y orden

* **Filtro por tipo de vehículo**: A1/A2, B, C, VIR, Quad, etc.
* **Filtro por estado**: Todos | Solo con alertas (🟡+🔴) | Solo urgentes (🔴)
* **Orden por proximidad**: ordena por el elemento de mantenimiento más urgente
  de cada vehículo (el rojo más inminente primero, luego amarillo, luego verde).
* Búsqueda por `ID_vehiculo` o matrícula.

### Vista de detalle por vehículo

Al hacer clic en una fila:
* Se abre el detalle completo del vehículo con todos los campos de `vehiculos_metadata`.
* Botón `Editar mantenimiento` *(RBAC: `responsable_flota`, `gerencia`)* →
  abre los campos de mantenimiento en modo edición inline.
* Guardar | Cancelar.

### Configuración de umbrales de alerta *(RBAC: `responsable_flota`, `gerencia`)*

Ajusta los porcentajes y días que definen los límites 🟡 Amarillo y 🔴 Rojo.
Valores por defecto:

| Parámetro | Valor por defecto |
|---|---|
| Umbral km 🟡 Amarillo | ≤ 1.000 km restantes |
| Umbral km 🔴 Rojo | 0 km o superado |
| Umbral fecha 🟡 Amarillo | ≤ 14 días |
| Umbral fecha 🔴 Rojo | Fecha pasada o hoy |

---

## Documentos *(referencia)*

* Doc-7 — Informe de avería.
