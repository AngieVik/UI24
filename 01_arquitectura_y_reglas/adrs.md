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

---

## ADR-003 — PWA install prompt condicional + nivel de accesibilidad WCAG 2.1 AA

**Estado:** Aceptado
**Fecha:** 2026-05-19

### Contexto

La aplicación es una PWA (Progressive Web App) diseñada para funcionar en tabletas y móviles dentro de ambulancias, donde la instalación nativa mejora la experiencia (pantalla completa, sin barra del navegador, acceso desde home screen). Sin embargo, el prompt de instalación del navegador es agresivo y puede interrumpir flujos operativos críticos si aparece en el momento equivocado.

Adicionalmente, el sistema opera en contextos de alta presión donde la legibilidad y la operatividad sin fricción son críticas. Se necesita un nivel mínimo de accesibilidad definido formalmente para guiar decisiones de implementación de UI.

### Decisiones

**A — PWA install prompt condicional**

1. **Evento `beforeinstallprompt`** se captura y posterga (`event.preventDefault()`). El prompt nativo del navegador nunca se muestra automáticamente.

2. **Condición para mostrar el banner interno:**
   - El usuario ha completado al menos **1 login exitoso** en la sesión actual (no en la primera pantalla del flujo de autenticación).
   - El perfil activo NO es una sesión de emergencia (tipo `'temporal'`).
   - El dispositivo aún no tiene la app instalada (`window.matchMedia('(display-mode: standalone)').matches === false`).

3. **Formato del banner:** Chip no intrusivo en el footer del header negro, no modal. Texto: *"Instalar U24 en este dispositivo"*. Botón: *"Instalar"* + icono `ti-download`. Descartable con X; la decisión se persiste en IndexedDB (`install_prompt_dismissed: true`) para no volver a mostrarlo en ese terminal.

4. **Audiencia:** coordinación, gerencia, responsable_flota, responsable_logistica. Los perfiles de TES / DUE en ambulancias instalan la app en los terminales via el proceso de alta de hardware — el banner no es necesario para ellos (el terminal ya tiene la app instalada por defecto).

**B — Rutas offline-capable**

| Ruta / módulo | Offline-capable | Motivo |
|---|---|---|
| Login (verificación PBKDF2 local) | ✅ | `u24_offline_session` + IndexedDB |
| Visor vehículos (`useVehiculoStore`) | ✅ | IndexedDB persist |
| Doc-8 (parte de trabajo en curso) | ✅ Cola offline | `useOfflineQueue` |
| Doc-2, Doc-3, Doc-4, Doc-5 | ✅ Cola offline | `useOfflineQueue` |
| Doc-6 (deducción optimista) | ✅ Cola offline | `useOfflineQueue` |
| Doc-7 (avería) | ✅ Cola offline | `useOfflineQueue` |
| Bandejas (lectura) | ✅ caché | IndexedDB fallback (`useBandejasStore`) |
| Marquesina + tablón (lectura) | ✅ caché | IndexedDB fallback (`useGlobalStore`) |
| Inventario (lectura) | ⚠️ Solo caché puntual | No operaciones de escritura offline |
| DRP (creación / transición) | ❌ | Operación atómica — requiere confirmación servidor |
| Cuadrantes, RRHH, system_config | ❌ | Solo online |
| Alta vehículo, alta empleado | ❌ | Requieren confirmación atómica |

5. **Offline UX fallback:** si el usuario intenta una acción no offline-capable sin conexión, el sistema muestra un toast `"Sin conexión — esta acción requiere red"` y deshabilita el botón (no lanza la mutación). No se encola ni se reintentan estas operaciones.

**C — Nivel de accesibilidad**

1. **Target:** WCAG 2.1 nivel AA como línea base para toda la UI.

2. **Criterios clave para este sistema:**
   - Contraste mínimo 4.5:1 texto normal, 3:1 texto grande (sobre fondo negro del header y fondo blanco del contenido).
   - Todos los controles interactivos tienen `aria-label` cuando el label visual no está en el DOM (p.ej. iconos `ti-*` sin texto).
   - Modales de confirmación bloquean el foco (`focus trap`) y devuelven el foco al elemento disparador al cerrarse.
   - Bandejas y listas de pacientes usan `role="list"` / `role="listitem"` semántico.
   - Formularios offline usan `aria-required`, `aria-invalid` y mensajes de error asociados con `aria-describedby`.

