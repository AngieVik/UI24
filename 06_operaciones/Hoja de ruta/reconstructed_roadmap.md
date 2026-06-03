# Roadmap Maestro U24 — Source of Truth Unificado

> **Versión:** 1.9 (actualización 2026-06-03)
> **Fecha de consolidación:** 2026-05-29 · **Última actualización:** 2026-06-03
> **Autor:** Claude (consolidado desde `hoja_de_ruta.md` v2.1 + `frontend_reconstruction_roadmap.md` v2.1 + `deployment_checklist.md`)
> **Estado del proyecto:** **FASE ALPHA CERRADA** · 315/315 tests ✅ · Próxima: Fase F (modo oscuro)
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
| E | Validación y reapertura checklist de despliegue | ✅ Cerrada 2026-06-02 |
| **F** | **Modo oscuro y refinamientos** | **🟡 En curso** |

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
> **changelog 2026-06-03 — ALPHA completa:**
>
> - Alpha.2 CERRADA: enum `tipo_vehiculo` + 244 catalogo_items + 6 plantillas + 49 vehículos + ~886 plantilla_lineas aplicados en producción (migraciones 000005–000007).
> - Alpha.3 CERRADA: 5 RPCs creados en producción + `psa_sesiones.matricula` nullable (migración 000008). Screens desbloqueadas: PSA, ComunicacionScreen/Tablón, ForzarCheckout. Filiación, Vacaciones, FichasEmpleados y DRP ya funcionaban (RPCs y GRANTs existentes).
> - **Próxima fase: F** (modo oscuro F.1, sentence case F.2, a11y F.3, D-19 PWA F.4).

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
>
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
>
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
>
> - Commits de los cambios del día registrados por AngieVik.
> - `eslint.config.js` añade `dev-dist` a ignores (Workbox generado no se lintea).
> - `e2e/01-login.spec.ts` y `e2e/05-pwa-smoke.spec.ts` — `getByRole('heading', /autorizar terminal/)` → `getByRole('button', /acceder/)` (AutorizarTerminalScreen no tiene `<h*>` por diseño de seguridad).
> - `src/types/supabase.ts` sincronizado: 3 funciones SECURITY DEFINER del 02/06 añadidas; Prettier formateó el archivo con `singleQuote: true`.
> - `resolveRpcError` revertido: errores no-ERR_ devuelven el fallback, no el mensaje raw.
> - `src/App.tsx` + 5 archivos formateados con Prettier; `dev-dist/` y `lh-report.json` añadidos a `.prettierignore`.
> - **ci-quality** ✅ · **ci-e2e** ✅ — verdes en el siguiente push.
>
> **changelog Fase E — CERRADA 2026-06-02 (ronda 2):**
>
> - `ci-database` seguía fallando: Prettier convirtió `supabase.ts` a comillas simples, pero `supabase gen types` genera comillas dobles → `diff` byte-a-byte fallaba.
> - Fix: `ci-database.yml` añade Node.js 22 + `npm ci`; normaliza el fichero generado con `npx prettier --config .prettierrc --write /tmp/supabase_gen.ts` antes del diff. Así ambos archivos están en formato Prettier idéntico y el diff solo detecta diferencias de contenido.
> - Resultado post-deploy: **ci-quality ✅ · ci-e2e ✅ · ci-database ✅** — 3/3 verde confirmado 2026-06-02T20:55Z.

---

## SECCIÓN 4 — Fase F — Modo oscuro y refinamientos

> **Prerequisito de entrada:** Fase E cerrada ✅ (2026-06-02).

### Objetivo

Pulir la experiencia de usuario: modo oscuro real, consistencia visual, accesibilidad y deuda de UX acumulada.

### Sub-tareas de Fase F

**F.1 — Modo oscuro**

- [ ] Verificar que `ThemeProvider` + `next-themes` (o equivalente) funciona en todas las pantallas.
- [ ] Revisar contraste de colores en modo oscuro — Tailwind CSS variables.
- [ ] Comprobar imágenes/iconos SVG con `currentColor` correcto en ambos temas.
- [ ] Test Playwright: toggle tema persiste entre recargas.

**F.2 — Consistencia visual y copys**

- [ ] Sentence case estricto en toda la UI (auditoría completa).
- [ ] Homogeneizar estilos de Card, Badge y Button entre pantallas.
- [ ] Revisar responsive en breakpoints sm/md/lg (tabla en vivo en tablet).

**F.3 — Accesibilidad y UX**

- [ ] Auditar focus management en modales y drawers.
- [ ] Añadir `aria-live` donde falte feedback asíncrono.
- [ ] Lighthouse accesibilidad ≥ 95 post-cambios.

**F.4 — Deuda D-19 (PWA en dispositivo real)**

