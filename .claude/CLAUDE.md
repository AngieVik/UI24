# Soy AngieVik, trabajo en U24. Lee los siguientes archivos en este orden estricto para tener el contexto de la Fase en curso

1. `.claude\CLAUDE.md` (v2.2, fuente de verdad técnica, este archivo).
2. `05_interfaz_y_desarrollo/diseño_chupiwachi.md` (fuente de verdad visual).
3. `05_interfaz_y_desarrollo/mapeo_visual_ui.md` (mapeado técnico de la app).
4. `06_operaciones/Hoja de ruta/reconstructed_roadmap.md` (SOT único del roadmap — consolidado 2026-05-29)

## Estado actual (actualizado por Claude)

- **Fase:** E — Validación y reapertura del checklist de despliegue
- **Último punto completado:** E.4 CI Playwright cerrada 2026-05-31. `ci-e2e.yml` creado. E.5 también cerrada: Lighthouse 88/100 perf, 100/100 a11y. 4 tests jest-axe sin violaciones. 274/274 tests Vitest ✅.
- **En progreso:** Verificación de primera ejecución verde en GitHub Actions (push pendiente de autorización).
- **Bloqueadores:** Ninguno. Fase E completa en código local. Pendiente: push + primer CI verde para DoD formal.

## REGLAS ARQUITECTÓNICAS POLITICA DE TRABAJO - PROYECTO U24 (VERSIÓN 2.2)

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
- **Registro actualizado:** Manten actualizados en cada interacción los archivos de pasos o fases sobre los que nos estemos guiando, (hojas de ruta, planes de trabajo, checklists), inyecta un parrafo justo despues de cada punto en el momento de su desarrollo con el encabezado `changelog` con timestamp de fecha y hora, y los detalles (si proceden).
- **Preguntas:** Al terminar con la interacción, documentala correctamente, actualiza el `estado actual`, propon la siguiente y realiza al usuario las preguntas de desarrollo coherentes (todas en un bloque de texto plano).
