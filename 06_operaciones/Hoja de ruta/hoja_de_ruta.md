# Hoja de Ruta de Desarrollo — Proyecto U24

**Versión:** 2.0 (auditada)
**Fecha:** 2026-05-20
**Estado del proyecto:** Sprint 1 completado · iniciando Sprint 2
**Documentos complementarios:** `AUDITORIA.md` (hallazgos y trazabilidad) · `hoja_de_ruta_v1_backup.md` (versión anterior)

---

## Cómo leer este documento

Cada sprint se describe con seis bloques fijos:

- **🎯 Objetivo** — el resultado de negocio/técnico del sprint.
- **📋 Tareas** — trabajo concreto con checkboxes.
- **✅ Definition of Done (DoD)** — criterios objetivos para dar el sprint por cerrado.
- **🔗 Dependencias** — qué debe existir antes.
- **⚠️ Riesgos** — qué puede salir mal y su mitigación.
- **🧪 Testing** — qué pruebas demuestran que funciona.
- **📦 Entregables** — artefactos versionados que quedan en el repo.

> **Cambios frente a la v1:** se añade **Sprint 0** (fundaciones de ingeniería), se cierran 2 deudas del Sprint 1, se amplían los Sprints 2-4 con los gaps ADR↔implementación, se divide el backend (≈14 RPCs / ≈14 Edge Functions / ≈12 triggers reales), se añade el **Sprint 12** (RRHH + Comunicación, hoy huérfanos) y el **Sprint 14** (gate de seguridad/RGPD + producción). El testing pasa a ser transversal.

---

## Principios transversales (aplican a todos los sprints)

1. **Migraciones inmutables y deterministas.** Una migración aplicada no se edita; se corrige con una nueva. `supabase db reset` debe ser reproducible siempre.
2. **Escritura solo vía RPC/Edge Function `SECURITY DEFINER`.** El cliente nunca hace `INSERT/UPDATE/DELETE` directo sobre tablas de dominio. RLS es *deny-by-default*.
3. **UTC en la base, `Europe/Madrid` en presentación** (ADR-005). Los payloads del cliente viajan en ISO 8601 UTC.
4. **Idempotencia obligatoria** en toda mutación encolable (ver ADR de idempotencia, Sprint 2).
5. **Identificadores en inglés, UI en español** (ADR-006).
6. **WCAG 2.1 AA** como línea base de toda la UI (ADR-003).
7. **Sin Base64 para imágenes; Blobs → Storage** (ADR-002).
8. **Definition of Done global:** ningún sprint se cierra sin (a) sus tests verdes en CI, (b) tipos TS regenerados y sincronizados, (c) documentación actualizada, (d) revisión de PR aprobada.

### Estrategia de testing (transversal)

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Base de datos | **pgTAP** | Políticas RLS, RPCs (casos felices + errores + concurrencia con `FOR UPDATE`), triggers, constraints e índices parciales. |
| Lógica cliente | **Vitest** | Stores Zustand, `useOfflineQueue` (enqueue/dequeue/retry/idempotencia), `resolveRpcError`, derivación PBKDF2. |
| E2E | **Playwright** | Flujos críticos: login normal/emergencia, check-in vehículo, Doc-8, gasto Doc-6, ciclo offline→online. |
| Accesibilidad | **axe-core** (en Playwright) | Contraste, roles ARIA, focus trap (ADR-003). |
| Carga/estrés | Script dedicado | Cola offline con cientos de mutaciones, reconexión masiva. |

### Mapa de dependencias (resumen)

```
S0 (CI/CD) ──► S1 cierre ──► S2 (RLS+gaps) ──► S3 (RPC/triggers I) ──► S4 (EF/cron II)
                                   │                                        │
                                   └────────────► S5 (scaffolding) ◄────────┘
S5 ──► S6 (offline) ──► S7 (UI base) ──► S8 (acceso) ──► S9 (flota+Storage)
                                                              │
                              S10 (operativa) ── S11 (DRP) ── S12 (RRHH/comms)
                                                              │
                                            S13 (PWA/Push/Obs) ──► S14 (gate prod)
```

---

## Sprint 0 — Fundaciones de Ingeniería *(NUEVO)*

> Puede ejecutarse en paralelo al cierre del Sprint 1. Reduce riesgo en todos los sprints siguientes.
**🎯 Objetivo:** que cada cambio se valide automáticamente y que los entornos y secretos estén gobernados antes de escribir más backend.
**📋 Tareas**

- [✅] **0.1 CI de base de datos:** workflow de GitHub Actions que levanta Supabase, ejecuta `supabase db reset`, valida que migración + seeds aplican y que `supabase gen types` no produce *diff* (tipos sincronizados).
- [✅] **0.2 CI de calidad:** lint (ESLint), formato (Prettier), `tsc --noEmit`. Falla el PR si no pasan.
- [✅] **0.3 Gestión de secretos y entornos:** `.env.example`, separación local/staging/producción, verificación de que `.env*` y claves nunca se commitean. Documentar en runbook.
- [✅] **0.4 Convención de migraciones y ramas:** nomenclatura `YYYYMMDDHHMMSS_descripcion.sql`, política de PR, plantilla de PR con checklist de DoD. Unificar la convención `ef-…` / `ef_…` (ver Anexo A).
- [✅] **0.5 `.gitattributes`:** `*.ts text eol=lf`, `*.sql text eol=lf` para evitar problemas de codificación/EOL.
- [✅] **0.6 Hooks pre-commit** (opcional): `lint-staged` para formatear y validar antes de commitear.

**✅ DoD:** un PR de prueba dispara CI; si la migración falla o los tipos están desincronizados, el PR se bloquea automáticamente.
**🔗 Dependencias:** ninguna.
**⚠️ Riesgos:** *Docker en CI lento* → cachear imagen de Supabase. *Falsos negativos en diff de tipos* → fijar versión del CLI.
**🧪 Testing:** el propio pipeline es la prueba (smoke test de infraestructura).
**📦 Entregables:** `.github/workflows/ci.yml`, `.gitattributes`, `.env.example`, runbook de secretos, plantilla de PR.

### Sprint 0 — Entregables creados

**Tarea Archivo Estado**
    0.1 CI base de datos .github/workflows/ci-database.yml ✅
    0.2 CI calidad .github/workflows/ci-quality.yml ✅
    0.3 Secretos y entornos .env.example · 06_operaciones/runbook-secretos.md · .gitignore actualizado ✅
    0.4 Convenciones + PR template 06_operaciones/convencion-nomenclatura.md · .github/pull_request_template.md ✅
    0.5 .gitattributes .gitattributes ✅
    0.6 Hooks pre-commit — ⏭️ Diferido a Sprint 5 (requiere package.json)
Decisión tomada en 0.4: Edge Functions → ef- + kebab-case (estándar HTTP/URL). Tabla de funciones a renombrar documentada en la convención.

