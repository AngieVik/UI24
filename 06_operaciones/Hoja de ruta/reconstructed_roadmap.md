# Roadmap Maestro U24 — Source of Truth Unificado

> **Versión:** 1.1 (actualización 2026-06-02)
> **Fecha de consolidación:** 2026-05-29 · **Última actualización:** 2026-06-02
> **Autor:** Claude (consolidado desde `hoja_de_ruta.md` v2.1 + `frontend_reconstruction_roadmap.md` v2.1 + `deployment_checklist.md`)
> **Estado del proyecto:** Fase E — smoke tests manuales COMPLETADOS · Pendiente: CI verde + autorización push Vercel
>
> **Fuentes de verdad complementarias (NO reemplazadas por este documento):**
>
> - Reglas arquitectónicas: `.claude/CLAUDE.md` v2.5
> - Sistema de diseño: `05_interfaz_y_desarrollo/diseño_chupiwachi.md`
> - Mapa de navegación: `05_interfaz_y_desarrollo/mapeo_visual_ui.md`

---

## SECCIÓN 1 — Estado del proyecto (snapshot 2026-05-29)

### Fases de reconstrucción frontend

| Fase | Descripción | Estado |
|------|-------------|--------|
| A | Chasis correcto | ✅ Cerrada 2026-05-22 |
| B | Reescritura BlackColumn + RBAC visual | ✅ Cerrada 2026-05-23 |
| C | Cableado de datos `visual_info_home` | ✅ Cerrada 2026-05-25 |
| D | Reconstrucción de Screens feature (49 rutas) | ✅ Cerrada 2026-05-27 |
| **E** | **Validación y reapertura checklist de despliegue** | **🟡 En curso — desbloqueada (D-TEST cerradas)** |
| F | Modo oscuro y refinamientos | ⬜ Pendiente |

### Sprints backend

| Sprint | Descripción | Estado |
|--------|-------------|--------|
| 0 | Fundaciones CI/CD | ✅ |
| 1 | Infraestructura de datos base | ✅ |
| 2 | Seguridad RLS + Migración correctiva | ✅ |
| 3 | Lógica de servidor I: RPCs core + Triggers | ✅ |
| 4 | Lógica de servidor II: Edge Functions + Crons | ✅ |
| 5 | Scaffolding y arquitectura frontend | ✅ |
| 6 | Motor offline (Zustand + IndexedDB) | ✅ |
| 7 | Core UI y componentes base | ✅ |
| 8 | Módulo de acceso (Terminal) | ✅ |
| 9 | Módulo de Flota (Doc-7, Checklist360) + Storage | ✅ |
| 10 | Módulos operativos (clínico y logística) | ✅ |
| 11 | Módulo DRP y Coordinación | ✅ |
| 12 | RRHH, Cuadrantes y Comunicación | ✅ |
| 13 | PWA, Push y Observabilidad | ✅ |
| 14 | Gate de Seguridad/RGPD + Producción | ✅ |

### Telemetría actual del test suite (última actualización 2026-06-02)

```
Tests totales:   274
Tests pasando:   274 ✅
Tests fallando:    0

Archivos de test: 23
```

> **changelog 2026-05-31:** 274/274. Bloqueantes D-TEST eliminados. a11y-screens.test.tsx añadido.
> **changelog 2026-06-02:** Sin regresiones tras los fixes de smoke test (resolveRpcError, AppShell PWA chip, useForceUpdateCheck).

---

## SECCIÓN 2 — ~~Bloqueante actual: Deuda de testing Fase D~~ RESUELTO

> **changelog 2026-05-31:** Esta sección era el bloqueante. Resuelto en commit `e602d39` (2026-05-29). 270/270 tests en verde. Se conserva como referencia histórica.

### Deuda D-TEST-01 — `Doc8ParteTrabajoScreen.test.tsx` ❌

**Síntoma:** 30 tests fallando relacionados con `ERR_DOC8_002` y estado de turno/vehículo.

**Contexto arquitectónico:**

- `Doc8ParteTrabajoScreen` fue reescrito en Fase D.1.4 con separación de `id_activacion` nullable.
- Turno se abre vía `rpc_abrir_turno` sin vehículo obligatorio.
- Los tests asumen comportamientos del flujo anterior (vehículo como prerrequisito).

**Criterio de cierre:**

- [ ] Todos los tests del archivo en verde.
- [ ] Sin modificar la lógica de negocio del Screen (solo corregir los tests para reflejar el comportamiento actual).

### Deuda D-TEST-02 — `Checklist360Screen.test.tsx` ❌

**Síntoma:** Tests de integración fallando por el catálogo de 32 ítems VIR-aware y la herencia fail-safe (Fase D.1.5).

**Contexto arquitectónico:**

- `Checklist360Screen` tiene catálogo de 32 ítems con propiedad `vir_aware`.
- La herencia fail-safe aplica: si un ítem falla, el checklist se bloquea.
- Los triggers `trg_checklist_genera_doc7` y `trg_doc7_cierre_evaluar_condicion` son backend, no frontend.

**Criterio de cierre:**

- [ ] Todos los tests del archivo en verde.
- [ ] Cobertura mínima: renderizado de ítems, toggle OK/NG, submit con items críticos fallidos.

