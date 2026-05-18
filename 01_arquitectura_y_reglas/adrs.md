# Registros de Decisión de Arquitectura (ADR) — Proyecto U24

> Los ADR documentan decisiones técnicas con impacto arquitectónico. Una vez aceptados, solo pueden revertirse mediante otro ADR con justificación explícita. El número de ADR es secuencial e inmutable.

---

## ADR-001 — Persistencia: adopción de IndexedDB en todos los stores Zustand

**Estado:** Aceptado
**Fecha:** 2026-05-18

### Contexto

La tabla de stores en `estados.md §16` definía `localStorage` como mecanismo de persistencia para la mayoría de stores Zustand (`useTerminalStore`, `usePersonaStore`, `useVehiculoStore`, `useDRPStore`, `useModulosStore`). Esto contradecía directamente `rules.md §4`, que prohíbe `localStorage` para estados de sesión vitales al ser una API síncrona que bloquea el Main Thread bajo ráfagas de actualización de Supabase Realtime o actualizaciones de GPS.

### Decisión

1. **Todos los stores persistentes migran a `IndexedDB` mediante `idb-keyval`** como adaptador del middleware `persist` de Zustand. Afecta a: `useTerminalStore`, `usePersonaStore`, `useVehiculoStore`, `useDRPStore`, `useModulosStore`.

2. **`useAuthStore` queda como excepción documentada en `sessionStorage`:** Las credenciales (JWT, permisos, ID_nombre activo) no deben sobrevivir al cierre de la pestaña del navegador. `sessionStorage` garantiza el borrado automático al terminar la sesión de navegación, alineado con el modelo de seguridad de sesión del sistema.

3. **`useBandejasStore` y `useGlobalStore` añaden caché `IndexedDB` como fallback offline:** Al operar exclusivamente con Supabase Realtime sin persist local, en pérdida de conexión el cliente quedaría sin datos de bandejas ni marquesina. Se añade un caché IndexedDB que se rehidrata desde Supabase Realtime al reconectar.

4. **`useInventarioStore` permanece sin persist local:** El inventario es sensible a race conditions y no puede operarse de forma optimista sin confirmación del servidor (`rules.md §5`). Sin cambios.

### Consecuencias

- Elimina el jank del Main Thread causado por `localStorage.setItem()` síncrono bajo escrituras frecuentes de GPS y eventos Realtime.
- Unifica el mecanismo de persistencia local en una única capa (`idb-keyval`).
- `idb-keyval` se añade como dependencia obligatoria del proyecto.
- Implementación real del adaptador: Fase 1.

---

## ADR-002 — Prohibición estricta de Base64 para imágenes persistidas

**Estado:** Aceptado
**Fecha:** 2026-05-18

### Contexto

El comentario en `payloads_y_contratos.md` (interfaz `PayloadDoc7`, campo de imágenes) indicaba: *"Las imágenes adjuntas en Base64 no deben superar los 500KB para no colapsar IndexedDB."* Este comentario contradecía `rules.md §4`, que prohíbe explícitamente la persistencia en formato Base64. Al permitir Base64 con un límite de tamaño, el comentario creaba una ambigüedad que podría llevar a implementaciones incorrectas y a errores `QuotaExceededError` en dispositivos móviles con cuota de almacenamiento reducida.

### Decisión

Base64 está **prohibido** para cualquier imagen persistida en IndexedDB o incluida en payloads offline. El flujo correcto es:

1. El usuario adjunta una imagen (input de cámara o galería del dispositivo).
2. El frontend comprime síncronamente en el hilo de UI mediante la **Canvas API**: máx. 1200px en el lado mayor, formato WebP, calidad 0.70.
3. El resultado se almacena en IndexedDB como un objeto **`Blob` binario plano** (no cadena Base64).
4. Al sincronizar online, el Blob se sube directamente vía multipart/form-data o Supabase Storage sin pasar por Base64 en ningún punto.

### Consecuencias

- Elimina el riesgo de `QuotaExceededError` por cadenas Base64 sobredimensionadas en la cuota de IndexedDB del dispositivo.
- El payload serializado de Doc-7 no incluye strings de imagen; las imágenes viajan como Blobs en una operación separada.
- El comentario en `payloads_y_contratos.md:92` se ha sustituido por la descripción del flujo correcto (completado 2026-05-18).
- Implementación del pipeline Canvas API → WebP Blob en el componente de adjunto de Doc-7: Fase 2/3.

---

## ADR-001 — Clarificación Fase 1: `tipoGalleta` e `id_terminal` en `useTerminalStore`

**Estado:** Aceptado
**Fecha:** 2026-05-18
**Amenda:** ADR-001

### Contexto

Durante la revisión de `terminal_check.md` en Fase 1 se detectó que la condición de renderizado del botón "Acceder como Invitado Operativo" referenciaba `useAuthStore.tipoSesion === 'galleta'` con el comentario `"cookie permanente detectada en localStorage"`. Este campo no puede residir en `useAuthStore` (sessionStorage) porque la galleta permanente debe **sobrevivir al cierre de pestaña y de navegador** — es la señal de que el terminal fue registrado como oficial.

### Decisión

1. **`tipoGalleta`** ('permanente' | 'temporal' | null) y **`id_terminal`** (fingerprint SHA-256 de canvas + userAgent + screen + timezone) se alojan en **`useTerminalStore`** con persistencia `IndexedDB (idb-keyval)`.
2. **`useAuthStore`** no almacena ni `tipoGalleta` ni `id_terminal`. Su ámbito se limita a: ID_nombre activo, rol, JWT, permisos — todos en sessionStorage, borrados al cerrar la pestaña.
3. La condición de renderizado del botón pasa a ser `useTerminalStore.tipoGalleta === 'permanente'`.

### Consecuencias

- La detección del tipo de galleta es persistente y no depende de una sesión de navegador activa.
- El flujo de "Invitado Operativo" es posible incluso tras un reinicio del navegador sin que el usuario haya hecho login explícito en esa sesión.
- `terminal_check.md` actualizado (2026-05-18). `estados.md §16` actualizado (2026-05-18).

---

## Nomenclatura Canónica — Galletas de terminal

> Esta sección no es un ADR de decisión técnica sino un glosario de términos vinculantes para garantizar uniformidad en código, DB, stores y documentación.

| Capa | Término `permanente` | Término `temporal` |
|---|---|---|
| Base de datos (`galletas_terminales.tipo`) | `'permanente'` | `'temporal'` |
| Store Zustand (`useTerminalStore.tipoGalleta`) | `'permanente'` | `'temporal'` |
| RPCs PostgreSQL (parámetros) | `'permanente'` | `'temporal'` |
| Strings UI (etiquetas visibles) | `'Galleta'` | `'Galleta pequeña'` |
| Strings UI (descripciones largas) | `'Cookie permanente de terminal'` | `'Sesión temporal de terminal'` |

**Regla:** los valores de DB/Store/RPC son siempre `'permanente'` / `'temporal'` (minúscula, sin acento). Los strings de UI son los únicos que pueden usar formas coloquiales como `'galleta'` / `'galleta pequeña'`.
