# Hoja de Ruta de Desarrollo Granular — Proyecto U24

## SPRINT 1: Infraestructura de Datos Base (Supabase)

*Objetivo: Tener la base de datos levantada con las tablas y catálogos, sin lógica compleja.*

- [ ] **1.1 Inicialización:** `supabase init` y configuración del proyecto local.
- [ ] **1.2 Types y Enums:** Migración con los enums (`entidad_imputable`, `tipo_movimiento_inventario`, etc.).
- [ ] **1.3 Tablas Core:** Crear migraciones para las tablas de Identidad, Vehículos e Inventario (sin RLS aún).
- [ ] **1.4 Tablas DRP y Clínicas:** Crear migraciones para DRPs, Doc-X, PSA y Filiación.
- [ ] **1.5 Data Seeding (Semillas):** Población inicial (`01_catalogo.sql`, `02_plantillas.sql`, `03_vehiculos.sql`).

## SPRINT 2: Seguridad de Datos (Supabase RLS)

*Objetivo: Blindar el acceso a los datos.*

- [ ] **2.1 RLS de Tablas Core:** Migración para aplicar las políticas de Row Level Security a Identidad y Vehículos.
- [ ] **2.2 RLS de Tablas Clínicas:** Políticas RLS para Doc-X asegurando el `auth_uid_redactor`.
- [ ] **2.3 RLS Inmutables:** Políticas `USING (FALSE)` para tablas de auditoría (`auditoria_rbac`, `auditoria_inventario`, `doc1_asistencias`).
- [ ] **2.4 Restricciones Clave:** Añadir las constraints de unicidad (ej. `mutation_uuid` para idempotencia).

## SPRINT 3: Lógica de Servidor (RPCs y Triggers)

*Objetivo: Implementar las reglas de negocio atómicas en el backend.*

- [ ] **3.1 RPCs de Autenticación/Galletas:** `rpc_revocar_y_reemitir_galleta`, `rpc_generar_token_emergencia`.
- [ ] **3.2 RPCs de Vehículos y Flota:** `rpc_alta_vehiculo`, baja de vehículo (con *guard* de DRP activo).
- [ ] **3.3 RPCs de DRP:** `cancelar_drp` (con transacción completa y *FOR UPDATE*).
- [ ] **3.4 Triggers y Validaciones:** Trigger del odómetro (validación de `km_inicio`) y trigger de `checklist360 -> doc7`.

## SPRINT 4: Funciones Edge y Tareas Programadas

*Objetivo: Procesos asíncronos y de mantenimiento.*

- [ ] **4.1 Gestión de Empleados (Auth):** `ef_alta_empleado` y `ef_baja_empleado` (gestión de `auth.users`).
- [ ] **4.2 Cron: Limpieza:** `ef-cron-cleanup-orphans` y expiración de sesiones temporales.
- [ ] **4.3 Cron: RGPD y Métricas:** `ef-cron-rgpd` y `ef-cron-refresh-dashboard`.
- [ ] **4.4 Generación de Tipos:** `supabase start` y volcado de `supabase.ts` para el frontend.

## SPRINT 5: Scaffolding y Arquitectura Frontend

*Objetivo: Estructura del proyecto Vite y estilos base.*

- [ ] **5.1 Setup Base:** Inicialización Vite + React + TS.
- [ ] **5.2 Estructura de Carpetas:** Crear árbol de carpetas (`components`, `hooks`, `lib`, `modules`, `stores`, `types`).
- [ ] **5.3 Tailwind y Diseño:** Configurar paleta WCAG AA en `tailwind.config.js` y clases tipográficas.
- [ ] **5.4 Cliente Supabase:** Configurar `src/lib/supabase.ts` (Singleton).

## SPRINT 6: El Motor Offline (Zustand + IndexedDB)

*Objetivo: La capa de persistencia local.*

- [ ] **6.1 Setup IndexedDB:** Instalación de `idb-keyval` y middleware de Zustand.
- [ ] **6.2 Cacheo de Tablas Lentas:** `useInventarioStore` y `useBandejasStore`.
- [ ] **6.3 Auth Local (`useAuthStore`):** Gestión de sesión, JWT activo y *Silent Refresh*.
- [ ] **6.4 La Cola (`useOfflineQueue`):** Implementar la lógica de *enqueue*, *dequeue* y *re-try* en base al patrón de idempotencia.

## SPRINT 7: Core UI y Componentes Base

*Objetivo: Bloques de construcción visuales de la aplicación.*

- [ ] **7.1 Componentes de Error:** Toasts, `ModalError` y la función `resolveRpcError()`.
- [ ] **7.2 Loading States:** Componente `<LoadingSkeleton />`.
- [ ] **7.3 Layout Principal:** App Shell con `<BlackColumn />`.
- [ ] **7.4 Sistema de Alertas Globales:** `<Marquesina />` y `<BannerOffline />`.

## SPRINT 8: Módulo de Acceso (Terminal)

*Objetivo: Pantalla de Login y asignación inicial.*

- [ ] **8.1 Interfaz de Login:** Flujo normal (PIN/Contraseña) y flujo de emergencia.
- [ ] **8.2 Validación de Galleta:** Comprobación del fingerprint del terminal contra la BD.
- [ ] **8.3 Estado de Espera:** Pantalla `estado_1` (esperando asignación de vehículo/rol).

## SPRINT 9: Módulo de Flota (Doc-8)

*Objetivo: Puesta en marcha del vehículo.*

- [ ] **9.1 Check-in de Vehículo:** Selección de matrícula y validación del estado operativo.
- [ ] **9.2 Checklist Inicial:** Formulario de `km_inicio` y firma de apertura del Doc-8.
- [ ] **9.3 Reporte de Averías:** Formulario Doc-7 con gestión de imágenes offline (Blob).

## SPRINT 10: Módulos Operativos (Clínico y Logística)

*Objetivo: Vistas de la operativa diaria.*

- [ ] **10.1 Gestión de Inventario:** Gasto de material (Doc-6) con UI optimista.
- [ ] **10.2 Listas de Pacientes (Filiación/PSA):** Integración con Supabase Realtime para actualizar la sala de espera.
- [ ] **10.3 Informes Clínicos:** Formularios Doc-2/Doc-3 integrados con la cola offline.

## SPRINT 11: Módulo DRP y Coordinación

*Objetivo: El panel de control de emergencias masivas.*

- [ ] **11.1 Creación/Gestión DRP:** Panel de coordinación para crear, asignar recursos y cancelar.
- [ ] **11.2 Visor GPS:** `visor_seguimiento_operativo` con la lógica de *pings*.

## SPRINT 12: PWA, Ops y Salida a Producción

*Objetivo: Convertir la app web en una PWA offline.*

- [ ] **12.1 Service Worker:** Configuración de `vite-plugin-pwa` (Cache First para el App Shell).
- [ ] **12.2 Configuración Push API:** Suscripción a notificaciones críticas (Alertas Doc-11).
- [ ] **12.3 Hardening del Bundle:** Split de *chunks* (<800KB) e instalación de Sentry.
- [ ] **12.4 Testing Final:** Ejecutar los *Runbooks* y pruebas de estrés de la cola offline.
