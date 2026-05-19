# Infraestructura y Operaciones — Proyecto U24

> Referencia técnica para el equipo de infraestructura y operaciones. Cubre backups,
> migraciones, variables de entorno, CI/CD, estrategia de caché del Service Worker
> y observabilidad. Los runbooks de respuesta a incidentes están en `runbooks.md`.
>
> Actualizado: 2026-05-19.

---

## 1. Backups y recuperación (RPO / RTO)

### 1.1 Estrategia — Supabase Point-in-Time Recovery (PITR)

U24 delega la capa de backup a la funcionalidad nativa de Supabase PITR (disponible en
planes Pro y Enterprise). No se implementan backups manuales propios.

| Parámetro | Valor objetivo | Fuente |
|---|---|---|
| **RPO** (Recovery Point Objective) | ≤ 5 minutos | Supabase PITR escribe WAL continuo |
| **RTO** (Recovery Time Objective) | ≤ 30 minutos | Tiempo de restauración en Supabase Dashboard |
| Retención de PITR | 7 días (configurable hasta 30 días en Enterprise) | Plan contratado |
| Granularidad de restauración | Punto exacto en el tiempo (resolución 1 segundo) | WAL streaming |

### 1.2 Procedimiento de restauración

```
1. Supabase Dashboard → Project → Database → Backups → Point in Time Recovery
2. Seleccionar el timestamp objetivo (anterior al incidente)
3. Confirmar: se crea un nuevo proyecto Supabase a partir del backup
4. Verificar integridad con queries de sanidad (ver checklist de post-recuperación en RB-01)
5. Actualizar SUPABASE_URL y claves en el CI/CD al nuevo proyecto
6. Redirigir el tráfico al nuevo proyecto
```

> **No existe rollback en caliente.** La restauración PITR crea un proyecto nuevo;
> el proyecto original queda en estado previo a la restauración. Mantener ambos
> brevemente para comparar y confirmar la integridad antes de eliminar el original.

### 1.3 Backups adicionales — Exports manuales

Para migraciones de alto riesgo (schema breaking changes), antes de ejecutar:

```bash
# Export manual pre-migración
supabase db dump --linked > backups/pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

Guardar en almacenamiento externo (no en el repositorio).

---

## 2. Migraciones de esquema

### 2.1 Flujo de trabajo con Supabase CLI

```
Desarrollo local → Staging Branch → Producción
```

```bash
# 1. Crear nueva migración (nombre descriptivo, nunca "fix" genérico)
supabase migration new add_filiacion_eventos_table

# 2. Editar el archivo generado en supabase/migrations/
# → supabase/migrations/20260519_add_filiacion_eventos_table.sql

# 3. Aplicar en local para verificar
supabase db reset   # aplica todo desde cero: migrations + seeds

# 4. Push a staging branch
supabase db push --linked   # aplica solo las migraciones pendientes

# 5. Verificar en staging
# → Tests de integración, validación de RLS, seeds de staging OK

