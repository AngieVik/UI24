# REGLAS ARQUITECTÓNICAS Y DE DISEÑO - PROYECTO U24 (VERSIÓN 2.1)

**Directiva principal:** Este documento es la única fuente de verdad para la arquitectura, diseño UI/UX y seguridad estructural del proyecto U24. La complacencia está prohibida. Cualquier desviación de estas reglas resultará en el rechazo inmediato del Pull Request.

## U24 Design System

 Sistema de diseño para **U24 Servicios Sanitarios** — El tono de la aplicación es clinico, profesional y de misión crítica para: servicios de emergencias médicas, ambulancias, dispositivos de riesgo previsible / DRP, logística de material sanitario, gestión de flota y RRHH.  
 Se prohíben las jerarquías visuales desordenadas o tamaños arbitrarios. La consistencia es inquebrantable.

### Sistema tipográfico estricto

* **Familia única:** Barlow (Google Fonts). Dos cortes de la misma familia, prohibido cualquier otra fuente.
  * `Barlow Condensed`: UI de mando — navegación, etiquetas, matrículas, nombres de paciente, badges, ticker, alertas, black_column y cualquier elemento de control operativo.
  * `Barlow` (regular): cuerpos de formulario, descripciones largas y bloques de texto de más de 2 líneas.
* **Pesos permitidos (Weights):**
  * `300` (Fino): Para metadatos, horas, fechas y descripciones secundarias.
  * `500` (Mediano): Para cuerpos de texto, formularios y datos de entrada del usuario.
  * `700` (Negrita): Para etiquetas de datos, nombres de pacientes, matrículas y navegación.
  * `900` (Grueso/Black): EXCLUSIVAMENTE para alertas críticas (Doc-11), roturas de stock o estados de emergencia.
* **Capitalización (Sentence case estricto):** Todos los textos de la interfaz emplean el formato "Primera letra mayúscula, resto minúscula" (ej. "Paleta semántica", "En ruta", "Control operativo U24"). Las MAYÚSCULAS SOSTENIDAS están estrictamente restringidas a acrónimos (ej. DRP, PSA, ITV, UTC).
* **Configuración Tailwind v4:**

` ` `css
@import url('<https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;500;700;900&family=Barlow:wght@300;500;700&display=swap>');

@theme {
  --font-sans: 'Barlow Condensed', sans-serif;
  --font-body: 'Barlow', sans-serif;
}
` ` `

### System de diseño, colores y componentes (UI Kit)

La interfaz no tendrá secciones de diferentes estilos. La uniformidad visual es inquebrantable.

* **Librería de componentes base:** Se usarán de forma exclusiva los componentes de `ui.shadcn.com`. Queda prohibido construir componentes interactivos complejos desde cero si existe un equivalente en esta librería.
* **Modo claro / oscuro:** Todo el sistema, sin excepción, tendrá el modo claro/oscuro (Light/Dark mode) definido y soportado mediante variables de CSS (`@theme` de Tailwind v4 y selectores `.dark`).
* **Reglas de botones:**
  * **Uniformidad:** Todos los botones estándar serán del mismo color, tanto de fondo como de letra, manteniendo una estética seria y profesional (paddings pequeños, estilo `shadcn/ui` base).
  * **Agrupación:** Cuando existan múltiples acciones relacionadas en una misma vista, los botones estarán agrupados obligatoriamente utilizando el código de **Button Group** de `ui.shadcn.com`.
  * **Destructivos:** Solo los botones de peligro crítico romperán la paleta base, utilizando el color rojo para la tipografía.
* **Paleta de colores:** Inspirada en la identidad visual de U24 Servicios Sanitarios, con un enfoque en tonos neutros para la base y colores vivos.
  * Nucleo: `Negro Unico #111111, Blanco Puro #FFFFFF, Amarillo vivo #ffd60a, Rojo Hover #dc2626` Colores base para diferentes elementos de la interfaz.
  * Escala de grises neutrados (Zinc en Tailwind): `zinc-900 #18181B, zinc-800 #27272A, zinc-700 #3f3f46, zinc-600 #52525b, zinc-500 #71717a, zinc-400 #9ca3af, zinc-300 #d4d4d8, zinc-200 #e5e7eb, zinc-150 #f4f4f5, zinc-100 #f4f4f5.` , adaptables a modo claro/oscuro,y otros elementos de la interfaz.
  * Estados / Alertas: `green-700 #15803D, amber-700 #B45309, red-600 #dc2626` Colores semánticos, texto/icono sobre blanco, WCAG AA y otros elementos de estado.
  * Superficies (light): `gray-50 #F9FAFB, gray-100 #F3F4F6, gray-200 #E5E7EB, gray-300 #D4D4D8` Superficies claras, tarjetas, fondos de formularios, y otros elementos.
  * Superficies (dark): `gray-800 #1F2937, gray-700 #374151, gray-600 #4B5563, gray-500 #6B7280` Superficies oscuras, tarjetas, fondos de formularios, y otros elementos.
  * Texto sobre oscuro: `gray-50 #F9FAFB, gray-100 #F3F4F6, gray-200 #E5E7EB, gray-300 #D4D4D8` Texto sobre oscuro, y otros elementos.
  * Texto sobre blanco: `gray-900 #111827, gray-600 #4B5563, gray-500 #6B7280, gray-400 #9CA3AF` Texto sobre blanco, y otros elementos.
  * Prohibido el uso de tonos azules.