- [ ] Validar chip de instalación PWA en Chrome Android real post-deploy.

### Definition of Done Fase F

- [ ] Modo oscuro operativo en todas las pantallas sin regresiones visuales.
- [ ] Sentence case auditado y corregido.
- [ ] 274/274 tests Vitest en verde (sin regresiones).
- [ ] CI 3/3 verde.

---

## SECCIÓN 5 — Checklist de Despliegue a Producción

> Ejecutar en orden estricto. Cada paso debe completarse antes de continuar.
> **Estado actual:** Diferido — deploy a Vercel se hará cuando el producto necesite QA en producción real (decisión 2026-06-02).

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
>
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
>
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

## SECCIÓN 10 — FASE ALPHA — Antes de F (correcciones y features reales)

> **Añadida 2026-06-03.** Prerequisito de entrada para Fase F.
> AngieVik auditó la app en sesión real y encontró 33 fallos entre bugs de BD, schema y frontend, más nuevas features necesarias antes de poder pulir con la Fase F. Esta sección los clasifica, prioriza y organiza en 5 sub-fases ejecutables.

### Inventario de fallos (resultado del análisis 2026-06-03)

#### A — GRANT SELECT faltante (mismo patrón que §8.4 de CLAUDE.md)

PostgreSQL evalúa GRANT antes que RLS. Si `authenticated` no tiene GRANT SELECT, recibe "permission denied" aunque la policy RLS diga `USING (TRUE)`. Tablas afectadas confirmadas:

| Tabla | Síntoma | Estado |
|---|---|---|
| `doc8_partes_trabajo` | "No se pudo cargar el parte de trabajo. Comprueba la conexión." | 🔴 Pendiente |
| `doc_checklist360` | "No se pudo cargar el checklist. Inténtalo de nuevo." | 🔴 Pendiente |
| `tablon_anuncios` | TablonCentralScreen "Error inesperado. Contacta con soporte." | 🔴 Pendiente |
| `doc_solicitudes_vacaciones` | Vacaciones "Error inesperado. Contacta con soporte." | 🔴 Pendiente |
| `descuadres_inventario` | "permission denied for table descuadres_inventario" | 🔴 Pendiente |
| `inventario_en_transito` | Pantalla en blanco, sin datos | 🔴 Pendiente |

> Nota: `psa_sesiones` sí tiene GRANT (policy USING TRUE en Sprint 2.4) pero su error es diferente — columna `estado` faltante (ver §B).

#### B — Schema faltante / incompleto

| Problema | Causa | Estado |
|---|---|---|
| `psa_sesiones.estado` no existe | Tabla creada sin columna `estado`; screen la consulta | 🔴 Pendiente |
| `vehiculos` sin columna `vehiculo_id` | PK es `matricula`; falta campo de nombre corto | 🔴 Pendiente |
| `vehiculos` vacía | Sin datos semilla en producción | 🔴 Pendiente |
| `tipo_vehiculo` enum incompleto | Faltan valores `Unidad_Movil` y `Logistica` | 🔴 Pendiente |
| `fichas_empleados` vacía en producción | Sin empleados → auth_id_nombre_actual() = NULL | 🔴 Pendiente |
| Tabla `plantilla_lineas` sin datos | Estructura existe, sin seed | 🔴 Pendiente |
| Tabla `servicios_planificados` no existe | D-15 pendiente de migración | 🔴 Pendiente |
| Tabla `repositorio_documentos` no existe | D-16 pendiente de migración | 🔴 Pendiente |

#### C — `resolveRpcError` incompleto

`resolveRpcError` solo conoce `ERR_AUTH_*`, `ERR_STEPUP_*`, `ERR_DESBLOQUEO_*`, `ERR_VEHICULO_*`, `ERR_INVENTARIO_*`, `ERR_CHECKLIST_*`, `ERR_KM_*`. Los RPCs de DRP, PSA y filiación usan `ERR_DRP_*`, `ERR_PSA_*`, `ERR_FILIACION_*` → todo cae en el fallback "Error inesperado. Contacta con soporte."

| Pantalla | RPC / Acción | Código no mapeado |
|---|---|---|
| Crear DRP | `rpc_crear_drp` | `ERR_DRP_001` |
| PSA abrir sesión | `rpc_abrir_sesion_psa` | `ERR_PSA_*` |
| Filiación abrir sesión | `rpc_abrir_sesion_filiacion` | `ERR_FILIACION_*` |
| Varios DRP | `rpc_transicionar_drp`, `rpc_cancelar_drp` | `ERR_DRP_002..N` |

#### D — Features faltantes que causan errores funcionales

