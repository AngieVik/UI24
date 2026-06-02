# Soy AngieVik, trabajo en U24. Lee los siguientes archivos en este orden estricto para tener el contexto de la Fase en curso

1. `.claude\CLAUDE.md` (v2.5, fuente de verdad técnica, este archivo).
2. `05_interfaz_y_desarrollo/diseño_chupiwachi.md` (fuente de verdad visual).
3. `05_interfaz_y_desarrollo/mapeo_visual_ui.md` (mapeado técnico de la app).
4. `06_operaciones/Hoja de ruta/reconstructed_roadmap.md` (SOT único del roadmap — consolidado 2026-05-29)

## Estado actual (actualizado por Claude)

- **Fase:** F — Fase E cerrada. Iniciando modo oscuro y refinamientos.
- **Último punto completado:** 2026-06-02 — Fase E CERRADA. CI workflows reparados (ci-quality + ci-e2e + ci-database). Fixes: `dev-dist` ignorado en ESLint/Prettier; locators E2E heading→button; `supabase.ts` sincronizado con 3 funciones SECURITY DEFINER; `resolveRpcError` revertido a fallback seguro; 6 archivos formateados. 274/274 tests ✅. Deploy Vercel diferido indefinidamente hasta necesidad real de QA en producción.
- **Bloqueadores:** Ninguno. Siguiente paso: Fase F — modo oscuro y refinamientos.

## REGLAS ARQUITECTÓNICAS POLITICA DE TRABAJO - PROYECTO U24 (VERSIÓN 2.5)

### 8. Gestión de Usuarios Supabase Auth — REGLA CRÍTICA

**Problema documentado (2026-06-02):** Crear usuarios via SQL directo en `auth.users` en producción
genera hashes bcrypt con cost 6 (`$2a$06$`). GoTrue en producción exige cost ≥ 10 (`$2a$10$`).
Además, los inserts SQL omiten campos internos de GoTrue (`instance_id`, registros en
`auth.identities`), dejando el usuario invisible para el servicio de Auth aunque exista en la tabla.

**Reglas permanentes:**

- **PROHIBIDO** insertar directamente en `auth.users` en producción (ni via MCP, ni via migración, ni via seed `--linked`).
- **ÚNICO método válido en producción:** `supabase.auth.admin.createUser()` desde una Edge Function o desde el Dashboard de Supabase (Authentication → Users → Add user).
- **La Edge Function canónica es `ef-alta-empleado`** — la usa gerencia/RRHH para crear trabajadores.
- **Para usuarios de prueba en producción:** Dashboard Supabase → Authentication → Users → Add user. Luego SQL solo para insertar la fila en `fichas_empleados` con el UUID que devuelve el dashboard.
- **Seeds SQL (`supabase/seeds/`)** son exclusivamente para entorno local con `supabase db reset` (sin `--linked`). Nunca ejecutar seeds con `--linked` o contra producción.
- **Si hay que resetear contraseña en producción via SQL:** usar `gen_salt('bf', 10)` explícitamente (cost 10), nunca `gen_salt('bf')` que usa cost 6 y GoTrue lo rechaza.
- **Si se inserta en `auth.users` via SQL** (solo en emergencia), además de `instance_id = '00000000-0000-0000-0000-000000000000'` y la identity en `auth.identities`, todos los campos de texto deben ser `''` (cadena vacía), NUNCA NULL: `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `phone_change_token`, `phone_change`. GoTrue los escanea como `string` Go (no puntero) y falla con "converting NULL to string is unsupported".

### 8.1 Inconsistencia auth.users ↔ fichas_empleados en usuarios máquina — REGLA PREVENTIVA

**Problema documentado (2026-06-02):** El EF `ef-autorizar-terminal` puede quedar en estado inconsistente
si el paso `auth.admin.createUser()` tiene éxito pero el `INSERT` en `fichas_empleados` falla
(error RLS, constraint, timeout, etc.). En ese caso:

- `auth.users` contiene el usuario máquina `terminal_<fp>@u24.local`
- `fichas_empleados` NO tiene fila para ese usuario
- El siguiente intento de autorización busca en `fichas_empleados` (no lo encuentra),
  intenta crear el auth user → 422 "already registered" → el EF devuelve `ERR_AUTORIZAR_003`
- El usuario ve "No se pudo crear el usuario del terminal" sin más contexto

**Diagnóstico rápido si el login de gerencia devuelve ERR_AUTORIZAR_003:**

```sql
-- 1. ¿Existe el auth user?
SELECT id, email FROM auth.users WHERE email LIKE 'terminal_%@u24.local';
-- 2. ¿Tiene su fila en fichas_empleados?
SELECT id_nombre, rol, activo FROM fichas_empleados WHERE id_nombre LIKE 'terminal_%';
-- Si (1) devuelve fila y (2) NO → inconsistencia confirmada → ejecutar Fix.
```

**Fix SQL de emergencia (extraer fingerprint del email y ajustar los valores):**

```sql
-- Obtener el fingerprint del email: terminal_{fingerprint}@u24.local → fingerprint = lo que hay entre _ y @
INSERT INTO fichas_empleados (auth_user_id, id_nombre, nombre_real, rol, activo)
VALUES (
  '<uuid de auth.users>',
  'terminal_<fingerprint.slice(0,16)>',
  'Terminal <fingerprint.slice(0,8)>',
  'gerencia',
  true
)
ON CONFLICT (auth_user_id) DO UPDATE
  SET id_nombre = EXCLUDED.id_nombre, nombre_real = EXCLUDED.nombre_real,
      rol = EXCLUDED.rol, activo = EXCLUDED.activo;
