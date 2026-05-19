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
| `posicion_desconocida` | **Sin coordenadas ni chincheta en mapa.** Texto visible: `"Posición desconocida (Vehículo en movimiento sin telemetría reciente)"` en `text-amber-700 font-medium`. Botón "Solicitar Ubicación" activo. Se alcanza cuando el fallback devuelve una coordenada de `origen = 'cambio_operativo'` con antigüedad > 10 min Y el vehículo está en `estado_operativo ∈ {ruta, alerta}`. Ver lógica en `logic.md §29.5`. |

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
| `en_espera` + `revaluacion = true` | Fondo `amber-50` / borde `amber-300` | Badge `Revaluación` en `amber-700 font-semibold` |
| `en_consulta` | Fondo `green-50` / borde `green-300` | Si llegó de revaluación: badge `Revaluación` en `amber-700` sobre fondo `green-50` |
| `archivado` | Fondo gris / opacidad reducida | — |

> ❌ No usar `blue-50` / `blue-400` para `en_consulta` — azul decorativo prohibido.
> ✅ `amber-700` (#b45309, ratio 4.6:1 sobre blanco) en lugar de `amber-600` (2.97:1 ❌ WCAG).

### Badge `Revaluación`

* Texto: `"Revaluación"` en `text-xs font-semibold text-amber-700`.
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

---

## LoadingSkeleton — estados de carga (U-02)

> Componente reutilizable para indicar que el contenido está en proceso de carga.
> Usar **exclusivamente** en los contextos descritos en §Cuándo usar. En una app
> offline-first donde la mayoría de lecturas vienen de IndexedDB o Zustand, los
> skeletons son la excepción, no la regla.

### Cuándo usar `<LoadingSkeleton />`

| Contexto | Usar skeleton | Motivo |
|---|---|---|
| Boot inicial de la app (rehidratación de IndexedDB) | ✅ Sí | Los stores tardan ~100-300 ms en rehidratarse desde IDB |
| Sincronización explícita forzada por el usuario (pull-to-refresh) | ✅ Sí | El usuario inició una operación consciente con el servidor |
| Primera carga de un listado que aún no tiene caché local | ✅ Sí | No hay datos en IDB — fetch al servidor necesario |
| Navegación entre pantallas con datos ya en Zustand/IDB | ❌ No | Los datos están en memoria — no hay espera real |
| Lecturas de `useVehiculoStore`, `useTerminalStore`, `useAuthStore` | ❌ No | Zustand es síncrono — render inmediato |
| Transiciones de estado dentro de un módulo ya cargado | ❌ No | Solo el elemento que muta debe mostrar un spinner local |
| Modo offline con datos cacheados | ❌ No | IndexedDB ya tiene los datos; mostrar skeleton sería incorrecto |

> ⚠️ Mostrar un skeleton cuando los datos vienen de IndexedDB introduce un flash
> innecesario que degrada la percepción de rendimiento. La app debe sentirse
> **instantánea** en los flujos cacheados.

### Variantes

```tsx
// Skeleton de página completa — solo en boot inicial o primera carga
<LoadingSkeleton variant="page" />

// Skeleton de tarjeta — para listas de DRP, pacientes, mensajes
<LoadingSkeleton variant="card" rows={3} />

// Skeleton de fila de tabla — para grids de inventario, cuadrantes
<LoadingSkeleton variant="row" columns={4} />

// Spinner inline — para botones con acción en curso
<LoadingSkeleton variant="spinner" size="sm" />
```

### Especificación de `<LoadingSkeleton />`

```tsx
interface LoadingSkeletonProps {
  variant: 'page' | 'card' | 'row' | 'spinner'
  rows?: number       // solo variant='card' — número de tarjetas simuladas (default: 1)
  columns?: number    // solo variant='row' — número de columnas simuladas (default: 3)
  size?: 'sm' | 'md' | 'lg'  // solo variant='spinner' (default: 'md')
  className?: string  // override de clases Tailwind si es necesario
}
```

**Implementación base:**

```tsx
// components/ui/LoadingSkeleton.tsx
export function LoadingSkeleton({ variant, rows = 1, columns = 3, size = 'md', className }: LoadingSkeletonProps) {
  const pulse = 'animate-pulse bg-gray-200 rounded'

  if (variant === 'spinner') {
    const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
    return (
      <div
        role="status"
        aria-label="Cargando"
        className={`${sizes[size]} border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin ${className ?? ''}`}
      />
    )
  }

  if (variant === 'page') {
    return (
      <div role="status" aria-label="Cargando" className={`p-4 space-y-4 ${className ?? ''}`}>
        <div className={`h-8 w-1/3 ${pulse}`} />
        <div className={`h-4 w-full ${pulse}`} />
        <div className={`h-4 w-5/6 ${pulse}`} />
        <div className={`h-32 w-full ${pulse}`} />
        <span className="sr-only">Cargando contenido…</span>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div role="status" aria-label="Cargando" className={`space-y-3 ${className ?? ''}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 border border-gray-100 rounded-lg space-y-2">
            <div className={`h-4 w-2/3 ${pulse}`} />
            <div className={`h-3 w-full ${pulse}`} />
            <div className={`h-3 w-4/5 ${pulse}`} />
          </div>
        ))}
        <span className="sr-only">Cargando elementos…</span>
      </div>
    )
  }

  // variant === 'row'
  return (
    <div role="status" aria-label="Cargando" className={`space-y-2 ${className ?? ''}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className={`h-4 flex-1 ${pulse}`} />
          ))}
        </div>
      ))}
      <span className="sr-only">Cargando tabla…</span>
    </div>
  )
}
```

**Regla de accesibilidad:** todos los skeletons tienen `role="status"` y `aria-label="Cargando"`.
El texto `<span className="sr-only">` es obligatorio para lectores de pantalla.

### Integración con TanStack Query

```tsx
// En un componente que hace fetch al servidor:
const { data, isLoading, isFetching } = useQuery({ queryKey: ['drps-activos'], queryFn: fetchDrpsActivos })

// Solo mostrar skeleton en la carga inicial (isLoading), no en refetches silenciosos (isFetching)
if (isLoading) return <LoadingSkeleton variant="card" rows={3} />
return <ListaDRP data={data} />
```

---

## BannerOffline — vista "Sin conexión" (U-03)

> No es una página de error que bloquea la app. Es un **estado global persistente**
> en forma de banner amarillo en la parte superior del contenido. La app sigue
> siendo completamente operable en modo offline para los flujos soportados.

### Comportamiento

```
Estado de red       → Visible
────────────────────────────────────────────────────────────
Online              → Banner oculto (sin render)
Offline detectado   → Banner visible — amarillo, persistente
Reconectando        → Banner cambia a "Reconectando…" + spinner
Sincronizando cola  → Banner cambia a "Sincronizando datos…" + progreso
```

**Detección de offline:**
El estado de red se gestiona en `useOfflineQueue`. La detección usa tres señales en
conjunción (ninguna es suficiente por sí sola):

```typescript
// 1. navigator.onLine — primera señal (puede ser false positive)
window.addEventListener('online',  () => useOfflineQueue.getState().setOnline(true))
window.addEventListener('offline', () => useOfflineQueue.getState().setOnline(false))

// 2. Error de canal Supabase Realtime — segunda señal
supabase.channel('system').on('system', { event: 'disconnect' }, () => {
  useOfflineQueue.getState().setOnline(false)
})

// 3. Fallo de petición fetch — tercera señal
// → Ya gestionado en customFetch de supabaseClient.ts vía classifyError()
```

### Especificación del banner

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️  Sin conexión  ·  Última sincronización: hace 12 min             │
│     Los partes de trabajo y registros clínicos siguen disponibles.   │
└─────────────────────────────────────────────────────────────────────┘
```

- **Posición:** fijo debajo del header negro, encima del contenido.
- **Color:** `bg-amber-50 border-b border-amber-300` con texto `text-amber-800`.
- **Ícono:** `ti-wifi-off` (Tabler Icons).
- **Texto contador:** "Última sincronización: hace X min" — calculado desde
  `useOfflineQueue.getState().lastSuccessfulDrainAt` (timestamp del último vaciado exitoso).

```typescript
// Formato del contador de última sincronización
function formatLastSync(lastDrainAt: number | null): string {
  if (!lastDrainAt) return 'sin sincronización previa en este turno'
  const diffMin = Math.floor((Date.now() - lastDrainAt) / 60_000)
  if (diffMin < 1) return 'hace menos de 1 min'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  return `hace ${diffH} h ${diffMin % 60} min`
}
```

### Acciones permitidas en modo offline

El banner **no deshabilita** estos flujos:

| Flujo | Offline-capable | Nota |
|---|---|---|
| Crear / continuar Doc-8 (parte de trabajo) | ✅ | Cola offline |
| Registrar Doc-2, Doc-3, Doc-4, Doc-5 | ✅ | Cola offline |
| Registrar Doc-7 (avería) | ✅ | Cola offline |
| Registrar Doc-6 (gasto material) | ✅ | Cola offline |
| Leer bandejas (últimos mensajes) | ✅ | Caché IndexedDB |
| Leer marquesina / tablón | ✅ | Caché IndexedDB |
| Ver estado del DRP en curso | ✅ | `useDRPStore` en memoria |

El banner **sí deshabilita** (con toast explicativo al intentar):

| Flujo | Deshabilitado | Mensaje |
|---|---|---|
| Crear / transicionar DRP | ✅ | "Sin conexión — esta acción requiere red" |
| Alta / baja de empleado o vehículo | ✅ | "Sin conexión — esta acción requiere red" |
| Cuadrantes, RRHH, configuración | ✅ | "Sin conexión — esta acción requiere red" |

### Implementación

```tsx
// components/ui/BannerOffline.tsx
import { useOfflineQueue } from '@/stores/useOfflineQueue'

export function BannerOffline() {
  const { isOnline, lastSuccessfulDrainAt, pendingCount } = useOfflineQueue()

  if (isOnline && pendingCount === 0) return null

  const isSyncing = isOnline && pendingCount > 0

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isSyncing ? 'Sincronizando datos' : 'Sin conexión a internet'}
      className="w-full bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-center gap-2 text-sm text-amber-800"
    >
      {isSyncing ? (
        <>
          <span className="ti-refresh animate-spin" aria-hidden="true" />
          <span>Sincronizando datos… ({pendingCount} operaciones pendientes)</span>
        </>
      ) : (
        <>
          <span className="ti-wifi-off" aria-hidden="true" />
          <span>
            Sin conexión · {formatLastSync(lastSuccessfulDrainAt)} ·
            Los partes de trabajo y registros clínicos siguen disponibles.
          </span>
        </>
      )}
    </div>
  )
}
```

**Campo requerido en `useOfflineQueue`:** `lastSuccessfulDrainAt: number | null`
— timestamp (epoch ms) del último vaciado completo exitoso de la cola. Se actualiza
en `procesarCola()` cuando `pendingCount` llega a 0 sin errores.

---

## Paleta de colores — ratios WCAG 2.1 AA verificados (U-04)

> Referencia canónica de colores del sistema. Fuente de verdad CSS:
> `05_interfaz_y_desarrollo/cloude_desing/colors_and_type.css`.
> Todos los valores tienen ratio de contraste verificado según WCAG 2.1 nivel AA
> (mínimo 4.5:1 para texto normal, 3:1 para texto grande ≥18px / ≥14px bold).

### Tokens de marca — los únicos colores de marca permitidos

| Token CSS | Hex | Uso |
|---|---|---|
| `--u24-yellow` | `#FFD60A` | Único amarillo del sistema — acento activo, logo, indicador nav, home_area |
| `--u24-yellow-soft` | `#FFF5B8` | Tint suave para badges de advertencia / fondo informativo |
| `--u24-black` | `#111111` | Header + black_column + todos los botones |
| `--u24-col-hover` | `#1f1f1f` | Hover de ítems en black_column y botones |
| `--u24-col-active` | `#2a2a2a` | Ítem activo en black_column |