3. **Fuera de scope:** WCAG 2.1 nivel AAA, screen reader testing exhaustivo (el sistema opera en terminales dedicados con usuarios formados — no público general).

### Consecuencias

- El banner de instalación no interrumpe nunca un flujo activo de asistencia.
- Los terminales de ambulancias instalados vía alta de hardware nunca ven el banner (ya están en modo standalone).
- Las rutas offline-capable están definidas explícitamente — el equipo de frontend sabe sin ambigüedad qué puede y no puede encolarse.
- WCAG 2.1 AA es el target de diseño; los componentes base del sistema de diseño deben documentar sus ratios de contraste.

---

## ADR-004 — Recuperación de contraseña: flujo gestionado exclusivamente por RRHH (C-09)

**Estado:** Aceptado
**Fecha:** 2026-05-19

### Contexto

Durante la auditoría de Fase 8 se identificó como G-01 la ausencia de un flujo
self-service de recuperación de contraseña. En los sistemas convencionales el
usuario recibe un enlace de reset al email o un código SMS. U24 no puede ofrecer
ninguna de estas dos vías:

1. **Email ficticio:** Todos los usuarios tienen dirección `id_nombre@u24.internal`.
   Este dominio no es enrutable externamente — no existe ningún servidor de correo
   que lo reciba. Supabase Auth acepta estos emails para crear la cuenta, pero
   nunca puede enviarles un mensaje de reset. Configurar Supabase `resetPasswordForEmail`
   simplemente no hace nada recuperable para el usuario.

2. **Sin canal SMS configurado:** U24 no integra Twilio ni ningún proveedor de SMS.
   Añadirlo requeriría recopilar y almacenar números de teléfono de los empleados,
   lo que introduce un nuevo vector de PII y complejidad operativa desproporcionada
   para un sistema de intranet cerrada.

3. **Sistema de intranet cerrada:** El acceso al sistema requiere presencia física en
   el contexto operativo. Un empleado que olvida su contraseña puede contactar con
   RRHH en persona o por radio — el escalado humano es el canal natural.

El G-02 (cambio de contraseña por el propio empleado) sí es viable y se documenta en
`logic.md §59`. Se distingue de la recuperación (G-01) en que G-02 requiere que el
empleado conozca su contraseña actual.

### Decisión

**La recuperación de contraseña cuando el empleado no la recuerda es responsabilidad
exclusiva de RRHH o Gerencia mediante la Edge Function `ef_reset_password`.**

No se implementa ningún flujo self-service de recuperación. Esto es una **decisión de
diseño consciente** derivada de las restricciones arquitectónicas del sistema, no un
gap a corregir.

El flujo operativo de recuperación es:

```
1. Empleado contacta con RRHH (en persona, teléfono fijo, radio)
2. RRHH verifica identidad del empleado (presencial o por código de empleado)
3. RRHH ejecuta ef_reset_password({id_nombre, nueva_contrasena_temporal})
4. Empleado recibe la contraseña temporal en mano (no por email)
5. Empleado hace login con la temporal y puede cambiarla
   (ver logic.md §59 — cambio de contraseña con actualización de sesión offline)
```

La UI del terminal debe mostrar en la pantalla de login:

```
"¿Olvidaste tu contraseña? Contacta con RRHH para restablecerla."
```

No hay botón de "Recuperar contraseña" con flujo automatizado.

### Consecuencias

- El flujo de recuperación depende de disponibilidad humana de RRHH — aceptable dado
  el contexto operativo (centro de coordinación siempre tiene personal de guardia).
- No se almacenan ni procesan números de teléfono de empleados para SMS.
- No se configura ningún servidor SMTP ni proveedor de email externo.
- `ef_reset_password` ya existe (Fase 6, rls_y_rpcs.md §8) — no hay desarrollo nuevo.
- Los runbooks operativos deben incluir el procedimiento de reset presencial como
  caso documentado (ver `runbooks.md RB-05`).

---

## ADR-005 — Huso horario canónico: `Europe/Madrid` + UTC en base de datos (C-15)

