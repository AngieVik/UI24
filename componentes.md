# componentes

---

## selector_drp

> Desplegable reutilizable que lista los DRP activos. Se instancia dentro
> de módulos que necesitan vincularse a un DRP específico. No es un icono
> de black_column — es un componente interno de módulo.

### Comportamiento

* Lista los DRP en estado `En_preparacion` o `En_curso`.
* Por cada DRP muestra: `nombre_drp`, `fecha`, `hora`, badge de estado.
* Si solo hay un DRP activo → se preselecciona automáticamente.
* Si no hay DRP activos → mensaje: "No hay DRP activos en este momento."
* Al seleccionar, el módulo queda vinculado al `drp_id` elegido.

### Instancias

| Módulo             | Contexto                                          |
|--------------------|---------------------------------------------------|
| `modulo_psa`       | Seleccionar el DRP al que se adhiere el PSA       |
| `modulo_filiacion` | Seleccionar el DRP al que se adhiere la filiación |

---

## flujos_transicion

> Componente único parametrizable compartido por todas las bandejas de entrada
> del sistema. Implementar como socket general reutilizable — no duplicar lógica
> en cada módulo.

### Estados de mensaje (base)

`Emitida_Pendiente` → `En_Proceso_Lectura` → `Solucionada_Archivada`

### Comportamiento base (todas las bandejas)

* Icono `ti-mail`: se ilumina en amarillo si hay mensajes sin leer.
* Al pulsar: abre modal superpuesto con los mensajes.
* Acuse de recibo: registra `ID_nombre_lector` y `timestamp_lectura`
  al abrir cada mensaje.
* `timestamp_cambio_estado` registrado en cada transición.
* Acciones base: Marcar_En_Proceso | Marcar_Solucionada | Archivar.

### Modo isReadOnly

Prop booleana `isReadOnly` inyectable por instancia o por tipo de mensaje.

```tsx
<flujos_transicion instancia="bandeja_entrada_logistica_drp" isReadOnly={true} />
// O por tipo de mensaje individual:
<flujos_transicion ... isReadOnly={mensaje.tipo === 'alerta_stock_minimo'} />
```

**Comportamiento cuando `isReadOnly={true}`:**

* Los botones de mutación de estado (Marcar_En_Proceso, Marcar_Solucionada, Archivar)
  están **deshabilitados** en el modal — el personal de campo solo lee la información.
* El acuse de recibo (`timestamp_lectura`, `ID_nombre_lector`) **sí se registra** al abrir.
* Al cerrar el modal, el mensaje **desaparece automáticamente** de la bandeja sin necesidad
  de acción manual — no transiciona a `Solucionada_Archivada` (estado contaminante innecesario).
* Mecanismo de purga **doble**:
  1. **Mutación optimista síncrona** (inmediata): `useBandejasStore.purgeMensaje(mensajeId)`
     elimina el objeto del array de mensajes en el store y decrementa `unreadCount` en el
     mismo tick de React — la bandeja se actualiza visualmente sin esperar ninguna respuesta
     de red.
  2. **Persistencia en DB** (en segundo plano): el mensaje se marca como `leido_auto_dismiss`
     en Supabase. Un trigger o cron job lo elimina de la vista activa
     (o tras TTL configurable, ej. 30 minutos).
  Si la persistencia en DB falla, la purga optimista permanece — el mensaje no se reinserta
  en el store. El coordinador puede forzar una recarga si detecta inconsistencia.
* El contador `unreadCount` del icono `ti-mail` se decrementa igual que en modo normal.

**Justificación:** las alertas puramente informativas (ej. stock mínimo durante un DRP)
no deben requerir gestión manual de archivado. Forzar al personal asistencial a archivar
notificaciones informativas durante una emergencia aumenta la carga cognitiva sin aportar valor.

**Excepción de tipo de payload — Doc-11 (Aviso urgente):**

`isReadOnly` es una directiva de bandeja, no una directiva de documento. Si el ítem
renderizado dentro de un contexto `isReadOnly={true}` es un Doc-11, el componente
**fuerza el desbloqueo del botón `Marcar_Solucionada`** ignorando el valor de la prop.

