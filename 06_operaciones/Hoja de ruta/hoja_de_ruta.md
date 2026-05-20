# Hoja de Ruta de Desarrollo Granular — Proyecto U24

# Sprint 1: Infraestructura de Datos Base

Objetivo: Preparar el repositorio local para que el esquema de Supabase sea determinista y profesional.
Instrucciones paso a paso:

1. Inicialización: Ejecuta supabase init. Asegúrate de que el .gitignore ignora correctamente la carpeta .supabase y los archivos de entorno local.
2. Estructura de migraciones: Crea la migración supabase/migrations/20260519000001_init_schema.sql.

* **Orden de ejecución (Crítico):**
  Primero: Crear todos los tipos ENUM (ej. entidad_imputable, tipo_movimiento_inventario).
  Segundo: Crear las tablas de dominio (Identidad, Vehículos, Inventario, DRP, Clínico).
  Tercero: Definir los índices parciales (ej. UNIQUE(id_terminal) WHERE revocado_at IS NULL).

**Seeds (Semillas):** Crea los archivos en supabase/seeds/ para 01_catalogo.sql, 02_plantillas.sql, 03_vehiculos.sql y 04_admin_users.sql.
**Validación:** Ejecuta supabase db reset. Si el comando termina sin errores y la base de datos queda poblada con los 244 ítems del catálogo, el Sprint 1 está completado correctamente.
**Nota de seguridad:** No olvides configurar la migración de la zona horaria (ALTER DATABASE postgres SET timezone TO 'Europe/Madrid';) al principio de la migración principal para cumplir con el ADR-005.
**[ ] Validación de Tipos TS:** Ejecuta el generador de tipos de Supabase (supabase gen types typescript --local > src/types/supabase.ts) y verifica que los ENUM definidos en SQL aparecen correctamente como tipos en el archivo generado. Si aparecen, tu base de datos y tu frontend ya hablan el mismo lenguaje.

## Sprint 1 completado ✓

### Lo que se creó

**Infraestructura Supabase:**

* `.gitignore` — ignora `.supabase/`, `supabase/.temp/`, `.env*`
* `supabase/config.toml` — generado por `supabase init`

**Migración** [`supabase/migrations/20260519000001_init_schema.sql`](supabase/migrations/20260519000001_init_schema.sql) — 1010 líneas:

* `ALTER DATABASE postgres SET timezone TO 'Europe/Madrid'` (ADR-005)

  * **Paso 1:** 27 tipos ENUM completos (todos los dominios)
  * **Paso 2:** 50 tablas (todos los dominios del ER)
  * **Paso 3:** Índices parciales críticos — `uq_galleta_terminal_activa`, `uq_vehiculo_drp_activo`, `uq_filiacion_evento_idempotente`, `uq_descuadre_pendiente`, `uq_descuadre_mutation_uuid` + índices de rendimiento
  * **Paso 4:** RLS habilitado en las 50 tablas + 24 políticas para tablas append-only e inmutables

**Seeds:**

* [`01_catalogo.sql`](supabase/seeds/01_catalogo.sql) — 244 ítems, IDs 1–244 exactos
* [`02_plantillas.sql`](supabase/seeds/02_plantillas.sql) — 6 plantillas + todas las líneas (A1A2, B, C, VIR, Quad, Backpack)
* [`03_vehiculos.sql`](supabase/seeds/03_vehiculos.sql) — 5 vehículos demo + locations
* [`04_admin_users.sql`](supabase/seeds/04_admin_users.sql) — 6 usuarios demo (contraseña via `$SEED_ADMIN_PASSWORD`) + 9 claves `system_config` + 8 mochilas BKP

**Correcciones aplicadas durante la implementación:**

* `estado_parte` eliminó `'Enviado_Cerrado_Administrativo'` (decisión Fase 2 — solo `cerrado_por_admin_id`)
* `locations.location_id` cambiado a `TEXT` (soporta UUIDs + matrículas, necesario para `rpc_alta_vehiculo`)

**Nota sobre validación:** `supabase db reset` requiere **Docker Desktop** que no está instalado. Para completar la validación final y generar los tipos TypeScript:

1. Instala [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)
2. Ejecuta: `npx supabase db reset`
3. Luego: `npx supabase gen types typescript --local > src/types/supabase.ts`

**🎉 Sprint 1 completado al 100%**
Todo lo que se ejecutó correctamente:
  ✅ Migración aplicada (20260519000001_init_schema.sql)
  ✅ 4 archivos de seeds cargados (244 ítems catálogo + plantillas + vehículos + usuarios)
  ✅ src/types/supabase.ts generado

## SPRINT 2: Seguridad de Datos (Supabase RLS)

*Objetivo: Blindar el acceso a los datos.*

* [ ] **2.1 RLS de Tablas Core:** Migración para aplicar las políticas de Row Level Security a Identidad y Vehículos.
* [ ] **2.2 RLS de Tablas Clínicas:** Políticas RLS para Doc-X asegurando el `auth_uid_redactor`.
* [ ] **2.3 RLS Inmutables:** Políticas `USING (FALSE)` para tablas de auditoría (`auditoria_rbac`, `auditoria_inventario`, `doc1_asistencias`).
* [ ] **2.4 Restricciones Clave:** Añadir las constraints de unicidad (ej. `mutation_uuid` para idempotencia).

## SPRINT 3: Lógica de Servidor (RPCs y Triggers)

*Objetivo: Implementar las reglas de negocio atómicas en el backend.*

