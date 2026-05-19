# Manejo de Errores — U24

> Referencia canónica para el tratamiento de errores en la capa cliente. **No añadir
> mensajes ad-hoc en componentes individuales.** Todo error que llega desde Supabase
> debe resolverse a través de `resolveRpcError()` (§6) y presentarse según la tabla de
> tipos (§2). Esto garantiza mensajes uniformes en español y coherencia de UX en toda la app.

---

## 1. Anatomía de un error Supabase

Cuando una RPC falla, el cliente Supabase JS devuelve un `PostgrestError` con esta forma:

```typescript
interface PostgrestError {
  code: string       // código PostgreSQL nativo (ej. 'P0001', '23505', '42501')
  message: string    // texto del RAISE EXCEPTION o descripción del error nativo
  hint: string | null   // valor USING HINT — nuestras RPCs lo usan como código HTTP ('409', '422', etc.)
  details: string | null  // valor USING DETAIL
}
```

**Patrón de detección en RPCs propias de U24:**

Las RPCs custom usan `RAISE EXCEPTION 'nombre_error' USING HINT='4xx'`.
La detección client-side se hace sobre `error.message`:

```typescript
const { data, error } = await supabase.rpc('cancelar_drp', { p_drp_id, p_coordinador_id })
if (error) {
  const { message: code, hint } = error
  // code → 'drp_ya_cancelado' | 'drp_estado_invalido' | etc.
  // hint → '409' | '422' | '403' | etc.
  const resolution = resolveRpcError(error)
  // → presentar según resolution.type
}
```

Los errores nativos de PostgreSQL se detectan sobre `error.code` (23505, 42501, etc.).

---

## 2. Tipos de presentación en UI

| Tipo | Componente | Cuándo usarlo | Duración |
|---|---|---|---|
| **toast-error** | `<Toast variant="error" />` (top-right) | Error transitorio: operación fallida, app sigue operable | 5 s auto-dismiss |
| **toast-warning** | `<Toast variant="warning" />` (top-right) | Advertencia no bloqueante (éxito parcial, degradación) | 8 s auto-dismiss |
| **modal** | `<ModalError />` bloqueante | Error que requiere decisión explícita antes de continuar | Hasta cierre activo |
| **inline** | `<FieldError />` bajo el campo | Error de validación de campo específico | Hasta corrección |
| **cola-conflictos** | Bandeja de `useOfflineQueue` | Error de red transitorio — mutación se reintenta al reconectar | Hasta resolución |
| **silencioso** | `console.warn` únicamente | Error no operativo (analytics, precache no crítico) | — |

### La distinción más importante: red vs. validación

| Clase de error | Ejemplo concreto | Tratamiento correcto |
|---|---|---|
| **Red / transitorio** | `TypeError: Failed to fetch`, timeout, HTTP 5xx | → **cola-conflictos** — encolar mutación + mostrar banner offline |
| **Validación síncrona** | `stock_insuficiente`, `motivo_insuficiente`, `drp_ya_cancelado` | → **toast-error** o **inline** — **nunca encolar** |
| **Autorización** | `insufficient_privilege`, código PG `42501` | → **toast-error** — **nunca encolar** |
| **Conflicto de datos** | `23505`, `subinventario_ya_asignado`, `doc8_anterior_en_curso` | → **modal** — requiere decisión del usuario |
| **Éxito parcial** | `offline_session_error`, `gasto_offline_stock_insuficiente` | → **toast-warning** — la operación principal fue exitosa |

> ⚠️ **Regla de oro:** una operación que recibe un error de validación del servidor
> (`4xx`) **nunca se encola en la cola offline**. Solo se encola cuando el servidor no
> pudo alcanzarse (error de red). Enconar una validación fallida causaría reintentos
> infinitos que nunca resolverán.

---

## 3. Errores nativos de PostgreSQL

Se detectan via `error.code`. Son devueltos directamente por PostgREST cuando la
restricción de DB se viola antes de llegar al código PL/pgSQL de la RPC.