**Lo que hace el CI ahora mismo**
    ci-database.yml — en cada PR: levanta Supabase local → supabase db reset (aplica migración + seeds) → genera tipos → diff contra src/types/supabase.ts. Bloquea si algo falla.
    ci-quality.yml — tres jobs independientes: (a) detecta .env commiteados + JWTs hardcodeados, (b) valida nomenclatura de migraciones, (c) placeholder para lint/tsc/prettier (se activa en Sprint 5 cuando exista package.json).
    Acción inmediata que te toca a ti (deuda 1.D1)
    El CI de tipos bloqueará hasta que se corrija la codificación de src/types/supabase.ts (actualmente UTF-16LE, Hallazgo S1-01). Con Supabase arrancado localmente:
**supabase gen types typescript --local | Out-File -Encoding utf8 src/types/supabase.ts**

### Sprint 1 — Infraestructura de Datos Base ✅ COMPLETADO

**🎯 Objetivo:** esquema de Supabase determinista y profesional. **Verificado:** 27 ENUMs, 50 tablas, índices parciales, RLS en todas, semillas cargadas, tipos generados.
**📋 Cierre de deuda (hacer antes del Sprint 2)**

- [✅] **1.D1** Regenerar `src/types/supabase.ts` en **UTF-8** (hoy está en UTF-16LE por el `>` de PowerShell). Validar con `file` y commitear. *(Hallazgo S1-01)*
- [✅] **1.D2** Eliminar las claves/secretos del documento `sprint_1_complete` (son defaults locales, pero no deben vivir en el repo). *(Hallazgo S2-01)*

**✅ DoD:** `supabase db reset` reproducible · catálogo poblado (244 ítems) · tipos en UTF-8 sincronizados · sin secretos en el repo.
**📦 Entregables:** `20260519000001_init_schema.sql`, `seeds/01..04`, `supabase.ts` (UTF-8), `config.toml`.

- **Resultados de 1.D2**
- `sprint_1_complete.md` → solo aparece en la lista de archivos **ignorados**, nunca fue commiteado. Limpio.
- `Apuntes(ignorar).md` → sí está trackeado (fue commiteado antes de añadirse al `.gitignore`). No es un secreto crítico pero vale la pena desntrackear.

**Sprint 0 ✅ Cerrado · Sprint 1 ✅ Deuda cerrada**
  Encoding supabase.ts: era UTF-8 con BOM (no UTF-16LE como decía la auditoría — probablemente ya se había regenerado parcialmente). Ahora es UTF-8 sin BOM, que es lo que produce el CLI de Supabase → el diff del CI funcionará correctamente.

  Deuda 1.D2: sprint_1_complete.md nunca estuvo en git. Limpio.
    *CI activo desde ahora: cada PR disparará:
      Verificación de secretos/JWTs + convención de migraciones (inmediato)
      DB reset + diff de tipos (requiere Docker en el runner de GitHub)
      Frontend: placeholder hasta Sprint 5
  Ambos sprints cerrados.

## Sprint 2 — Seguridad de Datos (RLS) + Migración Correctiva *(AMPLIADO)*

**🎯 Objetivo:** blindar el acceso a los datos **y cerrar los gaps ADR↔implementación de severidad alta** antes de construir la lógica de servidor.
**📋 Tareas**
**Políticas RLS**

- [✅] **2.1 RLS de tablas core:** políticas de lectura/escritura para `fichas_empleados`, `vehiculos`, `galletas_terminales` (escritura solo vía RPC).
- [✅] **2.2 RLS de tablas clínicas (Doc-2..Doc-5):** el redactor solo accede a sus informes (`auth_uid_redactor = auth.uid()`); lectura ampliada según rol.
- [✅] **2.3 RLS inmutables:** confirmar `USING (FALSE)` en `auditoria_rbac`, `auditoria_inventario`, `doc1_asistencias`, `filiacion_eventos` (ya en migración inicial; verificar cobertura).
- [✅] **2.4 Políticas `SELECT` para Supabase Realtime** *(dependencia del Sprint 10.2)*: `authenticated` debe poder `SELECT` en `psa_pacientes`, `filiacion_pacientes`, `doc11_avisos`, `tablon_anuncios`, `mensajes_bandeja` (salas de espera y bandejas en tiempo real). ****(Hallazgo P-06)*

- **Migración correctiva de gaps**
- [✅] **2.5 Step-up auth (ADR-010):** migración que añade `pin_stepup_hash TEXT NULL` y `pin_stepup_salt TEXT NULL` a `fichas_empleados`, y los valores `step_up_exitoso` / `step_up_fallido` al ENUM `tipo_evento_rbac` (vía `ALTER TYPE ... ADD VALUE`). *(Hallazgo G-01)*
- [✅] **2.6 Idempotencia (decisión + constraint):** redactar **ADR-012** eligiendo entre (a) `mutation_uuid UUID UNIQUE` en cada tabla encolable (Doc-2..Doc-8, Doc-6) o (b) tabla central `idempotency_keys(mutation_uuid PK, rpc, id_nombre, created_at, resultado)`. Implementar la migración correspondiente. *(Hallazgo G-02 — crítico para la cola del Sprint 6)*
- [✅] **2.7 Endurecimiento de `config.toml` (Auth):** `enable_signup = false`; definir `[auth.sessions]` coherente con el refresh de 7 días (ADR-009); `minimum_password_length ≥ 8` + `password_requirements`. *(Hallazgos C-01, C-02, C-03)*
**✅ DoD:** suite pgTAP de RLS verde · ningún rol puede leer/escribir fuera de su política · `mutation_uuid` rechaza duplicados en test · columnas/ENUM de step-up presentes en tipos TS · `config.toml` endurecido revisado.
**🔗 Dependencias:** Sprint 1 cerrado (deuda incluida), Sprint 0 (CI valida la migración).
**⚠️ Riesgos:** *RLS demasiado restrictivo rompe Realtime* (mitigación: 2.4 explícito y test E2E de suscripción). *Elegir mal el patrón de idempotencia* (mitigación: ADR razonado antes de codificar). *Alterar un ENUM en uso requiere `ADD VALUE`* (no recrear el tipo; `ADD VALUE` no es transaccional en versiones antiguas, validar en CI).
**🧪 Testing:** pgTAP por tabla y rol (acceso permitido/denegado); test de inserción duplicada con mismo `mutation_uuid`; test de suscripción Realtime con usuario `authenticated`.
**📦 Entregables:** migración(es) `2026..._rls_policies.sql`, `2026..._stepup_idempotency.sql`, ADR-012 de idempotencia, `config.toml` actualizado, tests pgTAP.

### Sprint 2  Cerrado — Entregables