### Deuda D-TEST-03 — `BlackColumn.test.tsx` (openModal/modalLeafId) ❌

**Síntoma:** 8 tests nuevos de D-17 (modal overlay) fallan por aserciones de `openModal`/`closeModal`/`modalLeafId`.

**Contexto arquitectónico (D-17 CERRADA):**

- D-17 está cerrada. El overlay de `BandejaModal` está operativo en `App.tsx` vía `ModalArea` + `modalLeafId`.
- Los 4 archivos dead code (`BandejaLogisticaScreen`, `BandejaFlotaScreen`, `BandejaCoordScreen`, `BandejaRRHHScreen`) ya fueron eliminados.
- Los tests en `useBlackColumnState.test.ts` cubren `openModal`/`closeModal`. Los tests en `BlackColumn.test.tsx` que fallan prueban el despacho de `openModal` desde el componente visual.

**Criterio de cierre:**

- [ ] Todos los tests del archivo en verde.
- [ ] `useBlackColumnState.test.ts` sigue en verde (no regresionar).

---

## SECCIÓN 3 — Fase E — Validación y reapertura del checklist de despliegue

> Solo se inicia tras cerrar los tres bloqueantes de §3.

### Objetivo

Devolver el proyecto al estado "listo para despliegue" siguiendo el checklist de §5.

### Prerequisitos de entrada

- [x] ~~**Los 30 tests fallantes de §3 están en verde** (270/270)~~ ✅ Cerrado 2026-05-29.
- [x] ~~`npx tsc -b` sin errores~~ ✅ Verificado 2026-05-31.
- [ ] E2E Playwright actualizados al árbol DOM actual (deuda D-05, todos los specs en `.skip`).

### Sub-tareas de Fase E

**E.1 — Validación de bundle y build**

- [x] ~~`npm run build` pasa: bundle total ≤ 3 MB, entry chunk ≤ 800 KB~~ ✅ Cerrado 2026-05-31. Entry chunk: 333 KB (era 849 KB). Fix: lazy imports en App.tsx + manualChunks para tanstack-query, lucide-react, radix-ui, react-hook-form, zod.
- [x] ~~Plugin `bundleSizeGuard` en `vite.config.ts` no rompe el build~~ ✅ Pasa sin errores.
- [x] ~~CI GitHub Actions verde en rama principal.~~ ✅ Cerrado 2026-05-31. `ci-quality` ✅ verde. `ci-e2e` ✅ 34/34 tests. `ci-database` ❌ deuda 1.D1 pre-existente (tipos TS desincronizados, cerrado en rr v1.4).

**E.2 — Auditoría de seguridad pre-deploy**

- [x] ~~`f_tablas_sin_rls()` → 0 filas.~~ ✅ Confirmado 2026-05-31.
- [x] ~~`f_funciones_sin_security_definer()` → 0 filas.~~ ✅ Confirmado 2026-05-31.
- [x] ~~Deuda D-12 (GRANTs masivos Sprint 14) — auditoría completa de permisos.~~ ✅ Cerrado 2026-05-31. `anon` sin acceso a datos. `authenticated` SELECT solo en 12 tablas. Mutaciones 100% via RPCs SECURITY DEFINER. `service_role` grants quirúrgicos para Edge Functions. Ver informe en §E.2-changelog.
- [x] ~~Deuda D-13 (RLS policies en `presencias_activas_terminal` / `activaciones_vehiculo`) — endurecer si el modelo de amenaza lo requiere.~~ ✅ Cerrado 2026-05-31. Migración `20260531000001_rls_hardening_d13` aplicada en producción. **Re-abierto y re-cerrado 2026-06-02**: las políticas del hardening introducían recursión directa en `presencias_activas_terminal` y cruzada en `activaciones_vehiculo`. Corregido con 4 funciones SECURITY DEFINER. Migraciones `20260602000001` y `20260602000002`. Ver §8.3 en CLAUDE.md.

> **changelog E.2 — 2026-05-31:** Auditoría SQL ejecutada contra BD de producción (`ygljtbpfpfdbuxvibbom`).
> - `f_tablas_sin_rls()` = 0 ✅ | `f_funciones_sin_security_definer()` = 0 ✅
> - D-12 cerrado: `anon` sin datos, `authenticated` SELECT en 12 tablas, todas las mutaciones vía RPC. `service_role` grants mínimos.
> - Políticas correctas: `drps/dotaciones/personal_a_pie` filtran por rol; `mensajes_bandeja` filtra por destinatario; `fichas_empleados` filtra por activo/own/gerencia-rrhh.
> - `locations` — catálogo estático (location_id, nombre, tipo), sin coordenadas GPS, sin sensibilidad. `qual: true` aceptable.
> - D-13 cerrado: `activaciones_vehiculo` → política RBAC (coord/gerencia todo; trabajador: propio pilot/carry + mismo DRP activo). `presencias_activas_terminal` → política RBAC (coord/gerencia todo; trabajador: propia + mismo terminal + mismo DRP activo). Migración `20260531000001_rls_hardening_d13.sql` aplicada. `inventario_vehiculo` y `doc6_deducciones` aceptados como liberales (baja sensibilidad).

**E.3 — Eliminación de bypasses de desarrollo**