| `error.code` | Nombre estándar PG | Mensaje UI en español | Tipo |
|---|---|---|---|
| `23505` | `unique_violation` | "Ya existe un registro con estos datos. Refresca e inténtalo de nuevo." | toast-error |
| `23514` | `check_violation` | "Los datos no cumplen las reglas de validación del sistema." | toast-error |
| `23503` | `foreign_key_violation` | "No se puede completar la operación: el registro referenciado no existe." | toast-error |
| `23502` | `not_null_violation` | "Falta un campo obligatorio. Revisa el formulario." | inline |
| `42501` | `insufficient_privilege` | "No tienes permisos para esta acción." | toast-error |
| `P0001` | `raise_exception` (custom) | → resolver por `error.message` (§4) | variable |
| `P0002` | `no_data_found` | "Registro no encontrado. Es posible que otro usuario lo haya eliminado." | toast-error |
| `55000` | `object_not_in_prerequisite_state` | "Esta operación ya fue procesada anteriormente." | toast-error |
| `22023` | `invalid_parameter_value` | "Valor no válido para este campo." | inline |
| `40001` | `serialization_failure` | "Conflicto de acceso simultáneo. Vuelve a intentarlo." | toast-error |
| `57014` | `query_canceled` | "La operación tardó demasiado. Vuelve a intentarlo." | toast-error |
| `28000` | `invalid_authorization_specification` | "Sesión no válida. Vuelve a iniciar sesión." | modal |

---

## 4. Errores custom de RPCs — por módulo

Se detectan via `error.message`. Cuando la RPC usa `RAISE EXCEPTION 'nombre' USING HINT='4xx'`,
el `nombre` llega textualmente en `error.message` con `error.code = 'P0001'`.

### 4.1 Autenticación y sesión

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `pin_invalido_o_expirado` | "PIN incorrecto o expirado. Solicita uno nuevo a coordinación." | toast-error |
| `contrasena_actual_incorrecta` | "La contraseña actual es incorrecta." | inline |
| `contrasena_nueva_invalida` | "La nueva contraseña debe tener al menos 8 caracteres y ser diferente a la actual." | inline |
| `offline_session_error` | "Contraseña actualizada. El acceso sin conexión puede no estar disponible hasta el próximo inicio de turno." | toast-warning |
| `insufficient_privilege` | "No tienes permisos para realizar esta acción." | toast-error |
| `jwt_no_disponible` | "Sesión expirada. Vuelve a iniciar sesión." | modal |

### 4.2 DRP

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `drp_ya_cancelado` | "Este DRP ya fue cancelado anteriormente." | toast-error |
| `drp_estado_invalido` (prefijo) | "El DRP no puede cancelarse en su estado actual." | toast-error |
| `subinventario_ya_asignado` | "La mochila seleccionada ya está asignada a otro DRP activo." | modal |

### 4.3 Inventario y stock

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `stock_insuficiente` | "Stock insuficiente para realizar este gasto." | toast-error |
| `stock_negativo_no_permitido` | "El stock no puede quedar en negativo." | inline |
| `gasto_offline_stock_insuficiente` | "Gasto sincronizado con stock insuficiente. Se ha generado un descuadre para revisión de logística." | toast-warning |
| `item_no_encontrado` | "El material no se encontró en el sistema." | toast-error |
| `item_no_encontrado_en_location` | "El material no se encontró en esta ubicación." | toast-error |
| `motivo_insuficiente` | "El motivo debe tener al menos 10 caracteres." | inline |
| `motivo_ajuste_insuficiente` | "El motivo del ajuste debe tener al menos 10 caracteres." | inline |
| `motivo_ajuste_insuficiente_rotura` | "Con stock a cero, describe la causa de la rotura con al menos 30 caracteres." | inline |
| `destino_no_apto_para_recepcion` | "El vehículo de destino no puede recibir material en su estado actual." | toast-error |