| Tarea | Entregable | Decisiones clave |
|---|---|---|
| **2.1** RLS core | [`20260521000001_rls_policies.sql`](supabase/migrations/20260521000001_rls_policies.sql) | `auth_rol_actual()` SECURITY DEFINER evita recursión; `galletas_terminales` SELECT solo galleta propia activa |
| **2.2** RLS clínico | mismo fichero | Redactor ve lo suyo; medico/due/coordinacion/gerencia ven todo |
| **2.3** Inmutables | mismo fichero | SELECT habilitado para roles de supervisión (gerencia, rrhh, logistica) |
| **2.4** Realtime | mismo fichero | `psa_pacientes`, `filiacion_pacientes`, `mensajes_bandeja` (destinatario propio) |
| **2.5** Step-up auth | [`20260521000002_stepup_idempotency.sql`](supabase/migrations/20260521000002_stepup_idempotency.sql) | `pin_stepup_hash/salt` en `fichas_empleados`; ENUM extendido con `ADD VALUE IF NOT EXISTS` |
| **2.6** Idempotencia | mismo fichero + [`ADR-012`](01_arquitectura_y_reglas/ADR-012-idempotencia.md) | **Ledger central** `idempotency_keys` (TTL 7 días, opaco al cliente) |
| **2.7** config.toml | [`supabase/config.toml`](supabase/config.toml) | signup=false, password min 8 + complejidad, timebox 168h |
| **Tests** | [`rls_core.test.sql`](supabase/tests/rls_core.test.sql) | 16 assertions pgTAP cubriendo las 4 tareas |

**Siguiente paso:** Sprint 3 — RPCs core + triggers (`rpc_revocar_y_reemitir_galleta`, `rpc_alta/baja_vehiculo`, `rpc_ajuste_manual_stock`, Checklist360, triggers de odómetro y auditoría).

## Sprint 3 — Lógica de Servidor I: RPCs core + Triggers *(AMPLIADO)*

**🎯 Objetivo:** implementar las reglas de negocio atómicas y los disparadores de integridad en el backend.
**📋 Tareas**

- [✅] **3.1 RPCs de autenticación/galletas:** `rpc_revocar_y_reemitir_galleta` (con step-up), `rpc_transferir_galleta`, `rpc_solicitar_desbloqueo`, `rpc_aprobar_desbloqueo`, `rpc_rechazar_desbloqueo`.
- [✅] **3.2 RPCs de vehículos y flota:** `rpc_alta_vehiculo` (inserta `locations` con `location_id = matrícula`), `rpc_baja_vehiculo` (*guard*: rechazar si tiene DRP activo).
- [✅] **3.3 RPCs de inventario:** `rpc_ajuste_manual_stock`, base de gasto/deducción con idempotencia (usa el patrón del Sprint 2.6).
- [✅] **3.4 Tabla + trigger Checklist360:** crear `doc_checklist360` (ausente hoy) y `trg_checklist_genera_doc7` + `trg_doc7_cierre_evaluar_condicion` (recalcula `condicion_tecnica`). *(Hallazgo G-03)*
- [✅] **3.5 Triggers de integridad:** `trg_validar_km_inicio` (odómetro: `km_fin >= km_inicio`), `trg_audit_cambio_rol`, `trg_audit_galleta_emitida/revocada`, `trg_purgar_plantillas_al_archivar`.

**✅ DoD:** cada RPC tiene test pgTAP de caso feliz + cada error documentado en `error_handling.md` · `rpc_baja_vehiculo` bloquea con DRP activo · trigger de odómetro rechaza retroceso de km · Checklist360 genera Doc-7 automáticamente.
**🔗 Dependencias:** Sprint 2 (RLS, step-up, idempotencia).
**⚠️ Riesgos:** *Condiciones de carrera en inventario/DRP* (mitigación: `SELECT ... FOR UPDATE` + tests de concurrencia). *RPC sin `SECURITY DEFINER` o sin `search_path` fijado* (riesgo de escalada — revisar cada función).
**🧪 Testing:** pgTAP de RPCs (incluye intentos no autorizados y step-up fallido); test de trigger Checklist360→Doc-7; test de concurrencia en baja de vehículo.
**📦 Entregables:** migraciones de RPCs/triggers, `doc_checklist360`, suite pgTAP, tabla de errores RPC actualizada.

### Sprint 3  Cerrado — Entregables

**Sprint 3 deliverables:**

| Archivo | Contenido |
|---|---|
| [`supabase/migrations/20260521000003_rpcs_galletas.sql`](supabase/migrations/20260521000003_rpcs_galletas.sql) | `_verificar_stepup()` helper + 5 RPCs de galletas/desbloqueo (ADR-010) |
| [`supabase/migrations/20260521000004_rpcs_vehiculos_inventario.sql`](supabase/migrations/20260521000004_rpcs_vehiculos_inventario.sql) | ENUM `alta_vehiculo` + `rpc_alta_vehiculo`, `rpc_baja_vehiculo` (con guard DRP), `rpc_ajuste_manual_stock`, `rpc_deducir_material` (ambas con idempotencia ADR-012) |
| [`supabase/migrations/20260521000005_checklist360_triggers.sql`](supabase/migrations/20260521000005_checklist360_triggers.sql) | `doc_checklist360` + 6 triggers: `trg_checklist_genera_doc7`, `trg_doc7_evaluar_condicion`, `trg_validar_km` (×2), `trg_audit_cambio_rol`, `trg_audit_galleta` (×2), `trg_purgar_plantillas_al_archivar` |
| [`supabase/tests/rpcs_core.test.sql`](supabase/tests/rpcs_core.test.sql) | 22 tests pgTAP cubriendo las 5 tareas del sprint |
| [`06_operaciones/error_handling.md`](06_operaciones/error_handling.md) | Tabla completa de códigos `ERR_*` + `resolveRpcError()` en TypeScript |

**Decisiones de diseño clave:**
    - El audit log de `galleta_emitida/revocada` lo hacen los triggers de migración 5 (no los RPCs), evitando entradas duplicadas
    - `_verificar_stepup()` es SECURITY DEFINER privada (sin GRANT) — solo llamable desde otras funciones del mismo schema
    - `rpc_deducir_material` usa `FOR UPDATE` en la fila de inventario para evitar race conditions antes de que actúe el CHECK constraint

## Sprint 4 — Lógica de Servidor II: Edge Functions + Crons *(AMPLIADO)*

**🎯 Objetivo:** procesos que requieren privilegios de `service_role` o ejecución programada.
**📋 Tareas**

