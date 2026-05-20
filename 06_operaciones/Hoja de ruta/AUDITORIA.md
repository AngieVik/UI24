# Auditoría Técnica — Proyecto U24

**Fecha de auditoría:** 2026-05-20
**Hito auditado:** Cierre de Sprint 1 / inicio de Sprint 2
**Alcance:** Esquema de base de datos (migración + semillas + tipos), coherencia entre ADRs y la implementación, configuración de Supabase y madurez del proceso de desarrollo.
**Veredicto general:** 🟢 **Base sólida y profesional.** El Sprint 1 está realmente completado. Antes de avanzar al Sprint 2 hay que cerrar **2 deudas del Sprint 1** y **5 gaps ADR↔implementación** (2 de severidad alta). Ninguno bloquea, pero todos deben planificarse de forma explícita.

---

## 1. Resumen ejecutivo

El proyecto parte de una documentación de arquitectura excepcional (~23.000 líneas: ADRs, lógica, RLS/RPCs, ER, estados, runbooks, testing). La migración inicial (`20260519000001_init_schema.sql`, 1.011 líneas) es de calidad de producción: tipos antes que tablas, índices parciales que codifican invariantes de negocio, RLS *deny-by-default* en las 50 tablas y políticas inmutables en auditoría.

El riesgo principal **no es la calidad del trabajo hecho, sino la coherencia entre lo decidido (ADRs) y lo implementado (SQL)**. Varias decisiones formalmente aceptadas todavía no tienen reflejo en el esquema, y si no se planifican como tareas explícitas se descubrirán tarde (en el sprint de la funcionalidad que las necesita), cuando el coste de corrección es mayor.

| Área | Estado | Severidad máx. |
|---|---|---|
| Sprint 1 (entregables) | ✅ Completado y verificado | — |
| Calidad del esquema | 🟢 Muy buena | Baja |
| Coherencia ADR ↔ implementación | 🟠 5 gaps | **Alta** |
| Configuración Supabase (Auth/Storage) | 🟠 Endurecer | Media |
| Madurez del proceso (CI/CD, testing) | 🔴 Inexistente aún | Media |
| Cobertura del roadmap | 🟠 Módulos huérfanos | Media |

---

## 2. Verificación del Sprint 1

Lo siguiente se ha **comprobado** sobre el repositorio, no solo leído:

- ✅ La migración aplica limpia (`supabase db reset` sin errores, confirmado en el log de cierre).
- ✅ **27 tipos ENUM** declarados antes de las tablas.
- ✅ **50 tablas** cubriendo todos los dominios del ER (identidad, vehículos, inventario, documentos operativos, DRP, módulos especiales, comunicación, RRHH, RGPD, configuración, versiones).
- ✅ **Índices parciales únicos** que materializan invariantes: `uq_galleta_terminal_activa`, `uq_vehiculo_drp_activo`, `uq_descuadre_pendiente`, `uq_filiacion_evento_idempotente`.
- ✅ **RLS habilitado en las 50 tablas** + políticas inmutables `USING (FALSE)` en tablas de auditoría/append-only.
- ✅ Semillas cargan: catálogo, plantillas (A1A2/B/C/VIR/Quad/Backpack), 5 vehículos, 6 usuarios demo (contraseña vía `$SEED_ADMIN_PASSWORD`), 8 mochilas BKP, 9 claves `system_config`.
- ✅ `src/types/supabase.ts` generado con los ENUMs presentes y correctos (p. ej. `tipo_galleta: "permanente" | "temporal"`).
- ✅ `db.seed.sql_paths` en `config.toml` lista los 4 seeds en orden determinista.
- ✅ ADR-005: `ALTER DATABASE ... SET timezone TO 'Europe/Madrid'` es la primera sentencia de la migración.

**Conclusión:** el Sprint 1 está correctamente cerrado. Las dos observaciones siguientes son deuda menor, no reapertura.

### Deuda del Sprint 1 (cerrar al inicio del Sprint 2)

