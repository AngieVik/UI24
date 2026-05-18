# REGLAS ARQUITECTÓNICAS Y DE DISEÑO - PROYECTO U24 (VERSIÓN 2.0)

**Directiva Principal:** Este documento es la única fuente de verdad para la arquitectura, diseño UI/UX y seguridad estructural del proyecto U24. La complacencia está prohibida. Cualquier desviación de estas reglas resultará en el rechazo inmediato del Pull Request.

## 1. SISTEMA TIPOGRÁFICO ESTRICTO

El tono de la aplicación es médico, profesional y de misión crítica. Se prohíben las jerarquías visuales desordenadas o tamaños arbitrarios.

* **Familia única:** Barlow (Google Fonts). Dos cortes de la misma familia, prohibido cualquier otra fuente.
  * `Barlow Condensed`: UI de mando — navegación, etiquetas, matrículas, nombres de paciente, badges, ticker, alertas, black_column y cualquier elemento de control operativo.
  * `Barlow` (regular): cuerpos de formulario, descripciones largas y bloques de texto de más de 2 líneas.

* **Pesos permitidos (Weights):**
  * `300` (Fino): Para metadatos, horas, fechas y descripciones secundarias.
  * `500` (Mediano): Para cuerpos de texto, formularios y datos de entrada del usuario.
  * `700` (Negrita): Para etiquetas de datos, nombres de pacientes, matrículas y navegación.
  * `900` (Grueso/Black): EXCLUSIVAMENTE para alertas críticas (Doc-11), roturas de stock o estados de emergencia.

* **Capitalización:** Uso estricto de *Sentence case* (Primera letra mayúscula, resto minúscula). MAYÚSCULAS SOSTENIDAS restringidas a acrónimos (DRP, PSA, ITV) y botones de acción primaria destructiva (EJ: ELIMINAR REGISTRO).

* **Configuración Tailwind v4:**

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;500;700;900&family=Barlow:wght@300;500;700&display=swap');

