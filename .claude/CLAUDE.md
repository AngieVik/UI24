# Soy AngieVik, trabajo en U24. Lee los siguientes archivos en este orden estricto para tener el contexto de la Fase en curso

1. `.claude\CLAUDE.md` (v2.5, fuente de verdad técnica, este archivo).
2. `05_interfaz_y_desarrollo/diseño_chupiwachi.md` (fuente de verdad visual).
3. `05_interfaz_y_desarrollo/mapeo_visual_ui.md` (mapeado técnico de la app).
4. `06_operaciones/Hoja de ruta/reconstructed_roadmap.md` (SOT único del roadmap — consolidado 2026-05-29)

## Estado actual (actualizado por Claude)

- **Fase:** PRE-FASE F — Correcciones post-Alpha.
- **Último punto completado:** 2026-06-03 — Correcciones post-alpha aplicadas. 315/315 tests ✅. tsc limpio.
  - **Fix 1:** Filiación: parámetro `mutation_uuid` → `p_mutation_uuid` en `useFiliacion.ts`.
  - **Fix 2:** DRP Resumen: pasa de modal Dialog a HomeArea como todas las ventanas (`black-column-nav.ts` + `App.tsx`).
  - **Fix 3:** Marquesina: ticker y velocidad leídos desde `system_config` en tiempo real (`useTickerConfig.ts`). Selector de velocidad añadido a `ComunicacionScreen`. Estado inicial del formulario sincronizado via `useEffect`.
  - **Fix 4:** `resolveRpcError` mejorado: muestra el código ERR_ o el mensaje raw en el fallback para facilitar diagnóstico.
  - **Fix 5:** RBAC: `Fragment` con key en el map de grupos (antes `<>` sin key).
  - **Fix 6:** Layout `ComunicacionScreen` mejorado: full-width con `max-w-2xl` para tablón y `max-w-lg` para marquesina.
    - **Fix 7:** Locations: eliminadas 6 locations demo, sincronizados 54 vehículos, añadido Almacén Central (`almacen_central`). Migración 000013 aplicada en producción.
  - **Fix 8:** `rpc_crear_drp` corregido: `resultado::UUID` → `(resultado #>> '{}')::UUID`; `rpc` → `rpc_name`; `v_id_drp::TEXT` → `to_jsonb(v_id_drp::TEXT)`. Migración 000013 incluye el fix.
  - **Fix 9:** Todas las pantallas con Tabs internos que duplicaban la navegación del BlackColumn refactorizadas (8 screens: ComunicacionScreen, MovimientosScreen, StockScreen, InventarioMaestroScreen, IncidenciasScreen, VisorMantenimientoScreen, VehiculosMetadataScreen, MantenimientoFlotaScreen, ModuloEmergenciasScreen). Cada pantalla ahora muestra directamente el contenido de su `vista` prop sin navegación interna.
- **Bloqueadores:** Ninguno.
- **Siguiente:** Fase F — Modo oscuro y refinamientos (F.1 ThemeToggle, F.2 sentence case, F.3 a11y focus, F.4 PWA device).

## REGLAS ARQUITECTÓNICAS POLITICA DE TRABAJO - PROYECTO U24 (VERSIÓN 2.5)

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

para mas informacion, revisar /Gestión_de_Usuarios_Supabase_Auth.md