```tsx
// Lógica de desbloqueo condicional dentro del componente flujos_transicion:
const esMarcableSolucionada =
  !isReadOnly                               // caso normal: no isReadOnly
  || mensaje.tipo === 'doc11'               // excepción: Doc-11 siempre marcable
  || mensaje.tipo === 'aviso_urgente'       // alias del tipo en algunos contextos

// Los demás botones (Marcar_En_Proceso, Archivar) siguen respetando isReadOnly
const esMutacionGeneral = !isReadOnly
```

Consecuencias:
* El botón `Marcar_Solucionada` aparece **habilitado** para Doc-11 en cualquier bandeja.
* Los botones `Marcar_En_Proceso` y `Archivar` permanecen **deshabilitados** si `isReadOnly={true}`.
* El acuse de recibo (`timestamp_lectura`) se registra igualmente, como en cualquier isReadOnly.
* La transición de estado al pulsar `Marcar_Solucionada` registra `ID_nombre_resolutor`
  y `timestamp_resolucion` — sí requiere el JWT del usuario activo con permisos.

**Justificación:** los avisos urgentes (Doc-11) requieren confirmación explícita de
resolución por el receptor. Un muro `isReadOnly` que impide marcar un aviso como solucionado
genera avisos perpetuamente "pendientes" sin reflejo real en el estado operativo.
El Doc-11 es el único tipo de payload con esta excepción porque es el único cuya
semántica es bidireccional: no solo informa, sino que requiere acuse de actuación.

### Instancias y variantes

| Instancia                       | Archivo de referencia                | Tipo              | isReadOnly | Acciones adicionales                                                                                        |
|---------------------------------|--------------------------------------|-------------------|------------|-------------------------------------------------------------------------------------------------------------|
| `bandeja_entrada_flota`         | `nucleo_flota_y_taller.md`           | Estándar          | No         | —                                                                                                           |
| `bandeja_entrada_logistica`     | `nucleo_logistica_y_almacen.md`      | Estándar          | No         | —                                                                                                           |
| `bandeja_entrada_coordinacion`  | `nucleo_coordinacion_y_seguridad.md` | Estándar          | No         | —                                                                                                           |
| `bandeja_entrada_rrhh`          | `nucleo_gestion_y_rrhh.md`           | Estándar+         | No         | Doc-12: Aprobar / Denegar — registra `timestamp_resolucion` e `ID_nombre_resolutor`. Doc-13: Marcar_Leida. |
| `bandeja_entrada_logistica_drp` | `nucleo_drp.md`                      | Mixta             | Parcial    | Doc-10 pendiente: flujo extendido (ver abajo). Alertas stock mínimo: `isReadOnly=true` (auto-dismiss).     |
| `bandeja_entrada_vehiculo`      | `terminal_index.md`                  | Solo lectura      | Sí         | Visible al seleccionar ID_vehiculo. Sin acciones de estado — solo lectura de mensajes del sistema.         |
| `bandeja_entrada_personal`      | `terminal_index.md`                  | Solo lectura      | Sí         | Un icono por ID_nombre con `checkin_on`. Icono `ti-mail` con iniciales. Sin acciones de estado.            |

---

### Flujo extendido: bandeja_entrada_logistica_drp

> Bandeja de logística interna al DRP activo. Lógica de confirmación de
> material en tránsito extendida respecto al flujo base.

**Recibe:**

* Notificaciones de Doc-10 cuyo destino sea:
  * Subinventario DRP (`ID_DRP` asignado al DRP activo).
  * Backpack (`BKP`) asignado al DRP activo.
* Alertas de stock mínimo superado en cualquier location del DRP activo.
* Doc-6 registrados durante el DRP *(solo lectura — seguimiento del gasto
  en tiempo real)*.

**Flujo de confirmación por cada Doc-10 pendiente:**