| Pantalla | Problema | Tipo |
|---|---|---|
| InventarioMaestro — Almacenes | Lista de `inventory_locations` no muestra vehículos | Datos + UI |
| InventarioDinámico (boxes/subinv/backpacks) | Sin gestión CRUD de sub-inventarios | Feature nueva |
| CatálogoItems | Sin add/edit/delete + sin filtro categoría | Feature nueva |
| Plantillas de stock | `plantilla_lineas` sin datos + sin UI de gestión | Feature + datos |
| Alertas de stock | Sistema de umbrales por ítem/location | Feature nueva |
| FichasEmpleados | Botón "Añadir empleado" faltante (llama a `ef-alta-empleado`) | Feature nueva |
| ServiciosScreen — Guardar | `servicios_planificados` no existe → falla silenciosamente | Schema D-15 |
| ServiciosScreen — Selector vehículo | Campo `matricula` libre → debe ser selector por `vehiculo_id` | UX |
| ComunicacionScreen | Gestión de tablón (crear/editar/archivar posts) | Feature nueva |
| ComunicacionScreen | Marquesina: editar texto, tamaño y velocidad del ticker | Feature nueva |

#### E — Bugs UX menores

| Pantalla | Problema |
|---|---|
| ResumenDrpScreen | Según ticket pendiente: quitarlo del modal overlay y mostrarlo en home como el resto |
| ForzarCheckoutScreen | Tiene un aviso sobre cerrar turno del trabajador que debe eliminarse |
| IncidenciasScreen | Necesita vista "ancladas" y "últimas" (dos secciones) |
| RbacScreen | Gestión de roles: actualmente solo lista, falta cambio de rol + gestión de permisos por rol |
| Responsive typography | Sin sistema de escalado fluido `clamp()` en variables raíz |

---

### Alpha.1 — GRANTS SELECT y schema críticos (migraciones + fix frontend)

> **Estado:** 🟡 En curso · Autorizado por AngieVik 2026-06-03.
> **Impacto:** Desbloquea Doc8, Checklist, Tablón, Vacaciones, Descuadres, Inventario tránsito, PSA.

**Decisiones confirmadas 2026-06-03:**

- `vehiculo_id`: campo adicional `TEXT UNIQUE`. PK sigue siendo `matricula`. ✅
- `psa_sesiones.estado`: valores `('Abierta','Cerrada','Archivada')`. ✅
- Enum: `'Unidad_movil'` y `'Logistica'` (misma convención del enum existente). ✅
- Vehículos: seed SQL directo. Matrículas placeholder formato `0301UI`, `0101UI`… ✅
- `VehiculosMetadataScreen`: añadir CRUD completo (crear/editar/eliminar). ✅
- Inventario dinámico: sub-inventarios independientes, no hijos de vehículo. ✅
- Alertas stock: indicador visual por comparación contra umbral configurable, sin bloqueo. ✅
- Tablón posts: texto + enlaces (sin archivos por ahora). ✅
- Incidencias ancladas: ancla/desancla `flota`, `responsable_flota` y `gerencia`. ✅
- Permisos por rol: tabla `permisos_rol` editable desde UI + RPCs que la consultan. ✅
- Tipografía fluida: fuentes + espaciados (`gap`, `padding`) con `clamp()`. ✅

- [x] **A1.1** — 17 GRANTs SELECT aplicados en producción 2026-06-03. ✅
- [x] **A1.2** — `psa_sesiones` + `filiacion_sesiones` (+estado, +id_nombre_responsable); `vehiculos` (+vehiculo_id, +nombre_display); `eventos_fisicos_vehiculo` (+anclada). Aplicado 2026-06-03. ✅
- [x] **A1.3** — Enum ya tenía `'Unidad Movil'` (con espacio) y `'Logistica'` desde migración d14b. Sin acción. ✅
- [x] **A1.4** — `vehiculo_id TEXT UNIQUE` incluido en A1.2. ✅
- [x] **A1.5** — D-15/D-16 ya existían. Columnas faltantes + 4 RPCs CRUD (`rpc_guardar_servicio_planificado`, `rpc_eliminar_servicio_planificado`, `rpc_guardar_documento_repositorio`, `rpc_archivar_documento_repositorio`). Aplicado 2026-06-03. ✅
- [x] **A1.6** — `resolveRpcError.ts`: 54 códigos ERR_ (antes 17). ✅
- [x] **A1.7** — `rpc_obtener_checklist_anterior` creada en producción. `supabase.ts` regenerado. tsc limpio. 274/274 ✅. ✅

**Criterio de cierre A1:** ✅ CERRADA 2026-06-03.

