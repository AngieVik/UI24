# Plan de Despliegue a Producción — U24

**Fecha de redacción:** 2026-05-21  
**Sprint de referencia:** 14 (gate de seguridad cerrado)  
**Tests:** 181/181 Vitest ✅ · 0 errores TS ✅ · CLI Supabase v2.101.0 ✅  
**Pendientes P-01..P-04:** todos cerrados ✅

---

## Estado actual del proyecto (pre-deploy)

| Área | Estado |
|------|--------|
| Migraciones locales | 15 migraciones (0001–0014) aplicadas en local |
| Tests Vitest | 181/181 ✅ |
| Build TS | 0 errores ✅ |
| Bundle max chunk | 277 KB (JS) — bien bajo el límite de 800 KB ✅ |
| SW + workbox | dist/sw.js generado ✅ |
| Edge Functions | 13 funciones en `supabase/functions/` ✅ |
| E2E Playwright | `e2e/` con 5 specs listos para ejecutar post-deploy ✅ |
| CLI Supabase | v2.101.0 ✅ |
| Proyecto Supabase hosted | **⚠ Por vincular** (`supabase login` + `supabase link`) |

---

## Checklist por fases (siguiendo `deployment_checklist.md`)

> **REGLA: No pasar a la siguiente fase hasta completar al 100% la actual.**

---

### FASE 0 — Pre-condiciones (T-48h antes del deploy)

#### 0.A — Generar VAPID keys

```bash
# Ejecutar una sola vez — guardar las dos claves en un gestor de secretos
npx web-push generate-vapid-keys
```

Resultado esperado:
```
Public Key:  BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxYK=
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=
```

- [ ] `VAPID_PUBLIC_KEY` → añadir como secret en el proyecto Supabase hosted  
  (Dashboard → Settings → Edge Functions → Secrets)
- [ ] `VAPID_PRIVATE_KEY` → ídem
- [ ] `VITE_VAPID_PUBLIC_KEY` → añadir en `.env.production`

#### 0.B — Configurar Sentry