```

**Segundo bug documentado (2026-06-02 — mismo incidente):** La contraseña del usuario máquina
se generaba como `` `terminal-${fingerprint}-u24` `` (77 chars). GoTrue rechaza contraseñas
> 72 bytes con `400: Password cannot be longer than 72 characters` en el endpoint de actualización
(`PUT /admin/users/:id`), aunque `POST /admin/users` puede aceptarlas y bcrypt las trunca
silenciosamente. El resultado es que `updateUserById` falla, la contraseña no se actualiza,
y el `signInWithPassword` posterior falla con 400 Invalid credentials.

**Regla permanente:** La contraseña del usuario máquina debe ser ≤ 72 bytes siempre.
Fórmula canónica en `ef-autorizar-terminal` v6: `fingerprint.slice(0, 64)` (64 chars hex).
NO añadir prefijos ni sufijos que superen el presupuesto de 72 bytes.

**Mitigación en código (ya aplicada en v6 del EF):** `ef-autorizar-terminal` ahora detecta el 422,
recupera el usuario existente vía `listUsers`, restablece la contraseña (ahora ≤ 72 bytes) y hace
`upsert` en `fichas_empleados`. El path feliz (fichaExistente encontrada) también usa la contraseña corregida.

### 8.3 Patrón obligatorio para RLS con acceso DRP/presencias cruzado

**Problema documentado (2026-06-02):** La migración `20260531000001_rls_hardening_d13` introdujo
políticas correctas semánticamente pero con recursión directa (`presencias_activas_terminal`) y
cruzada (`activaciones_vehiculo` → `activaciones_vehiculo` vía JOIN en subquery DRP). Ambas
generaban `infinite recursion detected in policy` con 500 en la API REST.

**Regla permanente:** Toda política RLS que necesite consultar datos de la misma tabla o de una
tabla que a su vez tiene RLS que consulta tablas relacionadas, DEBE usar una función
`SECURITY DEFINER` como intermediaria. El owner de la función (postgres, `rolbypassrls = true`)
bypasa las políticas internas, rompiendo el ciclo.

**Cuatro funciones canónicas creadas (2026-06-02):**

| Función | Tabla destino | Rompe recursión de |
|---|---|---|
| `presencias_terminal_para_usuario()` | `presencias_activas_terminal` | Auto-referencia en presencias |
| `presencias_drp_crew_para_usuario()` | `activaciones_vehiculo` | Cadena cruzada presencias→AV |
| `activaciones_matriculas_para_usuario()` | `activaciones_vehiculo` | Auto-referencia en AV |

**Migraciones locales:** `20260602000001_fix_rls_recursion_presencias_activas_terminal.sql`
y `20260602000002_fix_rls_recursion_activaciones_vehiculo_y_presencias.sql`.

**Al añadir nuevas políticas RLS que referencien `activaciones_vehiculo`, `dotaciones_drp` o
`presencias_activas_terminal`:** usar siempre las funciones helper existentes, nunca subqueries
directas a esas tablas dentro de un `USING` o `WITH CHECK`.

**Flujo correcto para dar de alta un trabajador real:**

```
1. Gerencia o RRHH llama a ef-alta-empleado con { email, password, id_nombre, nombre_real, rol }
2. La EF crea auth.users + fichas_empleados en una transacción atómica con rollback
3. El trabajador puede hacer login inmediatamente
```

### 8.4 GRANT SELECT faltante en versiones_cliente — DOCUMENTADO 2026-06-02

**Problema:** `versiones_cliente` fue creada en `20260519000001_init_schema.sql` con RLS habilitada y una política `USING (TRUE) TO authenticated`, pero sin el GRANT de tabla `GRANT SELECT ON versiones_cliente TO authenticated`. PostgreSQL evalúa el GRANT ANTES de la RLS, por lo que `authenticated` recibía "permission denied" incluso con la política permisiva.

**Síntomas:**

- `SystemConfigScreen` → "Error inesperado. Contacta con soporte." al montar (queries en `Promise.all`)
- `useForceUpdateCheck` → fallaba silenciosamente en anon/authenticated sin el GRANT

**Fix aplicado:**

- Migración `supabase/migrations/20260602000004_grant_select_versiones_cliente.sql` creada.
- `resolveRpcError` ahora extrae `.message` de PostgrestError (no solo de `instanceof Error`).
- `useForceUpdateCheck` ahora espera a `session !== null` antes de consultar.
- Chip PWA añadido a `AppShell` (consumía `useInstallPrompt` pero no tenía UI).

**Fix aplicado en producción:** `GRANT SELECT ON versiones_cliente TO authenticated` — migración `20260602000004` aplicada 2026-06-02 vía MCP.

### 8.2 Recursión infinita en políticas RLS — REGLA PREVENTIVA

**Problema documentado (2026-06-02):** La política RLS de `presencias_activas_terminal` contenía
una subconsulta que referenciaba la misma tabla dentro del `USING`:

```sql
OR (id_terminal IN (
  SELECT p2.id_terminal FROM presencias_activas_terminal p2  -- ← recursión
  WHERE p2.id_nombre = auth_id_nombre_actual()
))
```

PostgreSQL evalúa todos los ramos del `OR` en el plan de ejecución (no hace short-circuit
garantizado), por lo que aunque el primer ramo (`auth_rol_actual() = 'gerencia'`) sea verdadero,
el planner puede evaluar igualmente la subconsulta recursiva → 500 `infinite recursion detected`.

**Regla permanente:**

- **PROHIBIDO** que una política RLS referencie su propia tabla en el `USING`/`WITH CHECK`.
- **Patrón correcto:** crear una función `SECURITY DEFINER` que query la misma tabla sin
  aplicar RLS (el owner bypasa las políticas), y usar la función en la política:

```sql
CREATE OR REPLACE FUNCTION helper_sin_recursion()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT campo FROM mi_tabla WHERE id = auth_id_nombre_actual() LIMIT 1;
$$;
-- Luego en la política: USING (... OR campo = helper_sin_recursion())
```

**Fix aplicado (2026-06-02):** Migración `fix_rls_recursion_presencias_activas_terminal`.
Función canónica: `presencias_terminal_para_usuario()`.

**Directiva estricta:** No tocar la BD ni hacer despliegues de migraciones sin mi permiso explícito.
**Directiva principal:** Este documento es la única fuente de verdad para la arquitectura, rendimiento y seguridad estructural del proyecto U24. Cualquier desviación de estas reglas resultará en el rechazo inmediato del Pull Request.
*(Nota: Las especificaciones visuales, tipográficas y responsivas residen exclusivamente en `diseño_chupiwachi.md`).*
**Una fase a la vez:** No se inicia la siguiente sin cerrar la actual.
**No se hacen:** `npm run build` definitivos ni `git push` ni despliegues a Vercel
  sin autorización explícita previa.
**Bloqueo de infraestructura (CRÍTICO):** prohibido alterar BD, crear migraciones
  o ejecutar despliegues en Supabase sin autorización explícita previa.
**Cualquier desviación:** se levanta como deuda en §6 antes de cerrar la fase.
**Sentence case estricto:** en toda copy de UI. Sin emojis salvo si el producto lo pide.

### 1. Arquitectura de Datos y Sincronización Offline-First

Las ambulancias operan en zonas de baja cobertura. La aplicación debe ser resiliente a cortes de red de forma transparente.

- **Cola de mutaciones offline:** Las mutaciones críticas (React Query/Supabase) deben respaldarse mediante una cola asíncrona local apoyada en `IndexedDB`.
- **Idempotencia obligatoria:** Todos los registros creados sin conexión (incluyendo formularios dinámicos y hojas append-only como `Doc-1`) deben utilizar UUIDs generados nativamente en el frontend de forma determinista antes de tocar la cola. Esto evita registros duplicados durante reintentos de red.
- **Caché paginado y límite de memoria:** Debido a los límites de `IndexedDB` en móviles, la sincronización de inventarios masivos debe ser paginada o parcial. Prohibido cargar BBDD completas en dispositivo.
- **Persistencia crítica de estado (Zustand + IndexedDB):** Los estados de sesión vitales de turno (`estadoOperativo`, `condicionTecnica`, `tipoServicio`, `checkin_on`, `pilot`, `carry`, `drp_activo`, `turno_iniciado`) DEBEN utilizar el middleware `persist` sobre **IndexedDB** (`idb-keyval`). Prohibido `localStorage` para estados mutables por el bloqueo síncrono del Main Thread.
- **Procesamiento de imágenes offline:** Fotografías adjuntas (ej. Doc-7) deben comprimirse asíncronamente en UI vía Canvas API (máx 1200px, WebP, calidad 0.70) antes de guardarse en IndexedDB como `Blob` binario plano. Prohibido Base64.

### 2. Seguridad, RBAC y Modelo de Base de Datos

El frontend es intrínsecamente inseguro. El control real recae en PostgreSQL.

- **Row Level Security (RLS) obligatorio:** Ocultar componentes en el DOM es cosmético. Toda tabla en Supabase DEBE implementar RLS estricto.
- **Arquitectura RBAC + Claims (JWT Claims):** Las RLS validan claims inyectados en el JWT vía hook de Supabase. El JWT es la única fuente de verdad, no lecturas paralelas a `fichas_empleados`.
- **Lógica de negocio atómica en DB:** Prohibido realizar sustracciones matemáticas de inventario desde peticiones asíncronas del cliente (Race Conditions). Las operaciones atómicas se ejecutan en BBDD mediante RPCs y Triggers.
- **Normalización relacional (3NF):** La base de datos refleja entidades puras del negocio. Prohibido replicar interfaces de usuario.
- **Sesiones de emergencia:** La revocación de tokens temporales de emergencia se aísla en `sesiones_emergencia`. Un cronjob de Supabase Edge Functions las purga automáticamente.
- **Prohibición incondicional:** Entidades inmutables (`doc1_asistencias`) o en estado terminal (`DRP Finalizado`) deben devolver `USING (FALSE)` en RLS de `UPDATE/INSERT` para todos los roles.

### 3. Rendimiento y Tráfico de Red (Budget)

- **Payloads minimizados:** Uso obligatorio de selectores estrictos (ej. `select('id, nombre, stock')`). Prohibido `select('*')` en vistas de inventario masivo.
- **Sincronía de tipado:** Uso de `supabase-cli` (`supabase gen types typescript`) como hook de pre-commit. Single Source of Truth para validadores `Zod`.
- **Prohibición de criptografía pesada en UI:** Prohibido `bcrypt.js` en el cliente. Validaciones offline degradadas usarán Web Crypto API (`PBKDF2` / `SHA-256`).
- **Presupuesto de bundle (CI/CD):** Límite global del build: 3 MB. Entry chunk (FCP): ≤ 800 KB en producción. Excederlo rompe el pipeline en GitHub Actions.
- **pdfMake — Carga diferida:** Librerías de PDF se cargarán **exclusivamente mediante importación dinámica** (`import()`) con React 19 Lazy/Suspense al accionar la exportación.

### 4. Stack Tecnológico Obligatorio

- **React 19** + **Vite** (Client Components, bundle size config).
- **Zustand** + **idb-keyval** (Estado sesión / Offline).
- **TanStack Query v5** (Caché servidor + Sincronización).
- **Tailwind v4** + **shadcn/ui** (UI/UX).
- **Supabase** (PostgreSQL, Auth, Edge Functions, Storage, Realtime).
- **Vercel** (Hosting y despliegue).

### 5. Testing y Observabilidad

- **Vitest & RTL:** Unit tests e integración de stores, lógica y UI basada en comportamiento.
- **Playwright:** E2E Smoke suite y validación de cola offline interceptando red (`page.route`). El CI falla si los tests fallan.
- **Sentry (Cliente):** Captura diferida de errores (`VITE_SENTRY_DSN`).
- **Logflare:** Drain nativo de Supabase para capturar violaciones RLS o timeouts RPC (`SUPABASE_LOG_DRAIN_URL`).

### 6. Service Worker

- **Estrategia `skipWaiting()` + `clients.claim()` en evento activate.**
- **App shell precacheado (`index.html`, Google Fonts, manifest, chunks críticos).**
- **Ciclo Fetch: `cache-first` para assets, `network-first` para llamadas Supabase.**

### 7. Sesiones

- **Persistencia entre sesiones:** Manten el archivo `.claude/CLAUDE.md` vivo, reflejando el estado real del proyecto.
- **Registro actualizado:** Manten actualizados en cada interacción los archivos de pasos o fases sobre los que nos estemos guiando, 06_operaciones\Hoja de ruta\reconstructed_roadmap.md (hojas de ruta, planes de trabajo, checklists), inyecta un parrafo justo despues de cada punto en el momento de su desarrollo con el encabezado `changelog` con timestamp de fecha y hora, y los detalles (si proceden).
- **Preguntas:** Al terminar con la interacción, documentala correctamente, actualiza el `estado actual`, propon la siguiente y realiza al usuario las preguntas de desarrollo coherentes (todas en un bloque de texto plano).