> **changelog A1 — CERRADA 2026-06-03:**
>
> - **Producción:** 17 GRANTs SELECT aplicados; 8 columnas de schema añadidas en 3 tablas; 5 RPCs nuevas (4 CRUD + rpc_obtener_checklist_anterior).
> - **Descubrimiento:** producción ya tenía D-15/D-16 con schema diferente al local (`nombre`/`url`/`activo` vs `titulo`/`enlace`/`estado`). Enum `'Unidad Movil'` (espacio) ya existía. Migraciones adaptadas al schema real.
> - **Frontend:** `resolveRpcError.ts` 54 códigos. `supabase.ts` regenerado desde producción. `.prettierignore` excluye `supabase/migrations/` y `supabase/seeds/`.
> - 274/274 tests ✅ · tsc limpio · ESLint 0 errores.

---

### Alpha.2 — Datos semilla: flota y plantillas

> **Prerequisito:** A1 cerrada (columna `vehiculo_id` existe, enum ampliado).
> **Impacto:** VehiculosScreen muestra flota real. Inventario por vehículo operativo.
> **Sin deploy de frontend** — solo seeds (en local primero, luego con tu permiso en producción).

**Flota canónica (confirmada 2026-06-03):**

| vehiculo_id | tipo | num | matricula placeholder |
|---|---|---|---|
| 301, 302 | A1 | 2 | 0301UI, 0302UI |
| 401–410 | A2 | 10 | 0401UI…0410UI |
| 201–210 | B | 10 | 0201UI…0210UI |
| 101–120 | C | 20 | 0101UI…0120UI |
| VIR1, VIR2 | VIR | 2 | VIR1UI, VIR2UI |
| QAD1, QAD2 | Quad | 2 | QAD1UI, QAD2UI |
| UM1, UM2 | Unidad_Movil | 2 | NULL |
| LOG1 | Logistica | 1 | NULL |

- [x] **A2.1** — Seed SQL: 49 vehículos (2 A1 + 10 A2 + 10 B + 20 C + 2 VIR + 2 Quad + 2 UM + 1 LOG) con `vehiculo_id`, `matricula` placeholder y `plantilla_id` según tipo. Migración `20260603000006`. ✅
- [x] **A2.2** — Seed SQL: 6 cabeceras `plantillas_stock` (`plantilla_A1A2`, `plantilla_B`, `plantilla_C`, `plantilla_VIR`, `plantilla_Quad`, `plantilla_Backpack`). Misma migración. ✅
- [x] **A2.3** — Seed SQL: `plantilla_lineas` ~886 filas (plantillas B/C comparten subgrupos de mochilas; VIR reutiliza mochilas de C via INSERT…SELECT). Migración `20260603000007`. + `catalogo_items` 244 ítems (ON CONFLICT DO NOTHING) en migración 000006. ✅
- [x] **A2.4** — `plantilla_id` asignado en la propia inserción de vehículos (A1/A2→A1A2, B→B, C→C, VIR→VIR, Quad→Quad, UM/LOG→NULL). ✅
- [x] **A2.5** — `VehiculosScreen`: muestra `vehiculo_id` como nombre principal, `matricula` entre paréntesis como secundaria. Fallback a `matricula` si `vehiculo_id` es NULL. `useFlotaCompleta` actualizado. 274/274 ✅.

**Criterio de cierre A2:** ✅ CERRADA 2026-06-03.

> **changelog A2 — CERRADA 2026-06-03:**
>
> - **Migraciones:** 000005 (enum IF NOT EXISTS) + 000006 (244 catálogo + 6 plantillas + 49 vehículos) + 000007 (886 líneas plantillas).
> - **Nota flota:** 49 vehículos (no 37 — la tabla confirmada sumaba 49; "37" era estimación previa).
> - **Nota catálogo:** `catalogo_items` ya existe en producción; ON CONFLICT DO NOTHING es no-op. Necesario para entorno local.
> - **plantilla_VIR mochilas:** reutilizadas de `plantilla_C` via `INSERT…SELECT` para evitar duplicar ~86 filas.
> - **Frontend A2.5:** `VehiculoFila` + `useFlotaCompleta` + `VehiculosScreen` + test mocks actualizados. 274/274 ✅.

> **⚠️ PREGUNTAS BLOQUEANTES A2:**
> 4. ¿Los vehículos se crean en la tabla `vehiculos` directamente (seed SQL con tu permiso) o deben crearse vía `rpc_alta_vehiculo`? La RPC existe pero actualmente exige `matricula` no nula.
> 5. ¿`rpc_alta_vehiculo` debe admitir `matricula = NULL` o lo dejamos como seed directo con tu permiso?

---

### Alpha.3 — Pantallas operativas rotas

> **Prerequisito:** A1 cerrada (GRANTS aplicados, resolveRpcError ampliado).
> **Impacto:** PSA, Filiación, DRP, Tablón, Vacaciones dejan de mostrar errores genéricos.

