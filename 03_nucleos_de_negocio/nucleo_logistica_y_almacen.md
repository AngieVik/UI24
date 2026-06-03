# nucleo_logistica_y_almacen

* RBAC: `gerencia`, `logistica`, `responsable_logistica`.
* `responsable_logistica` tiene todos los permisos de `logistica`
  más la gestión completa del `catalogo_items` (añadir y eliminar ítems).

---

## inventario_maestro

* Vista global de todo el stock del sistema.
* Acceso desde `black_column → Logística → Inventario maestro`.
* Vista principal: tabla de todos los `inventory_locations` con su stock por ítem,
  agrupado por subgrupos. Filtros por tipo, location, categoría e ítem.

* **Sub-vistas accesibles desde inventario_maestro:**
  * `Gestionar locations` → crear, editar o eliminar `inventory_locations`.
  * `Gestionar plantillas` → crear, editar o eliminar `plantillas_stock`.
  * `Cuadre de stock` → ajuste manual de `stock_real` por location.

* **`auditoria_inventario`**: historial completo de todos los movimientos.
  * Filtros: fecha, ítem, location, usuario, tipo_movimiento.
  * Cada entrada registra:
    * `timestamp_movimiento`, `ID_nombre_responsable`
    * `ID_item`, `cantidad_delta` *(negativo = descuento, positivo = entrada)*
    * `ID_origen`, `ID_destino` *(solo movimientos entre locations)*
    * `tipo_movimiento`:
      * `doc6_gasto` — descuento operativo
      * `doc10_envio` — transferencia en tránsito
      * `doc10_recepcion` — recepción confirmada
      * `doc9_entrada` — entrada desde almacén externo
      * `ajuste_manual` — cuadre físico manual
      * `carga_inicial` — stock inicial al crear location
      * `merma` — baja contable por pérdida o rotura (generado por RPC de Resolver_Manual)
      * `recuperacion_descuadre` — alta contable por material localizado (ídem)

* **`ultimos_movimientos`**: los N movimientos más recientes a través
  de todos los locations (panel de resumen rápido).

---

## plantillas_stock

> Una plantilla define la **estructura canónica** de un tipo de location:
> qué subgrupos tiene, qué ítems van en cada subgrupo y cuál es
> el `stock_objetivo` de cada ítem. Es el "deber ser" de ese tipo.
>
> Los `inventory_locations` heredan su estructura de la plantilla de su tipo.
> Cada location puede tener overrides individuales de `stock_objetivo` por ítem.

### Tipos con plantilla fija

Estos tipos tienen subgrupos predefinidos en la plantilla.

| Tipo de plantilla | Comparte con |
|---|---|
| `plantilla_A1A2` | A1, A2 |
| `plantilla_B` | B |
| `plantilla_C` | C |
| `plantilla_VIR` | VIR |
| `plantilla_Quad` | Quad |
| `plantilla_Backpack` | BKP1–BKP8 |

**Subgrupos por plantilla fija:**

* `plantilla_A1A2`, `plantilla_B`, `plantilla_C`:
  * Cabina conducción, Cabina asistencial, Armario inm-mov,
    Ampulario, Vía aérea, Circulatorio, Curas y sutura,
    Mochila Roja, Mochila Azul, Mochila Amarilla.

* `plantilla_VIR`:
  * Cabina conducción, Ampulario,
    Mochila Roja, Mochila Azul, Mochila Amarilla.

* `plantilla_Quad`:
  * Mochila Roja, Mochila Azul, Mochila Amarilla.

* `plantilla_Backpack`:
  * Antisépticos, Curas y sutura, Vía venosa periférica,
    Vendajes y trauma, Diagnóstico, Vía aérea.

### Tipos con plantilla libre (subgrupos dinámicos)

Estos tipos no tienen subgrupos predefinidos en la plantilla.
Los subgrupos se crean directamente en cada location según necesidades.

| Tipo | Descripción |
|---|---|
| `Unidad_movil` | Subgrupos libres (Box1, Box2, Box3…) |
| `Logistica` | Subgrupos libres (Box1, Box2, Box3…) |
| `Subinventario` | Sin estructura predefinida — logística decide el contenido por DRP/PSA  |
| `Almacen` | Sin estructura predefinida — almacén central gestionado libremente |

### Estructura de una plantilla