1. Detalle del envío: origen, ítems, cantidades, número de lote.
2. Acción `Confirmar recepción`:
   * El usuario revisa ítem a ítem la cantidad recibida.
   * Si todo coincide → estado `Completado`.
     El stock se suma al location de destino.
   * Si hay discrepancia → el usuario marca la cantidad real recibida.
     El sistema genera automáticamente un `Descuadre_Pendiente_Revision`
     dirigido a `bandeja_entrada_logistica` para resolución manual.
3. Registra `timestamp_confirmacion` e `ID_nombre_receptor_confirmador`.

**Estados propios de Doc-10 en este contexto:**
`En_Transito` → `Pendiente_Validacion` → `Completado` | `Descuadre_Pendiente_Revision`

---

## flujo_checkout_automatico

> Flujo disparado al hacer `check_out` de un ID_nombre con estado `pilot`
> activo. Garantiza el cierre limpio de todos los estados del turno sin
> intervención adicional. Referenciado por `terminal_check.md`.

### Condición de disparo

ID_nombre con `checkin_on` + estado `pilot` activo sobre un ID_vehiculo.

### Pasos del flujo

**1. Modal km_fin**

* Solicita `km_fin` obligatoriamente antes de continuar.
* Sin `km_fin` el checkout no puede completarse.

**2. Cierre de estados del vehículo**

* Se registra `timestamp_fin` en el estado activo actual del vehículo
  (Ruta, Estacionado, En_espera, etc.).
* Si hay una función operativa activa (Programado, Dispositivo, Traslado,
  Guardia_urgencias, DRP…) se cierra con `timestamp_fin`.

**3. Salida de DRP (si aplica)**

* Si el vehículo estaba asignado a un DRP activo:
  * Se registra `timestamp_salida_drp` para el ID_vehiculo y todos
    los ID_nombre emparejados en ese momento.
  * La dotación abandona el DRP — equivalente a "Salir con vehículo"
    desde `visor_drp`.

**4. Cierre de Doc-8**

* Se registran `km_fin` y `timestamp_checkout` en `Bloque_Sesion`.
* Todos los bloques de estado abiertos se cierran con `timestamp_fin`.
* Doc-8 pasa a estado `Enviado_Cerrado`.

**5. Limpieza de estados de personal**

* Estado `pilot` eliminado del ID_nombre.
* Los carries emparejados al vehículo se desemparejan automáticamente.
  * **Excepción:** si un carry desea permanecer emparejado al vehículo
    en `en_espera`, puede indicarlo explícitamente en ese momento
    (ver `terminal_check.md → Regla carry sin pilot`).

**6. Estado final del vehículo**

* ID_vehiculo pasa a `en_espera`.
* No pasa a `Desactivado` — un nuevo pilot puede asignarse sin
  reintroducir km de inicio.

### Casos especiales

| Situación                                   | Comportamiento                                                    |
|---------------------------------------------|-------------------------------------------------------------------|
| Vehículo en DRP al hacer checkout           | Salida automática del DRP con `timestamp_salida_drp`              |
| Carry sin pilot tras checkout del pilot     | Carry queda emparejado en `en_espera` si lo elige (permitido)     |
| Checkout del último ID_nombre del terminal  | Terminal → `estado_0_terminal_bloqueado`                          |
| Cookie de emergencia temporal (`galleta_pequeña`) activa | Cookie se destruye al salir el último ID_nombre    |
| Vehículo con Doc-Checklist360 abierto       | Checklist se cierra con `timestamp_fin_revision` automáticamente  |

---

## visor_seguimiento_operativo

> Panel de monitorización en tiempo real de la flota activa. Exclusivo de puestos
> `coordinación` y `gerencia`. Implementar como componente de sólo lectura salvo las
> acciones de ping de coordenadas. Ver especificación funcional en
> `nucleo_coordinacion_y_seguridad.md → visor_seguimiento_operativo`.
> Ver lógica del mecanismo de coordenadas en `logic.md §29`.

### Tipografía

Sigue `rules.md §1` estrictamente:

* `Barlow Condensed` para: etiquetas de campo (`Pilot:`, `Carry:`, `Estado:`),
  valores de `ID_vehiculo`, `matricula`, badges de `estado_operativo` y
  `condicion_tecnica`, y toda la UI de control operativo.