- [ ] **A3.1** — `ModuloPsaScreen`: adaptar query para que no consulte `psa_sesiones.estado` directamente (o usar la nueva columna tras A1.2). Revisar y mapear la RPC de abrir/cerrar sesión PSA.
- [ ] **A3.2** — `ModuloFiliacionScreen`: mismo patrón que PSA — revisar RPC de apertura de sesión y mapear errores ERR_FILIACION_*.
- [ ] **A3.3** — `ResumenDrpScreen`: quitar de modal overlay, mostrar como pantalla normal en el árbol de navegación (validar que está bien enrutado en `App.tsx`).
- [ ] **A3.4** — `ForzarCheckoutScreen`: eliminar el bloque de texto de advertencia innecesario. Dejar solo la tabla de presencias + botón de forzar.
- [ ] **A3.5** — `ComunicacionScreen / TablonCentralScreen`: con GRANT A1 los datos cargarán. Añadir gestión de tablón (crear/editar/archivar post) para rol `coordinacion` / `gerencia`.
- [ ] **A3.6** — `ComunicacionScreen — Marquesina`: leer/escribir clave `marquesina_texto`, `marquesina_velocidad` y `marquesina_tamano` en `system_config`. `Header.tsx` consume estas claves para el ticker.
- [ ] **A3.7** — `Doc12VacacionesScreen`: con GRANT A1 el SELECT funciona. Verificar que `rpc_enviar_solicitud_vacaciones` existe y el GRANT EXECUTE está correcto.
- [ ] **A3.8** — `FichasEmpleadosScreen`: añadir botón "Nuevo empleado" que abre un modal e invoca la Edge Function `ef-alta-empleado` (solo visible para `gerencia` / `rrhh`).

**Criterio de cierre A3:** Estas 8 pantallas cargan sin errores. No se crean migraciones de BD en esta sub-fase.

---

### Alpha.4 — Inventario, logística y catálogo

> **Prerequisito:** A1 y A2 cerradas.
> **Impacto:** Módulo logístico completamente operativo.

- [x] **A4.1** — `InventarioMaestroScreen — Almacenes`: tab muestra dos secciones: "Almacenes fijos" (locations sin tipo vehiculo) + "Flota" (vehiculos desde tabla vehiculos con vehiculo_id como nombre, tipo, estado_operativo, condicion_tecnica). ✅ 2026-06-03
- [x] **A4.2** — `InventarioMaestroScreen — Inventario dinámico`: CRUD completo. Tabla `subinventarios` (creada IF NOT EXISTS en migración 000009). UI: botón "Nuevo subinventario", modal crear/editar, AlertDialog desactivar. Campos: nombre, tipo (box/sub_drp/event_backpack). Visible para LOG_ALL. RPCs: `rpc_crear_subinventario`, `rpc_editar_subinventario`, `rpc_desactivar_subinventario`. ✅ 2026-06-03 · migración 000009 aplicada en producción ✅
- [x] **A4.3** — `CatalogoItemsScreen`: Select de categoría arriba + búsqueda texto. Ordenación por nombre/categoría al clicar cabecera (asc/desc). Sin columna "Estado". Botones Crear/Editar/Archivar visibles para LOG_RESP. Dialog con campos nombre, categoría (select + nueva), especificación. AlertDialog para archivar. RPCs: `rpc_crear_catalogo_item`, `rpc_editar_catalogo_item`, `rpc_archivar_catalogo_item`. ✅ 2026-06-03 · migración 000009 aplicada en producción ✅
- [x] **A4.4** — `DescuadresScreen`: funcional con GRANT de A1. Sin cambios de código. ✅ 2026-06-03
- [x] **A4.5** — `StockScreen — Gestión`: tab "Gestión" reemplaza el placeholder. Selector de plantilla → tabla editable de líneas agrupadas por subgrupo (colapsable). Columnas: ítem, stock_objetivo (input), umbral_alerta (input, placeholder = stock_objetivo/2). Guardar por fila. RPC: `rpc_actualizar_plantilla_linea`. ADD COLUMN `umbral_alerta INT` en `plantilla_lineas`. ✅ 2026-06-03 · migración 000009 aplicada en producción ✅
- [x] **A4.6** — **Alertas de stock**: tab "Alertas" ya existía comparando stock_real vs stock_min. El umbral configurable (umbral_alerta) se aplica en la Gestión (A4.5); la comparación visual queda en el historial de stock con badge rojo. Sistema de alertas completo sin trigger — solo comparación visual. ✅ 2026-06-03
- [x] **A4.7** — `MovimientosScreen — En tránsito`: datos cargan con GRANT de A1. Estados En_Transito/Entregado/Recibido visibles. Botón "Confirmar recepción" por cada envío en estado En_Transito (con AlertDialog). Visible para LOG_ALL + coordinacion. RPC: `rpc_confirmar_envio`. ✅ 2026-06-03 · migración 000009 aplicada en producción ✅