Cada entrada en `plantillas_stock` tiene:

```
plantilla_id   → nombre de la plantilla (ej. 'plantilla_B')
tipo           → tipo de location al que aplica (ej. 'B')
subgrupo       → nombre del subgrupo (ej. 'Cabina asistencial')
ID_item        → referencia a catalogo_items
stock_objetivo → cantidad objetivo para ese ítem en ese subgrupo
```

### Gestión de plantillas *(RBAC: `logistica`, `gerencia`)*

Acceso desde `inventario_maestro → Gestionar plantillas`.

* **Ver plantilla**: despliega la plantilla de un tipo con todos
  sus subgrupos e ítems con `stock_objetivo`.

* **Editar plantilla**:
  * Modificar `stock_objetivo` de un ítem existente.
  * Añadir ítem al subgrupo (búsqueda predictiva en `catalogo_items`).
  * Eliminar ítem del subgrupo *(solo si stock_real = 0 en todos los
    locations de ese tipo — si hay stock, la acción está bloqueada)*.
  * Añadir subgrupo nuevo a la plantilla.
  * Eliminar subgrupo *(bloqueado si algún ítem del subgrupo tiene
    stock_real > 0 en cualquier location de ese tipo)*.
  * Al guardar cambios → modal:
    * **"¿Propagar cambios a los locations existentes de este tipo?"**
    * `Sí, propagar`:
      * Añade subgrupos nuevos a los locations existentes (sin stock).
      * Añade ítems nuevos con `stock_real = 0` y el nuevo `stock_objetivo`.
      * Actualiza `stock_objetivo` en ítems existentes **solo si el location
        no tiene un override individual** para ese ítem.
      * No modifica `stock_real` de ningún ítem.
    * `No, solo futuros`:
      * Los cambios aplican únicamente a locations creados a partir de ahora.
      * Los locations existentes no se modifican.

* **Crear plantilla**: para un tipo nuevo. Define nombre, tipo y
  subgrupos desde cero.

* **Duplicar plantilla**: copia la estructura de una plantilla existente
  como punto de partida para una nueva.

---

## inventory_locations

* Cada location tiene su propio `stock_real` por ítem,
  organizado en subgrupos según la plantilla de su tipo.
* Catálogo de ítems: único y compartido (245 ítems).
  Todos los locations pueden tener cualquier ítem del catálogo.

### Locations registrados

| Tipo | IDs |
|---|---|
| A1 | 301, 302 |
| A2 | 401–410 |
| B | 201–210 |
| C | 101–120 |
| Unidad_movil | UM1, UM2 |
| Logistica | LOG1 |
| VIR | VIR1, VIR2 |
| Quad | QAD1, QAD2 |
| Backpack | BKP1–BKP8 |
| Subinventario | ID_DRP1–ID_DRP8 *(inventarios de DRP/PSA)* |
| Almacen | ID_almacen *(stock central)* |

### Campos por ítem en cada location

| Campo | Descripción |
|---|---|
| `ID_item` | Referencia a `catalogo_items` |
| `subgrupo` | Subgrupo al que pertenece dentro del location |
| `stock_real` | Cantidad física actual |
| `stock_objetivo` | Cantidad objetivo. Si tiene override: valor propio del location. Si no: hereda de la plantilla. |
| `tiene_override` | Booleano — indica que `stock_objetivo` difiere de la plantilla |

### Estados de los Subinventarios (ID_DRP1–ID_DRP8)

| Estado | Descripción |
|---|---|
| `Operativo` | Disponible para asignar a un nuevo DRP o PSA. |
| `Asignado` | Vinculado a un DRP o PSA activo. |
| `En_Transito` | DRP/PSA finalizado. Stock físico pendiente de verificación. Asignación estándar bloqueada. |
| `Operativo_Condicionado` | Reasignado antes de completar la reconciliación del DRP anterior. El snapshot del DRP anterior se cierra automáticamente como `resuelto_por_transferencia` — logística nunca lo ve en su cola activa. Se crea un nuevo snapshot con el `stock_real` actual como referencia del nuevo DRP. La nueva dotación asume ciegamente el stock teórico. Al retornar a base, logística hace un único cuadre que cubre toda la merma acumulada. |

Flujo estándar: `Operativo` → `Asignado` → `En_Transito` → `Operativo`.

