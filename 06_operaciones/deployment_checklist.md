# Checklist de Despliegue a Producción — U24

> Ejecutar en orden estricto. Cada paso debe completarse antes de continuar.
> Responsable: técnico de guardia + gerencia.
> Fecha esperada: cuando Sprint 14 esté en verde en CI.

---

## FASE 0 — Pre-condiciones (T-48h antes del deploy)

```
☐ Suite completa en verde en CI: pgTAP + Vitest (169+ tests) + lint sin errores
☐ Staging branch validada: supabase db reset --linked ejecutado limpiamente
☐ Seeds de staging ejecutados y smoke tests manuales completados (doc. testing_arquitectura.md §1)
☑ Backup PITR — EXCEPCIÓN ACEPTADA (2026-05-21): plan Free no incluye PITR.
    Riesgo documentado: rollback de BD en caso de fallo durante db push sería manual.
    Mitigación: BD vacía pre-deploy → no hay datos que perder. Revisar upgrade a Pro post-go-live.
☐ VAPID keys generadas y guardadas en secrets de producción:
    VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY (generar con web-push CLI: npx web-push generate-vapid-keys)
☐ VITE_SENTRY_DSN configurado en el proyecto Supabase de producción
☐ VITE_APP_VERSION actualizado en .env.production (semver: MAJOR.MINOR.PATCH)
☐ Notificar al equipo: "Deploy planificado el [fecha] a las [hora] UTC — ventana de mantenimiento"
```

---

## FASE 1 — Base de datos (T-0)

### 1.1 Aplicar migraciones

```bash
# Verificar estado de migraciones antes de aplicar
supabase db diff --linked

# Aplicar todas las migraciones pendientes
supabase db push --linked

# Verificar que no hay migraciones pendientes
supabase migration list --linked
```

```
☐ Migraciones aplicadas sin error
☐ Verificar en Supabase Studio que las tablas nuevas existen:
    - push_subscriptions
    - fichas_empleados.rgpd_suprimido_at (columna)
```

### 1.2 Ejecutar auditoría de seguridad post-migración

```sql
-- Ejecutar en Supabase Studio → SQL Editor con service_role

-- Debe devolver 0 filas
SELECT * FROM f_tablas_sin_rls();

-- Debe devolver 0 filas
SELECT * FROM f_funciones_sin_security_definer();
```

```
☐ f_tablas_sin_rls() → 0 filas
☐ f_funciones_sin_security_definer() → 0 filas
☐ Si hay hallazgos → DETENER el deploy. Abrir issue, corregir, re-verificar.
```

### 1.3 Verificar configuración de Auth en hosted

En Supabase Dashboard → Authentication → Settings:
```
☐ enable_signup = OFF
☐ enable_anonymous_sign_ins = OFF
☐ minimum_password_length = 8
☐ password_requirements = lower_upper_letters_digits
☐ Session timebox = 168h (7 días)
```

### 1.4 Verificar SSL enforcement

En Supabase Dashboard → Database → SSL Enforcement:
```
☐ SSL enforcement = Habilitado
```

En Supabase Dashboard → Database → Network Restrictions:
```
☐ allowed_cidrs configurados a los CIDRs conocidos (servidores de la app + IPs de admins)
    No dejar 0.0.0.0/0 en producción.
```

---

## FASE 2 — Edge Functions (T+10min)

```bash
# Desplegar todas las Edge Functions
supabase functions deploy --project-ref <PROD_PROJECT_REF>
```

```
☐ ef-alta-empleado desplegada
☐ ef-baja-empleado desplegada
☐ ef-push-avisos desplegada
☐ ef-cron-cleanup-orphans desplegada
☐ ef-cron-revoke-stale-terminals desplegada
☐ ef-cron-rgpd desplegada
☐ ef-cron-transito-ttl desplegada
☐ ef-renovar-offline-session desplegada
☐ Cron jobs configurados en Supabase Dashboard → Edge Functions → Schedules:
    - ef-cron-cleanup-orphans: cada hora
    - ef-cron-revoke-stale-terminals: cada 6h
    - ef-cron-rgpd: diario 02:00 UTC
    - ef-cron-transito-ttl: cada 30min
```

---

## FASE 3 — Frontend (T+20min)

```bash
# Build de producción
npm run build

# Verificar tamaño de chunks (ninguno debe superar 800 KB)
npm run build 2>&1 | grep "kB"
```

```
☐ Build exitoso sin warnings de TypeScript ni ESLint errores
☐ Ningún chunk > 800 KB (chunkSizeWarningLimit configurado en vite.config.ts)
☐ El Service Worker se genera en dist/sw.js
☐ El manifest.webmanifest se genera en dist/manifest.webmanifest
```