1. Crear proyecto en [sentry.io](https://sentry.io) → tipo React
2. Copiar el DSN del proyecto
- [ ] `VITE_SENTRY_DSN` → añadir en `.env.production`

#### 0.C — Crear `.env.production`

```bash
cp .env.production.example .env.production
# Editar con los valores reales:
#   VITE_SUPABASE_URL    → URL del proyecto hosted
#   VITE_SUPABASE_ANON_KEY → anon key del proyecto hosted
#   VITE_SENTRY_DSN      → DSN de Sentry
#   VITE_VAPID_PUBLIC_KEY → clave pública VAPID generada
#   VITE_APP_VERSION     → 1.0.0
```

- [ ] `.env.production` creado y completo (sin valores vacíos)

#### 0.D — Vincular proyecto Supabase hosted

```bash
supabase login         # Autenticar con token de https://app.supabase.com/account/tokens
supabase link --project-ref <PROD_PROJECT_REF>
```

- [ ] `supabase link` exitoso — se crea `.supabase/config.json`

#### 0.E — Verificar CI en verde

```bash
npx vitest run         # → 181/181 ✅
npx tsc -b --noEmit    # → 0 errores ✅
npm run build          # → sin errores, chunks < 800 KB ✅
```

- [ ] Suite completa verde
- [ ] Build limpio

#### 0.F — Backup PITR confirmado activo

- [ ] Supabase Dashboard → Database → Backups → Point-in-Time Recovery = habilitado

#### 0.G — Notificar al equipo

- [ ] Mensaje enviado: "Deploy planificado el [fecha] a las [hora] UTC — ventana de mantenimiento"

**→ FASE 0 completa cuando todos los ☐ sean ✅**

---

### FASE 1 — Base de datos (T-0)

#### 1.1 — Verificar diff antes de aplicar

```bash
supabase db diff --linked
```

Resultado esperado: diff de las 15 migraciones pendientes (0001–0014).  
- [ ] Diff revisado y sin sorpresas

#### 1.2 — Aplicar migraciones

```bash
supabase db push --linked
```

- [ ] Sin errores en las 15 migraciones
- [ ] Verificar en Studio que existen:
  - Tabla `push_subscriptions`
  - Columna `fichas_empleados.rgpd_suprimido_at`

#### 1.3 — Auditoría de seguridad post-migración

Ejecutar en Supabase Studio → SQL Editor (con service_role):

```sql
-- Debe devolver 0 filas
SELECT * FROM f_tablas_sin_rls();

-- Debe devolver 0 filas  
SELECT * FROM f_funciones_sin_security_definer();
```

- [ ] `f_tablas_sin_rls()` → 0 filas
- [ ] `f_funciones_sin_security_definer()` → 0 filas
- [ ] **Si hay hallazgos → DETENER. No continuar hasta corregir.**

#### 1.4 — Auth settings en Dashboard

Ir a: Authentication → Settings

```
enable_signup              = OFF  (deshabilitar registro público)
enable_anonymous_sign_ins  = OFF
minimum_password_length    = 8
password_requirements      = lower_upper_letters_digits
Session timebox            = 168h (7 días)
```

- [ ] Todos los valores configurados

#### 1.5 — SSL enforcement

Ir a: Database → SSL Enforcement

- [ ] SSL enforcement = Habilitado

Ir a: Database → Network Restrictions

- [ ] `allowed_cidrs` configurados a CIDRs conocidos (no dejar 0.0.0.0/0)

**→ FASE 1 completa cuando todos los ☐ sean ✅**

---

### FASE 2 — Edge Functions (T+10min)

#### 2.1 — Añadir secrets de las EF

En Supabase Dashboard → Settings → Edge Functions → Secrets, añadir:

```
VAPID_PUBLIC_KEY   = <clave pública VAPID>
VAPID_PRIVATE_KEY  = <clave privada VAPID>
```

- [ ] Secrets VAPID configurados

#### 2.2 — Desplegar todas las Edge Functions

```bash
supabase functions deploy --project-ref <PROD_PROJECT_REF>
```

- [ ] ef-alta-empleado desplegada
- [ ] ef-baja-empleado desplegada
- [ ] ef-push-avisos desplegada
- [ ] ef-cron-cleanup-orphans desplegada
- [ ] ef-cron-revoke-stale-terminals desplegada
- [ ] ef-cron-rgpd desplegada
- [ ] ef-cron-transito-ttl desplegada
- [ ] ef-renovar-offline-session desplegada
- [ ] (+ 5 EFs de auth: ef-reset-password, ef-generar-token-emergencia, ef-consumir-pin, ef-logout, ef-revocar-sesion-usuario)

#### 2.3 — Configurar cron schedules

En Dashboard → Edge Functions → Schedules:

| EF | Schedule |
|----|---------|
| ef-cron-cleanup-orphans | `0 * * * *` (cada hora) |
| ef-cron-revoke-stale-terminals | `0 */6 * * *` (cada 6h) |
| ef-cron-rgpd | `0 2 * * *` (diario 02:00 UTC) |
| ef-cron-transito-ttl | `*/30 * * * *` (cada 30min) |

- [ ] Los 4 crons configurados y activos

**→ FASE 2 completa cuando todos los ☐ sean ✅**

---

### FASE 3 — Frontend (T+20min)

#### 3.1 — Build de producción final

```bash
npm run build
```

- [ ] 0 errores TS y ESLint
- [ ] Ningún chunk JS > 800 KB
- [ ] `dist/sw.js` generado
- [ ] `dist/manifest.webmanifest` generado

#### 3.2 — Deploy al hosting

```bash
# Vercel:
vercel --prod

# Netlify:
netlify deploy --prod --dir=dist
```

- [ ] Frontend desplegado en URL de producción
- [ ] HTTPS activo
- [ ] Headers de seguridad (CSP, X-Frame-Options) configurados en el CDN

#### 3.3 — Actualizar `versiones_cliente` en BD

```sql
INSERT INTO versiones_cliente (version, descripcion, min_version_permitida, created_at)
VALUES ('1.0.0', 'Primera versión de producción', '1.0.0', now());
```

- [ ] Registro de versión insertado

**→ FASE 3 completa cuando todos los ☐ sean ✅**

---

### FASE 4 — Smoke tests post-deploy (T+30min)

Ejecutar en dispositivo Android real (Chrome) con la URL de producción:

```bash
# Opcionalmente, ejecutar los E2E automatizados contra producción:
E2E_BASE_URL=https://<url-produccion> \
E2E_USER_EMAIL=<demo-email> \
E2E_USER_PASSWORD=<demo-password> \
npm run test:e2e
```

Tests manuales adicionales:
- [ ] Login funciona con credenciales de empleado demo
- [ ] Login offline funciona (desactivar WiFi tras primer login)
- [ ] Banner "Modo sin conexión" aparece al desactivar red
- [ ] PWA: chip de instalación visible en Chrome Android
- [ ] InstallChip: se puede instalar como PWA
- [ ] Cuadrante: carga la semana actual
- [ ] Inventario: carga y muestra ítems del vehículo
- [ ] DRP Panel: visible para coordinación/gerencia
- [ ] System Config: visible solo para gerencia y requiere step-up
- [ ] Force-update: cambiar `min_version_permitida` a `99.0.0` → banner aparece

**→ FASE 4 completa cuando todos los ☐ sean ✅**

---

### FASE 5 — Monitorización post-lanzamiento (T+1h)

- [ ] Sentry: recibiendo eventos en el dashboard (al menos el evento de inicialización)
- [ ] Supabase Logs → Edge Functions: sin errores críticos en las últimas 1h
- [ ] Supabase → Database → pg_stat_activity: sin queries bloqueadas
- [ ] Realtime: al menos un terminal conectado con canal activo

**→ FASE 5 completa = DEPLOY EXITOSO ✅**

---

## Comandos rápidos de referencia

```bash
# Verificar versión CLI
supabase --version                  # debe ser 2.101.0

# Generar VAPID keys
npx web-push generate-vapid-keys

# Link al proyecto hosted
supabase login
supabase link --project-ref <REF>

# Ver migraciones pendientes
supabase migration list --linked

# Aplicar migraciones
supabase db push --linked

# Deploy Edge Functions
supabase functions deploy --project-ref <REF>

# Build frontend
npm run build

# E2E post-deploy
E2E_BASE_URL=https://... npm run test:e2e

# Load test cola offline (staging)
SUPABASE_URL=https://... SUPABASE_ANON_KEY=... \
LOAD_TEST_EMAIL=... LOAD_TEST_PASSWORD=... \
npm run test:load -- --mutations=100
```

---

## Plan de rollback

Ver sección completa en `deployment_checklist.md`.

**Frontend:** `vercel rollback` o `netlify rollback` → instantáneo.  
**BD:** Las 15 migraciones son ADD COLUMN / CREATE TABLE / CREATE FUNCTION — todas reversibles manualmente. El script de rollback de migración 14 está en `deployment_checklist.md § Plan de rollback`.