### 4.4 Vehículos

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `vehiculo_ya_tiene_pilot` | "Este vehículo ya tiene un piloto asignado." | toast-error |
| `pilot_no_activo_en_vehiculo` | "Este empleado no está activo como piloto de este vehículo." | toast-error |
| `vehiculo_no_encontrado` | "Vehículo no encontrado en el sistema." | toast-error |
| `vehiculo_ya_de_baja` | "Este vehículo ya está dado de baja." | toast-error |
| `vehiculo_en_drp_activo` | "No se puede dar de baja un vehículo con un DRP activo en curso." | modal |
| `vehiculo_con_pilot_activo` | "Desasigna al piloto activo antes de dar de baja el vehículo." | modal |
| `tipo_vehiculo_invalido` | "Tipo de vehículo no reconocido." | inline |
| `matricula_duplicada` | "Ya existe un vehículo registrado con esa matrícula." | inline |
| `plantilla_no_encontrada` | "La plantilla de inventario seleccionada no existe." | toast-error |
| `vehiculo_ya_de_baja` | "Este vehículo ya está dado de baja." | toast-error |

### 4.5 Doc-8 y partes de trabajo

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `doc8_anterior_en_curso` | "Ya hay un parte de trabajo en curso para este vehículo. Cierra el anterior antes de iniciar uno nuevo." | modal |

### 4.6 Módulos clínicos (filiación, PSA)

Estas RPCs usan mensajes con formato dinámico (`format()`). Se detectan por **prefijo**:

| Prefijo de `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| Contiene `no encontrado en este módulo` | "Paciente no encontrado en este módulo." | toast-error |
| Contiene `ya no está en espera` | "El estado del paciente cambió. Actualiza la lista." | toast-error |
| Contiene `no está en consulta` | "El paciente ya no se encuentra en consulta." | toast-error |
| Contiene `no tiene asignado este paciente` | "Este box ya no tiene asignado a ese paciente." | toast-error |

### 4.7 RRHH, roles y RGPD

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `empleado_no_encontrado_o_inactivo` | "Empleado no encontrado o dado de baja." | toast-error |
| `rol_invalido` (prefijo) | "El rol seleccionado no es válido." | inline |
| `motivo_demasiado_corto` | "El motivo debe tener al menos 10 caracteres." | inline |
| `tipo_solicitud_invalido` (prefijo) | "Tipo de solicitud no reconocido." | inline |
| `solicitud_no_encontrada` | "Solicitud no encontrada. Es posible que ya haya sido procesada." | toast-error |
| `solicitud_ya_procesada` (prefijo `estado=`) | "Esta solicitud ya fue procesada anteriormente." | toast-error |
| `solicitud_no_pendiente` | "Esta solicitud ya no está pendiente de resolución." | toast-error |
| `empleado_no_encontrado` (prefijo) | "Empleado no encontrado." | toast-error |

### 4.8 Galletas y terminales

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `galleta_no_encontrada_o_ya_revocada` | "La galleta de terminal no existe o ya fue revocada." | toast-error |
| `dotacion_no_encontrada` | "Dotación no encontrada. El vehículo puede haber salido del DRP." | toast-error |

### 4.9 Alta de vehículo

| `error.message` | Mensaje UI en español | Tipo |
|---|---|---|
| `tipo_vehiculo_invalido` | "Tipo de vehículo no reconocido." | inline |
| `matricula_duplicada` | "Ya existe un vehículo con esa matrícula." | inline |
| `plantilla_no_encontrada` | "Plantilla de inventario no encontrada." | toast-error |

### 4.10 Odómetro (trigger)

El trigger de validación de `km_inicio` lanza un RAISE EXCEPTION con mensaje dinámico.
Se detecta por contenido:

| Condición de detección | Mensaje UI en español | Tipo |
|---|---|---|
| `error.message` contiene `inferior al km_fin anterior` | "El kilómetro de inicio es inferior al registro anterior del vehículo. Verifica el odómetro." | modal |

---

## 5. Errores de red y transporte

Estos errores ocurren antes de que la petición llegue a Supabase. Son los únicos
candidatos a la **cola offline**.

| Error JS | Condición | Tratamiento |
|---|---|---|
| `TypeError: Failed to fetch` | Sin conexión de red | → cola-conflictos + banner offline |
| `DOMException: AbortError` | Timeout de petición | → cola-conflictos |
| HTTP `503` / `502` | Supabase temporalmente caído | → cola-conflictos |
| HTTP `429` | Rate limit de Supabase | → cola-conflictos + backoff exponencial |
| HTTP `401` | JWT expirado (no refrescable) | → modal "sesión expirada" (no encolar) |
| HTTP `403` | Claim insuficiente | → toast-error (no encolar) |

**Helper de clasificación:**

```typescript
// lib/errorClassifier.ts
export type ErrorClass = 'network' | 'validation' | 'auth' | 'conflict' | 'unknown'