```bash
# Desplegar en hosting (ajustar según plataforma: Vercel / Netlify / S3+CDN)
# Ejemplo con Vercel:
vercel --prod

# Ejemplo con Netlify:
netlify deploy --prod --dir=dist
```

```
☐ Frontend desplegado y accesible en la URL de producción
☐ HTTPS activo (no HTTP)
☐ Headers de seguridad presentes (Content-Security-Policy, X-Frame-Options)
```

---

## FASE 4 — Smoke tests post-deploy (T+30min)

Ejecutar en un dispositivo real (tablet Android o similar) con la URL de producción:

```
☐ Login funciona con credenciales de un empleado demo
☐ Login offline funciona (desactivar WiFi tras primer login exitoso)
☐ Banner "Modo sin conexión" aparece al desactivar red
☐ PWA: aparece el chip de instalación (en Chrome/Edge Android)
☐ InstallChip: se puede instalar la app como PWA
☐ Cuadrante: carga la semana actual
☐ Inventario: carga y muestra el inventario del vehículo
☐ DRP Panel: visible para coordinación/gerencia
☐ System Config: visible solo para gerencia
☐ Forzar actualización: actualizar versiones_cliente.min_version_permitida
    a una versión superior a VITE_APP_VERSION y verificar que aparece el banner de force-update
```

---

## FASE 5 — Monitorización post-lanzamiento (T+1h)

```
☐ Sentry configurado y recibiendo eventos (verificar en dashboard de Sentry)
☐ Supabase Dashboard → Logs → Edge Functions sin errores críticos
☐ Supabase Dashboard → Database → pg_stat_activity sin queries bloqueadas
☐ Realtime: al menos un terminal conectado con canal activo
```

---

## Plan de rollback

En caso de incidente crítico post-deploy (sistema inoperativo):

**Rollback de frontend:**
```bash
# Revertir al deploy anterior (Vercel/Netlify soportan rollback instantáneo)
vercel rollback
# o
netlify rollback
```

**Rollback de migración de base de datos:**
```bash
# SOLO si la migración introduce datos corruptos o rompe funcionalidad crítica
# Las migraciones de U24 son ADD COLUMN / CREATE TABLE / CREATE FUNCTION:
# generalmente son seguras de revertir manualmente

# Revertir la migración 14 (ejemplo manual):
# DROP FUNCTION IF EXISTS rpc_procesar_borrado_rgpd(TEXT, TEXT);
# DROP FUNCTION IF EXISTS rpc_solicitar_borrado_rgpd(UUID);
# DROP FUNCTION IF EXISTS f_tablas_sin_rls();
# DROP FUNCTION IF EXISTS f_funciones_sin_security_definer();
# ALTER TABLE fichas_empleados DROP COLUMN IF EXISTS rgpd_suprimido_at;
# DROP TABLE IF EXISTS push_subscriptions;
```

```
☐ URL de rollback frontend anotada: ________________
☐ Timestamp del backup PITR pre-deploy anotado: ________________
☐ Contacto de guardia de Supabase (si Plan Pro): soporte@supabase.io
```

---

## Registro del deploy

```
Fecha:                    2026-05-22 01:31 UTC (redeploy login-fix: 2026-05-22)
Versión desplegada:       1.0.0
Responsable:              AngieVik
Migraciones aplicadas:    0001 – 0015 (todas, incluyendo migration 15 revoke system funcs)
Edge Functions:           13 funciones desplegadas (ACTIVE v1)
Bundle size (max chunk):  278 kB (index.js)
URL de producción:        https://u24-terminal.vercel.app  (Vercel — angieviks-projects/u24-terminal)
URL de rollback frontend: https://u24-terminal-4acj83g92-angieviks-projects.vercel.app
Inspector Vercel:         https://vercel.com/angieviks-projects/u24-terminal/9G4Eoq21picfaaGVdp9i89ENdv5B

Fase 0 completada:  ☑ Pass  ⬜ Fail
Fase 1 completada:  ☑ Pass  ⬜ Fail
Fase 2 completada:  ☑ Pass  ⬜ Fail
Fase 3 completada:  ☑ Pass  ⬜ Fail
Fase 4 completada:  ⬜ Pass  ⬜ Fail  ← EN CURSO (smoke tests manuales)
Fase 5 completada:  ⬜ Pass  ⬜ Fail

Incidencias post-deploy: Ninguna
RTO si hubo rollback:     ________________ min
```