@theme {
  --font-sans: 'Barlow Condensed', sans-serif;
  --font-body: 'Barlow', sans-serif;
}
```

## 2. SISTEMA DE ESPACIADO Y DISEÑO ADAPTATIVO (LAYOUT)

El espacio es un recurso crítico en pantallas móviles montadas en ambulancias.

* **Regla Minimalista:** Minimizar los espaciados (`gap`), márgenes y paddings. Preferible una fila compacta con `text-xs p-1` a una columna con botones desproporcionados.
* **Granularidad de Breakpoints:**
  1. `base` (< 640px): Terminales móviles y pantallas de flota antiguas.
  2. `sm` (640px+): Tablets pequeñas en posición vertical (Portrait).
  3. `md` (768px+): Tablets estándar en posición horizontal (Landscape).
  4. `lg` (1024px+): Pantallas de portátiles (Puestos de Coordinación/RRHH).
  5. `xl` y `2xl` (1280px+): Monitores de Base y Centros de Control.
* **Adaptabilidad Algorítmica (Fluid Design):** Fomentar propiedades matemáticas fluidas como `clamp()` en Tailwind para anchos y tipografías. El estilo base será uniforme de móvil a monitor.
* **Cambio Estructural Justificado:** Prohibidos los rediseños estéticos en distintos breakpoints. El layout solo mutará por limitación física (ej. transformar una tabla masiva en *Cards* en móvil).

## 3. ARQUITECTURA DE DATOS Y SINCRONIZACIÓN OFFLINE-FIRST

Las ambulancias operan en zonas de baja cobertura (zonas rurales, sótanos). La aplicación debe ser resiliente a cortes de red.

* **Cola de Mutaciones Offline:** Las mutaciones críticas (React Query/Supabase) deben respaldarse mediante una cola asíncrona local apoyada en `IndexedDB` (recomendado Workbox-Background-Sync, PouchDB o RxDB).
* **Generación Determinista de IDs:** Todos los registros creados sin conexión (como formularios Doc-2) deben utilizar UUIDs generados nativamente en el frontend para evitar colisiones relacionales al recuperar la conectividad con el backend.
* **Caché Paginado y Límite de Memoria:** Debido a los límites de `IndexedDB` en móviles, la sincronización de inventarios masivos debe ser paginada o parcial. No cargar la base de datos completa en el dispositivo.
* **Persistencia Crítica de Estado (Zustand — localStorage obligatorio):** Los estados de sesión vitales (`estadoOperativo`, `condicionTecnica`, `tipoServicio`, `checkin_on`, `pilot`, `carry`, `drp_activo`, `turno_iniciado`) DEBEN utilizar el middleware `persist` apuntando **exclusivamente a `localStorage`**. Queda prohibido usar `sessionStorage` para cualquier estado operativo de turno. Los terminales son dispositivos compartidos de flota; `sessionStorage` es por-pestaña y no garantiza coherencia entre sesiones del mismo navegador. Único uso válido de `sessionStorage`: el JWT crudo de autenticación (`useAuthStore`).

## 4. SEGURIDAD, RBAC Y MODELO DE BASE DE DATOS

El frontend es un entorno intrínsecamente inseguro. La seguridad y el control de inventario deben recaer en el motor de la base de datos.

* **Row Level Security (RLS) Obligatorio):** Ocultar componentes en el DOM basándose en roles es solo cosmético. Toda tabla en Supabase (PostgreSQL) DEBE implementar políticas RLS estrictas.
* **Arquitectura RBAC + Claims (JWT Claims):** Las políticas RLS **no validan el campo `role` directamente**. Validan claims booleanos específicos en el JWT (ej. `(auth.jwt() -> 'app_claims' ->> 'can_edit_inventory')::boolean = true`). Los claims se inyectan al generar el JWT mediante un hook de autenticación de Supabase. Esto desacopla los permisos del modelo de roles: añadir un permiso a un rol futuro solo requiere cambiar su claim al emitir el token, **sin tocar ninguna política SQL**. Ver `rbac_y_permisos.md` para el catálogo completo de claims.
* **Lógica de Negocio Atómica en DB (Inventario):** Queda terminantemente prohibido realizar sustracciones o cálculos matemáticos de inventario (ej. `Doc-6` de Gasto de material) desde peticiones asíncronas del cliente para evitar Condiciones de Carrera (Race Conditions). Estas operaciones se ejecutarán atómicamente a nivel de base de datos usando Funciones RPC y Triggers en PostgreSQL.
* **Normalización Relacional (3NF):** La base de datos debe reflejar entidades puras del negocio (Usuarios, Vehículos, Materiales, Historial_Transacciones). Queda prohibido replicar interfaces de usuario (como "Bandejas de entrada" o "Rutas de frontend") como entidades o tablas. Las bandejas serán vistas SQL o endpoints que filtren por estado.
* **Sesiones de Emergencia (Plan B):** La revocación de tokens temporales de emergencia debe aislarse en una tabla `sesiones_emergencia` con marca de tiempo. Supabase Edge Functions ejecutará un cronjob que purgará estas sesiones automáticamente sin depender de las acciones del usuario.

## 5. RENDIMIENTO Y TRÁFICO DE RED (BUDGET)

* **Payloads Minimizados (Reducción de Carga):** Las consultas hacia Supabase usarán selectores estrictos (ej. `select('id, nombre, stock')`). Está expresamente prohibido el uso de `select('*')` en vistas de listas o inventarios masivos para no colapsar ni encarecer el consumo de las tarifas de datos 4G/3G de las tablets en ruta.
* **Sincronía de Tipado (Single Source of Truth):** Se exige el uso de `supabase-cli` para autogenerar las interfaces de TypeScript directamente desde el esquema de PostgreSQL. Esto asegurará que los validadores de `Zod` en el cliente tengan una paridad exacta con la base de datos.
* **Presupuesto de Bundle — Límite global:** Vite se configurará con un límite estricto de peso. Si el build de producción supera los 3 MB totales, el pipeline de CI/CD abortará la compilación automáticamente.
* **First Contentful Paint — Chunk inicial ≤ 800 KB:** El chunk de entrada (entry chunk) que determina el FCP no puede superar los 800 KB en producción (gzip incluido). Vite debe configurarse con `build.chunkSizeWarningLimit: 800` y un paso de verificación en CI que falle si se supera.
* **pdfMake — Carga diferida obligatoria:** `pdfMake` y sus fuentes (`vfs_fonts`) se cargarán **exclusivamente mediante importación dinámica** (`import()`) en React 19 lazy/Suspense. Queda terminantemente prohibido importarlos en el bundle principal. El import dinámico se ejecutará solo cuando el usuario dispare una acción de exportar o archivar un documento. Ejemplo canónico:
  ```typescript
  const exportarPDF = async () => {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default
    const vfsFonts = (await import('pdfmake/build/vfs_fonts')).default
    pdfMake.vfs = vfsFonts.pdfMake.vfs
    // ... generar documento
  }
  ```

## 6.STACK TECNOLÓGICO OBLIGATORIO

* **React 19**
* **Vite**
* **Zustand**
* **TanStack Query**
* **Tailwind v4**
* **Supabase**
* **pdfMake**