| ID | Sev. | Hallazgo | Corrección |
|---|---|---|---|
| **S1-01** | Baja | `src/types/supabase.ts` está codificado en **UTF-16LE con CRLF**, no UTF-8. Causa: en PowerShell, `... > src/types/supabase.ts` usa UTF-16 por defecto. El contenido (tipos/ENUMs) es correcto, pero la codificación generará *diffs* ruidosos en Git, doble peso (148 KB) y posibles fallos en linters/bundlers que asumen UTF-8. | Regenerar con `npx supabase gen types typescript --local \| Out-File -Encoding utf8 src/types/supabase.ts`, o fijar `$PSDefaultParameterValues['Out-File:Encoding']='utf8'`. Validar con `file` que sea `UTF-8`. Añadir `*.ts text eol=lf` a `.gitattributes`. |
| **S2-01** | Media | El archivo `sprint_1_complete` (commiteado) contiene el volcado literal de `supabase start`, incluyendo `Secret`, claves S3 (Access/Secret) y JWT por defecto. Son los *defaults locales* de Supabase (no producción), pero no deben vivir en el repositorio como hábito. | Eliminar las claves del documento (dejar solo el resumen). Confirmar que `.env*` y secretos reales nunca se commitean. Documentar en un runbook el patrón de gestión de secretos por entorno. |

> Nota trivial: el roadmap actual contiene el typo `COMPLETADO AL !00%` (corregido en la nueva versión).

---

## 3. Calidad del esquema (revisión de diseño)

**Fortalezas destacables:**

- Separación por dominios clara y nomenclatura consistente (`doc1_…doc12`, `*_sesiones`/`*_pacientes`).
- Índices parciales únicos para invariantes en lugar de validación en aplicación — patrón correcto y robusto frente a concurrencia.
- *Deny-by-default* + RPCs `SECURITY DEFINER` como superficie de escritura: arquitectura coherente con un sistema de misión crítica.
- `ON DELETE RESTRICT` generalizado: protege la trazabilidad (nada se borra en cascada por accidente).
- `TIMESTAMPTZ` en todos los campos temporales (alineado con ADR-005) y `CHECK` de dominio (`stock_real >= 0`, `codigo IN ('BKP1'..'BKP8')`).

**Observaciones de diseño (no bloqueantes, anotar como deuda consciente):**

| ID | Sev. | Hallazgo |
|---|---|---|
| **E-09** | Baja | `doc11_avisos.leido_por JSONB '[]'` modela lecturas como array JSON: no escala ni se indexa por lector. Existe `rpc_marcar_aviso_leido`. Aceptable para v1; considerar tabla puente `avisos_lecturas(id_aviso, id_nombre, leido_at)` si el volumen crece. |
| **E-10** | Baja | Mezcla de claves foráneas: la mayoría referencian `id_nombre` (TEXT, natural key `UNIQUE`) pero algunas (`doc8.cerrado_por_admin_id`, `drps.cancelado_por_id`) referencian `id_persona` (UUID). Genera *joins* heterogéneos y acopla la integridad a la inmutabilidad de `id_nombre`. **Recomendación:** documentar la convención como ADR-011 ("qué FK usa `id_nombre` vs `id_persona` y por qué"). |
| **E-11** | Info | Tensión `ON DELETE RESTRICT` ↔ RGPD: el borrado RGPD chocará con los `RESTRICT`. La estrategia debe ser **anonimización**, no `DELETE` físico. Confirmar que `rpc_procesar_borrado_rgpd` / `ef-cron-rgpd` anonimizan (no eliminan filas referenciadas). |

---

## 4. Gaps ADR ↔ implementación (lo más importante)

Decisiones **formalmente aceptadas** que aún no tienen reflejo en el esquema o la configuración. Ordenadas por severidad.

