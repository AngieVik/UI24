# Hoja de Ruta de Desarrollo — Proyecto U24

## FASE 1: Backend y Cimientos (Supabase CLI)

_No tocar React todavía. El frontend necesita una base de datos viva para generar los tipos de TypeScript._

- [ ] **Inicializar Supabase Local:** Instalar el CLI de Supabase y ejecutar `supabase init`.
- [ ] **Migración 0001 (Esquema y RLS):** Ejecutar `supabase migration new 0001_schema_inicial`. Volcar todo el SQL de `er_y_seeds.md`: Enums, Tablas, constraints de idempotencia (`mutation_uuid`), y políticas RLS.
- [ ] **Migración 0002 (RPCs y Triggers):** Crear migración para lógica de servidor: `cancelar_drp`, `forzar_checkout_administrativo`, `rpc_alta_vehiculo`, y el trigger de `checklist360 -> doc7`.
- [ ] **Edge Functions:** Crear las funciones `ef-alta-empleado`, `ef-baja-empleado` y los cron jobs (`ef-cron-rgpd`, `ef-cron-cleanup-orphans`, `ef-cron-refresh-dashboard`).
- [ ] **Seeds:** Poblar `supabase/seed.sql` con el usuario admin (`SEED_ADMIN_PASSWORD`), los vehículos de prueba y el catálogo de 244 ítems.
- [ ] **Arrancar y Generar Tipos:** Ejecutar `supabase start`. Generar los tipos de TypeScript (`supabase.ts`) desde el CLI para consumirlos en React.

## FASE 2: Scaffolding y Arquitectura de Carpetas (Frontend)

_Preparar el esqueleto de la PWA._

- [ ] **Vite + React + TS:** Inicializar el proyecto (`npm create vite@latest ui24 -- --template react-ts`).
- [ ] **Estructura de carpetas:**
  - `src/assets/`: Logos, iconos (maskable_icons).
  - `src/components/ui/`: Componentes base (LoadingSkeleton, Botones, Toast).
  - `src/components/layout/`: BlackColumn, Marquesina, BannerOffline.
  - `src/components/shared/`: Componentes reutilizables (SelectorDRP, FlujosTransicion).
  - `src/hooks/`: Lógica (useCambiarPassword, etc.).
  - `src/lib/`: Cliente Supabase singleton (con interceptor de JWT).
  - `src/modules/`: Vistas principales (Flota, DRP, Filiacion, Terminal).
  - `src/stores/`: Estado global con Zustand.
  - `src/types/`: `supabase.ts` y tipos propios.
  - `src/utils/`: Helpers (`resolveRpcError`).
- [ ] **Tailwind CSS:** Configurar `tailwind.config.js` inyectando la paleta de colores y validando ratios WCAG AA.

## FASE 3: El Corazón Offline (Estado y Sincronización)

_Construir el motor antes de la carrocería._

- [ ] **Setup IndexedDB:** Configurar `idb-keyval` y Zustand (persist middleware). Prohibición estricta de `localStorage` para datos de negocio (ADR-001).
- [ ] **Store de Sesión (`useAuthStore`):** Gestión del JWT, rol activo y lógica de retención del JWT congelado (`useBackgroundSyncStore`) para checkouts offline.
- [ ] **Cola de Mutaciones (`useOfflineQueue`):** Motor de sincronización. Métodos `enqueue()`, detección de reconexión, y `procesarCola()` gestionando errores 23505 (idempotencia) y fallos RLS.

## FASE 4: App Shell y UI Base

_La carcasa de la aplicación._

- [ ] **Layout Principal:** Contenedor persistente. Integrar `BlackColumn`, header con `Marquesina`, y `BannerOffline` reactivo.
- [ ] **Componentes Core:** Implementar `<LoadingSkeleton />` (solo para arranque/refetch explícito) y sistema de modales.
- [ ] **Manejo de Errores:** Implementar la utilidad de traducción de códigos nativos PostgreSQL a Toasts en español según `error_handling.md`.

## FASE 5: Módulos de Negocio (Orden de Desarrollo)

_Construir las vistas conectando con los stores y RPCs._

- [ ] **Módulo Terminal y Auth:** Pantalla de Login, validación de PIN de emergencia, Check-in y pantalla `estado_1` (espera).
- [ ] **Módulo Flota:** Selección de vehículo, flujo de activación (`km_inicio`), validación `inoperativo_critico` y apertura de Doc-8 Borrador.
- [ ] **Módulo DRP y Coordinación:** Creación de DRP, asignación de vehículos, y `visor_seguimiento_operativo` (pings GPS).
- [ ] **Módulos Clínicos (Filiación / PSA):** Sistema de boxes, lista de espera con Supabase Realtime, y Doc-1/Doc-2 encolables offline.
- [ ] **Módulo Logística:** Gestión de Doc-6 (con UI optimista) y confirmaciones de Doc-10.

## FASE 6: PWA, Ops y Compilación Final

_Preparar para salida a producción._

- [ ] **Service Worker:** Configurar `vite-plugin-pwa` para cachear el App Shell. Implementar ADR-003 (suprimir prompt de instalación según rol).
- [ ] **Observabilidad:** Integrar `@sentry/react` excluyendo los errores de red (NetworkError) esperados durante caídas de cobertura.
- [ ] **Presupuesto de Bundle:** Configurar `manualChunks` en Vite para garantizar que el peso inicial sea < 800 KB por ruta.