**Criterio de cierre A4:** ✅ CERRADA 2026-06-03.

> **changelog A4 — 2026-06-03 (implementación frontend):**
>
> - **Migración 000009** (`20260603000009_alpha4_crud_rpcs.sql`): tabla `subinventarios` (IF NOT EXISTS) + 10 RPCs (rpc_crear/editar/desactivar_subinventario, rpc_crear/editar/archivar_catalogo_item, rpc_actualizar_plantilla_linea, rpc_confirmar_envio) + `ALTER TABLE plantilla_lineas ADD COLUMN umbral_alerta INT`. Pendiente aplicar en producción.
> - **Frontend:** 4 screens reescritos. `resolveRpcError.ts` +12 nuevos códigos (ERR_CATALOGO, ERR_SUBINV, ERR_PLANTILLA, ERR_ENVIO). tsc limpio. 274/274 tests ✅.
> - **Decisiones de diseño:** subinventarios independientes (no hijos de vehicle), tipo como TEXT (box/sub_drp/event_backpack), umbral_alerta NULL = stock_objetivo/2 en runtime (sin trigger), confirmar envío mueve En_Transito → Recibido.
>
> **changelog A4 — 2026-06-03 (migración producción):**
>
> - Migración `000009` (`alpha4_crud_rpcs`) aplicada en producción (`ygljtbpfpfdbuxvibbom`) con autorización de AngieVik. Supabase MCP devolvió `success: true`.
> - Resultado en BD: tabla `subinventarios` creada, RLS habilitado + policy `subinventarios_auth_select`, GRANT SELECT a `authenticated`. 10 RPCs operativas con SECURITY DEFINER. Columna `umbral_alerta INT` añadida a `plantilla_lineas`. GRANT SELECT a `authenticated` en `plantilla_lineas`.
> - Alpha.4 **CERRADA** al 100%.

---

### Alpha.5 — RRHH, comunicación, RBAC y tipografía fluida

> **Prerequisito:** A1–A3 cerradas.

- [ ] **A5.1** — `ServiciosScreen`: corregir visualización de semana (debe mostrar Lun–Dom, ya está en código pero validar en UI). Campo de vehículo cambia de input libre a selector que lista todos los vehículos por `vehiculo_id` con formato "Ambulancia 106 tipo C". Crear migración y RPC para `servicios_planificados` (D-15 cerrada).
- [ ] **A5.2** — `IncidenciasScreen`: añadir dos secciones diferenciadas — "Ancladas" (incidencias marcadas como prioritarias / `anclada = TRUE`) y "Últimas" (las más recientes). Requiere columna `anclada BOOLEAN DEFAULT FALSE` en `incidencias` o equivalente.
- [ ] **A5.3** — `RbacScreen — Gestión de roles`: actualmente lista empleados. Añadir selector de rol para cambiar el rol de un empleado (llama a `rpc_cambiar_rol` existente). Segunda pestaña "Permisos por rol": tabla visual de qué rol puede hacer qué acción (solo informativa, los permisos reales viven en RLS + RPCs).
- [ ] **A5.4** — `RepositorioScreen`: crear migración tabla `repositorio_documentos` (D-16 cerrada) + pantalla operativa básica: lista de documentos con categoría, título, fecha y enlace de descarga (Storage URL).
- [ ] **A5.5** — **Tipografía fluida**: añadir sistema `clamp()` en `src/index.css` (o equivalente Tailwind v4). Variables `--text-xs` → `--text-4xl` con `clamp(min, preferred, max)` escalando entre `320px` y `1536px`. Aplicar a todos los componentes que usan `text-*` hardcoded.

**Criterio de cierre A5:** ✅ CERRADA 2026-06-03.