**Estado:** Aceptado
**Fecha:** 2026-05-19

### Contexto

El sistema U24 opera exclusivamente en España peninsular (zona horaria `Europe/Madrid`,
UTC+1 invierno / UTC+2 verano). La instancia PostgreSQL de Supabase tiene por defecto
huso horario `UTC`. Sin una declaración explícita de timezone:

1. Los operadores y el equipo de soporte que acceden a la DB directamente (Supabase
   Studio, psql) ven timestamps en UTC, lo que causa confusión en auditorías (un evento
   a las 01:00 UTC se registra como 01:00 cuando ocurrió a las 02:00 o 03:00 hora local
   según si hay DST activo).

2. Las funciones PostgreSQL que operan con rangos de fecha (`CURRENT_DATE`, `NOW()::date`,
   operadores de rango temporal) producen resultados incorrectos cuando la timezone de
   sesión difiere de la zona operativa del negocio. Esto es especialmente crítico en RPCs
   de cuadrantes, vacaciones (Doc-12) y generación de reports diarios.

3. La ausencia de un ADR explícito sobre timezone crea riesgo de que futuros desarrolladores
   añadan comparaciones `= CURRENT_DATE` en RPCs sin ser conscientes de la discrepancia UTC.

### Decisión

**1. Almacenamiento: siempre `TIMESTAMPTZ` en UTC.**
Todos los campos de timestamp en la base de datos son `TIMESTAMPTZ`. El valor almacenado
es siempre UTC — esto no cambia con esta decisión. UTC es la única fuente de verdad en
la DB, sin excepciones.

**2. Timezone de sesión PostgreSQL: `Europe/Madrid`.**
Se declara mediante migración de base de datos:

```sql
-- supabase/migrations/20260519_set_timezone_europe_madrid.sql
ALTER DATABASE postgres SET timezone TO 'Europe/Madrid';
```

Esto configura `Europe/Madrid` como timezone de sesión por defecto para todas las
conexiones nuevas al pool. Efectos:
- `NOW()` devuelve el instante actual con offset correcto para España.
- `CURRENT_DATE` refleja el día español, no el día UTC (relevante para cuadrantes y vacaciones).
- `AT TIME ZONE` sin argumento explícito resuelve a `Europe/Madrid`.
- Los timestamps se muestran con offset local en Supabase Studio.

**3. Presentación en cliente: `Intl.DateTimeFormat` con `timeZone: 'Europe/Madrid'`.**
Las RPCs no devuelven strings localizados. Devuelven `TIMESTAMPTZ` en UTC; el cliente
formatea con la locale y timezone del usuario. Ejemplo:

```typescript
const formatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  dateStyle: 'short',
  timeStyle: 'short',
})
formatter.format(new Date(timestampUTC))
```

**4. Payloads offline del cliente: siempre ISO 8601 UTC.**
Los timestamps generados por dispositivos en campo se transmiten como
`new Date().toISOString()` (UTC). Ver `logic.md §60` sobre autoridad de timestamps.

**5. Tests de integración en CI: `SET timezone = 'Europe/Madrid'`.**
Los tests que ejecutan RPCs con comparaciones de fecha deben incluir:

```sql
SET timezone = 'Europe/Madrid';
```
al inicio de la sesión de test, para que el entorno de CI sea consistente con producción.

### Consecuencias

- Supabase Studio y las consultas directas de soporte muestran timestamps en hora
  española — operadores y soporte ven la hora local directamente sin conversión manual.
- `CURRENT_DATE` en RPCs de cuadrantes y vacaciones refleja el día español correcto.
- No hay impacto en los datos existentes: todos son `TIMESTAMPTZ` — el valor UTC no
  cambia, solo cambia la presentación sin conversión explícita.
- **DST:** en los cambios de hora de primavera/otoño, el sistema sigue siendo correcto
  porque los datos están en UTC. `Intl.DateTimeFormat` y PostgreSQL `Europe/Madrid`
  ambos aplican DST automáticamente.
- La migración `20260519_set_timezone_europe_madrid.sql` debe estar entre las primeras
  migraciones aplicadas (ver `infraestructura.md §2.4`).

---