> ❌ **Prohibido usar:** naranja, mostaza, dorado (`#F5C518`), `amber-400` (#fbbf24),
> `yellow-400` (#facc15), `amber-500` (#f59e0b). El único amarillo es `#FFD60A`.
> ❌ **Azul decorativo prohibido:** el azul solo se usa en focus rings y enlaces de texto.
> No usar `bg-blue-*`, `text-blue-*` como color de estado operativo — sustituir por neutro o verde.

### Tipografía — familias y pesos

| Rol | Familia | Pesos permitidos | Uso |
|---|---|---|---|
| UI de mando | `Barlow Condensed` (token `--font-cmd`) | 300, 500, 700, **900** | Navegación, etiquetas, IDs, matrículas, badges, ticker, alertas |
| Cuerpos largos | `Barlow` (token `--font-body`) | 300, 500, 700 | Formularios >2 líneas, descripciones, bloques de texto |

> Peso **900** (`font-black`) **exclusivo** para alertas Doc-11 y rotura de stock crítica.
> No usar en textos ordinarios.

### Casing — sentence case estricto

| Tipo de texto | Regla | Ejemplo |
|---|---|---|
| Labels, títulos, estados | Sentence case | "En preparación", "Parte de trabajo", "Sin conexión" |
| Acrónimos de rol/módulo | UPPERCASE siempre | `TES`, `DUE`, `VIR`, `MED`, `DRP`, `PSA`, `RBAC`, `ITV` |
| Botones destructivos críticos | UPPERCASE | "ELIMINAR REGISTRO", "BORRAR DRP" |
| Identificadores de máquina | Inglés, sin cambios | `id_nombre`, `timestamp_apertura`, `cancelado_por_drp` |

### Fondos base del sistema

| Token | Variable CSS / Tailwind | Hex | Luminancia relativa |
|---|---|---|---|
| `fondo-header` + `fondo-black_column` | `--u24-black` / `bg-[#111111]` | `#111111` | 0.004 |
| `fondo-home_area` | `--bg-home` = `--u24-yellow` | `#FFD60A` | 0.671 |
| `fondo-contenido` | `bg-white` | `#FFFFFF` | 1.000 |
| `fondo-panel` | `bg-gray-50` | `#f9fafb` | 0.955 |
| `fondo-borde` | `border-gray-200` | `#e5e7eb` | 0.753 |

### Texto sobre header / black_column negro (`#111111`)

| Uso | Token | Hex | Ratio vs `#111111` | WCAG AA |
|---|---|---|---|---|
| Texto principal / blanco | `text-white` | `#ffffff` | **19.5:1** | ✅ |
| Texto secundario / ticker | `text-gray-300` | `#d1d5db` | **12.6:1** | ✅ |
| Acento activo / logo / indicador | `--u24-yellow` / `text-[#FFD60A]` | `#FFD60A` | **12.8:1** | ✅ |
| Alerta crítica | `text-red-400` | `#f87171` | **7.2:1** | ✅ |
| Estado OK | `text-green-400` | `#4ade80` | **11.2:1** | ✅ |
| Ícono deshabilitado | `text-gray-500` | `#6b7280` | **4.9:1** | ✅ |

### Texto sobre fondo blanco / panel (`bg-white`, `bg-gray-50`)

| Uso | Token | Hex | Ratio vs blanco | WCAG AA |
|---|---|---|---|---|
| Texto primario | `text-gray-900` | `#111827` | **19.0:1** | ✅ |
| Texto secundario | `text-gray-600` | `#4b5563` | **7.0:1** | ✅ |
| Metadatos / auxiliar | `text-gray-500` | `#6b7280` | **4.5:1** | ✅ |
| Texto deshabilitado | `text-gray-400` | `#9ca3af` | **3.0:1** | ⚠️ Solo texto grande |
| Error / crítico | `text-red-600` | `#dc2626` | **4.6:1** | ✅ |
| Advertencia AA-safe | `text-amber-700` | `#b45309` | **4.6:1** | ✅ |
| Éxito / OK | `text-green-700` | `#15803d` | **7.3:1** | ✅ |
| Enlace (solo texto, no decorativo) | `text-blue-700` | `#1d4ed8` | **7.2:1** | ✅ solo links |

> ⚠️ **`text-amber-600`** (`#d97706`) sobre blanco = ratio **2.97:1** ❌ WCAG FAIL.
> Sustituir siempre por `text-amber-700` (`#b45309`, ratio 4.6:1 ✅).

### Badges de estado (fondo claro + texto oscuro)

| Estado | Clases Tailwind | Ratio texto/fondo | WCAG AA |
|---|---|---|---|
| Error / Crítico | `bg-red-100 text-red-800` | **7.9:1** | ✅ |
| Advertencia | `bg-amber-100 text-amber-800` | **5.4:1** | ✅ |
| Éxito / OK | `bg-green-100 text-green-800` | **7.5:1** | ✅ |
| Neutro / Inactivo | `bg-gray-100 text-gray-700` | **10.8:1** | ✅ |
| Revaluación | `bg-amber-100 text-amber-700` | **6.5:1** | ✅ |
| Alerta crítica Doc-11 | `bg-red-600 text-white font-black` | **4.6:1** | ✅ (peso 900) |

> ❌ Eliminar variante `bg-blue-100 text-blue-800` — azul decorativo prohibido.
> Usar `bg-gray-100 text-gray-700` (neutro) o `bg-green-100 text-green-800` (activo/OK).

### Badges de estado de vehículo / DRP

| Estado | Clases | WCAG AA |
|---|---|---|
| `disponible` | `bg-green-100 text-green-800` | ✅ |
| `en_servicio` | `bg-green-100 text-green-700` | ✅ (no azul) |
| `en_mantenimiento` | `bg-amber-100 text-amber-800` | ✅ |
| `inoperativo_critico` | `bg-red-100 text-red-800` | ✅ |
| `dado_de_baja` | `bg-gray-100 text-gray-700` | ✅ |
| DRP `En_preparacion` | `bg-[#FFF5B8] text-amber-800` | ✅ (amarillo soft del sistema) |
| DRP `En_curso` | `bg-green-100 text-green-800` | ✅ (no azul) |
| DRP `Finalizado` | `bg-green-100 text-green-800` | ✅ |
| DRP `Cancelado` | `bg-gray-100 text-gray-700` | ✅ |

### Alertas y banners

| Tipo | Clases contenedor | Clases texto | Ratio | WCAG AA |
|---|---|---|---|---|
| Error crítico | `bg-red-50 border-red-300` | `text-red-800` | **6.8:1** | ✅ |
| Advertencia | `bg-amber-50 border-amber-300` | `text-amber-800` | **5.4:1** | ✅ |
| Sin conexión (BannerOffline) | `bg-amber-50 border-amber-300` | `text-amber-800` | **5.4:1** | ✅ |
| Éxito / confirmación | `bg-green-50 border-green-300` | `text-green-800` | **6.8:1** | ✅ |

> ❌ No usar `bg-blue-50 border-blue-300 text-blue-800` para "información" — azul decorativo prohibido.
> Sustituir por `bg-gray-50 border-gray-200 text-gray-700` (neutro) o por advertencia ámbar.

### Controles interactivos — botones

Todos los botones tienen **fondo `#111111` (negro único)**. No hay botones de color.

| Variante | Fondo | Texto | Hover | Casing | WCAG AA |
|---|---|---|---|---|---|
| Primario | `bg-[#111111]` | `text-white` | `bg-[#1f1f1f]` | Sentence case | ✅ 19.5:1 |
| Secundario | `bg-[#111111]` | `text-white` borde gris | `bg-[#1f1f1f]` | Sentence case | ✅ 19.5:1 |
| Destructivo | `bg-[#111111]` | `text-red-500` | `text-red-400` | **UPPERCASE** | ✅ 7.1:1 |
| Ghost | `transparent` | `text-gray-900` | `bg-gray-100` | Sentence case | ✅ 16.7:1 |
| Disabled | cualquier variante | `opacity-45` | — | — | ⚠️ Exento |

> ❌ Botón con `bg-red-600 text-white` no existe en U24. El rojo solo va en el **texto**
> del botón destructivo, nunca en el fondo.
> ❌ `bg-amber-400`, `bg-yellow-*` como fondo de botón — prohibido. El amarillo `#FFD60A`
> solo es fondo en el `home_area` (zona estructural) y en el indicador activo de black_column.

### Inputs y formularios

| Elemento | Estado | Estilos | WCAG AA |
|---|---|---|---|
| Input text | Normal | `border-gray-300 bg-white text-gray-800` | ✅ |
| Input text | Hover | `border-gray-400` | ✅ |
| Input text | Foco | `border-[#111111]` + focus ring azul (accesibilidad) | ✅ |
| Input text | Error | `border-red-400` + `text-red-600` bajo el campo | ✅ 4.6:1 |
| Focus ring | Universal | `box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3b82f6` | ✅ AA |
| Label | — | `text-gray-600 font-bold text-xs` Barlow Condensed | ✅ 7.0:1 |

> El focus ring azul (`#3b82f6`) está **expresamente permitido** para accesibilidad — es
> la única excepción al color azul, y va exclusivamente en el anillo de foco, nunca
> como color decorativo de fondo o texto.

### Reglas de accesibilidad adicionales (ADR-003)

1. **Iconos sin texto:** todos los iconos Tabler que actúan como controles únicos requieren
   `aria-label` explícito. Sistema de iconos: **Tabler Icons (outline) únicamente** — no mezclar
   con otros sets ni con emojis.
   ```tsx
   <button aria-label="Cerrar modal"><IconX size={18} aria-hidden="true" /></button>
   ```

2. **Modales bloqueantes:** `focus-trap` obligatorio. Al cerrar, devolver el foco al
   elemento disparador (`ref.current?.focus()`).

3. **Listas semánticas:** bandejas y listas de pacientes usan `<ul>` / `<li>` nativos
   (o `role="list"` / `role="listitem"` si el elemento semántico es inviable).

4. **Formularios offline:** `aria-required="true"` en campos obligatorios; `aria-invalid`
   cuando hay error de validación; `aria-describedby` apuntando al mensaje de error.

5. **Texto `text-gray-400` sobre blanco** (ratio 3.0:1) — **solo texto auxiliar grande**
   (≥18px o ≥14px bold). Nunca para contenido operativo crítico.

6. **Tarjetas:** borde uniforme `1px solid #e5e7eb` en todos los lados, `border-radius: 6px`.

---

### Accesibilidad daltónica — badges con iconografía (C-04)

> Los badges de estado **nunca confían exclusivamente en el color** para transmitir
> información. Todo badge operativo incluye un icono Tabler que comunica el estado
> de forma independiente del color (ADR-003).

#### Mapa icono-estado para badges operativos

| Estado | Color (fondo/texto) | Icono obligatorio | `aria-label` |
|---|---|---|---|
| Operativo / OK / Activo | `bg-green-100 text-green-800` | `<IconCheck size={14} />` | "activo" |
| Advertencia / Pendiente | `bg-amber-50 text-amber-800` | `<IconAlertTriangle size={14} />` | "advertencia" |
| Error / Crítico / Bloqueado | `bg-red-50 text-red-800` | `<IconAlertCircle size={14} />` | "error" |
| Inactivo / Archivado | `bg-gray-100 text-gray-600` | `<IconCircleOff size={14} />` | "inactivo" |
| En progreso / En curso | `bg-blue-50 text-blue-800`* | `<IconLoader size={14} />` | "en progreso" |
| Sin conexión / Degradado | `bg-amber-50 text-amber-800` | `<IconWifiOff size={14} />` | "sin conexión" |
| GPS sin señal | `bg-gray-100 text-gray-600` | `<IconMapPinOff size={14} />` | "GPS sin señal" |
| Doc-8 Abierto\_En\_Turno | `bg-green-100 text-green-800` | `<IconCheck size={14} />` | "parte abierto" |
| Doc-8 Enviado\_Cerrado | `bg-gray-100 text-gray-600` | `<IconCircleCheck size={14} />` | "parte cerrado" |
| Doc-8 Enviado\_Cerrado\_Administrativo | `bg-gray-100 text-gray-600` | `<IconLock size={14} />` | "cierre administrativo" |
| DRP En\_preparacion | `bg-[#FFF5B8] text-amber-800` | `<IconClock size={14} />` | "DRP en preparación" |
| DRP En\_curso | `bg-green-100 text-green-800` | `<IconCheck size={14} />` | "DRP en curso" |
| DRP Cancelado | `bg-gray-100 text-gray-700` | `<IconX size={14} />` | "DRP cancelado" |

> *`bg-blue-50` solo está permitido en el contexto "En progreso" dentro de badges de
> estado de proceso. No usar para estados DRP o estados de vehículo.

#### Estructura canónica de badge accesible

```tsx
// Componente BadgeEstado — estructura obligatoria
interface BadgeEstadoProps {
  estado: string
  icon:   React.ReactNode   // siempre un Tabler Icon con aria-hidden="true"
  label:  string            // texto visible del badge
  ariaLabel?: string        // si difiere del texto visible
}

function BadgeEstado({ estado, icon, label, ariaLabel }: BadgeEstadoProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? label}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}

// Uso correcto:
<BadgeEstado
  estado="activo"
  icon={<IconCheck size={14} aria-hidden="true" />}
  label="Operativo"
/>
```

#### Patrón de relleno para impresión en blanco y negro

En componentes que pueden imprimirse (Doc-8, informes de inventario), añadir clase
`print:pattern-*` para distinguir estados sin color:

| Estado | Clase print |
|---|---|
| OK / Activo | `print:bg-white print:border-2 print:border-black` |
| Advertencia | `print:bg-white print:border-2 print:border-dashed print:border-black` |
| Error | `print:bg-gray-200 print:border-2 print:border-black` |
| Inactivo | `print:bg-white print:border print:border-gray-400` |

---

### Atajos de teclado — puestos de coordinación (C-05)

> Los atajos de teclado aplican **únicamente** en terminales con rol `coordinacion` o
> `gerencia`. En terminales móviles (puestos de ambulancia) se deshabilitan via
> `useMediaQuery('(pointer: coarse)')` para evitar activaciones accidentales en táctil.

#### Implementación

```typescript
// hooks/useKeyboardShortcuts.ts
// Solo activo si: rol === 'coordinacion' || 'gerencia'  Y  pointer: fine (mouse/teclado)
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

const COORDINACION_ROLES = ['coordinacion', 'gerencia']

export function useKeyboardShortcuts() {
  const rol = useAuthStore(s => s.rol)
  const isDesktop = window.matchMedia('(pointer: fine)').matches

  useEffect(() => {
    if (!COORDINACION_ROLES.includes(rol) || !isDesktop) return

    function handler(e: KeyboardEvent) {
      // Ignorar si el foco está en un input / textarea / select
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      // Atajos con Alt (evitar colisiones con el SO)
      if (!e.altKey) return

      switch (e.key) {
        case 'b': e.preventDefault(); openBandeja()          ; break
        case 'a': e.preventDefault(); openAlertasCriticas()  ; break
        case 'd': e.preventDefault(); openVisorDRP()         ; break
        case 'v': e.preventDefault(); openVisorVehiculos()   ; break
        case 's': e.preventDefault(); openVisorSeguimiento() ; break
        case 'n': e.preventDefault(); openNuevoDRP()         ; break
        case 'Escape': closeActiveModal()                    ; break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rol, isDesktop])
}
```

#### Tabla de atajos disponibles

| Atajo | Acción | Disponible en |
|---|---|---|
| `Alt + B` | Abrir bandeja de coordinación | coordinacion, gerencia |
| `Alt + A` | Abrir panel de alertas críticas (Doc-11) | coordinacion, gerencia |
| `Alt + D` | Abrir visor de DRPs activos | coordinacion, gerencia |
| `Alt + V` | Abrir visor de vehículos | coordinacion, gerencia |
| `Alt + S` | Abrir visor de seguimiento GPS | coordinacion, gerencia |
| `Alt + N` | Nuevo DRP (shortcut de creación rápida) | coordinacion |
| `Escape` | Cerrar modal activo / panel activo | todos los roles |
| `Tab` | Navegación entre controles (estándar HTML) | todos los roles |
| `Enter` / `Space` | Activar botón enfocado (estándar HTML) | todos los roles |

#### Reglas de implementación

1. **Sin colisiones con el SO:** todos los atajos personalizados usan `Alt + tecla`. No usar
   `Ctrl + tecla` (reservado para el navegador y el SO).
2. **No activos en inputs:** el handler comprueba `document.activeElement.tagName` antes
   de ejecutar la acción.
3. **Solo puntero fino:** desactivar con `matchMedia('(pointer: coarse)')` en táctil —
   las tablets de ambulancia no deben disparar atajos por accidente.
4. **Documentación en la UI:** un modal de ayuda (`Alt + ?`) muestra la tabla completa.
   El modal se abre con:
   ```typescript
   case '?': if (e.altKey) { e.preventDefault(); openHelpShortcuts() }; break
   ```
5. **Sin atajos en `estado_0`:** el hook solo se monta cuando `useTerminalStore.estado === 'estado_1'`.

#### Visibilidad del atajo en tooltips

Los controles con atajo asociado muestran el atajo entre paréntesis en el `title` del botón:

```tsx
<button title="Bandeja de coordinación (Alt+B)" aria-label="Bandeja de coordinación">
  <IconInbox size={20} aria-hidden="true" />
</button>
```
   ❌ Prohibido `border-l-4` (borde acento de color) — anti-patrón explícito del design system.