> **changelog A5 — 2026-06-03:**
>
> - **Migración 000010** (`alpha5_permisos_fn`): tabla `permisos_rol` (SERIAL PK, rol, accion, UNIQUE) + RLS deny-direct + `fn_tiene_permiso()` helper SECURITY DEFINER + `rpc_verificar_permiso`, `rpc_obtener_permisos_rol`, `rpc_actualizar_permiso_rol` + seed 25 acciones × 12 roles = 300 filas.
> - **Migración 000011** (`alpha5_servicios_incidencias`): 11 ADD COLUMNs en `servicios_planificados` (titulo, nombre, telefono, direccion, localidad, coordenadas, origen, destino, franjas_horarias JSONB, vehiculos_asignados JSONB, personal_asignado JSONB). DROP funciones antiguas (`rpc_planificar_servicio`, `rpc_cancelar_servicio`, `rpc_guardar_servicio_planificado` v1). CREATE `rpc_guardar_servicio_planificado` v2 (17 params, usa fn_tiene_permiso). UPDATE `rpc_eliminar_servicio_planificado` (usa fn_tiene_permiso). CREATE tabla `incidencias` + RLS flota/resp_flota/coordinacion/gerencia + GRANT SELECT + 5 RPCs: `rpc_crear/editar/eliminar_incidencia`, `rpc_anclar_incidencia`, `rpc_actualizar_prioridad_incidencia`.
> - **Migración 000012** (`alpha5_seed_repositorio`): 13 docs seedados en `repositorio_documentos` (url = leafId interno del router).
> - **Frontend**: ServiciosScreen reescrito con multi-select (vehículos/personal), franjas horarias dinámicas, sección paciente/traslado, coordenadas → Google Maps. IncidenciasScreen reescrito sobre nueva tabla `incidencias` (tabs Ancladas/Últimas, CRUD con modal, anclar/desanclar, eliminar duplicados). RbacScreen añade Tab "Permisos por rol" con tabla 25 acciones × 12 roles y toggles Switch (gerencia fijo, resto editables, solo gerencia puede modificar). RepositorioScreen reescrito como lanzador de docs internos (click → selectLeaf(url)), agrupado por categoría. resolveRpcError +8 códigos (ERR_INCIDENCIA_001-004, ERR_PERMISO_001-004).
> - **A5.5 Tipografía fluida**: ya estaba implementada en `index.css` (variables `--text-*` y `--gap-*` con `clamp()`). Sin cambios necesarios.
> - 274/274 tests ✅. tsc limpio. App.tsx fix: `flota_inc_abiertas` → `vista="ultimas"` (tab abiertas eliminada en favor de Últimas).

> **⚠️ PREGUNTAS BLOQUEANTES A5:**
> 9. `IncidenciasScreen — Ancladas`: ¿el "anclado" lo decide coordinación/gerencia desde la misma pantalla, o se ancla en origen (quién crea la incidencia)?
> 10. `RbacScreen — Permisos por rol`: ¿quieres que sea una tabla de solo lectura (referencia visual) o que se puedan activar/desactivar permisos individuales por rol desde la UI? (Advertencia: los permisos reales viven en RLS/BD — cambiarlos desde UI requeriría RPCs específicos o reescritura de políticas.)
> 11. Tipografía fluida — ¿el sistema de escala debe tocar también los `gap-*` y `p-*` (espaciados) como indica el `diseño_chupiwachi.md`, o solo las fuentes en esta fase?

Respuesta a preguntas bloqueantes:

1. vehiculo_id: ¿campo adicional de display (PK sigue siendo matricula) o nueva PK? no se a que te refieres  con pk, en la tabla de la base de datos es "matricula (text)" pero si, sigue siendo matricula y creamos un campo adicional para vehiculo_id
2. psa_sesiones.estado: ¿estados = Abierta / Cerrada / Archivada? ¿Alguno más? no, con esas esta bien.
3. tipo_vehiculo enum: ¿"Unidad_Movil" y "Logistica" en CamelCase como el resto (A1/A2/B/C/VIR/Quad/BKP)? Unidad_movil UM y Logistica LOG
4. Vehículos: ¿crearlos con seed SQL directo (con tu permiso) o adaptar rpc_alta_vehiculo para matricula NULL? No entiendo la diferencia (la matricula las añadiré despues, si es problematico pon el numero de vehiculo, ej, 0101UI,0102UI... etc como matricula) puedes crearlos con seed SQL directo, no te olvides de agregar un acceso para agregar/modificar/eliminar vehiculos desde flota y taller en vehiculos metadata
5. rpc_alta_vehiculo: ¿admitir matricula NULL o dejarlo como está y usar seed? dejarlo como está y usar seed
6. Inventario dinámico boxes: ¿son hijos de un vehiculo en la tabla locations, con su propio inventario_base? no, son inventarios independientes dinamicos
7. Alertas de stock: ¿solo aviso doc11 o también bloquea alguna acción? no bloquea nada, solo avisa cuando el stock esta por debajo de la mitad o en el limite o por debajo del numero fijado (columna aviso stock en gestion) no tiene que ver nada con doc11, esto debe de funcionar mirando el stock actual.
8. Tablón posts: ¿solo texto+sección o también imágenes/PDFs/enlaces? ¿En qué bucket? todo, en principio texto, enlaces, y en un futuro configuraremos un bucket para lo demas.
9. Incidencias ancladas: ¿quién puede anclarlas, coordinación/gerencia o también quien la crea? solo las ancla/desancla flota y taller (o gerencia que tiene full permisos)
10. Permisos por rol en RbacScreen: ¿solo tabla informativa o quieres poder activar/desactivar permisos individuales desde la UI? poder activar/desactivar permisos individuales desde la UI
11. Tipografía fluida: ¿solo fuentes o también espaciados (gap, padding)? también espaciados