export function classifyError(error: unknown): ErrorClass {
  if (!error) return 'unknown'

  // Error de red (no llegó al servidor)
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch'))
    return 'network'
  if (error instanceof DOMException && error.name === 'AbortError')
    return 'network'

  // Error de PostgREST / Supabase
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const e = error as { code: string; message: string; hint?: string | null }
    const httpHint = parseInt(e.hint ?? '0', 10)
    if (httpHint === 401 || e.code === '28000') return 'auth'
    if (httpHint === 403 || e.code === '42501') return 'auth'
    if (httpHint === 409 || e.code === '23505' || e.code === '55000') return 'conflict'
    if (httpHint >= 400 && httpHint < 500) return 'validation'
    if (httpHint >= 500 || httpHint === 0) return 'network'
  }

  return 'unknown'
}
```

---

## 6. Hook centralizado `resolveRpcError`

```typescript
// lib/resolveRpcError.ts
import type { PostgrestError } from '@supabase/supabase-js'

export interface ErrorResolution {
  message: string
  type: 'toast-error' | 'toast-warning' | 'modal' | 'inline' | 'cola'
}

// Tabla maestra — coincide con §4 de este documento
const ERROR_MAP: Record<string, ErrorResolution> = {
  // §4.1 Autenticación
  pin_invalido_o_expirado:            { message: 'PIN incorrecto o expirado. Solicita uno nuevo a coordinación.', type: 'toast-error' },
  contrasena_actual_incorrecta:       { message: 'La contraseña actual es incorrecta.', type: 'inline' },
  contrasena_nueva_invalida:          { message: 'La nueva contraseña debe tener al menos 8 caracteres y diferir de la actual.', type: 'inline' },
  offline_session_error:              { message: 'Contraseña actualizada. El acceso sin conexión puede no estar disponible hasta el próximo inicio de turno.', type: 'toast-warning' },
  insufficient_privilege:             { message: 'No tienes permisos para realizar esta acción.', type: 'toast-error' },
  jwt_no_disponible:                  { message: 'Sesión expirada. Vuelve a iniciar sesión.', type: 'modal' },
  // §4.2 DRP
  drp_ya_cancelado:                   { message: 'Este DRP ya fue cancelado anteriormente.', type: 'toast-error' },
  drp_estado_invalido:                { message: 'El DRP no puede cancelarse en su estado actual.', type: 'toast-error' },
  subinventario_ya_asignado:          { message: 'La mochila seleccionada ya está asignada a otro DRP activo.', type: 'modal' },
  // §4.3 Inventario
  stock_insuficiente:                 { message: 'Stock insuficiente para realizar este gasto.', type: 'toast-error' },
  stock_negativo_no_permitido:        { message: 'El stock no puede quedar en negativo.', type: 'inline' },
  gasto_offline_stock_insuficiente:   { message: 'Gasto sincronizado con stock insuficiente. Descuadre generado para revisión de logística.', type: 'toast-warning' },
  item_no_encontrado:                 { message: 'El material no se encontró en el sistema.', type: 'toast-error' },
  item_no_encontrado_en_location:     { message: 'El material no se encontró en esta ubicación.', type: 'toast-error' },
  motivo_insuficiente:                { message: 'El motivo debe tener al menos 10 caracteres.', type: 'inline' },
  motivo_ajuste_insuficiente:         { message: 'El motivo del ajuste debe tener al menos 10 caracteres.', type: 'inline' },
  motivo_ajuste_insuficiente_rotura:  { message: 'Con stock a cero, describe la causa de la rotura con al menos 30 caracteres.', type: 'inline' },
  destino_no_apto_para_recepcion:     { message: 'El vehículo de destino no puede recibir material en su estado actual.', type: 'toast-error' },
  // §4.4 Vehículos
  vehiculo_ya_tiene_pilot:            { message: 'Este vehículo ya tiene un piloto asignado.', type: 'toast-error' },
  pilot_no_activo_en_vehiculo:        { message: 'Este empleado no está activo como piloto de este vehículo.', type: 'toast-error' },
  vehiculo_no_encontrado:             { message: 'Vehículo no encontrado en el sistema.', type: 'toast-error' },
  vehiculo_ya_de_baja:                { message: 'Este vehículo ya está dado de baja.', type: 'toast-error' },
  vehiculo_en_drp_activo:             { message: 'No se puede dar de baja un vehículo con un DRP activo en curso.', type: 'modal' },
  vehiculo_con_pilot_activo:          { message: 'Desasigna al piloto activo antes de dar de baja el vehículo.', type: 'modal' },
  tipo_vehiculo_invalido:             { message: 'Tipo de vehículo no reconocido.', type: 'inline' },
  matricula_duplicada:                { message: 'Ya existe un vehículo registrado con esa matrícula.', type: 'inline' },
  plantilla_no_encontrada:            { message: 'La plantilla de inventario seleccionada no existe.', type: 'toast-error' },
  // §4.5 Doc-8
  doc8_anterior_en_curso:             { message: 'Ya hay un parte de trabajo en curso. Cierra el anterior antes de iniciar uno nuevo.', type: 'modal' },
  // §4.7 RRHH
  empleado_no_encontrado_o_inactivo:  { message: 'Empleado no encontrado o dado de baja.', type: 'toast-error' },
  motivo_demasiado_corto:             { message: 'El motivo debe tener al menos 10 caracteres.', type: 'inline' },
  solicitud_no_encontrada:            { message: 'Solicitud no encontrada. Es posible que ya haya sido procesada.', type: 'toast-error' },
  solicitud_ya_procesada:             { message: 'Esta solicitud ya fue procesada anteriormente.', type: 'toast-error' },
  solicitud_no_pendiente:             { message: 'Esta solicitud ya no está pendiente de resolución.', type: 'toast-error' },
  // §4.8 Galletas
  galleta_no_encontrada_o_ya_revocada: { message: 'La galleta de terminal no existe o ya fue revocada.', type: 'toast-error' },
  dotacion_no_encontrada:             { message: 'Dotación no encontrada. El vehículo puede haber salido del DRP.', type: 'toast-error' },
  // §3 PostgreSQL nativo (por error.code)
  '23505': { message: 'Ya existe un registro con estos datos. Refresca e inténtalo de nuevo.', type: 'toast-error' },
  '42501': { message: 'No tienes permisos para esta acción.', type: 'toast-error' },
  '40001': { message: 'Conflicto de acceso simultáneo. Vuelve a intentarlo.', type: 'toast-error' },
  'P0002': { message: 'Registro no encontrado. Es posible que otro usuario lo haya eliminado.', type: 'toast-error' },
  '55000': { message: 'Esta operación ya fue procesada anteriormente.', type: 'toast-error' },
  '28000': { message: 'Sesión no válida. Vuelve a iniciar sesión.', type: 'modal' },
}