### Fuentes y referencias

* **GitHub** — [`/UI24`](https://github.com/AngieVik/UI24) ·
  arquitectura, reglas, núcleos de negocio, mapeo visual UI, componentes, hooks y manejo de errores. Lectura obligatoria para construir nada ambicioso encima de este sistema.
* **Maskable icons** — recibidos directamente del usuario, copiados bajo `05_interfaz_y_desarrollo\Public\Icons` junto con el json de configuración.
* **Logo U24** — `copiado bajo 05_interfaz_y_desarrollo\Public\Logo.svg`
* **Ilustración corporativa** — `05_interfaz_y_desarrollo\Public\Ilustración_corporativa.png`.
* **Paleta de colores:** Inspirada en la identidad visual de U24 Servicios Sanitarios, con un enfoque en tonos neutros para la base y colores vivos para alertas y estados críticos.
* **Iconografía:**  Se utilizarán exclusivamente los iconos de `lucide.dev` para mantener una estética coherente y profesional. Stroke width 2px, sin rellenos (outline), y con un tamaño base de 24px para la mayoría de los casos.
                    Queda prohibido el uso de iconos de otras fuentes o la creación de iconos personalizados sin aprobación previa. Peso uniforme. Sin emojis ni unicode como sustituto.
                    `https://github.com/lucide-icons/lucide/tree/22cfe96931bd9253ae26105d2b779210f2765b60/packages/lucide-react`

### Sistema de espaciado y diseño adaptativo (Layout)

El espacio es un recurso crítico en pantallas móviles montadas en ambulancias.

* **Regla minimalista:** Minimizar los espaciados (`gap`), márgenes y paddings. Preferible una fila compacta con `text-xs p-1` a una columna con botones desproporcionados.
* **Granularidad de breakpoints:** Base (<640px), sm (640px+), md (768px+), lg (1024px+), xl (1280px+), 2xl (1536px+).
* **Adaptabilidad algorítmica (Fluid design):** Fomentar propiedades matemáticas fluidas como `clamp()` en Tailwind para anchos y tipografías. El estilo base será uniforme de móvil a monitor.
* **Cambio estructural justificado:** Prohibidos los rediseños estéticos en distintos breakpoints. El layout solo mutará por limitación física (ej. transformar una tabla masiva en *Cards* en móvil).

## Arquitectura de datos y sincronización offline-first

Las ambulancias operan en zonas de baja cobertura (zonas rurales, sótanos). La aplicación debe ser resiliente a cortes de red.

* **Cola de mutaciones offline:** Las mutaciones críticas (React Query/Supabase) deben respaldarse mediante una cola asíncrona local apoyada en `IndexedDB`.
* **Idempotencia obligatoria:** Todos los registros creados sin conexión (incluyendo formularios dinámicos y hojas append-only como `Doc-1`) deben utilizar UUIDs generados nativamente en el frontend de forma determinista antes de tocar la cola para evitar registros duplicados o colisiones relacionales durante procesos de reintento de red.
* **Caché paginado y límite de memoria:** Debido a los límites de `IndexedDB` en móviles, la sincronización de inventarios masivos debe ser paginada o parcial. No cargar la base de datos completa en el dispositivo.
* **Persistencia crítica de estado (Zustand — IndexedDB Obligatorio):** Los estados de sesión vitales de turno (`estadoOperativo`, `condicionTecnica`, `tipoServicio`, `checkin_on`, `pilot`, `carry`, `drp_activo`, `turno_iniciado`) DEBEN utilizar el middleware `persist` acoplado a un adaptador de **almacenamiento asíncrono sobre `IndexedDB`** (ej. mediante `idb-keyval`). Queda **estrictamente prohibido** usar `localStorage` para persistir estos stores debido a que su naturaleza síncrona bloquea el Main Thread (Jank) bajo ráfagas de actualización Realtime. `localStorage` queda restringido a configuraciones ligeras o flags booleanos primitivos.
* **Procesamiento de imágenes offline:** Cualquier fotografía adjunta a formularios offline (ej. Doc-7) debe someterse a una compresión síncrona obligatoria en el hilo de UI mediante la Canvas API (reducir dimensiones a un máximo de 1200px y codificar en formato WebP con calidad 0.70) antes de ser persistida en IndexedDB como un objeto `Blob` binario plano. Queda prohibida la persistencia en formato Base64 para evitar la saturación de la cuota de almacenamiento del navegador y la inyección de excepciones `QuotaExceededError`.

## Seguridad, RBAC y modelo de base de datos

El frontend es un entorno intrínsecamente inseguro. La seguridad y el control de inventario deben recaer en el motor de la base de datos.

* **Row Level Security (RLS) obligatorio:** Ocultar componentes en el DOM basándose en roles es solo cosmético. Toda tabla en Supabase (PostgreSQL) DEBE implementar políticas RLS estrictas.
* **Arquitectura RBAC + Claims (JWT Claims):** Las políticas RLS validan claims booleanos específicos en el JWT (ej. `(auth.jwt() -> 'app_claims' ->> 'can_edit_inventory')::boolean = true`). Los claims se inyectan al generar el JWT mediante un hook de autenticación de Supabase, desacoplándolos del modelo de roles estáticos.
* **Lógica de negocio atómica en DB (Inventario):** Queda terminantemente prohibido realizar sustracciones o cálculos matemáticos de inventario desde peticiones asíncronas del cliente para evitar Condiciones de Carrera (Race Conditions). Estas operaciones se ejecutarán atómicamente a nivel de base de datos usando Funciones RPC y Triggers en PostgreSQL.
* **Normalización relacional (3NF):** La base de datos debe reflejar entidades puras del negocio. Queda prohibido replicar interfaces de usuario como entidades o tablas independientes.
* **Sesiones de emergencia (Plan B):** La revocación de tokens temporales de emergencia debe aislarse en una tabla `sesiones_emergencia` con marca de tiempo. Supabase Edge Functions ejecutará un cronjob que purgará estas sesiones automáticamente sin depender de las acciones del usuario.
* **Políticas RLS de prohibición incondicional:** Para tablas con inmutabilidad de negocio (ej. doc1_asistencias) y para cualquier entidad en estado terminal (ej. DRPs, sus recursos y asistencias vinculadas donde estado = 'Finalizado'), las políticas RLS de UPDATE e INSERT deben devolver USING (FALSE) de forma estricta e incondicional — independientemente de los claims del JWT o del rol del usuario.

## Rendimiento y tráfico de red (Budget)

* **Payloads minimizados (Reducción de carga):** Las consultas hacia Supabase usarán selectores estrictos (ej. `select('id, nombre, stock')`). Está expresamente prohibido el uso de `select('*')` en vistas de listas o inventarios masivos para no colapsar ni encarecer el consumo de las tarifas de datos móviles de las tablets en ruta.
* **Sincronía de tipado (Single Source of Truth):** Se exige el uso de `supabase-cli` para autogenerar las interfaces de TypeScript directamente desde el esquema de PostgreSQL. Esto asegurará que los validadores de `Zod` en el cliente tengan una paridad exacta con la base de datos.
* **Generador de tipos en pre-commit:** El comando `supabase gen types typescript` se integra como hook de pre-commit. Un commit con tipos desincronizados del esquema PostgreSQL falla automáticamente antes de llegar al repositorio.
* **CI/CD — GitHub Actions:** El pipeline de integración continua corre en GitHub Actions. Los gates de bundle size (3 MB total, 800 KB entry chunk) son steps bloqueantes en el workflow de build. Un build que supere estos límites impide el merge a `main`.
* **Prohibición de Criptografía Pesada en Frontend:** Queda prohibido el empaquetado o ejecución de la librería `bcrypt.js` en el Main Thread del cliente. Toda validación de credenciales en modo degradado offline debe realizarse utilizando algoritmos nativos de derivación de claves (`PBKDF2` / `SHA-256`) provistos de forma asíncrona por la **Web Crypto API** (`window.crypto.subtle`), garantizando que el chunk inicial del bundle no sea penalizado y el hilo principal nunca sufra congelamientos.
* **Presupuesto de bundle — Límite global:** Vite se configurará con un límite estricto de peso. Si el build de producción supera los 3 MB totales, el pipeline de CI/CD abortará la compilación automáticamente.
* **First Contentful Paint — Chunk inicial ≤ 800 KB:** El chunk de entrada (entry chunk) que determina el FCP no puede superar los 800 KB en producción (gzip incluido). Vite debe configurarse con `build.chunkSizeWarningLimit: 800` y un paso de verificación en CI que falle si se supera.
* **pdfMake — Carga diferida obligatoria:** `pdfMake` y sus fuentes (`vfs_fonts`) se cargarán **exclusivamente mediante importación dinámica** (`import()`) en React 19 lazy/Suspense. Queda terminantemente prohibido importarlos en el bundle principal. El import dinámico se ejecutará solo cuando el usuario dispare una acción de exportar o archivar un documento.

## Stack tecnológico obligatorio

* **React 19** (con soporte estricto para React Server Components en futuras fases, aunque inicialmente solo se usarán Client Components).
* **Vite** (compilador y bundler, configurado con límites estrictos de bundle size).
* **Zustand** (gestión de estado global, con middleware `persist` acoplado a IndexedDB mediante `idb-keyval`).
* **TanStack Query** (gestión de datos asíncrona, caché y sincronización con Supabase).
* **Tailwind v4** (estilado utilitario, con configuración personalizada para tipografía, colores y breakpoints).
* **shadcn/ui** (Única librería de componentes permitida)
* **Supabase** (PostgreSQL + Edge Functions + Auth + Storage)
* **pdfMake** (generación de PDFs en cliente — carga diferida obligatoria)
* **idb-keyval** (adaptador IndexedDB para el middleware `persist` de Zustand — obligatorio tras ADR-001)
* **Vercel** (hosting y despliegue)

## 8. Stack de testing y calidad

* **Vitest:** Unit tests e integración para lógica de negocio (stores Zustand, lógica de transformación, validadores Zod).
* **React Testing Library:** Tests de componentes con interacciones de usuario simuladas. No se prueba la implementación interna, solo el comportamiento observable desde el DOM.
* **Playwright — Smoke suite:** Verificar que las rutas principales renderizan sin error. Interacciones core: formulario de login completo y cierre de sesión exitoso.
* **Playwright — Offline queue suite:** Interceptar red con `page.route('**', route => route.abort())`, ejecutar una mutación crítica (ej. Doc-7), verificar que la mutación entra en la cola de IndexedDB, reconectar con `page.unroute('**')` y verificar que el retry se dispara y el servidor confirma la operación.
* **Gate de calidad en CI:** El pipeline falla si cualquier test falla. La cobertura se reporta pero no es gate de bloqueo en Fase 0.

## 9. Observabilidad mínima

* **Sentry (cliente):** Captura de errores JavaScript en el frontend. Inicialización diferida para no penalizar el FCP. Variable de entorno: `VITE_SENTRY_DSN` (placeholder — pendiente de provisionar proyecto Sentry).
* **Logflare (Supabase logs):** Log drain nativo de Supabase hacia Logflare. Captura errores de RLS (policy violations), errores en funciones RPC y query timeouts. Variable de entorno: `SUPABASE_LOG_DRAIN_URL` (placeholder — pendiente de habilitar en Supabase dashboard).
* **Variables de entorno requeridas** (en `.env.local`, nunca versionar valores reales):
  * `VITE_SENTRY_DSN` — pendiente de provisionar.
  * `SUPABASE_LOG_DRAIN_URL` — pendiente de habilitar en Supabase dashboard.

## 10. Service Worker

* **Estrategia de actualización:** `skipWaiting()` + `clients.claim()` en el evento `activate`. La nueva versión del SW toma control inmediatamente sin esperar a que el usuario cierre la pestaña.
* **Assets precacheados:** App shell (`index.html`), webfonts Barlow y Barlow Condensed (Google Fonts CDN), chunks críticos de JS/CSS (entry chunk + vendor chunk), iconos de la PWA (manifest icons).
* **Exposición de versión del build:** en dos puntos simultáneamente para que el SW pueda comparar su versión con la del documento activo:
  * `<meta name="app-version" content="x.y.z">` inyectado en el `<head>` del HTML en build time.
  * `window.__APP_VERSION__` como constante global inyectada por Vite (`define` en `vite.config.ts`).
* **Lifecycle:** Install → precache assets → Activate (`skipWaiting` + `clients.claim`) → Fetch (cache-first para assets precacheados, network-first para llamadas a Supabase API).