- [✅] **4.1 Gestión de empleados:** `ef-alta-empleado` (crea `auth.users` + `fichas_empleados`), `ef-baja-empleado` (desactiva, revoca JWT y galletas; con step-up), `ef_reset_password` (ADR-004), `rpc_cambiar_rol`.
- [✅] **4.2 Sesiones y emergencia:** `ef_generar_token_emergencia`, `ef-consumir-pin`, `ef_logout`, `ef_revocar_sesion_usuario`, `ef-renovar-offline-session` (ADR-009).
- [✅] **4.3 RPCs/EF de DRP:** `cancelar_drp` (transacción completa + `FOR UPDATE`), `rpc_asignar_mochila_a_drp`, triggers `trg_descuadre_libera_drp_retenido` / `trg_descuadre_notificar_bandeja`.
- [✅] **4.4 Crons de mantenimiento:** `ef-cron-cleanup-orphans`, `ef-cron-revoke-stale-terminals`, `ef-cron-transito-ttl` (caducidad de tránsitos), expiración de `sesiones_emergencia`.
- [✅] **4.5 Cron**s de RGPD y métricas:** `ef-cron-rgpd` + `rpc_solicitar_borrado_rgpd` / `rpc_procesar_borrado_rgpd` (**anonimización**, no `DELETE`, por los `RESTRICT` — *Hallazgo E-11*), `ef-cron-refresh-dashboard`.
- [✅] **4.6 Doc-12 → cuadrante:** trigger `trg_doc12_aprobada_a_cuadrante` (inyecta turnos al aprobar vacaciones).

**✅ DoD:** todas las EF desplegables localmente · `ef-baja-empleado` revoca acceso de forma verificable · RGPD anonimiza sin violar FKs · crons programados y probados con disparo manual.

**🔗 Dependencias:** Sprint 3 (RPCs/triggers base), Sprint 2 (step-up).

**⚠️ Riesgos:** *Secretos de service_role mal gestionados* (mitigación: Sprint 0.3). *RGPD que rompe integridad* (mitigación: estrategia de anonimización probada). *Crons que solapan* (idempotencia + locks).

**🧪 Testing:** tests de integración de cada EF (alta→login→baja); test de anonimización RGPD que verifica que las referencias siguen íntegras; disparo manual de cada cron.

**📦 Entregables:** `supabase/functions/*`, migraciones de triggers DRP/Doc-12, definición de crons, tests de integración.

### Sprint 4 completado. Resumen de entregables

**Migraciones**
    - supabase/migrations/20260521000006_rpcs_drp_rgpd.sql — rpc_cambiar_rol, rpc_cancelar_drp, rpc_asignar_mochila_a_drp, rpc_solicitar_borrado_rgpd, rpc_procesar_borrado_rgpd
    - supabase/migrations/20260521000007_triggers_drp_doc12.sql — trg_descuadre_notificar_bandeja, trg_descuadre_libera_drp_retenido, trg_doc12_aprobada_a_cuadrante
    - Shared utilities

- supabase/functions/_shared/cors.ts, supabase/functions/_shared/errors.ts, supabase/functions/_shared/auth.ts
- **Edge Functions (12)**
        *Employee: ef-alta-empleado, ef-baja-empleado, ef-reset-password
        *Emergencia: ef-generar-token-emergencia, ef-consumir-pin
        *Sesión: ef-logout, ef-revocar-sesion-usuario, ef-renovar-offline-session
        *Crons: ef-cron-cleanup-orphans, ef-cron-revoke-stale-terminals, ef-cron-transito-ttl, ef-cron-rgpd
        *Tests y documentación
- supabase/tests/sprint4_rpcs.test.sql — 16 tests pgTAP
- 06_operaciones/cron-schedule.md — schedules pg_cron + invocación manual

## Sprint 5 — Scaffolding y Arquitectura Frontend

**🎯 Objetivo:** estructura del proyecto Vite + React + TS y estilos base, lista para construir módulos.
**📋 Tareas**
    - [✅] **5.1 Setup base:** Vite + React + TypeScript (strict).
    - [✅] **5.2 Estructura de carpetas:** `components`, `hooks`, `lib`, `modules`, `stores`, `types`.
    - [✅] **5.3 Tailwind y diseño:** paleta WCAG AA en `tailwind.config.js` + clases tipográficas (importar tokens de `05_interfaz_y_desarrollo/cloude_desing`).
    - [✅] **5.4 Cliente Supabase:** `src/lib/supabase.ts` (singleton) leyendo claves de `.env`.
    - [✅] **5.5 CI frontend:** extender el pipeline (build + lint + `tsc`) — engancha con Sprint 0.

**✅ DoD:** `npm run build` y `npm run dev` funcionan · tipos importados desde `supabase.ts` · CI de frontend verde · ratios de contraste de la paleta documentados (ADR-003).
**🔗 Dependencias:** Sprint 0 (CI), Sprint 4 (tipos definitivos tras todas las migraciones del backend).
**⚠️ Riesgos:** *Deriva entre tipos TS y BD* (mitigación: regeneración en CI). *Presupuesto de bundle* (vigilar desde el inicio: 3 MB total / 800 KB por ruta).
**🧪 Testing:** smoke test de arranque + un test de render del shell vacío.
**📦 Entregables:** proyecto Vite scaffolded, `tailwind.config.js`, `src/lib/supabase.ts`, CI extendido.

## Sprint 5 completo. Resumen de entregables

**5.1 – Setup base**
    - [`package.json`](package.json) — React 19, Vite 6, TypeScript 5.7 (strict)
    - [`tsconfig.json`](tsconfig.json) + [`tsconfig.app.json`](tsconfig.app.json) + [`tsconfig.node.json`](tsconfig.node.json) — project references, `strict: true`
    - [`vite.config.ts`](vite.config.ts) — `manualChunks` vendor/supabase, límite 800 KB

**5.2 – Estructura de carpetas**
    - `src/components/`, `src/hooks/`, `src/modules/`, `src/stores/` — creadas con `.gitkeep`
    - `src/lib/`, `src/test/`, `src/types/` — ya operativas

**5.3 – Tailwind y diseño**
    - [`src/index.css`](src/index.css) — Tailwind v4 CSS-first (`@theme`), todos los tokens de `cloude_desing` mapeados: `bg-u24-yellow`, `text-fg-1`, `font-cmd`, etc.
    - WCAG AA ratios documentados en cabecera del CSS (cumple ADR-003)
    - **Nota:** Tailwind v4 usa `@theme {}` en CSS en lugar de `tailwind.config.js` — es el modo canónico de v4

**5.4 – Cliente Supabase**
     - [`src/lib/supabase.ts`](src/lib/supabase.ts) — singleton `createClient<Database>`, falla en producción sin env vars, modo placeholder en dev/test

**5.5 – CI frontend** (ya activo)
    - [`.github/workflows/ci-quality.yml`](.github/workflows/ci-quality.yml) — eliminado el gate condicional; nuevo paso `npm run build` con vars placeholder + `npm test`

**Tests**
    - [`src/App.test.tsx`](src/App.test.tsx) — 3 tests: arranque, región `main`, navegación

**Siguiente paso: instalar dependencias con `npm install` para verificar que el proyecto levanta.**
    npm install
    npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
    npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting <i@izs.me>
    added 354 packages, and audited 355 packages in 28s
    86 packages are looking for funding
    run `npm fund` for details