const FALLBACK: ErrorResolution = {
  message: 'Se produjo un error inesperado. Contacta con soporte técnico si persiste.',
  type: 'toast-error',
}

// Errores con mensaje dinámico — se detectan por substring
const SUBSTRING_MAP: Array<{ substring: string; resolution: ErrorResolution }> = [
  { substring: 'inferior al km_fin anterior',    resolution: { message: 'El kilómetro de inicio es inferior al registro anterior del vehículo. Verifica el odómetro.', type: 'modal' } },
  { substring: 'no encontrado en este módulo',   resolution: { message: 'Paciente no encontrado en este módulo.', type: 'toast-error' } },
  { substring: 'ya no está en espera',           resolution: { message: 'El estado del paciente cambió. Actualiza la lista.', type: 'toast-error' } },
  { substring: 'no está en consulta',            resolution: { message: 'El paciente ya no se encuentra en consulta.', type: 'toast-error' } },
  { substring: 'no tiene asignado este paciente', resolution: { message: 'Este box ya no tiene asignado a ese paciente.', type: 'toast-error' } },
  { substring: 'drp_estado_invalido',            resolution: { message: 'El DRP no puede cancelarse en su estado actual.', type: 'toast-error' } },
  { substring: 'rol_invalido',                   resolution: { message: 'El rol seleccionado no es válido.', type: 'inline' } },
  { substring: 'tipo_solicitud_invalido',        resolution: { message: 'Tipo de solicitud no reconocido.', type: 'inline' } },
  { substring: 'solicitud_ya_procesada',         resolution: { message: 'Esta solicitud ya fue procesada anteriormente.', type: 'toast-error' } },
  { substring: 'empleado_no_encontrado',         resolution: { message: 'Empleado no encontrado.', type: 'toast-error' } },
]