# 6. Merge de staging branch a producción
supabase branches merge staging --target production
```

### 2.2 Reglas de migración

| Regla | Motivo |
|---|---|
| Nunca modificar una migración ya aplicada en producción | Rompería el historial; crear una nueva migración correctiva en su lugar |
| Siempre idempotente (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) | Permite re-apply sin error en caso de fallo parcial |
| Schema breaking changes en dos migraciones | 1ª migración: campo nullable. 2ª migración (cuando código desplegado): NOT NULL. Nunca romper en un solo paso. |
| Backfills en migración separada | Los UPDATE masivos van en script separado, no en la migración de schema |
| Enums: no eliminar valores existentes | Solo añadir nuevos valores. Eliminar un valor de enum requiere recrear el tipo — migración de riesgo alto. |

### 2.3 Rollback de migración

Supabase no tiene rollback automático de migraciones. El rollback es una nueva migración
que revierte los cambios:

```bash
# Crear migración de rollback
supabase migration new rollback_filiacion_eventos_table
# Contenido: DROP TABLE IF EXISTS filiacion_eventos;
supabase db push --linked
```

### 2.4 Migraciones de configuración de servidor

Algunas migraciones no alteran el esquema sino la configuración de la instancia
PostgreSQL. Deben aplicarse antes que cualquier migración que dependa de ellas.

**`20260519_set_timezone_europe_madrid.sql` — Huso horario canónico (ADR-005)**

```sql
-- Declara Europe/Madrid como timezone de sesión para todas las conexiones nuevas.
-- El valor almacenado en los campos TIMESTAMPTZ sigue siendo UTC; este ajuste afecta
-- a la presentación en Supabase Studio y al comportamiento de CURRENT_DATE en RPCs.
ALTER DATABASE postgres SET timezone TO 'Europe/Madrid';
```

Esta migración tiene las siguientes propiedades:
- **Idempotente:** re-aplicar no causa error — el valor se sobreescribe con el mismo.
- **Sin impacto en datos existentes:** los `TIMESTAMPTZ` almacenados son UTC; solo cambia
  la timezone de sesión por defecto para conexiones nuevas.
- **Efecto en CI:** los tests de integración deben ejecutar `SET timezone = 'Europe/Madrid'`
  al inicio de cada sesión de test para ser consistentes con producción.

**`20260519_alter_km_fin_nullable.sql` — `km_fin` nullable en `doc8_partes_trabajo` (C-04)**

```sql
-- Permite km_fin = NULL cuando el checkout es administrativo (cerrado_por_admin_id IS NOT NULL).
-- Ver logic.md §42.3
ALTER TABLE doc8_partes_trabajo
  ALTER COLUMN km_fin DROP NOT NULL;