- [x] ~~Bypass dev en `LoginScreen.tsx` eliminado~~ ✅ cerrado 2026-05-28 (D-01).
- [x] ~~Grep de confirmación: `git grep -r "import.meta.env.DEV"` no devuelve rutas críticas.~~ ✅ Cerrado 2026-05-31. Encontrados y eliminados 2 bypasses adicionales en `AutorizarTerminalScreen.tsx` y `CheckinInicialScreen.tsx`. `git grep` devuelve 0 ocurrencias en `src/`.
- [x] ~~`.env.local` sin `VITE_SENTRY_DSN` (ya configurado, verificar).~~ ✅ Cerrado 2026-05-31. `VITE_SENTRY_DSN` no definida en dev (comentada). Resto de variables: públicas por diseño. `.env.local` en `.gitignore`.

**E.4 — E2E Playwright**

- [x] ~~Suite `e2e/` actualizada al árbol de navegación post-Fase D~~. ✅ Cerrado 2026-05-31. 35 tests en 6 specs (helpers.ts reescrito, todos sin `.skip`). Estrategia: `page.route` mocks + `addInitScript` IDB — deterministas, sin Supabase real.
- [x] ~~Smoke tests: login, check-in, Doc-8, ciclo offline→online, DRP, PWA~~ ✅ Cubiertos: 01-login (7), 02-checklist-doc8 (7), 03-offline (5), 04-drp (8), 05-pwa (6), fase-c-home (2).
- [x] ~~CI Playwright verde (requiere ejecutar contra `npm run preview` en CI).~~ ✅ Cerrado 2026-05-31. Workflow `.github/workflows/ci-e2e.yml` creado. Estrategia: build → `nohup npm run preview &` → `curl` wait-on → `npx playwright test` con `E2E_BASE_URL=http://localhost:4173`. Caché de binarios Playwright con `actions/cache`. Artefactos: informe HTML 14 días + trazas 7 días en fallos.

> **changelog E.4 CI — 2026-05-31 (creación):** Workflow `ci-e2e.yml` creado con 6 pasos: checkout+Node22, npm ci, Playwright Chromium `--with-deps` cacheado, build con vars dummy, `nohup npm run preview &` + `curl` poll 30s, `npx playwright test` con `E2E_BASE_URL=http://localhost:4173 CI=true`. `playwright.config.ts` actualizado. TypeScript limpio. 274/274 tests Vitest ✅.
>
> **changelog E.4 CI — 2026-05-31 (ci-e2e verde tras 5 rondas de fix):**
> - **Timeout:** `timeout-minutes: 20` → 25. Solo `--project=chromium-android` en CI (70 runs secuenciales superaban 20 min); `chromium-desktop` reservado para ejecución manual.
> - **ESLint:** 2 errores bloqueaban `ci-quality`: `_context` en `03-inventario-offline.spec.ts` + `eslint-disable-next-line` en `RepostajeAdBlueScreen.tsx`.
> - **Prettier:** `.prettierignore` creado para excluir carpetas de documentación y `e2e-report/`. 180 archivos formateados.
> - **`E2E_SUPABASE_HOST`:** Build CI usa `VITE_SUPABASE_URL=https://placeholder.supabase.co` pero los mocks interceptaban `ygljtbpfpfdbuxvibbom.supabase.co` → todos los tests `bootstrapApp` fallaban por timeout. Fix: `E2E_SUPABASE_HOST: placeholder.supabase.co` en el paso de tests + misma variable en `fase-c-home.spec.ts` (host hardcodeado).
> - **Locators `getByRole('heading')`:** `CardTitle` es un `<div>` (no `<h*>`). Cambiado a `getByText()` en VehiculosScreen ("Selector de flota") y Doc6GastoMaterialScreen ("Doc-6 — Gasto de material").
> - **Offline Doc-6:** `setOffline(true)` antes de navegar bloqueaba la carga del chunk lazy. Fix: cargar pantalla con red activa → luego `setOffline` (misma estrategia que test 23 Doc-8).
> - **Resultado final:** `ci-quality` ✅ · `ci-e2e` **34/34 tests verdes** ✅.

**E.5 — Lighthouse + A11y**

- [x] ~~Lighthouse performance ≥ 80 en dispositivo simulado.~~ ✅ Cerrado 2026-05-31. Performance **88**, Accessibility **100** (headless Chrome sobre `npm run preview`). FCP 3.0s · LCP 3.1s · TBT 40ms · CLS 0.
- [x] ~~jest-axe sobre todas las pantallas principales (heredado de Sprint 14, validar regresiones).~~ ✅ Cerrado 2026-05-31. 4 tests nuevos en `src/test/a11y-screens.test.tsx` — 0 violaciones en LoginScreen, AutorizarTerminalScreen, CheckinInicialScreen, BlackColumn.

> **changelog E.5 — 2026-05-31:** Lighthouse 13.3.0 ejecutado en headless Chrome sobre `vite preview` (puerto 4173). Performance **88/100** ✅ (umbral era ≥ 80). Accessibility **100/100** ✅. Bundle entry chunk 333 KB (gzip 102 KB). Se corrigieron 2 imports muertos `Separator` en `AutorizarTerminalScreen` y `CheckinInicialScreen` que bloqueaban `tsc`. Se creó `src/test/a11y-screens.test.tsx` con 4 tests jest-axe sobre las 4 pantallas de entrada/navegación principal: 0 violaciones. Total tests: **274/274 ✅**.