export function resolveRpcError(
  error: PostgrestError | Error | null | unknown
): ErrorResolution {
  if (!error) return FALLBACK

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const e = error as PostgrestError
    // 1. Lookup exacto por message (códigos custom — fuente más específica)
    if (ERROR_MAP[e.message]) return ERROR_MAP[e.message]
    // 2. Lookup exacto por code (errores nativos PG)
    if (e.code && ERROR_MAP[e.code]) return ERROR_MAP[e.code]
    // 3. Detección por substring (mensajes con formato dinámico)
    const msgLower = e.message?.toLowerCase() ?? ''
    for (const { substring, resolution } of SUBSTRING_MAP) {
      if (msgLower.includes(substring.toLowerCase())) return resolution
    }
  }

  return FALLBACK
}
```

---

## 7. Errores de Supabase Auth

Estos errores son distintos a los de PostgREST — vienen del SDK de Auth.

| Evento / condición | Mensaje UI en español | Tipo |
|---|---|---|
| `signInWithPassword` falla (credenciales) | "ID_nombre o contraseña incorrectos." | inline |
| `signInWithPassword` falla (cuenta deshabilitada) | "Esta cuenta está deshabilitada. Contacta con RRHH." | modal |
| `refreshSession` falla irrecuperablemente | "La sesión expiró. Vuelve a iniciar sesión." | modal |
| `onAuthStateChange: SIGNED_OUT` inesperado | "Tu sesión fue cerrada. Vuelve a iniciar sesión." | modal |
| Rate limit de Auth (429) | "Demasiados intentos fallidos. Espera un momento e inténtalo de nuevo." | toast-error |

---

## 8. Errores de validación de cliente (previos al envío)

Estos errores se detectan en el cliente **antes** de llamar a la RPC o encolar.
Siempre son `inline` y **nunca** llegan al servidor.

| Contexto | Condición | Mensaje UI | Tipo |
|---|---|---|---|
| `useOfflineQueue.enqueue()` | `timestamp_apertura` > 72h en el pasado | "Timestamp demasiado antiguo. Verifica el reloj del dispositivo." | toast-error |
| `useOfflineQueue.enqueue()` | `timestamp_apertura` > 5 min en el futuro | "Timestamp en el futuro. Verifica el reloj del dispositivo." | toast-error |
| Formulario Doc-7 | Motivo vacío | "El motivo de la avería es obligatorio." | inline |
| Formulario ajuste stock | `cantidad_nueva < 0` | "El stock no puede ser negativo." | inline |
| `idbStorageWithQuotaGuard` | `QuotaExceededError` irrecuperable | "Almacenamiento del dispositivo lleno. Libera espacio para continuar." | toast-error |
