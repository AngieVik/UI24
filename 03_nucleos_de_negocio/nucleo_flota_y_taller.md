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
  1. El vehículo afectado cambia automáticamente `condicion_tecnica → 'critico'`.
  2. Se genera un Doc-11 automático dirigido a `flota` y `coordinación`
     con los datos del Doc-7.
* Al guardar un Doc-7 con nivel `Leve` o `Moderado`:
  * `condicion_tecnica → 'averiado_leve'` (si no había ya un Doc-7 `Grave` activo).
  * Si ya existía un Doc-7 `Grave` activo para ese vehículo, el badge permanece en
    `critico` — el nuevo Doc-7 queda registrado pero no degrada la condición.
* `timestamp_incidencia` registrado automáticamente al guardar.
* `timestamp_cambio_estado` registrado en cada transición:
  `Reportada_Pendiente` → `En_Proceso_Taller` → `Reparada_Operativa`.

## Trigger de Evaluación Máxima al cerrar un Doc-7

Al marcar un Doc-7 como `Reparada_Operativa`, el sistema **no restablece `condicion_tecnica`
a `operativo` de forma automática e incondicional**. En su lugar, ejecuta una evaluación
de la criticidad máxima de todos los Doc-7 que aún permanecen activos para ese vehículo:

| Doc-7 activos restantes | `condicion_tecnica` resultante |
|---|---|
| Ningún Doc-7 activo | `operativo` |
| Solo `Leve` / `Moderado` | `averiado_leve` |
| Al menos uno `Grave` | `critico` (sin cambio) |

Esto garantiza que reparar un fallo secundario no oculte un fallo primario grave.
Ver `logic.md §40` para el trigger SQL completo.

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

## Compresión de adjuntos Doc-7

Las fotografías adjuntas en un Doc-7 (daño o panel de mandos) deben comprimirse
obligatoriamente en el cliente antes de que el archivo toque el store de Zustand
o IndexedDB. La compresión ocurre en el hook `useImageCompressor` mediante la
Canvas API nativa — sin librerías externas, sin coste de bundle.

### Pipeline de compresión

```typescript
// useImageCompressor — hook reutilizable para cualquier adjunto de imagen
async function comprimirImagen(file: File): Promise<Blob> {
  const MAX_PX   = 1200   // píxeles en el lado mayor
  const CALIDAD  = 0.70   // WebP quality 70 %

  // 1. Decodificar a ImageBitmap (usa el decodificador nativo del navegador)
  const bitmap = await createImageBitmap(file)

  // 2. Calcular dimensiones manteniendo el aspect ratio
  const escala  = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width  * escala)
  const h = Math.round(bitmap.height * escala)

  // 3. Renderizar en OffscreenCanvas (no bloquea el DOM)
  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()  // liberar memoria del ImageBitmap

  // 4. Exportar como WebP
  return canvas.convertToBlob({ type: 'image/webp', quality: CALIDAD })
}
```

### Reglas de almacenamiento

| Regla | Descripción |
|---|---|
| Formato en memoria | `Blob` — nunca `string` (Base64 o data-URL) |
| Motor de persistencia | IndexedDB object store `document_drafts` — campo `adjuntos: Blob[]` |
| Prohibición explícita | Ningún adjunto puede almacenarse como cadena Base64 en Zustand ni en IndexedDB. Una cadena Base64 de 1 MB ocupa ≈1,37 MB en RAM tras la deserialización JSON, contra ≈1 MB de un Blob — y el Blob no pasa por el parser JSON |
| Lectura para previsualización | `URL.createObjectURL(blob)` — revocado con `URL.revokeObjectURL` al desmontar el componente |
| Lectura para upload | `supabase.storage.from('adjuntos_doc7').upload(path, blob, { contentType: 'image/webp' })` |

### Comportamiento en la UI

1. El usuario selecciona una o varias fotografías (`<input type="file" accept="image/*" multiple>`).
2. Por cada archivo: `useImageCompressor.comprimirImagen(file)` → `Blob` comprimido.
3. El `Blob` se añade al array de adjuntos del draft en IndexedDB.
4. El componente renderiza una miniatura con `URL.createObjectURL(blob)`.
5. Al guardar el Doc-7:
   * Si online: upload a Supabase Storage + INSERT del path en el registro del Doc-7.
   * Si offline: el `Blob` permanece en IndexedDB; la mutación se encola con el path
     temporal. Al reconectar: upload primero, luego INSERT con path real.
6. El `Blob` en IndexedDB se elimina una vez confirmada la sincronización con Supabase.

---

## Documentos *(referencia)*

* Doc-7 — Informe de avería.