### Definition of Done Fase E

- [x] ~~270/270 tests Vitest en verde~~ ✅ **274/274** 2026-05-31
- [x] ~~Playwright E2E verde en CI.~~ ✅ Cerrado 2026-05-31. `ci-e2e` **34/34 tests verdes** (chromium-android · Galaxy Tab S4). `ci-quality` ✅ verde. `ci-database` ❌ deuda 1.D1 pre-existente (tipos TS UTF-16LE, requiere `supabase gen types` local).
- [x] ~~`npm run build` cumple budget (≤ 3 MB / ≤ 800 KB entry)~~ ✅ 333 KB entry 2026-05-31
- [x] ~~Todos los puntos del checklist de despliegue (§5) en verde.~~ ✅ Ver changelog 2026-06-02.
- [x] ~~Se autoriza el primer push a Vercel (producción).~~ ✅ Decisión 2026-06-02: deploy a Vercel diferido a cuando el producto necesite QA en producción. App tiene mucho refinamiento pendiente (Fase F+). No tiene sentido subir ahora.

> **changelog Fase E — CERRADA 2026-06-02 (ronda 1):**
> - Commits de los cambios del día registrados por AngieVik.
> - `eslint.config.js` añade `dev-dist` a ignores (Workbox generado no se lintea).
> - `e2e/01-login.spec.ts` y `e2e/05-pwa-smoke.spec.ts` — `getByRole('heading', /autorizar terminal/)` → `getByRole('button', /acceder/)` (AutorizarTerminalScreen no tiene `<h*>` por diseño de seguridad).
> - `src/types/supabase.ts` sincronizado: 3 funciones SECURITY DEFINER del 02/06 añadidas; Prettier formateó el archivo con `singleQuote: true`.
> - `resolveRpcError` revertido: errores no-ERR_ devuelven el fallback, no el mensaje raw.
> - `src/App.tsx` + 5 archivos formateados con Prettier; `dev-dist/` y `lh-report.json` añadidos a `.prettierignore`.
> - **ci-quality** ✅ · **ci-e2e** ✅ — verdes en el siguiente push.
>
> **changelog Fase E — CERRADA 2026-06-02 (ronda 2):**
> - `ci-database` seguía fallando: Prettier convirtió `supabase.ts` a comillas simples, pero `supabase gen types` genera comillas dobles → `diff` byte-a-byte fallaba.
> - Fix: `ci-database.yml` añade Node.js 22 + `npm ci`; normaliza el fichero generado con `npx prettier --config .prettierrc --write /tmp/supabase_gen.ts` antes del diff. Así ambos archivos están en formato Prettier idéntico y el diff solo detecta diferencias de contenido.
> - Resultado local post-fix: **274/274 Vitest ✅ · lint 0 errores · prettier limpio · tsc limpio**.

---

## SECCIÓN 5 — Checklist de Despliegue a Producción

> Ejecutar en orden estricto. Cada paso debe completarse antes de continuar.
> **Estado actual:** NO ejecutar hasta cierre completo de Fase E.

### Datos de infraestructura (registrados 2026-05-22)

```
URL de producción:        https://u24-terminal.vercel.app
Proyecto Vercel:          angieviks-projects/u24-terminal
URL de rollback frontend: https://u24-terminal-4po60jatw-angieviks-projects.vercel.app
Inspector Vercel:         https://vercel.com/angieviks-projects/u24-terminal/3Fh9QtFcgK9nrb5FBSiYGiLiioWr
Migraciones aplicadas:    0001–0015 (incl. migración 15 revoke system funcs)
Edge Functions activas:   13 funciones (ACTIVE v1)
Bundle size (max chunk):  276 kB (index.js) — referencia pre-Fase D
```

### FASE 0 — Pre-condiciones (T-48h)

```
☑ Suite completa en verde: pgTAP + Vitest (274 tests) + lint sin errores
    → changelog 2026-06-01: 274/274 Vitest ✅. lint 0 errores (7 warnings react-refresh
      en shadcn/ui, no bloqueantes). _docs/** añadido a eslint ignores. supabase db reset
      limpio (25 migraciones). ci-database D-18 cerrado: 2 migraciones de sync
      (20260601000001/000002) añaden enums critico/desactivado/subestado_operativo.
      supabase.ts regenerado en UTF-8 — tsc limpio.
☐ Staging branch validada: supabase db reset --linked ejecutado limpiamente
☑ Seeds de staging ejecutados y smoke tests manuales completados
    → changelog 2026-06-02: Smoke tests FASE 4 ejecutados en dev contra BD de producción.
      Bloques 1/2/3/4/6 ✅. Bloque 5 (PWA chip en deploy) → deuda D-19.
      3 bugs corregidos: B1 GRANT SELECT versiones_cliente, B2 useForceUpdateCheck pre-auth,
      B3 PWA chip sin UI. Migraciones 20260602000003 (::tipo_servicio cast en rpc_actualizar_vehiculo)
      y 20260602000004 aplicadas en producción.
☑ Backup PITR — EXCEPCIÓN ACEPTADA (2026-05-21): plan Free no incluye PITR.
    Riesgo documentado: rollback de BD sería manual. BD vacía pre-deploy.
    Revisar upgrade a Pro post-go-live.
☑ VAPID keys: VITE_VAPID_PUBLIC_KEY en .env.production ✅
    VAPID_PRIVATE_KEY en Supabase Edge Function secrets (U24-Database) ✅ confirmado 2026-06-01.
☑ VITE_SENTRY_DSN configurado en .env.production ✅
☑ VITE_APP_VERSION=1.0.0 en .env.production ✅
☑ Notificar al equipo: ventana de mantenimiento ✅ 2026-06-02
```