**6 moderate severity vulnerabilities**
    To address all issues (including breaking changes), run:
    npm audit fix --force
    Run `npm audit` for details.

**npm audit report**
    esbuild  <=0.24.2
    Severity: moderate
    esbuild enables any website to send any requests to the development server and read the response - <https://github.com/advisories/GHSA-67mh-4wv8-2f99>
    fix available via `npm audit fix --force`
    Will install vitest@4.1.7, which is a breaking change
    node_modules/vite-node/node_modules/esbuild
    node_modules/vitest/node_modules/esbuild
    vite  <=6.4.1
    Depends on vulnerable versions of esbuild
    node_modules/vite-node/node_modules/vite
    node_modules/vitest/node_modules/vite
        @vitest/mocker  <=3.0.0-beta.4
        Depends on vulnerable versions of vite
        node_modules/vitest/node_modules/@vitest/mocker
        vitest  0.0.1 - 0.0.12 || 0.0.29 - 0.0.122 || 0.3.3 - 3.0.0-beta.4
        Depends on vulnerable versions of @vitest/mocker
        Depends on vulnerable versions of vite
        Depends on vulnerable versions of vite-node
        node_modules/vitest
            @vitest/coverage-v8  <=2.2.0-beta.2
            Depends on vulnerable versions of vitest
            node_modules/@vitest/coverage-v8
        vite-node  <=2.2.0-beta.2
        Depends on vulnerable versions of vite
        node_modules/vite-node
    To address all issues (including breaking changes), run:
    npm audit fix --force
    No hagas `npm audit fix --force` — instalaría Vitest 4.x que requiere Vite 7 y romperías la configuración. Las vulnerabilidades son todas del **servidor de desarrollo** (`npm run dev`) y no afectan el build de producción, pero conviene arreglarlas limpiamente.
    El fix correcto es actualizar a Vitest 3.x estable, que ya viene con las versiones parcheadas de esbuild/vite internamente:
    npm install
    npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
    npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting <i@izs.me>
    added 354 packages, and audited 355 packages in 10s
    86 packages are looking for funding
    run `npm fund` for details
**found 0 vulnerabilities**

## Sprint 6 — El Motor Offline (Zustand + IndexedDB) ✅ COMPLETADO

**🎯 Objetivo:** la capa de persistencia local y la cola de mutaciones offline idempotente.
**📋 Tareas**

- [✅] **6.1 Setup IndexedDB:** `idb-keyval` + `createIdbStorage<T>()` factory para el middleware `persist` de Zustand (ADR-001). Añadido alias `@/` en vite.config + tsconfig.
- [✅] **6.2 Stores con caché offline:** `useInventarioStore` (solo lectura, sin persist de escritura — ADR-001 §4), `useBandejasStore`/`useGlobalStore` (caché IndexedDB como *fallback* de Realtime).
- [✅] **6.3 Auth local:** `useAuthStore` en sessionStorage (no sobrevive al cierre de pestaña); `useTerminalStore` en IndexedDB (galleta permanente del dispositivo, enmienda ADR-001).
- [✅] **6.4 La cola (`useOfflineQueue`):** enqueue/dequeue/retry con `mutation_uuid` (ADR-012); `refreshSession()` antes del primer batch al reconectar (ADR-009); mutaciones solo guardan `ejecutorId`, nunca el JWT; `offlineQueueActions` para acceso fuera de componentes.

**✅ DoD:** 22 tests Vitest verdes · `npm run build` limpio · idempotencia verificada · JWT refresh antes del batch · `useAuthStore` no persiste entre pestañas.
**🔗 Dependencias:** Sprint 2.6 (idempotencia en BD), Sprint 3/4 (RPCs/EF que la cola invoca), Sprint 5 (scaffolding).

### Sprint 6 — Entregables

| Archivo | Contenido |
|---|---|
| [`src/lib/idb.ts`](../../src/lib/idb.ts) | `createIdbStorage<T>()` — adapter Zustand persist ↔ idb-keyval |
| [`src/lib/resolveRpcError.ts`](../../src/lib/resolveRpcError.ts) | Mapa completo `ERR_*` → string UI español |
| [`src/stores/useAuthStore.ts`](../../src/stores/useAuthStore.ts) | sessionStorage (sesión + ejecutorId, pestaña-scoped) |
| [`src/stores/useTerminalStore.ts`](../../src/stores/useTerminalStore.ts) | IndexedDB (galleta permanente, id_terminal, fingerprint) |
| [`src/stores/useInventarioStore.ts`](../../src/stores/useInventarioStore.ts) | IndexedDB read-only cache (base + vehículo) |
| [`src/stores/useBandejasStore.ts`](../../src/stores/useBandejasStore.ts) | IndexedDB cache + upsert Realtime (mensajes_bandeja) |
| [`src/stores/useGlobalStore.ts`](../../src/stores/useGlobalStore.ts) | IndexedDB (isOnline, degradedMode, forceUpdate, queue count) |
| [`src/hooks/useOfflineQueue.ts`](../../src/hooks/useOfflineQueue.ts) | Cola offline: enqueue/retry/processQueue + offlineQueueActions |
| [`src/test/resolveRpcError.test.ts`](../../src/test/resolveRpcError.test.ts) | 6 tests — cobertura todos los dominios ERR_* |
| [`src/test/useOfflineQueue.test.ts`](../../src/test/useOfflineQueue.test.ts) | 13 tests — enqueue, processQueue, retry, isProcessing |

**Decisiones de diseño:**

- `createIdbStorage<T>()` usa `PersistStorage<T>` (Zustand v4) para almacenar `StorageValue<T>` directamente en IndexedDB (structured clone, sin JSON).
- La cola usa `eslint-disable any` puntual en `supabase.rpc()` — la validación tipada ocurre en el servidor vía idempotency_keys.
- `_resetProcessing()` + `onRehydrateStorage` garantizan que `isProcessing` sea siempre `false` al arrancar.

Sprint 6 cerrado. Resumen de lo entregado:

### Sprint 6 — Motor Offline ✅

**22 tests verdes · build limpio · DoD cumplido**
**Archivos nuevos:**

| Archivo | Qué hace |
|---|---|
| [`src/lib/idb.ts`](src/lib/idb.ts) | `createIdbStorage<T>()` — adapter Zustand ↔ IndexedDB |
| [`src/lib/resolveRpcError.ts`](src/lib/resolveRpcError.ts) | Mapa `ERR_*` → mensaje UI en español |
| [`src/stores/useAuthStore.ts`](src/stores/useAuthStore.ts) | sessionStorage — sesión + `ejecutorId`, muere al cerrar pestaña |
| [`src/stores/useTerminalStore.ts`](src/stores/useTerminalStore.ts) | IndexedDB — galleta permanente + fingerprint |
| [`src/stores/useInventarioStore.ts`](src/stores/useInventarioStore.ts) | IndexedDB — caché read-only (ADR-001 §4) |
| [`src/stores/useBandejasStore.ts`](src/stores/useBandejasStore.ts) | IndexedDB — caché + upsert para Realtime |
| [`src/stores/useGlobalStore.ts`](src/stores/useGlobalStore.ts) | IndexedDB — online/degraded/forceUpdate/cola count |
| [`src/hooks/useOfflineQueue.ts`](src/hooks/useOfflineQueue.ts) | Cola offline: enqueue/retry/processQueue + `offlineQueueActions` |

