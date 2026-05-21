# Gestión de errores — U24

## 1. Convención (ADR-006)

Las RPCs lanzan excepciones con `ERRCODE = 'P0001'` (Generic PL/pgSQL exception).  
El mensaje de excepción sigue el formato:

```
ERR_<DOMINIO>_<NNN>: descripción en inglés
```

El cliente captura el código `ERR_*` y muestra el string de UI en español usando `resolveRpcError()`.

**Regla estricta:** los códigos de error viven en el servidor (inglés).  
Los mensajes que ve el usuario viven en el cliente (español).

---

## 2. Tabla de códigos de error

### Dominio AUTH

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_AUTH_001` | `auth.uid()` no mapea a ninguna ficha activa | "Sesión no reconocida. Vuelve a iniciar sesión." |
| `ERR_AUTH_002` | Rol insuficiente para actuar sobre otro usuario | "No tienes permiso para esta acción." |
| `ERR_AUTH_003` | No existe galleta permanente activa para transferir | "No tienes una galleta activa para transferir." |
| `ERR_AUTH_004` | Terminal origen == terminal destino en transferencia | "El terminal destino es el mismo que el origen." |

### Dominio STEPUP

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_STEPUP_001` | Step-up bloqueado por intentos fallidos | "Demasiados intentos. Inténtalo en 15 minutos." |
| `ERR_STEPUP_002` | Empleado no encontrado o inactivo | "Cuenta no activa." |
| `ERR_STEPUP_003` | PIN step-up no configurado para este rol | "No tienes PIN de confirmación configurado. Contacta con RRHH." |
| `ERR_STEPUP_004` | Bloqueo tras 3 intentos fallidos | "Demasiados intentos. Bloqueado 15 minutos." |
| `ERR_STEPUP_005` | PIN step-up incorrecto | "PIN incorrecto." |

### Dominio DESBLOQUEO

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_DESBLOQUEO_001` | Ya existe solicitud pendiente activa | "Ya tienes una solicitud de desbloqueo pendiente." |
| `ERR_DESBLOQUEO_002` | Rol insuficiente para aprobar/rechazar | "No tienes permiso para gestionar desbloqueos." |
| `ERR_DESBLOQUEO_003` | Solicitud no encontrada, ya resuelta o expirada | "La solicitud no existe o ha caducado." |

### Dominio VEHICULO

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_VEHICULO_001` | Rol insuficiente (alta o baja) | "No tienes permiso para gestionar vehículos." |
| `ERR_VEHICULO_002` | Matrícula duplicada en alta | "Ya existe un vehículo con esa matrícula." |
| `ERR_VEHICULO_003` | Vehículo no encontrado en baja | "Vehículo no encontrado." |
| `ERR_VEHICULO_004` | DRP activo impide la baja | "El vehículo está en un DRP activo. Retíralo primero." |
| `ERR_VEHICULO_005` | Activación abierta impide la baja | "El vehículo tiene un parte de trabajo abierto." |

### Dominio INVENTARIO

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_INVENTARIO_001` | Rol insuficiente para ajuste manual | "No tienes permiso para ajustar stock." |
| `ERR_INVENTARIO_002` | Location no encontrada | "Localización no encontrada." |
| `ERR_INVENTARIO_003` | Subgrupo requerido para ajuste en vehículo | "Debes indicar el subgrupo para ajustar stock en un vehículo." |
| `ERR_INVENTARIO_004` | Cantidad a deducir ≤ 0 | "La cantidad debe ser mayor que cero." |
| `ERR_INVENTARIO_005` | Ítem no encontrado en el vehículo | "Este ítem no existe en el vehículo." |
| `ERR_INVENTARIO_006` | Stock insuficiente | "Stock insuficiente. Disponible: {disponible}, solicitado: {solicitado}." |

### Dominio CHECKLIST

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_CHECKLIST_001` | Sistema marcado como fallido sin criticidad | "Debes indicar la criticidad de cada avería detectada." |

### Dominio KM

| Código | Situación | Mensaje UI |
|---|---|---|
| `ERR_KM_001` | km_fin < km_inicio | "El kilómetro de cierre no puede ser menor que el de apertura." |

---

## 3. Función cliente: `resolveRpcError()`