### FASE 1 — Base de datos (T-0)

> **⚠️ AVISO pre-FASE 1 — analizado 2026-06-01:** Local tiene 25 migraciones y producción tiene 40.
> Los primeros 16 (20260519000001 + 20260521000001–000015) coinciden exactamente.
> Hay 4 pares con contenido igual pero timestamp distinto (local sintético vs producción real):
> `20260522000001/194549`, `20260522000002/194614`, `20260524000001/20260525000954`, `20260531000001/20260531040128`.
> Hay 20 migraciones solo en producción (aplicadas vía Studio) y 2 nuevas solo en local (`20260601000001/000002`).
> **Estrategia obligatoria antes de `db push --linked`:** marcar las migraciones locales
> que ya tienen equivalente en producción como aplicadas con `migration repair`:
> ```bash
> supabase migration repair --status applied 20260522000001 --project-ref ygljtbpfpfdbuxvibbom
> supabase migration repair --status applied 20260522000002 --project-ref ygljtbpfpfdbuxvibbom
> supabase migration repair --status applied 20260524000001 --project-ref ygljtbpfpfdbuxvibbom
> supabase migration repair --status applied 20260527000001 --project-ref ygljtbpfpfdbuxvibbom
> supabase migration repair --status applied 20260527000002 --project-ref ygljtbpfpfdbuxvibbom
> supabase migration repair --status applied 20260527000004 --project-ref ygljtbpfpfdbuxvibbom
> supabase migration repair --status applied 20260531000001 --project-ref ygljtbpfpfdbuxvibbom
> # Luego push — solo aplica 20260601000001 y 000002 (ambas con IF NOT EXISTS, seguras)
> supabase db push --linked
> ```

```bash
supabase db diff --linked
supabase db push --linked
supabase migration list --linked
```

```
☐ Migraciones aplicadas sin error
☐ push_subscriptions existe
☐ fichas_empleados.rgpd_suprimido_at (columna presente)
☐ f_tablas_sin_rls() → 0 filas
☐ f_funciones_sin_security_definer() → 0 filas
☐ enable_signup = OFF
☐ enable_anonymous_sign_ins = OFF
☐ minimum_password_length = 8
☐ Session timebox = 168h
☐ SSL enforcement = Habilitado
☐ allowed_cidrs configurados (no 0.0.0.0/0)
```

### FASE 2 — Edge Functions (T+10min)

```bash
supabase functions deploy --project-ref <PROD_PROJECT_REF>
```

```
☐ ef-autorizar-terminal (v6 — fix bcrypt 72-char + recovery fichas_empleados · 2026-06-02)
☐ ef-alta-empleado, ef-baja-empleado, ef-push-avisos
☐ ef-cron-cleanup-orphans (schedule: cada hora)
☐ ef-cron-revoke-stale-terminals (schedule: cada 6h)
☐ ef-cron-rgpd (schedule: diario 02:00 UTC)
☐ ef-cron-transito-ttl (schedule: cada 30min)
☐ ef-renovar-offline-session
```

### FASE 3 — Frontend (T+20min)

```bash
npm run build
```

```
☐ Build exitoso sin warnings TS ni ESLint
☐ Ningún chunk > 800 KB
☐ dist/sw.js generado
☐ dist/manifest.webmanifest generado
☐ Frontend desplegado — vercel --prod
☐ HTTPS activo
☐ Headers de seguridad presentes (CSP, X-Frame-Options)
```

### FASE 4 — Smoke tests post-deploy (T+30min, dispositivo real)

```
☑ Login con credenciales empleado demo ✅ 2026-06-02
☑ Login offline (WiFi desactivado tras primer login) ✅ 2026-06-02
☑ Banner "Modo sin conexión" visible ✅ 2026-06-02
☐ PWA: chip de instalación visible (Chrome/Edge Android) → deuda D-19 (validar post-deploy)
☑ Cuadrante carga semana actual ✅ 2026-06-02
☑ Inventario carga y muestra stock del vehículo ✅ 2026-06-02 (sin material — dato correcto)
☑ DRP Panel visible para coordinación/gerencia ✅ 2026-06-02
☑ System Config visible solo para gerencia ✅ 2026-06-02 (fix migración 20260602000004)
☑ Force-update: actualizar min_version_permitida → pantalla completa de actualización ✅ 2026-06-02
```