**Comportamientos clave implementados:**
    - Cada mutación lleva `mutation_uuid` en el payload → el servidor lo lee via `idempotency_keys` (ADR-012)
    - Las mutaciones almacenan `ejecutorId` (id_nombre), **nunca** el JWT
    - `refreshSession()` se llama antes del primer batch al reconectar (ADR-009)
    - Si el refresh falla → `SESSION_REFRESH_FAILED` para que el componente muestre el modal
    - `onRehydrateStorage` garantiza `isProcessing = false` tras cualquier cierre inesperado

**~~Siguiente: Sprint 7~~** ✅ **Sprint 7 completado — 2026-05-21**

### Sprint 7 — Core UI y Componentes Base ✅ COMPLETADO

**🎯 Objetivo:** bloques de construcción visuales reutilizables y manejo de errores/estados.
**📋 Tareas**

- [x] **7.1 Manejo de errores:** `<ModalError />` con focus trap (ADR-003) · `useToast` + `<ToastContainer />` con `aria-live="polite"`.
- [x] **7.2 Loading states:** `<LoadingSkeleton />` variantes `card / spinner / row` con `role="status"`.
- [x] **7.3 Layout principal:** `<AppShell />` con `<Header />` + `<BlackColumn />` accordion nav + `<main id="main-content">`.
- [x] **7.4 Alertas globales:** Marquesina en Header · `<BannerOffline />` (sin conexión / sincronizando con nº operaciones pendientes).
- [x] **7.5 Accesibilidad base (ADR-003):** focus trap Tab/Shift+Tab en `<Modal />` · `aria-hidden` en iconos decorativos · `aria-current="page"` en nav activo · `aria-expanded` en acordeón · `aria-labelledby` en diálogos.

**📦 Entregables**

| Artefacto | Ruta |
|---|---|
| `<Btn />` | `src/components/atoms/Btn.tsx` |
| `<Badge />` | `src/components/atoms/Badge.tsx` |
| `<BlackColumn />` | `src/components/layout/BlackColumn.tsx` |
| `<Header />` | `src/components/layout/Header.tsx` |
| `<AppShell />` | `src/components/layout/AppShell.tsx` |
| `<LoadingSkeleton />` | `src/components/feedback/LoadingSkeleton.tsx` |
| `<BannerOffline />` | `src/components/feedback/BannerOffline.tsx` |
| `<Modal />` + `<ModalError />` | `src/components/feedback/ModalError.tsx` |
| `<ToastContainer />` | `src/components/feedback/ToastContainer.tsx` |
| `useToast` | `src/hooks/useToast.ts` |
| Design system CSS | `src/index.css` (`@layer components`) |
| Tests Sprint 7 (33) | `src/test/sprint7.test.tsx` |

**🧪 Testing:** 55 tests verdes (Vitest) · build TypeScript sin errores · `tsc -b && vite build` OK.

## Sprint 8 — Módulo de Acceso (Terminal) ✅ COMPLETADO — 2026-05-21

**🎯 Objetivo:** pantalla de login (normal y emergencia) y asignación inicial.
**📋 Tareas**

- [x] **8.1 Interfaz de login:** `<LoginScreen />` con tabs Acceso normal / Emergencia · login online via `supabase.auth.signInWithPassword` · caché offline PBKDF2-SHA256 en IndexedDB · bloqueo tras 3 intentos fallidos · mensaje RRHH sin self-service (ADR-004).
- [x] **8.2 Fingerprint + galleta:** `computeFingerprint()` SHA-256(canvas+userAgent+screen+timezone) · resolución de `galletas_terminales` tras login exitoso · `tipoGalleta` persistido en `useTerminalStore`.
- [x] **8.3 Estado de espera (`estado_1`):** `<EstadoEspera />` con `role=main` · muestra `ejecutorId` + badge galleta permanente · botón logout.
- [x] **8.4 Step-up auth (ADR-010):** `<StepUpModal />` + `useStepUp` · patrón Promise-resolver · verifica contraseña contra sesión offline cacheada.
- [x] **App router:** `App.tsx` condicional por `session` · listener online/offline sincroniza `useGlobalStore`.

**📦 Entregables**

| Artefacto | Ruta |
|---|---|
| `computeFingerprint()` | `src/lib/fingerprint.ts` |
| `deriveKey()` / `verifyPassword()` / `generateSalt()` | `src/lib/pbkdf2.ts` |
| `saveOfflineSession()` / `verifyOfflineLogin()` | `src/lib/offlineSession.ts` |
| `useLoginFlow` | `src/hooks/useLoginFlow.ts` |
| `useStepUp` | `src/hooks/useStepUp.ts` |
| `<LoginScreen />` | `src/components/auth/LoginScreen.tsx` |
| `<EstadoEspera />` | `src/components/auth/EstadoEspera.tsx` |
| `<StepUpModal />` | `src/components/auth/StepUpModal.tsx` |
| `App.tsx` (router auth-gated) | `src/App.tsx` |
| Tests Sprint 8 (28) | `src/test/sprint8.test.tsx` |

**🧪 Testing:** 83 tests verdes (Vitest) · build TypeScript sin errores.

## Sprint 9 — Módulo de Flota (Doc-8) + Storage de Imágenes ✅ COMPLETADO — 2026-05-21

**🎯 Objetivo:** puesta en marcha del vehículo y primer flujo con imágenes (que obliga a configurar Storage).
**📋 Tareas**

- [✅] **9.1 Check-in de vehículo:** selección de matrícula + validación de `estado_operativo`/`condicion_tecnica`.
- [✅] **9.2 Checklist 360° inicial + apertura Doc-8:** 10 sistemas (exterior, neumáticos, luces, sirena, motor, maletín medicación, SVB, camilla, comunicaciones, documentación) con toggle OK/NG + criticidad + descripción. Trigger `trg_checklist_genera_doc7` genera Doc-7 automáticamente.
- [✅] **9.3 Reporte de averías (Doc-7):** imágenes comprimidas en cliente (OffscreenCanvas → WebP ≤1200px, calidad 0.70) como **Blob** y subidas a Storage (ADR-002), nunca Base64. Cola offline con blobMeta.
- [✅] **9.4 Configuración de Supabase Storage** *(Hallazgo G-05)*: buckets `averias` (5 MiB, image/webp,jpeg,png) y `firmas` (1 MiB, image/webp,png), privados, RLS por `auth.uid()` propietario + roles supervisor. `config.toml` actualizado.

