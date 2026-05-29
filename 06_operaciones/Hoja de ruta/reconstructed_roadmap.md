# Roadmap Maestro U24 — Source of Truth Unificado

> **Versión:** 1.0 (consolidación documental)
> **Fecha de consolidación:** 2026-05-29
> **Autor:** Claude (consolidado desde `hoja_de_ruta.md` v2.1 + `frontend_reconstruction_roadmap.md` v2.1 + `deployment_checklist.md`)
> **Estado del proyecto:** Fase E en curso · 270 tests (240 ✅ / 30 ❌) · deuda de testing Fase D bloqueante
>
> **Fuentes de verdad complementarias (NO reemplazadas por este documento):**
> - Reglas arquitectónicas: `.claude/CLAUDE.md` v2.2
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
| **E** | **Validación y reapertura checklist de despliegue** | **🔴 En curso — BLOQUEADA (ver §3)** |
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

### Telemetría actual del test suite (2026-05-29)

```
Tests totales:   270
Tests pasando:   240 ✅
Tests fallando:   30 ❌  ← BLOQUEANTE para E2E

Archivos fallando:
  - src/test/Doc8ParteTrabajoScreen.test.tsx
  - src/test/Checklist360Screen.test.tsx
  - src/test/BlackColumn.test.tsx (parcial — tests de openModal/modalLeafId)

Archivos de test existentes: 22
```

---

## SECCIÓN 2 — Política de trabajo (lectura obligatoria al cambiar de agente)

1. **Una fase a la vez.** No se inicia Fase E completa hasta cerrar el bloqueante de testing.
2. **Claude pregunta antes de empezar cada fase.** Solo tras confirmación explícita comienza la implementación.
3. **Cada cambio se documenta en `diseño_chupiwachi.md` §15 (changelog)** en la misma sesión.
4. **No se hacen `npm run build` definitivos ni `git push` ni despliegues a Vercel** hasta cerrar la Fase E completa.
5. **Bloqueo de infraestructura (CRÍTICO):** prohibido alterar BD, crear migraciones o ejecutar despliegues en Supabase sin autorización explícita previa.
6. **Cualquier desviación de las reglas se levanta como deuda** en §6 antes de cerrar la fase.
7. **Sentence case estricto** en toda copy de UI. Sin emojis salvo si el producto lo pide.

---

## SECCIÓN 3 — Bloqueante actual: Deuda de testing Fase D (MÁXIMA PRIORIDAD)

> **Estos tests deben pasar antes de ejecutar cualquier test E2E (Playwright).**
> Esta es la única tarea accionable del proyecto en este momento.

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

## SECCIÓN 4 — Fase E — Validación y reapertura del checklist de despliegue

> Solo se inicia tras cerrar los tres bloqueantes de §3.

### Objetivo

Devolver el proyecto al estado "listo para despliegue" siguiendo el checklist de §5.

### Prerequisitos de entrada

- [ ] **Los 30 tests fallantes de §3 están en verde** (270/270).
- [ ] `npx tsc -b` sin errores.
- [ ] E2E Playwright actualizados al árbol DOM actual.

### Sub-tareas de Fase E

**E.1 — Validación de bundle y build**
- [ ] `npm run build` pasa: bundle total ≤ 3 MB, entry chunk ≤ 800 KB.
- [ ] Plugin `bundleSizeGuard` en `vite.config.ts` no rompe el build.
- [ ] CI GitHub Actions verde en rama principal.

**E.2 — Auditoría de seguridad pre-deploy**
- [ ] `f_tablas_sin_rls()` → 0 filas.
- [ ] `f_funciones_sin_security_definer()` → 0 filas.
- [ ] Deuda D-12 (GRANTs masivos Sprint 14) — auditoría completa de permisos.
- [ ] Deuda D-13 (RLS policies en `presencias_activas_terminal` / `activaciones_vehiculo`) — endurecer si el modelo de amenaza lo requiere.

**E.3 — Eliminación de bypasses de desarrollo**
- [x] ~~Bypass dev en `LoginScreen.tsx` eliminado~~ ✅ cerrado 2026-05-28 (D-01).
- [ ] Grep de confirmación: `git grep -r "import.meta.env.DEV"` no devuelve rutas críticas.
- [ ] `.env.local` sin `VITE_SENTRY_DSN` (ya configurado, verificar).

**E.4 — E2E Playwright**
- [ ] Suite `e2e/` actualizada al árbol de navegación post-Fase D (49 rutas).
- [ ] Smoke tests: login, check-in, Doc-8, ciclo offline→online, DRP, PWA.
- [ ] CI Playwright verde.

**E.5 — Lighthouse + A11y**
- [ ] Lighthouse performance ≥ 80 en dispositivo simulado.
- [ ] jest-axe sobre todas las pantallas principales (heredado de Sprint 14, validar regresiones).

### Definition of Done Fase E