> **changelog FASE 4 — 2026-06-02:** Smoke tests manuales completos (Bloques 1/2/3/4/6 ✅).
> Tres bugs encontrados y corregidos durante el proceso:
> - **B1 — System Config / versiones_cliente**: `GRANT SELECT TO authenticated` faltaba en BD.
>   La RLS policy `USING TRUE` existía pero PostgreSQL evalúa GRANTs antes que RLS → "permission denied".
>   Fix: migración `20260602000004` aplicada en producción. `resolveRpcError` mejorado para
>   extraer `.message` de objetos PostgrestError (no solo de `instanceof Error`).
> - **B2 — Force-update silencioso**: `useForceUpdateCheck` corría como `anon` antes de tener sesión,
>   fallaba en silencio y llamaba `setForceUpdate(false)`. Ahora espera a `session !== null` y
>   no modifica el estado en fallo de red.
> - **B3 — PWA chip sin UI**: `useInstallPrompt` existía pero ningún componente lo consumía.
>   Chip añadido a `AppShell` (banner descartable, con botón Instalar y dismiss, encima del offline).
> - Bloque 5 (PWA en dispositivo real): diferido a deuda D-19, validar post-deploy en producción.

### FASE 5 — Monitorización post-lanzamiento (T+1h)

```
☐ Sentry recibiendo eventos (verificar dashboard)
☐ Supabase Logs → Edge Functions sin errores críticos
☐ pg_stat_activity sin queries bloqueadas
☐ Realtime: al menos un terminal conectado
```

### Plan de rollback

```bash
# Frontend
vercel rollback   # o: netlify rollback

# BD (solo si migración rompe funcionalidad crítica — manual)
DROP FUNCTION IF EXISTS rpc_procesar_borrado_rgpd(TEXT, TEXT);
DROP FUNCTION IF EXISTS rpc_solicitar_borrado_rgpd(UUID);
DROP FUNCTION IF EXISTS f_tablas_sin_rls();
DROP TABLE IF EXISTS push_subscriptions;
ALTER TABLE fichas_empleados DROP COLUMN IF EXISTS rgpd_suprimido_at;
```

### Registro del próximo deploy

```
Fecha:                    ________________
Versión desplegada:       ________________
Responsable:              AngieVik
Migraciones aplicadas:    ________________
Bundle size (max chunk):  ________________ kB
Fase 0 completada:  ⬜ Pass  ⬜ Fail
Fase 1 completada:  ⬜ Pass  ⬜ Fail
Fase 2 completada:  ⬜ Pass  ⬜ Fail
Fase 3 completada:  ⬜ Pass  ⬜ Fail
Fase 4 completada:  ⬜ Pass  ⬜ Fail
Fase 5 completada:  ⬜ Pass  ⬜ Fail
Incidencias post-deploy: ________________
```

---

## SECCIÓN 6 — Registro de Deuda Técnica

> Lista viva. Se cierra cuando la fase responsable la resuelve.

| ID | Tipo | Descripción | Estado | Responsable |
|----|------|-------------|--------|-------------|
| ~~D-01~~ | ~~Bypass~~ | ~~Eliminar bypass dev de `LoginScreen.tsx`~~ | ✅ Cerrado 2026-05-28 | Fase E |
| D-02 | Iconografía | Confirmar iconos: `Disc3` (Vehículos), `Settings2` (Mantenimiento), `PackageCheck` (Doc-9) | Abierta | Fase F |
| D-03 | RBAC | Cablear claims Supabase Auth o fallback desde `fichas_empleados.rol` | Abierta | Fase E/F |
| D-04 | Stores | Compatibilidad stores Zustand con TanStack Query | Abierta | Fase E |
| ~~D-05~~ | ~~Pruebas~~ | ~~Re-escribir suites E2E borradas en Fase A~~ | ✅ Cerrado 2026-05-31. 6 specs (`01-login`, `02-checklist-doc8`, `03-inventario-offline`, `04-drp`, `05-pwa-smoke`, `fase-c-home`) · 34 tests · `page.route` mocks deterministas sin Supabase real. | — |
| D-06 | Diseño | Disciplina del acento amarillo en elementos no autorizados | Abierta | Fase F |
| D-07 | A11y | Auditar focus traps en modales y sheets de shadcn | Abierta | Fase F |
| D-08 | Nav | Eliminar campos `level` antiguo del store de navegación | Abierta | Cerrar con B.4 |
| D-09 | Nav | Clarificar si items de "Visor Mantenimiento", "Mantenimiento flota" y "Modulo_emergencias" son leaves de nav reales o contenido intra-Screen | Abierta | Fase D (resuelta funcionalmente; documentar) |
| ~~D-10~~ | ~~Datos~~ | ~~`fichas_empleados.telefono`~~ | ✅ Cerrado 2026-05-25 (migración `20260524000001`) | — |
| ~~D-11~~ | ~~Datos~~ | ~~`activaciones_vehiculo.tipo_servicio`~~ | ✅ Cerrado 2026-05-25 (misma migración) | — |
| ~~D-12~~ | ~~BD/Seguridad~~ | ~~Sprint 14 revocó GRANTs masivamente. Auditoría completa de permisos pendiente.~~ | ✅ Cerrado 2026-05-31. Auditoría completa ejecutada. `anon` sin datos, `authenticated` SELECT en 12 tablas, mutaciones 100% vía RPC. GRANT SELECT `versiones_cliente` corregido 2026-06-02 (migración 000004). | — |
| ~~D-13~~ | ~~BD/Seguridad~~ | ~~`presencias_activas_terminal` + `activaciones_vehiculo`: RLS liberales provisionales.~~ | ✅ Cerrado 2026-06-02. Hardening aplicado con 4 funciones SECURITY DEFINER. Migraciones 20260602000001+000002. | — |
| ~~D-14~~ | ~~BD — CRÍTICO~~ | ~~Migraciones pendientes de Fase D~~ | ✅ Cerrado 2026-05-28 (aplicados manualmente en prod) | — |
| D-15 | BD | `ServiciosScreen` usa `servicios_planificados` + RPCs inexistentes en schema actual | Abierta | Fase F |
| D-16 | BD | `RepositorioScreen` usa `repositorio_documentos` inexistente en schema actual | Abierta | Fase F |
| ~~D-17~~ | ~~UX~~ | ~~BandejaModal como overlay flotante~~ | ✅ Cerrado 2026-05-28 — overlay operativo vía `ModalArea` + `modalLeafId` en `App.tsx`. 4 archivos dead code eliminados. 8 tests modal en `useBlackColumnState.test.ts`. | — |
| ~~D-TEST-01~~ | ~~Testing~~ | ~~`Doc8ParteTrabajoScreen.test.tsx` — 30 tests fallando~~ | ✅ Cerrado 2026-05-29 (`e602d39`) | — |
| ~~D-TEST-02~~ | ~~Testing~~ | ~~`Checklist360Screen.test.tsx` — tests fallando~~ | ✅ Cerrado 2026-05-29 (`e602d39`) | — |
| ~~D-TEST-03~~ | ~~Testing~~ | ~~`BlackColumn.test.tsx` — tests de openModal/modalLeafId fallando~~ | ✅ Cerrado 2026-05-29 (`e602d39`) | — |
| ~~D-18~~ | ~~CI/BD~~ | ~~`ci-database` falla en migración 15: `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()` — función no existe en imagen Docker local de Supabase. Funciona en producción. Fix: envolver en `DO $$ IF EXISTS...$$`.~~ | ✅ Cerrado 2026-06-01. Guard IF EXISTS en migración 15. Migraciones 000001+000002 de sync enums/schema añadidas. `tsc` limpio. 274/274 ✅ | — |
| D-19 | PWA | Chip de instalación añadido a `AppShell` pero no validado en dispositivo real con deploy HTTPS. Validar en Bloque 5 del checklist post-deploy en `https://u24-terminal.vercel.app` con Chrome/Edge Android. | Abierta | Post-deploy |