* `Barlow` (regular) para: coordenadas GPS (lat/lon), timestamps de último
  ping y cualquier bloque de texto de más de dos líneas.
* Pesos: `700` para IDs, matrículas y badges de estado. `300` para timestamps
  y metadatos secundarios.

### Densidad y espaciado

Entorno de flota en monitor de coordinación — máxima densidad de información:

* `gap-1` entre tarjetas de vehículo en la cuadrícula.
* `p-2` de padding interno por tarjeta.
* `text-xs` como tamaño base para todos los valores dentro de la tarjeta.
* Badges de estado: `text-xs font-bold` con color semántico por estado
  (`ruta` → azul, `alerta` → rojo, `en_espera` → gris, `activado` → verde,
  `estacionado` → amarillo).

### Iconografía permitida

Sólo tres iconos en este componente:

| Icono | Uso |
|---|---|
| `ti-map-pin` | Botón "Solicitar Ubicación" — estado inactivo y en error |
| `ti-loader` | Animación de carga durante petición de ping activa |
| `ti-copy` | Botón "Copiar Coordenadas" — estado inicial |
| `ti-check` | Confirmación visual de copia al portapapeles (300 ms, luego vuelve a `ti-copy`) |

### Estados del componente de coordenadas (por tarjeta)

| Estado | Visual |
|---|---|
| `idle` | Muestra últimas coordenadas conocidas (lat, lon) + timestamp en `text-xs font-light`. Botones activos. |
| `fetching` | Icono `ti-loader` animando. Botón "Solicitar Ubicación" deshabilitado. Coordenadas previas visibles en opacidad reducida (`opacity-50`). |
| `success` | Coordenadas actualizadas en verde (`text-green-600`) durante 2 s, luego vuelven al color neutro. Timestamp actualizado. |
| `fallback` | Coordenadas del historial con opacidad reducida (`opacity-60`) + badge `Ubicación offline` en gris. Indica que el vehículo no respondió al ping y se muestra la última posición conocida desde `gps_historial`. Se alcanza por timeout (5 s) o por recepción de `pong_error` (inmediato). |
| `posicion_desconocida` | **Sin coordenadas ni chincheta en mapa.** Texto visible: `"Posición desconocida (Vehículo en movimiento sin telemetría reciente)"` en `text-amber-600 font-medium`. Botón "Solicitar Ubicación" activo. Se alcanza cuando el fallback devuelve una coordenada de `origen = 'cambio_operativo'` con antigüedad > 10 min Y el vehículo está en `estado_operativo ∈ {ruta, alerta}`. Ver lógica en `logic.md §29.5`. |

### Gestión de `pong_error`

Cuando el terminal de vehículo no puede obtener la posición GPS (hardware no disponible,
permiso denegado, timeout del chip), publica un evento `pong_error` en el canal
`vehiculo:${ID_vehiculo}`. El componente maneja este evento de la siguiente forma:

```
onPongError(payload):
  1. clearTimeout(fallbackTimer)          // cancela el timer de 5 s si sigue activo
  2. estado → 'fallback'                  // transición inmediata — sin esperar timeout
  3. ejecutarFallbackRPC(payload.id_vehiculo)
       // RPC get_ultima_ubicacion_vehiculo — UNION ALL gps_historial + doc8_eventos
  4. Muestra badge "Ubicación offline" en gris + coordenadas históricas con opacity-60
```

**Nota UX:** el badge `Ubicación offline` se muestra igual tanto si el fallback fue por
`pong_error` como por timeout. No se expone el código de error técnico al coordinador.
El botón "Solicitar Ubicación" vuelve a estar habilitado tras el fallback, permitiendo
un nuevo intento manual.

**Nota de throttle:** el terminal NO activa el throttle de 15 s cuando falla el GPS
(ver `hooks.md §16`). El coordinador puede reintentar inmediatamente si lo considera
necesario.

---

## selector_vehiculo_drp

