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
* Mecanismo de purga: el mensaje se marca como `leido_auto_dismiss` en DB. Un trigger o
  cron job lo elimina de la vista activa inmediatamente al detectar el cierre del modal
  (o tras un TTL configurable, ej. 30 minutos, para bandejas sin confirmación de cierre).
* El contador `unreadCount` del icono `ti-mail` se decrementa igual que en modo normal.

**Justificación:** las alertas puramente informativas (ej. stock mínimo durante un DRP)
no deben requerir gestión manual de archivado. Forzar al personal asistencial a archivar
notificaciones informativas durante una emergencia aumenta la carga cognitiva sin aportar valor.

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
| `fallback` | Coordenadas del historial con opacidad reducida (`opacity-60`) + badge `Ubicación offline` en gris. Indica que el vehículo no respondió al ping y se muestra la última posición conocida desde `gps_historial`. |