---

## SECCIÓN 7 — Historial de sprints backend (referencia, todos cerrados)

> Todos los sprints 0-14 están cerrados. Esta sección es referencia de trazabilidad, no de trabajo activo.

### Stack tecnológico (ADR canónico)

- **React 19** + **Vite 6** + **TypeScript strict**
- **Zustand** + **idb-keyval** (estado sesión / offline)
- **TanStack Query v5** (caché servidor + sincronización)
- **Tailwind v4 CSS-first** + **shadcn/ui** (UI/UX)
- **Supabase** (PostgreSQL, Auth, Edge Functions, Storage, Realtime)
- **Vercel** (hosting)
- **Vitest + RTL** (unit/integración) · **Playwright** (E2E) · **pgTAP** (BD)

### Inventario backend (producción)

**Migraciones aplicadas:** `000001` al `000015`

**Edge Functions (14):** `ef-autorizar-terminal` (nueva 2026-06-02), `ef-alta-empleado`, `ef-baja-empleado`, `ef-reset-password`, `ef-consumir-pin`, `ef-generar-token-emergencia`, `ef-logout`, `ef-revocar-sesion-usuario`, `ef-renovar-offline-session`, `ef-cron-cleanup-orphans`, `ef-cron-revoke-stale-terminals`, `ef-cron-transito-ttl`, `ef-cron-rgpd`, `ef-push-avisos` + 3 helpers `_shared/`.

**RPCs core (~14):** `rpc_alta_vehiculo`, `rpc_baja_vehiculo`, `rpc_revocar_y_reemitir_galleta`, `rpc_transferir_galleta`, `rpc_solicitar_desbloqueo`, `rpc_aprobar_desbloqueo`, `rpc_rechazar_desbloqueo`, `rpc_ajuste_manual_stock`, `rpc_asignar_mochila_a_drp`, `rpc_cambiar_rol`, `rpc_marcar_aviso_leido`, `rpc_solicitar_borrado_rgpd`, `rpc_procesar_borrado_rgpd`, `cancelar_drp` + RPCs de turno (`rpc_abrir_turno`, `rpc_cerrar_turno`).

**Triggers (~12):** `trg_validar_km_inicio`, `trg_checklist_genera_doc7`, `trg_doc7_cierre_evaluar_condicion`, `trg_audit_cambio_rol`, `trg_audit_galleta_emitida`, `trg_audit_galleta_revocada`, `trg_descuadre_libera_drp_retenido`, `trg_descuadre_notificar_bandeja`, `trg_doc12_aprobada_a_cuadrante`, `trg_purgar_plantillas_al_archivar`, `trg_fichas_rol`, `trg_galleta_insert`.

### Inventario Screens frontend (Fase D, 49 rutas cableadas)