| ID | Sev. | ADR / Doc | Gap | Dónde resolver |
|---|---|---|---|---|
| **G-01** | 🔴 Alta | **ADR-010** (step-up auth) | Faltan las columnas `pin_stepup_hash TEXT NULL` y `pin_stepup_salt TEXT NULL` en `fichas_empleados`, y **faltan los valores `step_up_exitoso` / `step_up_fallido`** en el ENUM `tipo_evento_rbac`. Sin esto no se pueden implementar las acciones críticas con segundo factor (revocar galleta, baja empleado, `system_config UPDATE`). | Migración correctiva en **Sprint 2** (las RPCs del Sprint 3/4 dependen de ello). |
| **G-02** | 🔴 Alta | **ADR-009** + `rules.md` (cola offline) | La **idempotencia de reintentos** solo está garantizada en `descuadres_inventario` (`mutation_uuid UNIQUE`). Las mutaciones encolables (Doc-2..Doc-8, deducciones Doc-6, averías Doc-7) no tienen mecanismo de deduplicación: un *replay* de la cola puede duplicar registros clínicos o de inventario. ADR-009 resuelve la expiración del JWT, **no** la idempotencia. | **Decisión arquitectónica pendiente** (ADR nuevo): o `mutation_uuid UNIQUE` por tabla encolable, o un *ledger* central `idempotency_keys`. Resolver en **Sprint 2** (constraint/tabla) + **Sprint 3** (RPCs lo usan) + **Sprint 6.4** (cliente lo emite). |
| **G-03** | 🟠 Media | `logic.md` (Checklist360 → Doc-7) | La tabla `doc_checklist360` **no existe**; la migración la declara como *placeholder*. El trigger `trg_checklist_genera_doc7` (Sprint 3.4) depende de ella. | Crear tabla + trigger en la migración del **Sprint 3**. |
| **G-04** | 🟠 Media | **ADR-002** / docs PWA | No existe tabla `push_subscriptions` (endpoint + claves VAPID). El Sprint 12.2 (Push API para avisos Doc-11) y los docs referencian `web-push`/VAPID, pero no hay dónde persistir las suscripciones. | Migración antes del **Sprint 13 (PWA/Push)**. |
| **G-05** | 🟠 Media | **ADR-002** (Blobs → Storage) | Supabase **Storage no está configurado**: `config.toml` no define buckets y no hay políticas RLS de Storage. ADR-002 obliga a subir imágenes de Doc-7 (y, según diseño, firmas de Doc-4/Doc-5) como Blobs a Storage. | Configurar bucket(s) + políticas en el **Sprint 9** (primer módulo con imágenes) y formalizar el patrón. |

---

## 5. Configuración de Supabase (endurecimiento)

Revisión de `supabase/config.toml` frente a los ADRs y a buenas prácticas de intranet cerrada:

| ID | Sev. | Hallazgo | Recomendación |
|---|---|---|---|
| **C-01** | Media | `enable_signup = true` (también en `[auth.email]`). En U24 los usuarios se crean **solo** vía `ef-alta-empleado` (service role). El alta pública abre una superficie innecesaria. | `enable_signup = false`. |
| **C-02** | Media | ADR-009 fija refresh token TTL = **7 días**, pero `config.toml` solo activa rotación; no hay *timebox*/expiry de 7 días (`[auth.sessions]` está comentado). | Definir `[auth.sessions]` con `timebox`/`inactivity_timeout` coherentes con los 7 días del ADR-009 y documentar el valor de producción. |
| **C-03** | Baja | `minimum_password_length = 6` y `password_requirements = ""`. | Subir a ≥ 8 y exigir `lower_upper_letters_digits` como mínimo. |
| **C-04** | Baja | `db.network_restrictions.allowed_cidrs = ["0.0.0.0/0"]` y `ssl_enforcement` comentado. | En el sprint de producción: restringir CIDRs y activar `ssl_enforcement`. |
| **C-05** | Baja | ADR-005 hace `ALTER DATABASE postgres SET timezone`. En Supabase **gestionado** esto puede requerir permisos especiales, aplica a todo el proyecto y **solo afecta a conexiones nuevas**. | Documentar el procedimiento para *hosted* (vía panel o `ALTER ROLE`) en el runbook de despliegue. *Drift* documental menor: ADR-005 cita un archivo de migración separado que finalmente se fusionó en `init_schema`. |

---

## 6. Madurez del proceso de desarrollo