**✅ DoD:** check-in valida estado del vehículo · Doc-8 se abre con `km_inicio` · imagen de Doc-7 se comprime, se encola offline y se sube como Blob al reconectar · bucket con políticas RLS · App.tsx enruta por estado de activación.
**📦 Entregables**

| Artefacto | Ruta |
|---|---|
| RPC `rpc_checkin_vehiculo` | `supabase/migrations/20260521000008_rpcs_flota_doc8.sql` |
| RPC `rpc_cerrar_checklist` | ídem |
| RPC `rpc_registrar_averia` | ídem |
| Storage RLS | `supabase/migrations/20260521000009_storage_rls.sql` |
| `useCheckin` | `src/hooks/useCheckin.ts` |
| `useChecklist` | `src/hooks/useChecklist.ts` |
| `useDoc7` | `src/hooks/useDoc7.ts` |
| `compressImage` | `src/lib/imageCompressor.ts` |
| `blobStorage` | `src/lib/blobStorage.ts` |
| `useActivacionStore` | `src/stores/useActivacionStore.ts` |
| `<VehiclePickerScreen />` | `src/components/flota/VehiclePickerScreen.tsx` |
| `<ChecklistScreen />` | `src/components/flota/ChecklistScreen.tsx` |
| `<Doc7Form />` | `src/components/flota/Doc7Form.tsx` |
| `App.tsx` (router flota) | `src/App.tsx` |
| Tests Sprint 9 (21) | `src/test/sprint9.test.tsx` |

**🧪 Testing:** 104 tests verdes (Vitest) · build TypeScript sin errores.

## Sprint 10 — Módulos Operativos (Clínico y Logística) ✅ COMPLETADO — 2026-05-21

**🎯 Objetivo:** la operativa diaria: inventario, listas de pacientes en tiempo real e informes clínicos.
**📋 Tareas**

- [✅] **10.1 Gestión de inventario:** gasto de material (Doc-6) con UI optimista + rollback + cola offline. `useInventario` carga `inventario_vehiculo JOIN catalogo_items`, actualiza stock_real optimistamente antes del RPC y lo revierte si falla.
- [✅] **10.2 Listas de pacientes (Filiación/PSA):** sala de espera con Supabase Realtime. `useFiliacion` abre sesiones via `rpc_abrir_sesion_filiacion`, suscribe a `filiacion_pacientes` por canal dedicado, admite pacientes y gestiona transiciones de estado. Muestra aviso si offline.
- [✅] **10.3 Informes clínicos:** Doc-2 SVB offline-capable. `useInformes` crea/lista/cierra informes via `rpc_crear_informe_svb` / `rpc_cerrar_informe_svb` (encolables offline). Formulario con campos básicos de paciente (nombre, edad, motivo, tratamiento, destino, observaciones).

**✅ DoD:** deducción Doc-6 refleja stock optimista y encola offline · sala de espera actualiza en Realtime · informe clínico creado offline se encola y sincroniza.
**📦 Entregables**

| Artefacto | Ruta |
|---|---|
| RPCs filiación + informes | `supabase/migrations/20260521000010_rpcs_operativa.sql` |
| `useInventario` | `src/hooks/useInventario.ts` |
| `useFiliacion` | `src/hooks/useFiliacion.ts` |
| `useInformes` | `src/hooks/useInformes.ts` |
| `<InventarioScreen />` | `src/components/operativa/InventarioScreen.tsx` |
| `<SalaEsperaScreen />` | `src/components/operativa/SalaEsperaScreen.tsx` |
| `<InformesScreen />` | `src/components/operativa/InformesScreen.tsx` |
| `App.tsx` (router doc6/drp_op/doc2) | `src/App.tsx` |
| Tests Sprint 10 (12) | `src/test/sprint10.test.tsx` |

**🧪 Testing:** 116 tests verdes (Vitest) · build TypeScript sin errores.

## Sprint 11 — Módulo DRP y Coordinación

**🎯 Objetivo:** el panel de control de emergencias masivas y el seguimiento operativo.
**📋 Tareas**

- [ ] **11.1 Creación/gestión DRP:** panel de coordinación para crear, asignar recursos (dotaciones, personal a pie, mochilas BKP) y cancelar (`cancelar_drp`, solo online — ADR-003).
- [ ] **11.2 Visor GPS:** `visor_seguimiento_operativo` con lógica de *pings* (`lat`/`lng`/`gps_timestamp`).
- [ ] **11.3 Estados retenidos:** UI de `Finalizado_Retenido` y resolución de descuadres que liberan el DRP (`trg_descuadre_libera_drp_retenido`).

**✅ DoD:** crear/transicionar/cancelar DRP funciona con confirmación de servidor · un vehículo no puede estar en dos DRP a la vez (`uq_vehiculo_drp_activo`) · el visor pinta posiciones actualizadas.
**🔗 Dependencias:** Sprints 4 (RPCs DRP), 10 (operativa base).
**⚠️ Riesgos:** *Operación DRP intentada offline* (mitigación: ADR-003 — toast "requiere red", no encolar). *Carga de pings GPS* (mitigación: throttle + IndexedDB para visor).
**🧪 Testing:** Playwright del ciclo DRP completo; pgTAP de invariante de vehículo único por DRP.
**📦 Entregables:** panel DRP, visor GPS, gestión de estados retenidos.

## Sprint 12 — RRHH, Cuadrantes y Comunicación *(NUEVO — módulos antes huérfanos)*

**🎯 Objetivo:** cubrir en frontend los dominios que ya existen en el esquema pero no estaban en el roadmap v1. *(Hallazgo P-04)*
**📋 Tareas**

- [ ] **12.1 Cuadrantes y turnos:** vistas de `cuadrante_turnos`/`patrones`/`grupos`; inyección de patrones; excepciones absolutas.
- [ ] **12.2 Vacaciones (Doc-12):** flujo `doc_solicitudes_vacaciones` (Borrador→Pendiente→Aprobada/Denegada) con resolución de RRHH (alimenta `trg_doc12_aprobada_a_cuadrante`).
- [ ] **12.3 Tablón de anuncios:** `tablon_anuncios` por secciones (normativas/protocolos/avisos), lectura en vivo.
- [ ] **12.4 Bandeja de mensajes:** `mensajes_bandeja` (no_leido/leido) con caché offline.
- [ ] **12.5 Avisos (Doc-11):** lista de `doc11_avisos` por nivel (informativo/aviso/crítico) + `rpc_marcar_aviso_leido`.
- [ ] **12.6 System config / kill-switches y force-update:** UI de `system_config` (solo gerencia, con step-up) y comprobación de `versiones_cliente` (versión mínima).