```

---

## 3. Variables de entorno

### 3.1 Entorno de producción

| Variable | Scope | Descripción |
|---|---|---|
| `SUPABASE_URL` | Cliente + servidor | URL del proyecto Supabase de producción |
| `SUPABASE_ANON_KEY` | Cliente (público) | Clave anónima — embebida en el bundle del cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo Edge Functions / CI | Clave de servicio — **nunca exponer al cliente** |
| `SENTRY_DSN` | Cliente + Edge Functions | DSN de Sentry para captura de errores |
| `SENTRY_ENVIRONMENT` | Build time | `'production'` / `'staging'` |

### 3.2 Entorno de staging

Ver `testing_arquitectura.md §1.3` para las variables de staging.

### 3.3 Gestión de secretos

- Las variables de cliente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) se inyectan en build time
  como variables de entorno de Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Las variables de servidor (`SUPABASE_SERVICE_ROLE_KEY`) se configuran en el panel de
  Edge Functions de Supabase — nunca en `.env` del repositorio.
- `.env.local` para desarrollo local — incluido en `.gitignore`.

---

## 4. CI/CD Pipeline

### 4.1 Flujo de despliegue

```
Push a rama → GitHub Actions → Tests → Deploy Edge Functions → Push Migrations
```

### 4.2 Configuración GitHub Actions (referencia)

```yaml
# .github/workflows/deploy.yml
name: Deploy U24

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - name: Lint + type-check
        run: npm run lint && npm run tsc --noEmit
      - name: Unit tests
        run: npm test

  deploy-edge-functions:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - name: Deploy Edge Functions
        run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  push-migrations:
    needs: deploy-edge-functions
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - name: Push DB migrations
        run: supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

  smoke-e2e:
    needs: push-migrations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Smoke E2E post-deploy
        run: npx playwright test tests/e2e/smoke.spec.ts
        env:
          STAGING_APP_URL:    ${{ secrets.STAGING_APP_URL }}
          SEED_TEST_PASSWORD: ${{ secrets.SEED_TEST_PASSWORD }}
          SEED_EMERGENCY_PIN: ${{ secrets.SEED_EMERGENCY_PIN }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

> **El job `smoke-e2e` es gate de producción.** Si falla, el pipeline se detiene y no se
> promueve el deploy a producción. Ver `testing_arquitectura.md §12` para la suite completa.

### 4.3 Secrets requeridos en GitHub

| Secret | Descripción |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Token personal de Supabase CLI (generado en app.supabase.com/account/tokens) |
| `SUPABASE_PROJECT_REF` | Referencia del proyecto de producción |
| `SUPABASE_DB_PASSWORD` | Contraseña de la base de datos de producción |
| `SENTRY_AUTH_TOKEN` | Token para source maps de Sentry (si se sube el build) |

---

## 5. Estrategia de caché del Service Worker

### 5.1 Principio fundamental (ADR-001)

**`localStorage` está prohibido para datos de negocio.** Todo el estado persistente
de la aplicación vive en **IndexedDB** gestionado por `idb-keyval` + middleware
`persist` de Zustand. El Service Worker **no cachea datos de negocio** — ese rol
pertenece exclusivamente a los stores de Zustand.

```
┌─────────────────────────────────────────────────────────┐
│                    Capas de persistencia                 │
├──────────────────────┬──────────────────────────────────┤
│ SW Cache (CacheAPI)  │ App Shell estático únicamente    │
│                      │ JS/CSS/HTML/iconos/fuentes        │
├──────────────────────┼──────────────────────────────────┤
│ IndexedDB (idb-keyval│ TODOS los datos de negocio:       │
│ + Zustand persist)   │ stores, cola offline, sesión,     │
│                      │ imágenes Blob, caché de bandejas  │
├──────────────────────┼──────────────────────────────────┤
│ sessionStorage       │ JWT activo en memoria de turno   │
│                      │ (limpiado en clearJwtAfterSync)  │
└──────────────────────┴──────────────────────────────────┘
```

### 5.2 Estrategias por tipo de recurso

| Recurso | Estrategia SW | Motivo |
|---|---|---|
| HTML del App Shell (`/index.html`) | **Cache First** con fallback a red | Permite inicio offline inmediato |
| JS / CSS (con hash en nombre) | **Cache First, inmutable** | El hash garantiza unicidad de versión |
| Fuentes e iconos | **Cache First** | Raramente cambian; ahorra ancho de banda |
| Imágenes de UI (logos, placeholders) | **Cache First** | Estáticas — no afectan a negocio |
| Peticiones a Supabase REST / RPC | **Network Only** | Los datos viven en IndexedDB via Zustand; el SW no interfiere |
| Peticiones a Edge Functions | **Network Only** | Requieren JWT fresco — no cachear |
| Imágenes de documentos (fotos de averías) | **No cachear en SW** | Viajan como Blob a IndexedDB; el SW solo registra la URL de Supabase Storage |

### 5.3 Gestión de versión del SW (precache + cache busting)

```typescript
// service-worker.ts (ejemplo con Workbox o SW nativo)
const CACHE_NAME = 'u24-shell-v1'  // incrementar en cada release

// Instalar: precachear el App Shell completo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/assets/main.[hash].js',
        '/assets/main.[hash].css',
        // ... resto del manifest de precache generado por Vite PWA plugin
      ])
    )
  )
})

// Activar: limpiar caches de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
})

// Fetch: Cache First para App Shell; Network Only para API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Peticiones a Supabase o Edge Functions → Network Only (no interceptar)
  if (url.hostname.includes('supabase.co')) return

  // App Shell → Cache First
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ?? fetch(event.request)
    )
  )
})
```

### 5.4 JWT en el Service Worker

El JWT activo del turno se almacena en `sessionStorage` del contexto de página,
**no en el SW**. El SW no tiene acceso a `sessionStorage` por diseño (contextos distintos).
La comunicación de JWT al SW (si se necesita para Background Sync) se hace por
`postMessage` — ver `logic.md §34.5` y `hooks.md §9 clearJwtAfterSync`.

---

## 6. Observabilidad

### 6.1 Frontend — Sentry

**SDK:** `@sentry/react` con integración de React Error Boundaries y Performance.

**Política de retención (C-03):**

| Tipo de dato | Retención configurada | Motivo |
|---|---|---|
| Errores (issues) | **30 días** | Plan Team/Business — configurar en Sentry → Project → Settings → Data Management |
| Session Replays | **7 días** | Reducir superficie RGPD; los replays contienen comportamiento de usuario |
| Trazas de Performance | 30 días | Misma retención que errores |

```typescript
// src/main.tsx — inicializar antes de renderizar el árbol React
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,  // 'production' | 'staging'
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,      // RGPD: enmascara TODO el texto de formularios en replays
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.1,    // 10% de transacciones para performance (ajustar en prod)
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,  // 100% de sesiones con error

  // ── Scrubbing de PII clínico — OBLIGATORIO (C-03) ──────────────────────────
  beforeSend(event) {
    // No enviar errores de red durante modo offline
    if (event.exception?.values?.[0]?.type === 'NetworkError') return null

    // Eliminar campos con PII clínica del payload antes de enviar a Sentry
    // Los campos están en `event.extra` y en los breadcrumbs del request
    const PII_FIELDS = [
      'nombre_paciente', 'apellidos_paciente', 'dni_paciente', 'telefono_paciente',
      'direccion', 'fecha_nacimiento', 'num_historia_clinica',
      // Campos de fichas_empleados que no deben salir del dominio
      'nombre_completo', 'email', 'telefono', 'dni',
    ]

    if (event.extra) {
      for (const field of PII_FIELDS) {
        if (field in event.extra) {
          event.extra[field] = '[SCRUBBED]'
        }
      }
    }

    // Nunca incluir payloads completos de Doc-2/3/4/5 (datos clínicos)
    if (event.extra?.['mutation_tipo']?.toString().startsWith('doc')) {
      delete event.extra['payload']  // payload puede contener PII clínica
    }

    return event
  },

  // Scrubbing en breadcrumbs (peticiones XHR/fetch)
  beforeBreadcrumb(breadcrumb) {
    // No registrar URLs con parámetros que puedan incluir PII
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      if (breadcrumb.data?.url?.includes('fichas_empleados')) {
        breadcrumb.data.url = '[SCRUBBED — fichas_empleados]'
      }
    }
    return breadcrumb
  },
})
```

**Captura de errores de la cola offline:**

```typescript
// En useOfflineQueue.procesarCola — rama de fallo estándar
import * as Sentry from '@sentry/react'

Sentry.withScope(scope => {
  scope.setTag('modulo', 'offline_queue')
  scope.setExtra('mutation_tipo', mutacion.tipo)
  scope.setExtra('mutation_intentos', mutacion.intentos)
  // NO incluir el payload completo — puede contener PII clínica
  Sentry.captureException(error)
})
```

**Alertas configuradas en Sentry:**

| Condición | Alerta | Canal |
|---|---|---|
| Error rate > 1% en 5 min | Email + Slack `#u24-alertas` | Crítico |
| Crash de Error Boundary | Inmediato | Email a técnico de guardia |
| Performance P95 > 4s (LCP) | Email semanal | Review |

### 6.2 Edge Functions — Logflare

Supabase integra Logflare nativamente para Edge Functions. No requiere SDK adicional.

**Configuración en Supabase Dashboard → Logs:**

- Retención: **30 días** (requiere plan Pro o superior — configurar en Dashboard → Logs → Retention). Plan Free retiene 1 día. (C-03)
- Queries útiles en Logflare:

```sql
-- Errores en Edge Functions en las últimas 24h
SELECT timestamp, function_id, error_message
  FROM edge_logs
 WHERE level = 'error'
   AND timestamp > NOW() - INTERVAL '24 hours'
 ORDER BY timestamp DESC

-- Latencia P95 por Edge Function
SELECT function_id,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) AS p95_ms
  FROM edge_logs
 WHERE timestamp > NOW() - INTERVAL '1 hour'
 GROUP BY function_id
 ORDER BY p95_ms DESC
```

**Alertas de Edge Functions:**

| Condición | Acción |
|---|---|
| `ef_cron_rgpd` no ejecuta en 25h | Alerta manual (revisar scheduler Supabase) |
| `ef_cron_cleanup_orphans` elimina > 5 huérfanos | Investigar — indica fallo recurrente en ef_alta_empleado |
| Latencia P95 de Edge Function > 2s | Revisar logs de esa función |
| Error 500 en `ef_alta_empleado` o `ef_baja_empleado` | Alerta inmediata — puede dejar auth.users en estado inconsistente |

### 6.3 Alertas Supabase — canal predefinido

Las alertas de infraestructura de Supabase (uso de DB, Edge Function errors, Realtime)
se configuran en **Supabase Dashboard → Alerts** con entrega a:

| Canal | Tipo de alerta |
|---|---|
| Email `tecnico@u24.internal` | Todas las alertas de nivel ERROR |
| Slack `#u24-alertas` | P0/P1 — Supabase project down, Realtime caído |
| PagerDuty (si plan lo permite) | Solo P0 — outage total del proyecto |

**Umbrales de alerta en Supabase:**

| Métrica | Umbral | Severidad |
|---|---|---|
| CPU > 80% sostenido 5 min | Alerta | P1 |
| Conexiones DB > 80% del límite | Alerta | P1 |
| Almacenamiento > 80% | Warning | P2 |
| Edge Function error rate > 5% | Alerta | P1 |

---

## 7. Dashboard de métricas operativas — KPIs (U-07)

> El dashboard **nunca consulta directamente** tablas operativas en caliente
> (`vehiculos`, `inventario_vehiculo`, `fichas_empleados`, `dotaciones_drp`,
> `galletas_terminales`). Toda métrica se construye sobre tablas append-only
> inmutables que solo crecen por INSERT: `auditoria_rbac`, `descuadres_inventario`,
> `doc1_asistencias` y `drps`. Las consultas pesadas se materializan cada 15 minutos
> — nunca en tiempo real.

### 7.1 Stack recomendado

| Opción | Cuándo elegirla |
|---|---|
| **Supabase Studio → SQL Views** | Volumen bajo (< 100 K filas), consultas puntuales internas, sin necesidad de alertas automáticas |
| **Grafana + datasource PostgreSQL** | Producción con datos históricos crecientes, alertas configurables, paneles compartibles con gerencia |
| **Metabase** (alternativa) | Equipo no técnico que necesita query builder visual sin escribir SQL |

**Setup Grafana (recomendado para producción):**

```
1. Grafana Cloud (plan gratuito — 10K métricas) o self-hosted en VPS/Docker
2. Datasource: "PostgreSQL" → connection pooler de Supabase (puerto 5432, SSL required)
3. Credenciales: rol de solo lectura grafana_reader (ver §7.4)
4. Refresh de dashboards: 5 min (los datos de las vistas materializadas se actualizan cada 15 min)
```

### 7.2 Vistas materializadas — fuente de datos

Las vistas se refrescan mediante una Edge Function programada. **Nunca se consultan en
tiempo real** desde el dashboard — Grafana siempre lee las vistas materializadas.

```sql
-- supabase/migrations/20260519_create_dashboard_views.sql

-- DRPs por día (últimos 90 días)
CREATE MATERIALIZED VIEW mv_drps_por_dia AS
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Europe/Madrid') AS dia,
  estado,
  COUNT(*)                                                    AS total,
  AVG(
    EXTRACT(EPOCH FROM (timestamp_fin_drp - timestamp_inicio_curso)) / 60.0
  )::INT                                                      AS duracion_media_min
FROM drps
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON mv_drps_por_dia (dia, estado);

-- Asistencias por día (últimos 90 días)
CREATE MATERIALIZED VIEW mv_asistencias_por_dia AS
SELECT
  DATE_TRUNC('day', timestamp_creacion AT TIME ZONE 'Europe/Madrid') AS dia,
  tipo_asistencia,
  COUNT(*)                                                            AS total
FROM doc1_asistencias
WHERE timestamp_creacion >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON mv_asistencias_por_dia (dia, tipo_asistencia);

-- Descuadres de inventario por semana (últimos 90 días)
CREATE MATERIALIZED VIEW mv_descuadres_por_semana AS
SELECT
  DATE_TRUNC('week', created_at AT TIME ZONE 'Europe/Madrid') AS semana,
  entidad_imputable_tipo,
  COUNT(*)                                                     AS total_descuadres
FROM descuadres_inventario
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON mv_descuadres_por_semana (semana, entidad_imputable_tipo);

-- Eventos RBAC relevantes por semana (últimos 90 días)
CREATE MATERIALIZED VIEW mv_rbac_eventos_por_semana AS
SELECT
  DATE_TRUNC('week', created_at AT TIME ZONE 'Europe/Madrid') AS semana,
  tipo_evento,
  COUNT(*)                                                     AS total
FROM auditoria_rbac
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2;

CREATE UNIQUE INDEX ON mv_rbac_eventos_por_semana (semana, tipo_evento);

-- Función de refresco — llamada por Edge Cron cada 15 minutos
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_drps_por_dia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_asistencias_por_dia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_descuadres_por_semana;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_rbac_eventos_por_semana;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Edge Cron de refresco (cada 15 min):**

```typescript
// supabase/functions/ef-cron-refresh-dashboard/index.ts
Deno.serve(async () => {
  await supabaseAdmin.rpc('refresh_dashboard_views')
  return new Response('ok')
})
// Supabase Dashboard → Edge Functions → Schedules: "*/15 * * * *"
```

### 7.3 KPIs operativos

| KPI | Tabla fuente | Vista | Granularidad |
|---|---|---|---|
| DRPs activados (total) | `drps` | `mv_drps_por_dia` WHERE estado IN ('En_curso','Finalizado') | Diaria |
| Tasa de cancelación DRP (%) | `drps` | ratio estado='Cancelado' / total por día | Diaria |
| Duración media de DRP | `drps` | `mv_drps_por_dia.duracion_media_min` | Diaria |
| Asistencias totales | `doc1_asistencias` | `mv_asistencias_por_dia` | Diaria |
| Asistencias por tipo | `doc1_asistencias` | `mv_asistencias_por_dia GROUP BY tipo_asistencia` | Diaria |
| Descuadres detectados | `descuadres_inventario` | `mv_descuadres_por_semana` | Semanal |
| Descuadres por tipo de entidad | `descuadres_inventario` | `mv_descuadres_por_semana.entidad_imputable_tipo` | Semanal |
| Bajas de empleado | `auditoria_rbac` | `mv_rbac_eventos_por_semana` WHERE tipo_evento='baja_empleado' | Semanal |
| Altas de empleado | `auditoria_rbac` | `mv_rbac_eventos_por_semana` WHERE tipo_evento='alta_empleado' | Semanal |
| Cambios de rol | `auditoria_rbac` | WHERE tipo_evento='cambio_rol' | Semanal |
| Bajas de vehículo | `auditoria_rbac` | WHERE tipo_evento='baja_vehiculo' | Semanal |
| Desbloqueos aprobados | `auditoria_rbac` | WHERE tipo_evento='desbloqueo_aprobado' | Semanal |
| Desbloqueos rechazados | `auditoria_rbac` | WHERE tipo_evento='desbloqueo_rechazado' | Semanal |

### 7.4 Permisos del usuario de solo lectura

```sql
-- Usuario dedicado para Grafana — acceso exclusivo a vistas materializadas
CREATE ROLE grafana_reader WITH LOGIN PASSWORD '${secreto_desde_vault}';

GRANT USAGE ON SCHEMA public TO grafana_reader;

-- Solo las cuatro vistas materializadas
GRANT SELECT ON mv_drps_por_dia            TO grafana_reader;
GRANT SELECT ON mv_asistencias_por_dia     TO grafana_reader;
GRANT SELECT ON mv_descuadres_por_semana   TO grafana_reader;
GRANT SELECT ON mv_rbac_eventos_por_semana TO grafana_reader;

-- Denegación explícita de tablas operativas (defense in depth)
REVOKE ALL ON vehiculos           FROM grafana_reader;
REVOKE ALL ON fichas_empleados    FROM grafana_reader;
REVOKE ALL ON galletas_terminales FROM grafana_reader;
REVOKE ALL ON dotaciones_drp      FROM grafana_reader;
```

### 7.5 Alertas de negocio en Grafana

| Condición | Umbral | Severidad | Destinatario |
|---|---|---|---|
| DRPs cancelados > 20% en una semana | ratio > 0.20 | P2 Warning | Email coordinación |
| Sin DRPs registrados en 48 h | COUNT = 0 | P1 Alerta | Email + Slack (posible fallo de registro) |
| Descuadres > 10 en una semana | COUNT > 10 | P2 Warning | Email responsable_logistica |
| Bajas de empleado > 3 en una semana | COUNT > 3 | P2 Informativo | Email gerencia |

### 7.6 Qué NO incluye el dashboard

| Dato | Motivo de exclusión |
|---|---|
| Stock actual por vehículo / base | Requiere JOIN en caliente sobre `inventario_vehiculo` — tabla operativa caliente |
| Estado actual de la flota | `vehiculos` es tabla operativa — usar `auditoria_rbac` para cambios históricos |
| Localización GPS actual | No se persiste — solo en memoria (`useGPS`) y en `eventos_fisicos_vehiculo` |
| Datos clínicos de Doc-2/3/4/5 | RGPD — datos de pacientes nunca en dashboard operativo |
| Sesiones de galleta activas en tiempo real | Dato operativo caliente — no histórico |
| Conteos de empleados activos en tiempo real | Tabla `fichas_empleados` operativa — fuera de scope |

---

## 8. Control de versiones del cliente — `X-Client-Version` (B-14)

### 8.1 Mecanismo

El cliente PWA incluye el header `X-Client-Version: <semver>` en **todas** las peticiones HTTP a Supabase (RPCs, Edge Functions, Storage). El valor se inyecta desde la variable de entorno `VITE_APP_VERSION` durante el build.

```typescript
// lib/supabaseClient.ts — configurar el header global
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: { 'X-Client-Version': import.meta.env.VITE_APP_VERSION ?? '0.0.0' }
  }
})
```

### 8.2 Edge Function `validate_client_version`

**Tipo:** middleware Edge Function invocado desde las RPCs críticas que requieren versión mínima.
**Ubicación:** `supabase/functions/validate-client-version/index.ts`

```typescript
// Llamada desde otras Edge Functions: await validateClientVersion(req)
export async function validateClientVersion(req: Request): Promise<void> {
  const clientVersion = req.headers.get('X-Client-Version')
  if (!clientVersion) return  // Clientes sin header: permitidos con warning en logs

  const { data: config } = await supabaseAdmin
    .from('versiones_cliente')
    .select('min_version_permitida')
    .eq('activa', true)
    .order('publicada_at', { ascending: false })
    .limit(1)
    .single()

  if (!config) return  // Sin config de versión: no bloquear

  if (semverLt(clientVersion, config.min_version_permitida)) {
    throw new Response(
      JSON.stringify({ error: 'client_version_obsoleta', min_required: config.min_version_permitida }),
      { status: 426, headers: { 'Content-Type': 'application/json', 'X-Min-Version': config.min_version_permitida } }
    )
  }
}
```

### 8.3 Comportamiento del cliente al recibir 426

```typescript
// lib/supabaseClient.ts — interceptor de respuesta
if (response.status === 426) {
  const minVersion = response.headers.get('X-Min-Version')
  // Modal bloqueante no descartable — el usuario debe actualizar antes de continuar
  showModalBlocking({
    title: 'Actualización requerida',
    body: `Esta versión del sistema ya no está soportada (mínima: ${minVersion}). 
           Recarga la página para obtener la versión más reciente.`,
    action: () => window.location.reload()
  })
}
```

### 8.4 Proceso de publicación de nueva versión mínima

```
1. Publicar build nuevo en Vercel/Netlify (VITE_APP_VERSION bumpeado)
2. Verificar que la nueva versión funciona correctamente en staging
3. Insertar en versiones_cliente: { version_semver, min_version_permitida, publicada_at }
4. Monitorizar `useRealtime` en producción — los clientes con versión antigua recibirán 426
5. Período de gracia recomendado: 7 días antes de bloquear (solo para actualizaciones no críticas)
```

**Variables de entorno CI/CD añadidas:**

| Variable | Descripción |
|---|---|
| `VITE_APP_VERSION` | Semver del build actual (ej. `1.2.3`). Inyectada por el pipeline CI/CD desde el tag git. |