- [ ] 270/270 tests Vitest en verde.
- [ ] Playwright E2E verde en CI.
- [ ] `npm run build` cumple budget (≤ 3 MB / ≤ 800 KB entry).
- [ ] Todos los puntos del checklist de despliegue (§5) en verde.
- [ ] Se autoriza el primer push a Vercel (producción).

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
☐ Suite completa en verde: pgTAP + Vitest (270 tests) + lint sin errores
☐ Staging branch validada: supabase db reset --linked ejecutado limpiamente
☐ Seeds de staging ejecutados y smoke tests manuales completados
☑ Backup PITR — EXCEPCIÓN ACEPTADA (2026-05-21): plan Free no incluye PITR.
    Riesgo documentado: rollback de BD sería manual. BD vacía pre-deploy.
    Revisar upgrade a Pro post-go-live.
☐ VAPID keys generadas y guardadas en secrets de producción
    (npx web-push generate-vapid-keys → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)
☐ VITE_SENTRY_DSN configurado en proyecto Supabase de producción
☐ VITE_APP_VERSION actualizado en .env.production (semver)
☐ Notificar al equipo: ventana de mantenimiento
```

### FASE 1 — Base de datos (T-0)

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
☐ Login con credenciales empleado demo
☐ Login offline (WiFi desactivado tras primer login)
☐ Banner "Modo sin conexión" visible
☐ PWA: chip de instalación visible (Chrome/Edge Android)
☐ Cuadrante carga semana actual
☐ Inventario carga y muestra stock del vehículo
☐ DRP Panel visible para coordinación/gerencia
☐ System Config visible solo para gerencia
☐ Force-update: actualizar min_version_permitida → banner aparece
```

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
| D-05 | Pruebas | Re-escribir suites E2E borradas en Fase A | Abierta | Fase E |
| D-06 | Diseño | Disciplina del acento amarillo en elementos no autorizados | Abierta | Fase F |
| D-07 | A11y | Auditar focus traps en modales y sheets de shadcn | Abierta | Fase F |
| D-08 | Nav | Eliminar campos `level` antiguo del store de navegación | Abierta | Cerrar con B.4 |
| D-09 | Nav | Clarificar si items de "Visor Mantenimiento", "Mantenimiento flota" y "Modulo_emergencias" son leaves de nav reales o contenido intra-Screen | Abierta | Fase D (resuelta funcionalmente; documentar) |
| ~~D-10~~ | ~~Datos~~ | ~~`fichas_empleados.telefono`~~ | ✅ Cerrado 2026-05-25 (migración `20260524000001`) | — |
| ~~D-11~~ | ~~Datos~~ | ~~`activaciones_vehiculo.tipo_servicio`~~ | ✅ Cerrado 2026-05-25 (misma migración) | — |
| D-12 | BD/Seguridad | Sprint 14 revocó GRANTs masivamente. Auditoría completa de permisos pendiente. | Abierta — CRÍTICO | Fase E (pre-deploy) |
| D-13 | BD/Seguridad | `presencias_activas_terminal` + `activaciones_vehiculo`: RLS liberales provisionales. Endurecer si el modelo de amenaza lo pide. | Abierta | Fase E (pre-deploy) |
| ~~D-14~~ | ~~BD — CRÍTICO~~ | ~~Migraciones pendientes de Fase D~~ | ✅ Cerrado 2026-05-28 (aplicados manualmente en prod) | — |
| D-15 | BD | `ServiciosScreen` usa `servicios_planificados` + RPCs inexistentes en schema actual | Abierta | Fase F |
| D-16 | BD | `RepositorioScreen` usa `repositorio_documentos` inexistente en schema actual | Abierta | Fase F |
| ~~D-17~~ | ~~UX~~ | ~~BandejaModal como overlay flotante~~ | ✅ Cerrado 2026-05-28 — overlay operativo vía `ModalArea` + `modalLeafId` en `App.tsx`. 4 archivos dead code eliminados. 8 tests modal en `useBlackColumnState.test.ts`. | — |
| **D-TEST-01** | **Testing** | **`Doc8ParteTrabajoScreen.test.tsx` — 30 tests fallando** | **🔴 BLOQUEANTE** | **Próximo paso** |
| **D-TEST-02** | **Testing** | **`Checklist360Screen.test.tsx` — tests fallando** | **🔴 BLOQUEANTE** | **Próximo paso** |
| **D-TEST-03** | **Testing** | **`BlackColumn.test.tsx` — tests de openModal/modalLeafId fallando** | **🔴 BLOQUEANTE** | **Próximo paso** |

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

**Edge Functions (13):** `ef-alta-empleado`, `ef-baja-empleado`, `ef-reset-password`, `ef-consumir-pin`, `ef-generar-token-emergencia`, `ef-logout`, `ef-revocar-sesion-usuario`, `ef-renovar-offline-session`, `ef-cron-cleanup-orphans`, `ef-cron-revoke-stale-terminals`, `ef-cron-transito-ttl`, `ef-cron-rgpd`, `ef-push-avisos` + 3 helpers `_shared/`.

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
| D.6 Coordinación | `ModuloEmergenciasScreen`, `DispositivosValidadosScreen`, `VisorSeguimientoScreen`, `RbacScreen`, `ForzarCheckoutScreen`, `CambioPasswordScreen`, `BandejaCoordScreen` |
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