* [ ] **3.1 RPCs de Autenticación/Galletas:** `rpc_revocar_y_reemitir_galleta`, `rpc_generar_token_emergencia`.
* [ ] **3.2 RPCs de Vehículos y Flota:** `rpc_alta_vehiculo`, baja de vehículo (con *guard* de DRP activo).
* [ ] **3.3 RPCs de DRP:** `cancelar_drp` (con transacción completa y *FOR UPDATE*).
* [ ] **3.4 Triggers y Validaciones:** Trigger del odómetro (validación de `km_inicio`) y trigger de `checklist360 -> doc7`.

## SPRINT 4: Funciones Edge y Tareas Programadas

*Objetivo: Procesos asíncronos y de mantenimiento.*

* [ ] **4.1 Gestión de Empleados (Auth):** `ef_alta_empleado` y `ef_baja_empleado` (gestión de `auth.users`).
* [ ] **4.2 Cron: Limpieza:** `ef-cron-cleanup-orphans` y expiración de sesiones temporales.
* [ ] **4.3 Cron: RGPD y Métricas:** `ef-cron-rgpd` y `ef-cron-refresh-dashboard`.
* [ ] **4.4 Generación de Tipos:** `supabase start` y volcado de `supabase.ts` para el frontend.

## SPRINT 5: Scaffolding y Arquitectura Frontend

*Objetivo: Estructura del proyecto Vite y estilos base.*

* [ ] **5.1 Setup Base:** Inicialización Vite + React + TS.
* [ ] **5.2 Estructura de Carpetas:** Crear árbol de carpetas (`components`, `hooks`, `lib`, `modules`, `stores`, `types`).
* [ ] **5.3 Tailwind y Diseño:** Configurar paleta WCAG AA en `tailwind.config.js` y clases tipográficas.
* [ ] **5.4 Cliente Supabase:** Configurar `src/lib/supabase.ts` (Singleton).

## SPRINT 6: El Motor Offline (Zustand + IndexedDB)

*Objetivo: La capa de persistencia local.*

* [ ] **6.1 Setup IndexedDB:** Instalación de `idb-keyval` y middleware de Zustand.
* [ ] **6.2 Cacheo de Tablas Lentas:** `useInventarioStore` y `useBandejasStore`.
* [ ] **6.3 Auth Local (`useAuthStore`):** Gestión de sesión, JWT activo y *Silent Refresh*.
* [ ] **6.4 La Cola (`useOfflineQueue`):** Implementar la lógica de *enqueue*, *dequeue* y *re-try* en base al patrón de idempotencia.

## SPRINT 7: Core UI y Componentes Base

*Objetivo: Bloques de construcción visuales de la aplicación.*

* [ ] **7.1 Componentes de Error:** Toasts, `ModalError` y la función `resolveRpcError()`.
* [ ] **7.2 Loading States:** Componente `<LoadingSkeleton />`.
* [ ] **7.3 Layout Principal:** App Shell con `<BlackColumn />`.
* [ ] **7.4 Sistema de Alertas Globales:** `<Marquesina />` y `<BannerOffline />`.

## SPRINT 8: Módulo de Acceso (Terminal)

*Objetivo: Pantalla de Login y asignación inicial.*

* [ ] **8.1 Interfaz de Login:** Flujo normal (PIN/Contraseña) y flujo de emergencia.
* [ ] **8.2 Validación de Galleta:** Comprobación del fingerprint del terminal contra la BD.
* [ ] **8.3 Estado de Espera:** Pantalla `estado_1` (esperando asignación de vehículo/rol).

## SPRINT 9: Módulo de Flota (Doc-8)

*Objetivo: Puesta en marcha del vehículo.*

* [ ] **9.1 Check-in de Vehículo:** Selección de matrícula y validación del estado operativo.
* [ ] **9.2 Checklist Inicial:** Formulario de `km_inicio` y firma de apertura del Doc-8.
* [ ] **9.3 Reporte de Averías:** Formulario Doc-7 con gestión de imágenes offline (Blob).

## SPRINT 10: Módulos Operativos (Clínico y Logística)

*Objetivo: Vistas de la operativa diaria.*

* [ ] **10.1 Gestión de Inventario:** Gasto de material (Doc-6) con UI optimista.
* [ ] **10.2 Listas de Pacientes (Filiación/PSA):** Integración con Supabase Realtime para actualizar la sala de espera.
* [ ] **10.3 Informes Clínicos:** Formularios Doc-2/Doc-3 integrados con la cola offline.

## SPRINT 11: Módulo DRP y Coordinación

*Objetivo: El panel de control de emergencias masivas.*

* [ ] **11.1 Creación/Gestión DRP:** Panel de coordinación para crear, asignar recursos y cancelar.
* [ ] **11.2 Visor GPS:** `visor_seguimiento_operativo` con la lógica de *pings*.

## SPRINT 12: PWA, Ops y Salida a Producción

*Objetivo: Convertir la app web en una PWA offline.*

* [ ] **12.1 Service Worker:** Configuración de `vite-plugin-pwa` (Cache First para el App Shell).
* [ ] **12.2 Configuración Push API:** Suscripción a notificaciones críticas (Alertas Doc-11).
* [ ] **12.3 Hardening del Bundle:** Split de *chunks* (<800KB) e instalación de Sentry.
* [ ] **12.4 Testing Final:** Ejecutar los *Runbooks* y pruebas de estrés de la cola offline.