## ADR-006 — Internacionalización: español único + ruta de migración a i18next (U-05)

**Estado:** Aceptado
**Fecha:** 2026-05-19

### Contexto

U24 es una PWA de intranet cerrada destinada íntegramente a servicios de emergencias
médicas en España. El equipo de usuarios — TES, DUE, médicos, coordinadores, responsables
de flota y logística, RRHH y gerencia — es 100% hispanohablante. No existe ningún requisito
de multi-idioma en el horizonte operativo de 3-5 años del sistema.

Las opciones evaluadas:

| Opción | Bundle añadido | Overhead de desarrollo |
|---|---|---|
| Strings en español directamente en JSX/TS | 0 KB | Nulo |
| `react-intl` (Format.js) | ~50 KB min | Mensajes-ID, ficheros de traducción |
| `i18next` + `react-i18next` | ~70 KB min | Sistema de claves, namespaces, fallbacks |
| `Intl` API nativa del navegador | 0 KB | Solo formatos de fecha/número, no strings de UI |

El presupuesto de bundle es **3 MB total / 800 KB por ruta** (rules.md). Añadir ~70 KB de
i18next para una funcionalidad sin demanda actual representa ~9% del presupuesto total.
Adicionalmente, la abstracción en claves reduce la legibilidad directa del código JSX:
`t('drp.cancelar.confirmacion')` es significativamente menos claro para un revisor que
el string literal en español. En un sistema de misión crítica, la legibilidad inmediata
reduce la probabilidad de introducir bugs en textos que guían decisiones operativas.

### Decisión

**El sistema usa español directamente en todo el código de UI.** No se introduce ninguna
librería de i18n en esta fase.

**1. Strings de UI en JSX/TSX escritos directamente en español:**
```tsx
// ✅ Correcto
<Button>Cancelar DRP</Button>
<p>No hay DRP activos en este momento.</p>
<Toast message="Stock insuficiente para realizar este gasto." />
```

**2. Identificadores de máquina siempre en inglés:**
El español es exclusivo para lo que el usuario ve. Variables, keys de stores Zustand,
códigos de error de RPC, enum values de DB y nombres de funciones permanecen en inglés.
```typescript
// ✅ Correcto
const errorCode = 'drp_ya_cancelado'              // identificador → inglés
const mensajeUI = 'Este DRP ya fue cancelado.'    // string de UI → español

// ❌ Incorrecto
const errorDrpYaCancelado = 'drp_ya_cancelado'    // identificador en español
```

**3. Formatos de fecha y número mediante `Intl` API nativa:**
No se usa librería externa para formateo — `Intl.DateTimeFormat` y `Intl.NumberFormat`
con `locale: 'es-ES'` y `timeZone: 'Europe/Madrid'` cubren todos los casos necesarios.

**4. Tabla de mensajes de error en `error_handling.md §6`:**
El mapeo código → string español vive en `resolveRpcError()`. No hay clave i18n.

**Ruta de migración si se requiere multi-idioma en el futuro:**

`i18next-scanner` puede extraer automáticamente todos los strings del JSX/TSX existente:

```bash
# 1. Instalar tooling
npm install -D i18next-scanner

# 2. Escanear codebase y generar fichero de claves en español
npx i18next-scanner 'src/**/*.{ts,tsx}' --output locales/es/translation.json

# 3. Reemplazar strings por t('clave') — automatizable con jscodeshift codemods
```

Tiempo estimado de migración: 2-3 sprints según el volumen de componentes en ese momento.
La migración es lineal y no requiere cambios arquitectónicos — solo extracción y reemplazo.

### Consecuencias

- **Cero overhead de bundle** por i18n — presupuesto de 800 KB protegido.
- **Legibilidad directa** del código: los revisores leen el texto de UI sin buscar claves.
- **Sin riesgo de clave faltante**: no hay sistema de fallback necesario ni traducciones pendientes.
- **Deuda técnica conocida y aceptada**: si se requiere multi-idioma, la migración requiere
  un refactor completo. Esta deuda se acepta conscientemente dado el contexto de intranet
  monolingüe y horizonte operativo definido.
- Los desarrolladores que añadan strings de UI deben escribirlos en español directamente
  — no en inglés con comentario de traducción futura.