| ID | Sev. | Hallazgo |
|---|---|---|
| **P-01** | Media | **No existe CI/CD** (`.github/` ausente). No hay validación automática de que la migración aplica, que los seeds cargan, que los tipos están sincronizados ni que el linter pasa. Es la pieza que más reduce riesgo en un equipo y debe existir **antes** de escribir más SQL/TS. → nuevo **Sprint 0**. |
| **P-02** | Media | **Testing relegado al final** (Sprint 12.4). Existe `testing_arquitectura.md` (1.290 líneas) sin explotar. La estrategia debe ser **transversal**: pgTAP para RLS/RPC, Vitest para lógica de stores/cola, Playwright para E2E offline. → DoD de testing en cada sprint. |
| **P-03** | Media | **Backend infradimensionado en el roadmap.** Documentados ~14 RPCs (`rpc_alta_vehiculo`, `rpc_baja_vehiculo`, `rpc_revocar_y_reemitir_galleta`, `rpc_transferir_galleta`, `rpc_solicitar/aprobar/rechazar_desbloqueo`, `rpc_ajuste_manual_stock`, `rpc_asignar_mochila_a_drp`, `rpc_cambiar_rol`, `rpc_marcar_aviso_leido`, `rpc_solicitar/procesar_borrado_rgpd`…), ~14 Edge Functions (`ef-alta/baja-empleado`, `ef-consumir-pin`, `ef_generar_token_emergencia`, `ef_reset_password`, `ef_logout`, `ef_revocar_sesion_usuario`, `ef-renovar-offline-session`, `ef-cron-cleanup-orphans`, `ef-cron-revoke-stale-terminals`, `ef-cron-transito-ttl`, `ef-cron-rgpd`, `ef-cron-refresh-dashboard`, `ef_cron_purge`…) y ~12 triggers. El roadmap nombra <8. Sprints 3-4 deben dividirse. |
| **P-04** | Media | **Módulos huérfanos.** El esquema tiene tablas de RRHH/cuadrantes (`cuadrante_turnos/patrones/grupos`, `doc_solicitudes_vacaciones`) y de comunicación (`tablon_anuncios`, `mensajes_bandeja`, `doc11_avisos`, `versiones_cliente`) que **ningún sprint del roadmap actual cubre** en frontend. → nuevo sprint de RRHH + Comunicación. |
| **P-05** | Media | **Sin *gate* de seguridad/RGPD antes de producción**, pese a manejar datos clínicos (`datos_paciente`/`datos_clinicos` JSONB). → sprint final de revisión RLS/RGPD/accesibilidad. |
| **P-06** | Baja | **Dependencias cruzadas no explicitadas:** las políticas RLS `SELECT` para `authenticated` que necesita Supabase Realtime (Sprint 10.2 — listas de pacientes) deben crearse en el Sprint 2; hoy el Sprint 2 no las menciona. La idempotencia (G-02) atraviesa Sprints 2/3/6. |

---

## 7. Recomendaciones priorizadas

**Antes de empezar el Sprint 2 (esta semana):**
1. Regenerar `supabase.ts` en UTF-8 y añadir `.gitattributes` (S1-01).
2. Limpiar secretos del documento `sprint_1_complete` (S2-01).
3. Crear **Sprint 0** (CI/CD + entornos + secretos + linters) — ver hoja de ruta.

**Integrar como tareas del Sprint 2 (seguridad de datos):**
4. Migración correctiva G-01 (columnas + ENUM step-up).
5. Decisión + constraint de idempotencia G-02 (ADR-011 o ADR-012 + tabla/columnas).
6. Políticas RLS `SELECT` para Realtime (P-06) y endurecimiento de `config.toml` (C-01..C-03).

**Planificar en su sprint correspondiente:**
7. `doc_checklist360` + trigger (Sprint 3, G-03).
8. Configuración de Storage + políticas (Sprint 9, G-05).
9. Tabla `push_subscriptions` (antes del Sprint 13, G-04).
10. Sprint de RRHH + Comunicación (P-04) y *gate* de seguridad/RGPD final (P-05).

**Deuda documental:**
11. ADR-011: convención `id_nombre` vs `id_persona` (E-10).
12. Confirmar estrategia de anonimización RGPD vs `RESTRICT` (E-11).

---

## 8. Trazabilidad de hallazgos → hoja de ruta

| Hallazgo | Se resuelve en |
|---|---|
| S1-01, S2-01 | Sprint 1 (cierre de deuda) |
| P-01 (CI/CD) | **Sprint 0 (nuevo)** |
| G-01, G-02, C-01..C-03, P-06 | Sprint 2 (ampliado) |
| P-03 (RPCs/EF) | Sprints 3 y 4 (divididos) |
| G-03 | Sprint 3 |
| G-05 | Sprint 9 |
| G-04 | Sprint 13 |
| P-04 (RRHH/Comunicación) | **Sprint 12 (nuevo)** |
| P-05, C-04, E-11 | **Sprint 14 (nuevo — gate producción)** |
| E-10, P-02 (testing) | Transversal / ADR + DoD por sprint |

> Detalle completo de tareas, *Definition of Done*, dependencias, riesgos y testing por sprint: ver `hoja_de_ruta.md` (versión 2.0).