```typescript
// src/lib/resolveRpcError.ts

const ERROR_MESSAGES: Record<string, string> = {
  ERR_AUTH_001:        'Sesión no reconocida. Vuelve a iniciar sesión.',
  ERR_AUTH_002:        'No tienes permiso para esta acción.',
  ERR_AUTH_003:        'No tienes una galleta activa para transferir.',
  ERR_AUTH_004:        'El terminal destino es el mismo que el origen.',

  ERR_STEPUP_001:      'Demasiados intentos. Inténtalo en 15 minutos.',
  ERR_STEPUP_002:      'Cuenta no activa.',
  ERR_STEPUP_003:      'No tienes PIN de confirmación configurado. Contacta con RRHH.',
  ERR_STEPUP_004:      'Demasiados intentos. Bloqueado 15 minutos.',
  ERR_STEPUP_005:      'PIN incorrecto.',

  ERR_DESBLOQUEO_001:  'Ya tienes una solicitud de desbloqueo pendiente.',
  ERR_DESBLOQUEO_002:  'No tienes permiso para gestionar desbloqueos.',
  ERR_DESBLOQUEO_003:  'La solicitud no existe o ha caducado.',

  ERR_VEHICULO_001:    'No tienes permiso para gestionar vehículos.',
  ERR_VEHICULO_002:    'Ya existe un vehículo con esa matrícula.',
  ERR_VEHICULO_003:    'Vehículo no encontrado.',
  ERR_VEHICULO_004:    'El vehículo está en un DRP activo. Retíralo primero.',
  ERR_VEHICULO_005:    'El vehículo tiene un parte de trabajo abierto.',

  ERR_INVENTARIO_001:  'No tienes permiso para ajustar stock.',
  ERR_INVENTARIO_002:  'Localización no encontrada.',
  ERR_INVENTARIO_003:  'Debes indicar el subgrupo para ajustar stock en un vehículo.',
  ERR_INVENTARIO_004:  'La cantidad debe ser mayor que cero.',
  ERR_INVENTARIO_005:  'Este ítem no existe en el vehículo.',
  ERR_INVENTARIO_006:  'Stock insuficiente.',

  ERR_CHECKLIST_001:   'Debes indicar la criticidad de cada avería detectada.',

  ERR_KM_001:          'El kilómetro de cierre no puede ser menor que el de apertura.',
}

export function resolveRpcError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  // El servidor incluye el código al inicio: "ERR_XXX_NNN: descripción"
  const match = message.match(/^(ERR_[A-Z_0-9]+)/)
  if (match) {
    return ERROR_MESSAGES[match[1]] ?? 'Error inesperado. Contacta con soporte.'
  }
  return 'Error inesperado. Contacta con soporte.'
}
```

---

## 4. Patrón de uso en hooks React

```typescript
import { resolveRpcError } from '@/lib/resolveRpcError'

// En un useMutation de TanStack Query:
onError: (error) => {
  toast.error(resolveRpcError(error))
}
```

---

## 5. Errores HTTP de Supabase

Las RPCs devuelven errores HTTP 400 desde PostgREST cuando lanzan excepciones con `ERRCODE = 'P0001'`.  
El cuerpo JSON tiene la forma:

```json
{
  "code": "P0001",
  "message": "ERR_INVENTARIO_006: Stock insuficiente. Disponible: 3, solicitado: 10",
  "details": null,
  "hint": null
}
```

`resolveRpcError()` extrae el prefijo `ERR_*` de `message` y devuelve el string localizado.

---

## 6. Errores de red / offline

Los errores de red no contienen prefijo `ERR_*`. `resolveRpcError()` retorna el fallback genérico.  
La detección de offline se hace a nivel de `useOfflineQueue` antes de llamar a la RPC:

```typescript
if (!navigator.onLine) {
  // Si la mutación es encolable → añadir a la cola sin mostrar error
  // Si no es encolable → toast "Sin conexión — esta acción requiere red"
}
```

---

## 7. Errores de constraint PostgreSQL

Las constraints DB (CHECK, UNIQUE, FK) devuelven códigos SQLSTATE distintos (`23514`, `23505`, `23503`).  
PostgREST los traduce a error HTTP 400 con `code` diferente a `P0001`.  
Como regla general, las RPCs deben validar explícitamente antes de llegar a la constraint (ver `rpc_deducir_material`: comprueba stock antes de que la constraint `stock_real >= 0` actúe).  
Si por algún motivo el constraint llega al cliente, `resolveRpcError()` devuelve el fallback genérico.