Flujo condicionado: `En_Transito` → `Operativo_Condicionado` → `Asignado` (nuevo DRP).

Ver `logic.md §9.1` para el flujo completo de reasignación condicionada.

### Gestión de locations *(RBAC: `logistica`, `gerencia`)*

Acceso desde `inventario_maestro → Gestionar locations`.

* **Crear location**:
  1. Seleccionar `tipo` (desplegable con todos los tipos disponibles).
  2. Introducir `ID` del location (ej. `209`, `BKP9`). El sistema valida
     que el ID no exista ya.
  3. Si el tipo tiene plantilla fija:
     * La estructura de subgrupos e ítems se copia automáticamente de la plantilla.
     * `stock_real = 0` para todos los ítems (carga inicial posterior via cuadre o Doc-9).
     * `stock_objetivo` heredado de la plantilla (sin override inicial).
  4. Si el tipo es libre (Unidad_movil, Logistica, Subinventario, Almacen):
     * Location creado vacío. Los subgrupos e ítems se añaden manualmente.
  5. Confirmar → `timestamp_creacion`, `ID_nombre_creador` registrados.

* **Editar location** (estructura e ítems — no el stock_real):
  * Renombrar el location.
  * Añadir subgrupo al location.
  * Eliminar subgrupo *(bloqueado si algún ítem del subgrupo tiene `stock_real > 0`)*.
  * Añadir ítem a un subgrupo (búsqueda predictiva en `catalogo_items`):
    * Asignar `stock_objetivo` propio (override).
  * Eliminar ítem de un subgrupo *(bloqueado si `stock_real > 0`)*.
  * Modificar `stock_objetivo` de un ítem específico (override individual):
    * El campo queda marcado como `tiene_override = true`.
    * Icono visible en UI para distinguirlo de los valores heredados de la plantilla.
    * Acción `Restablecer plantilla`: elimina el override, vuelve al valor de la plantilla.

* **Eliminar location**:
  * Bloqueado si:
    * `stock_real > 0` en algún ítem del location.
    * Location es un Subinventario en estado `Asignado` o `En_Transito`.
    * Hay Doc-10 en tránsito cuyo origen o destino es este location.
  * Si pasa las guards: modal de confirmación doble antes de eliminar.
  * `tipo_movimiento = 'eliminacion_location'` en `auditoria_inventario`.

---

## ajuste_manual_stock

> Permite a logística modificar directamente el `stock_real` de cualquier ítem
> en cualquier location para reflejar el recuento físico real (cuadre).
> Cada ajuste genera entrada en `auditoria_inventario` con `tipo_movimiento = 'ajuste_manual'`.
> No afecta `stock_objetivo`.

### Acceso

Desde `inventario_maestro → Cuadre de stock` *(RBAC: `logistica`, `gerencia`)*.

También accesible desde la vista de detalle de cualquier location individual.

### Flujo de cuadre

1. Seleccionar **location** a cuadrar.
2. Vista del location con todos sus subgrupos e ítems:
   * Columnas visibles: `Subgrupo`, `Ítem`, `stock_real` (actual), `stock_objetivo`.
   * Columna adicional: `stock_físico` (campo editable, inicialmente vacío).
3. El usuario introduce el **recuento físico** en la columna `stock_físico`
   para los ítems que quiere cuadrar. Solo los ítems con `stock_físico` rellenado
   serán actualizados.
4. Campo obligatorio: `motivo_ajuste` (texto libre).
   * Ejemplos: "Recuento físico post-DRP", "Corrección tras avería",
     "Auditoría mensual", "Pérdida no documentada".
5. Resumen previo antes de confirmar:
   * Lista de ítems que se van a ajustar con la diferencia calculada:
     `delta = stock_físico - stock_real`.
   * Delta positivo (verde): stock aumenta.
   * Delta negativo (rojo): stock disminuye.
   * Delta cero: no se muestra en el resumen (sin cambio).
6. Confirmar | Cancelar.
7. Al confirmar:
   * RPC ejecuta todas las actualizaciones en una transacción:
     * `UPDATE stock_real = stock_físico` para cada ítem ajustado.
     * `INSERT auditoria_inventario` por cada ítem con:
       `tipo_movimiento = 'ajuste_manual'`,
       `cantidad_delta = delta`,
       `ID_nombre_responsable`,
       `timestamp_movimiento`,
       `motivo_ajuste`.
   * Si algún ítem genera una alerta de stock mínimo tras el ajuste
     → notificación automática a `bandeja_entrada_logistica`.