**✅ DoD:** RRHH aprueba vacaciones y se reflejan en el cuadrante · tablón y bandeja se actualizan en vivo · cambiar una clave de `system_config` exige step-up · una versión de cliente por debajo de la mínima fuerza actualización.
**🔗 Dependencias:** Sprints 4 (triggers RRHH), 7 (UI base), 2.4 (Realtime).
**⚠️ Riesgos:** *Permisos cruzados (quién ve/edita qué)* (mitigación: RBAC + RLS por rol). *Force-update mal calibrado bloquea terminales* (mitigación: ventana de gracia).
**🧪 Testing:** Playwright de flujo de vacaciones→cuadrante; test de step-up en `system_config`; test de force-update.
**📦 Entregables:** módulos de cuadrantes, vacaciones, tablón, bandeja, avisos y configuración.

## Sprint 13 — PWA, Push y Observabilidad *(antes Sprint 12)*

**🎯 Objetivo:** convertir la web en PWA instalable con notificaciones críticas y observabilidad.
**📋 Tareas**

- [ ] **13.1 Service Worker:** `vite-plugin-pwa` (Cache First para el App Shell, Network First para datos).
- [ ] **13.2 Install prompt condicional (ADR-003):** capturar `beforeinstallprompt`, mostrar chip no intrusivo según condiciones; persistir descarte en IndexedDB.
- [ ] **13.3 Push API:** tabla `push_subscriptions` *(Hallazgo G-04)*, claves VAPID, suscripción y envío de avisos críticos (Doc-11).
- [ ] **13.4 Observabilidad:** Sentry (errores + trazas), conectar con la Fase C de observabilidad ya especificada.
- [ ] **13.5 Hardening del bundle:** split de chunks (<800 KB por ruta, <3 MB total), análisis de tamaño.

**✅ DoD:** la app se instala como PWA y arranca offline · un aviso crítico llega como push · errores reportados a Sentry con contexto · bundle dentro de presupuesto.
**🔗 Dependencias:** todos los módulos (12 incluido), tabla `push_subscriptions` migrada.
**⚠️ Riesgos:** *SW cacheando datos sensibles* (mitigación: estrategia por tipo de recurso). *Push sin tabla = no hay dónde suscribir* (cubierto en 13.3).
**🧪 Testing:** Playwright de instalación PWA y arranque offline; test de recepción de push; medición de bundle en CI.
**📦 Entregables:** PWA funcional, migración `push_subscriptions`, integración Sentry, presupuesto de bundle verificado.

## Sprint 14 — Gate de Seguridad/RGPD, UAT y Salida a Producción *(NUEVO)*

**🎯 Objetivo:** validación final de seguridad, cumplimiento y aceptación antes de producción. *(Hallazgo P-05)*
**📋 Tareas**

- [ ] **14.1 Revisión de seguridad:** auditoría completa de políticas RLS, `SECURITY DEFINER` + `search_path` en todas las RPCs, revisión de step-up, rate-limits.
- [ ] **14.2 Checklist RGPD:** verificar anonimización (no `DELETE`), minimización de PII en JSONB clínico, flujo de borrado probado de extremo a extremo.
- [ ] **14.3 Endurecimiento de producción:** `config.toml` de prod (CIDRs restringidos, `ssl_enforcement`, refresh 7d, signup off), procedimiento de timezone en hosted (ADR-005 / *Hallazgo C-05*).
- [ ] **14.4 Auditoría de accesibilidad (ADR-003):** pasada axe-core global + revisión manual de contraste y focus.
- [ ] **14.5 UAT y runbooks:** ejecutar los *Runbooks* (RB-01..RB-06), pruebas de estrés de la cola offline y reconexión masiva.
- [ ] **14.6 Despliegue:** *promote* a producción, monitorización post-lanzamiento, plan de rollback.

**✅ DoD:** sin hallazgos críticos de seguridad/RGPD/accesibilidad abiertos · runbooks ejecutados con éxito · prueba de estrés de cola superada · despliegue con rollback documentado.
**🔗 Dependencias:** Sprints 1-13.
**⚠️ Riesgos:** *Descubrir gaps tarde* (mitigado por esta hoja de ruta). *Migración de timezone en hosted* (procedimiento documentado en 14.3).
**🧪 Testing:** suite completa (pgTAP + Vitest + Playwright + axe) verde en CI; pruebas de carga; ensayo de rollback.
**📦 Entregables:** informe de seguridad/RGPD, `config.toml` de producción, checklist de accesibilidad, runbooks ejecutados, despliegue.

## Anexo A — Inventario de backend documentado (para dimensionar Sprints 3-4)

**RPCs (~14):** `rpc_alta_vehiculo`, `rpc_baja_vehiculo`, `rpc_revocar_y_reemitir_galleta`, `rpc_transferir_galleta`, `rpc_solicitar_desbloqueo`, `rpc_aprobar_desbloqueo`, `rpc_rechazar_desbloqueo`, `rpc_ajuste_manual_stock`, `rpc_asignar_mochila_a_drp`, `rpc_cambiar_rol`, `rpc_marcar_aviso_leido`, `rpc_solicitar_borrado_rgpd`, `rpc_procesar_borrado_rgpd`, `cancelar_drp`.

**Edge Functions (~14):** `ef-alta-empleado`, `ef-baja-empleado`, `ef_reset_password`, `ef-consumir-pin`, `ef_generar_token_emergencia`, `ef_logout`, `ef_revocar_sesion_usuario`, `ef-renovar-offline-session`, `ef-cron-cleanup-orphans`, `ef-cron-revoke-stale-terminals`, `ef-cron-transito-ttl`, `ef-cron-rgpd`, `ef-cron-refresh-dashboard`, `ef_cron_purge`.

> ⚠️ Aparecen dos convenciones de nombres en la documentación (`ef-…` con guion y `ef_…` con guion bajo). **Acción (Sprint 0.4):** unificar a una sola convención y registrarla en la guía de nomenclatura.

**Triggers (~12):** `trg_validar_km_inicio`, `trg_checklist_genera_doc7`, `trg_doc7_cierre_evaluar_condicion`, `trg_audit_cambio_rol`, `trg_audit_galleta_emitida`, `trg_audit_galleta_revocada`, `trg_descuadre_libera_drp_retenido`, `trg_descuadre_notificar_bandeja`, `trg_doc12_aprobada_a_cuadrante`, `trg_purgar_plantillas_al_archivar`, `trg_fichas_rol`, `trg_galleta_insert`.

## Anexo B — ADRs pendientes de redactar

- **ADR-011** — Convención de claves foráneas `id_nombre` (TEXT) vs `id_persona` (UUID). *(Hallazgo E-10)*
- **ADR-012** — Patrón de idempotencia de la cola offline (`mutation_uuid` por tabla vs *ledger* central). *(Hallazgo G-02)*
- **ADR-007 / ADR-008** — Reservados (ver `revisiones.md`).