> Combobox filtrado reutilizable para seleccionar un `ID_vehiculo` en el contexto
> de creación de DRP (`crear_drp → agregar_dotacion_vehiculo`).
> Reemplaza al campo de texto libre anterior — presenta solo vehículos seleccionables
> con alertas contextuales para los casos de advertencia.

### Comportamiento

* Carga la lista de vehículos ejecutando la RPC `get_vehiculos_disponibles_para_drp()`:
  ```sql
  -- Excluye inoperativo_critico
  -- Excluye vehículos ya en DRP En_curso
  -- Incluye con badge "Ya en DRP" si están en DRP En_preparacion
  SELECT id_vehiculo, matricula, estado_operativo, condicion_tecnica,
         drp_activo_nombre, drp_activo_estado
    FROM vehiculos
   WHERE condicion_tecnica != 'inoperativo_critico'
     AND (
       drp_activo_id IS NULL
       OR drp_activo_estado != 'En_curso'
     )
   ORDER BY estado_operativo, id_vehiculo;
  ```

* **Categorías de presentación:**

| Vehículo | Visualización | Seleccionable |
|---|---|---|
| `condicion_tecnica = inoperativo_critico` | No aparece en la lista | ✗ |
| En DRP `En_curso` | No aparece en la lista | ✗ |
| En DRP `En_preparacion` | Badge naranja "Ya en DRP [nombre]" | ✓ con confirmación |
| Disponible (`operativo` o `averiado_leve`) | Normal | ✓ directo |

* **Confirmación adicional para vehículos "Ya en DRP":**
  Modal: "Este vehículo ya está asignado al DRP [nombre_drp] en preparación.
  ¿Confirmar asignación a este nuevo DRP también?"
  [ Confirmar ] [ Cancelar ]

* Búsqueda: texto predictivo por `id_vehiculo` o `matricula`.
* Si no hay vehículos disponibles → mensaje: "No hay vehículos disponibles
  (todos están en DRP en curso o inoperativos)."

### Instancias

| Módulo | Contexto |
|---|---|
| `crear_drp` | `agregar_dotacion_vehiculo` → campo `ID_vehiculo` |
| `resumen_drp → Editar recursos` | Campo de vehículo al añadir dotaciones |

---

## tarjeta_paciente_filiacion

> Tarjeta reutilizable que representa un paciente dentro del módulo filiación.
> Se usa tanto en `perfil_admision` (lista de espera) como en `perfil_boxes`
> (monitor de pacientes en espera del box).

### Colorimetría por estado

| Estado del paciente | Estilo base | Variante `revaluacion = true` |
|---|---|---|
| `en_espera` (primera vez) | Fondo blanco / borde neutro | — |
| `en_espera` + `revaluacion = true` | Fondo `amber-50` / borde `amber-400` | Badge `Revaluación` en `amber-600 font-semibold` |
| `en_consulta` | Fondo `blue-50` / borde `blue-400` | Si llegó de revaluación: badge `Revaluación` en `amber-600` sobre fondo `blue-50` |
| `archivado` | Fondo gris / opacidad reducida | — |

### Badge `Revaluación`

* Texto: `"Revaluación"` en `text-xs font-semibold text-amber-600`.
* Posición: esquina superior derecha de la tarjeta, junto al badge de orden.
* Visible en todos los contextos donde `revaluacion = true`:
  * Lista de espera (`perfil_admision` y `perfil_boxes`).
  * Vista de paciente abierto en box (`en_consulta` si proviene de revaluación).
* **Propósito:** el profesional que atiende al paciente sabe de inmediato que
  hay un Doc-3 con contexto clínico previo y que el `timestamp_admision` es anterior
  al turno actual. Evita tratar al paciente como una primera atención nueva.

### Tooltip al pasar el cursor sobre el badge

`"Paciente en revaluación — timestamp de admisión original preservado"`

### Orden en la lista de espera

Los pacientes con `revaluacion = true` no reciben prioridad automática por el flag;
mantienen su `orden` numérico. El perfil_admision puede ajustar el orden manualmente
si la urgencia clínica lo requiere.