### Cuadre de subinventario DRP (post-evento)

Flujo específico para reconciliación después de que un subinventario
pasa a estado `En_Transito` (ver `logic.md §9`):

1. Logística abre el subinventario `ID_DRP` en estado `En_Transito`.
2. Ejecuta el cuadre normal (introduce recuento físico ítem a ítem).
3. Al confirmar el cuadre → modal adicional:
   * **"¿Marcar subinventario como verificado y disponible?"**
   * `Sí` → `ID_DRP` pasa de `En_Transito` a `Operativo`.
   * `No` → el ajuste se aplica pero el subinventario permanece en `En_Transito`
     (para casos donde el recuento requiere varias sesiones).

---

## descuadres_inventario

* Generados automáticamente cuando la cantidad física no coincide
  con el sistema al confirmar recepción de un Doc-10.
* Campos: `ID_item`, `categoria`, `nombre`, `especificación`,
  `cantidad_enviada`, `cantidad_recibida`, `diferencia`,
  `ID_origen`, `ID_destino`, `timestamp_generado`.
* Visibles en `bandeja_entrada_logistica` y en `black_column → Logística → Descuadres`.
* Acciones: `Resolver_Manual` | `Archivar`.
* **`Resolver_Manual`** — obliga a clasificar el destino contable mediante RPC:
  * `Pérdida/Rotura` → el sistema registra una entrada de `merma` en `auditoria_inventario`. Sin cambio de `stock_real`.
  * `Recuperación` → el sistema suma la cantidad faltante al `ID_origen` o `ID_destino` elegido por el operario. Registra `recuperacion_descuadre` en `auditoria_inventario`.
  * Ver `logic.md §7.3` para el flujo RPC completo.
* **`Archivar`**: cierra sin clasificación contable. Solo para casos sin impacto de stock.
* Al resolver o archivar: registra `ID_nombre_resolutor` y `timestamp_resolucion`.

---

## inventario_en_transito

* Material enviado vía Doc-10 pendiente de confirmación por el receptor.
* Restado del origen, aún no sumado al destino.
* Campos: `ID_item`, `categoria`, `nombre`, `especificación`,
  `cantidad`, `ID_origen`, `ID_destino`,
  `timestamp_envio`, `ID_nombre_emisor`.

---

## catalogo_items *(referencia — 245 ítems)*

* Campos por ítem: `ID_item`, `categoria`, `nombre`, `especificación`.
* Catálogo compartido por todos los `inventory_locations`.

* **Gestión del catálogo** *(RBAC: `responsable_logistica`, `gerencia`)*:
  * **Añadir ítem**: formulario con `categoria` (desplegable), `nombre` y
    `especificación`. El sistema genera `ID_item` automáticamente.
    Confirmar | Cancelar.
  * **Editar ítem**: modificar `categoria`, `nombre` o `especificación`.
    Registra `timestamp_edicion` e `ID_nombre_editor`.
  * **Eliminar ítem**:
    * Bloqueado si el ítem tiene `stock_real > 0` en cualquier location
      o si está referenciado en Doc-10 o Doc-6 activos.
    * Si no hay ninguna referencia activa: modal de confirmación doble.
    * La eliminación es lógica (`archivado = true`) — el registro histórico
      se conserva en `auditoria_inventario`.

* Categorías: Agujas, Antisépticos, Apósito, Ayudas técnicas,
  Catéter, Dispositivo supraglótico, Electromedicina,
  Equipamiento no sanitario, Equipamiento sanitario, Gasas,
  Inmovilización y movilización, Jeringas, Lencería,
  Mascarillas, Material intubación, Medicación parenteral,
  Oxigenoterapia, Set de emergencias, Sondas, Sueroterapia,
  Sutura, Tópicos, Vendas, Vía enteral/oral,
  Vía venosa periférica.

---

## bandeja_entrada_logistica

* Recibe Doc-6 (gastos de material), Doc-11 (avisos urgentes),
  alertas de stock mínimo y descuadres generados por Doc-10.
* Flujo de estados y acciones: ver `componentes.md → flujos_transicion`.