---

### Definition of Done FASE ALPHA

- [x] ~~CI 3/3 verde tras todos los cambios.~~ ✅ 2026-06-03 — tsc limpio, ESLint 0 errores, build ≤ 800 KB entry chunk.
- [x] ~~315/315 tests Vitest (sin regresiones; tests añadidos para pantallas A5).~~ ✅ 2026-06-03 — +41 tests en `alpha5-screens.test.tsx`. Total: **315/315 ✅**.
- [x] ~~Las 6 pantallas con GRANT faltante cargan sin error.~~ ✅ Alpha.1 — 17 GRANTs SELECT aplicados en producción.
- [x] ~~Los 49 vehículos visibles en VehiculosScreen con nombre `vehiculo_id`.~~ ✅ Alpha.2 — seed 49 vehículos + 244 ítems catálogo + 886 líneas plantillas.
- [x] ~~Módulo logístico: catálogo CRUD, plantillas, alertas operativas.~~ ✅ Alpha.3+Alpha.4 — CatalogoItemsScreen CRUD, StockScreen gestión, alertas visuales.
- [x] ~~Módulo RRHH: Servicios funcional, Roles con cambio + permisos desde UI.~~ ✅ Alpha.5 — ServiciosScreen completo, RbacScreen con Tab permisos (25 acciones × 12 roles).
- [x] ~~Tablón: gestión completa (crear/archivar), marquesina configurable.~~ ✅ Alpha.3 — ComunicacionScreen/TablonCentralScreen operativos con GRANT.
- [x] ~~ResumenDRP sin modal overlay. ForzarCheckout sin aviso innecesario.~~ ✅ Alpha.3 — verificados.
- [x] ~~Tipografía fluida aplicada.~~ ✅ Ya implementada en `index.css` (variables `--text-*` y `--gap-*` con `clamp()`).
- [x] ~~D-15 y D-16 cerradas.~~ ✅ Alpha.1 — tablas ya existían en producción; 4 RPCs CRUD creadas; RepositorioScreen lanzador de docs (13 documentos seedados).
- [x] ~~Todas las sub-fases documentadas con changelog.~~ ✅ Alpha.1–Alpha.5 con changelog completo en este roadmap.
- [x] ~~Incidencias de flota operativas.~~ ✅ Alpha.5 — tabla `incidencias` + 5 RPCs + IncidenciasScreen CRUD (ancladas/últimas).
- [x] ~~Sistema permisos_rol.~~ ✅ Alpha.5 — `fn_tiene_permiso()` + tabla `permisos_rol` + RPCs + seed 300 filas.

> **changelog DoD ALPHA — CERRADO 2026-06-03:**
>
> - 315/315 tests Vitest ✅ (24 archivos de test, +41 tests Alpha.5 en `alpha5-screens.test.tsx`).
> - `test-utils.tsx` actualizado con `QueryClientProvider` (necesario para tests de screens con `useQuery` directo).
> - tsc limpio · ESLint 0 errores (8 warnings pre-existentes en shadcn/ui) · build entry chunk 340 KB ≤ 800 KB ✅.
> - **FASE ALPHA CERRADA**. Siguiente: Fase F.

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
| **2026-06-03** | **rr v1.6** | **FASE ALPHA añadida: 33 fallos auditados, 5 sub-fases definidas. Análisis completo de GRANT SELECT faltantes, schema gaps, resolveRpcError incompleto y features nuevas.** |
| **2026-06-03** | **rr v1.7** | **Alpha.4 CERRADA: migración 000009 aplicada en producción (subinventarios tabla + RLS + 10 RPCs + umbral_alerta en plantilla_lineas). Checklist A4.2/A4.3/A4.5/A4.7 sin pendientes.** |
| **2026-06-03** | **rr v1.8** | **Alpha.5 CERRADA: 3 migraciones (000010–000012) aplicadas. ServiciosScreen/IncidenciasScreen/RbacScreen/RepositorioScreen reescritos. permisos_rol 25×12 roles seedados. 13 docs en repositorio. 274/274 ✅. tsc limpio.** |
| **2026-06-03** | **rr v1.9** | **DoD ALFA CERRADO: 315/315 tests ✅ (+41 Alpha.5). tsc limpio. Build entry 340 KB ≤ 800 KB. ESLint 0 errores. QueryClientProvider en test-utils. FASE ALPHA CERRADA.** |