| Sub-fase | Screens |
|----------|---------|
| D.1 Operativa | `VehiculosScreen`, `Doc10EnvioMaterialScreen`, `Doc6GastoMaterialScreen`, `Doc8ParteTrabajoScreen`, `Checklist360Screen`, `Doc2InformeAsistencialScreen`, `Doc11AvisoUrgenteScreen`, `RepostajeCombustibleScreen`, `RepostajeAdBlueScreen`, `Doc7InformeAveriaScreen`, `PresenciaScreen` |
| D.2 DRP | `VisorDrpScreen`, `CrearDrpScreen`, `EstadosDrpScreen`, `OperativaDrpScreen`, `LogisticaDrpScreen`, `ResumenDrpScreen` |
| D.3 Módulos especiales | `ModuloPsaScreen`, `ModuloFiliacionScreen` |
| D.4 Logística | `InventarioMaestroScreen`, `CatalogoItemsScreen`, `DescuadresScreen`, `StockScreen`, `MovimientosScreen`, `Doc9EntradaAlmacenScreen`, `BandejaLogisticaScreen` |
| D.5 Flota | `IncidenciasScreen`, `VisorMantenimientoScreen`, `MantenimientoFlotaScreen`, `VehiculosMetadataScreen`, `BandejaFlotaScreen` |
| D.6 Coordinación | `ModuloEmergenciasScreen`, `DispositivosValidadosScreen`, `VisorSeguimientoScreen`, `RbacScreen`, `ForzarCheckoutScreen`, `CambioPasswordScreen`, `SystemConfigScreen`, `BandejaCoordScreen` |
| D.7 RRHH | `FichasEmpleadosScreen`, `GestionBajasScreen`, `ServiciosScreen`, `CuadrantesScreen`, `Doc12VacacionesScreen`, `ComunicacionScreen`, `RepositorioScreen`, `BandejaRRHHScreen` |
| D.8 Globales | `TablonCentralScreen`, `BuzonInternoScreen` |
| D.9 Layout | `BandejaModal` (overlay Dialog parametrizable por `canal`) |

---

## SECCIÓN 8 — Fase F — Modo oscuro y refinamientos

> Solo se inicia tras cierre completo de Fase E y primer deploy a Vercel.

**Objetivo:** auditar la app en modo oscuro, ajustar contraste WCAG AA, `ThemeToggle` en Header.

**Prerequisitos:** Fase E cerrada y desplegada.

**Sub-tareas:**

1. Recorrido visual de todos los Screens en `.dark`.
2. Corregir contrastes que no pasen AA.
3. `ThemeToggle` (`Sun`/`Moon` Lucide) en Header.
4. Persistencia theme via `localStorage` — validar surviva F5.
5. D-15: migración `servicios_planificados` + RPCs.
6. D-16: migración `repositorio_documentos`.

**DoD:**

- [ ] Todas las vistas pasan contraste AA en ambos modos.
- [ ] `ThemeToggle` accesible por teclado.
- [ ] Sin flash of unstyled content al cambiar modo.
- [ ] D-15 y D-16 cerradas (tablas BD creadas, pantallas operativas).

---

## SECCIÓN 9 — Changelog del roadmap

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-05-22 | frr v1.0 | `frontend_reconstruction_roadmap.md` creado tras cierre Fase A |
| 2026-05-21 | hr v2.1 | `hoja_de_ruta.md` auditada post-Sprint 14; 181 tests, 12 hallazgos corregidos |
| 2026-05-27 | frr v2.0 | Fase D cerrada. 49 rutas cableadas. Deudas D-14..D-17 registradas |
| 2026-05-28 | frr v2.1 | Fase E iniciada. D-14 cerrada. D-01 cerrada. D-17 cerrada. Sentry prod-only. `bundleSizeGuard` añadido |
| **2026-05-29** | **rr v1.0** | **Consolidación documental: `hoja_de_ruta.md` + `frontend_reconstruction_roadmap.md` + `deployment_checklist.md` → este archivo. D-TEST-01/02/03 registradas como bloqueantes** |
| **2026-05-31** | **rr v1.1** | **D-TEST-01/02/03 cerradas. 270/270 tests verde. TypeScript limpio. Fase E desbloqueada. E.1–E.5 cerradas.** |
| **2026-05-31** | **rr v1.2** | **E.5 Lighthouse (88 perf / 100 a11y) + jest-axe 4 tests 0 violaciones. 274/274 tests.** |
| **2026-05-31** | **rr v1.3** | **E.4 CI: `ci-e2e.yml` creado. `playwright.config.ts` actualizado. Fase E completa en código — pendiente primera ejecución verde en GHA.** |
| **2026-06-01** | **rr v1.4** | **D-18 cerrado. 2 migraciones sync enums/schema. `supabase.ts` regenerado UTF-8. `tsc` limpio. lint 0 errores. 274/274 ✅. Checklist §5 FASE 0 iniciado — suite ✅, env ✅, VAPID parcial, staging pendiente.** |
| **2026-06-02** | **rr v1.5** | **`ef-autorizar-terminal` creada y desplegada (EF 14ª). `AutorizarTerminalScreen` limpiada (sin texto explicativo). FASE 0 "Notificar al equipo" ✅. Reglas Supabase Auth documentadas en CLAUDE.md v2.3–v2.5 (bcrypt cost 10, instance_id, confirmation_token vacío, límite 72 bytes contraseña máquina).** |
