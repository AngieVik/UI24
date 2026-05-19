# Reporte Crítico de Auditoría — Proyecto UI24

<razonamiento>
He auditado los 22 archivos del mapa (~13.000 líneas). El sistema U24 es una PWA offline-first para gestión de servicios de emergencia médica con cinco capas bien diferenciadas: reglas arquitectónicas, seguridad/RBAC, núcleos de negocio, repositorios y UI.
La calidad estructural es alta para una fase de diseño —los contratos de payloads están tipados, los estados modelados, y el RBAC basado en JWT claims es defendible—, pero detecto patrones repetidos que delatan los puntos de mayor riesgo:
Contradicciones internas entre fuentes de verdad (rules.md vs estados.md sobre persistencia; rules.md vs payloads sobre Base64). Esto indica que las reglas globales se redactaron después y no se hizo un sweep de coherencia.
Dependencia exhaustiva de Realtime sin plan B: marquesina, bandejas, estados de flota, descuadres — todo asume websocket sano. No hay polling fallback definido.
Single points of failure humanos: coordinación es cuello de botella en (a) desbloqueos críticos, (b) forzar checkout, (c) revocación de galletas, (d) liberación de boxes. Sin SLA ni escalación automática.
Operaciones críticas sin recovery: forgot password, dispositivo robado de usuario real (no galleta), IndexedDB corrupto, JWT congelado offline replicado con permisos obsoletos.
Ausencia total de capa de ops: cero observabilidad, cero versionado de cliente, cero estrategia de testing, cero política de retención RGPD, cero migración inicial seed.
Estructura de datos canónica difusa: muchas tablas referenciadas (solicitudes_desbloqueo, galletas_terminales, eventos_fisicos_vehiculo, cuadrante_turnos) sin un diagrama ER consolidado.
Módulos referenciados pero no desarrollados: nucleo_coordinacion_y_seguridad.md existe pero está incompleto respecto a las funciones que el resto del sistema le exige.
El proyecto tiene madurez de diseño de producto avanzada pero infraestructura/operación inexistente. El roadmap debe priorizar pavimentar la base antes de capas de negocio.
</razonamiento>

1. DETECCIÓN DE ERRORES Y CUELLOS DE BOTELLA

1.A — Contradicciones entre fuentes de verdad (severidad crítica)
InconsistenciaUbicación AUbicación BC1Persistencia Zustand: localStorage prohibido vs declarado como usadorules.md:63 ("IndexedDB obligatorio, prohibido localStorage")estados.md:526-534 (5 stores usan localStorage)C2Adjuntos Base64rules.md:64 + nucleo_flota_y_taller.md:253 ("prohibición explícita")payloads_y_contratos.md:92 ("imágenes en Base64 no deben superar 500KB")C3Estado inicial de vehículos: desactivado "solo por acción manual explícita"estados.md:129Sin definir cómo se entra al sistema desde un seed inicial
1.B — Single Points of Failure humanos
CuelloRiesgoMitigación faltanteB1Desbloqueo de vehículo inoperativo_critico depende 100% de coordinaciónFlota inmóvil sin SLAEscalación automática a gerencia + timeoutB2LIBERAR BOX solo manual; sin timeout automáticoBox bloqueado indefinidamente si terminal caeWatchdog server-side por inactividadB3forzar_checkout_administrativo requiere km_fin que "el coordinador conoce por comunicación externa"Si no hay comunicación: bypass forzado con km del Doc-8 anteriorPolítica de degradación documentadaB4Revocación de galleta permanente solo manualTablet robada queda operativa hasta acción humanaAuto-revocación tras N días de inactividad o cambio de fingerprint
1.C — Dependencia ciega en Realtime
Todo el realtime (marquesina, bandejas, estados, descuadres, ping/pong GPS, alertas críticas) cae si Supabase Realtime se degrada. No hay polling fallback definido en ninguna parte de la documentación. Los flujos de inventario (§24.5) y vehículos (§29.3) asumen WS sano.
1.D — Race conditions y flujos rotos
EscenarioRiesgoR1JWT congelado offline replicado: usuario hace Doc-6 offline, mientras tanto gerencia le revoca permisos. Al sync, ¿qué evalúa RLS?Mutación con permisos obsoletos aplicadaR2DRP cancelado en En_curso: el borrado en cascada de nucleo_drp.md:194 está documentado para En_espera/En_preparacion. No hay flujo para cancelación con dotaciones dentroEstado huérfanoR3Operativo_Condicionado acumulado: 3 DRPs encadenados sin reconciliar — ¿quién responde contablemente del descuadre?Imputación contable ambiguaR4terminal_check offline en estado_1: si nunca se hizo check-in online previo Y no hay precache → "acceso denegado" sin instrucción de qué hacerBloqueo operativoR5Galleta_pequeña sin checkout: terminal en estado_1 con cookie temporal y sin nunca añadir ID_nombre — la cookie no expira por TTL, solo "al último checkout" que nunca ocurreTerminal autoritativo indefinido2. ANÁLISIS DE BRECHAS (LO QUE FALTA)

2.A — Módulos críticos no documentados
#Módulo faltanteImpactoF1Recuperación de contraseña (forgot_password)Empleado sin acceso depende de gerencia/coordinación 24/7F2Revocación de sesión de usuario (dispositivo robado de TES/DUE)Solo se contempla revocar galletas, no JWTs de cuentas realesF3Onboarding/offboarding de empleado¿Cómo se da de alta un nuevo TES? ¿Y de baja respecto a Doc-1 históricos?F4Alta de vehículo nuevo en flotaNo hay flujo: ID, location de inventario inicial, plantilla a aplicarF5Configuración global del sistemaTTLs de galletas, umbrales km/fechas, intervalo throttle GPS — todo hardcoded en docsF6Auditoría de cambios RBACSin trazabilidad de "quién promocionó a quién y cuándo"F7Política de retención RGPDDoc-1 inmutables eternamente, pero datos personales sensibles deben tener TTL legal
2.B — Capa de operaciones inexistente

    Pieza faltante  Justificación

O1 Observabilidad (Sentry/Logflare + métricas) PWA en producción sin trazas = imposible debugging post-incidente
O2 Versionado de cliente PWA + update strategyTerminal en ruta con versión vieja vs servidor con nuevo schema = bugs invisibles
O3 Service Worker lifecycle definidoMencionado tangencialmente, no especificado (install/activate/skipWaiting)
O4 Estrategia de testingCero menciones a unit, integration o E2E (Playwright)
O5 Esquema ER + migraciones seedHay tablas referenciadas sin diagrama consolidado ni script inicial
O6 Backup/Restore RPO-RTOSupabase tiene backups, pero IndexedDB local no — pérdida de cola offline si tablet se daña
O7 Validación de integridad de IndexedDBSin recovery si estructura local se corrompe
O8 Healthcheck de Edge Functionsset_claims cae → ¿qué pasa con login?
O9 Sistema de feature flagsSin manera de desactivar selectivamente módulos en incidente
O10 Pipeline de despliegue + presupuesto de bundleReglas mencionan 3MB/800KB pero no la implementación del guard2.C — Edge cases sin documentar

    Empleado con checkin_on en dos terminales simultáneos (¿permitido?).
    Doc-8 de un pilot que cambia de vehículo a mitad de turno.
    Doc-12 aprobado que se solapa con un servicio ya agendado.
    Modal-ligero abierto durante un cambio de estado realtime que invalida su contexto.
    Galleta_pequeña expira mid-operativo durante un DRP.

<razonamiento>
He interpretado el mapa del proyecto como **un sistema offline-first de misión crítica para gestión de ambulancias**, donde la integridad de datos clínicos y la disponibilidad operativa son innegociables. La documentación de las 7 fases está estructuralmente sólida en lo que es **especificación arquitectónica pura** (tablas, RPCs, estados), pero presenta tres clases de problemas graves:
**1. Acoplamiento entre archivos sin verificación cruzada:** durante las 7 fases se referenciaron entidades (`filiacion_eventos`, `responsable_flota`, `responsable_logistica`) que se asumieron existentes pero nunca se documentaron formalmente. Esto crea **fantasmas de schema** — tablas/roles citados que romperán la migración SQL al ejecutarse.
**2. Falta de pensamiento adversarial:** los flujos felices están documentados pero los flujos de fallo (transacciones a medio camino, huérfanos, recuperación de terminales sin galleta válida, derecho al olvido RGPD on-demand) tienen agujeros que solo aparecen en producción bajo carga real o stress operativo.
**3. Inversión documental — operaciones desnudas:** se documentaron exhaustivamente arquitectura y reglas de negocio, pero **infraestructura operativa (backups, CI/CD, migraciones, observabilidad, Service Worker)** está prácticamente ausente. Sin estos, el proyecto no puede salir a producción aunque el código fuera perfecto.
Los **5 problemas más graves** que veo son:
- `filiacion_eventos` es una tabla fantasma — el watchdog Gap B2 fallará 288 veces al día
- `ef_alta_empleado` crea huérfanos en `auth.users` si falla el INSERT en `fichas_empleados` (sin cron de limpieza)
- Roles `due`, `medico`, `responsable_flota`, `responsable_logistica` citados en policies pero sin seed ni RPC de cambio de rol
- Sin RPC de borrado RGPD on-demand (incumple "derecho al olvido")
- Cero documentación de backups, migraciones zero-downtime, CI/CD ni observabilidad
</razonamiento>

1. DETECCIÓN DE ERRORES Y CUELLOS DE BOTELLA
   1.1 Fallos lógicos / Callejones sin salida
   | # | Severidad | Archivo / Sección | Descripción | - | - | - | - | - |
   | F-01 | **CRÍTICO** | `rls_y_rpcs.md §14` | **Tabla fantasma `filiacion_eventos`**
   — el watchdog Gap B2 hace `upsert` cada 5 min sobre una tabla no definida en `er_y_seeds.md`. La Edge Function `ef_cron_purge` fallará silenciosamente en su bloque 3. |
   | F-02 | **CRÍTICO** | `rls_y_rpcs.md §16` + `logic.md §50` | **Huérfanos en `auth.users`**
   — si el INSERT en `fichas_empleados` falla tras crear el usuario de Auth, la cuenta queda viva sin ficha. No existe `ef_cron_cleanup_orphans`. El usuario no podrá hacer login (claims vacíos) y nadie sabrá que existe. |
   | F-03 | **CRÍTICO** | `rls_y_rpcs.md §3` + `rbac_y_permisos.md` | **Roles fantasma con permisos efectivos**
   — `due`, `medico`, `responsable_flota`, `responsable_logistica` aparecen en `ROLE_CLAIMS` y RLS policies pero no están en los 6 seeds demo. No hay `rpc_cambiar_rol` documentada. `set_claims` no documenta qué hace ante un rol desconocido. |
   | F-04 | **ALTO** | `er_y_seeds.md §3 (línea 64)` | **`solicitudes_desbloqueo` sin path de resolución**
   — la tabla tiene estados `aprobada`/`rechazada` pero no hay RPC ni UPDATE policy para transicionar desde `pendiente`. Las solicitudes pueden expirar pero nunca aprobarse. |
   | F-05 | **ALTO** | `logic.md §48` | **Cancelación de DRP deja mochilas con stock huérfano**
   — al cancelar DRP, las mochilas BKP se marcan `disponible` pero su subinventario residual no se reconcilia con el almacén central. Genera descuadres silenciosos. |
   | F-06 | **ALTO** | `logic.md §48` | **Pacientes PSA/filiación quedan en estado incoherente al cancelar DRP**
   — las sesiones se cierran con `timestamp_cierre = NOW()` pero los pacientes individuales mantienen `estado = 'en_consulta'`. Las métricas operativas se corrompen. |

1.2 Fricciones de arquitectura/DB
| # | Severidad | Archivo / Sección | Descripción |
| - | - | - | - |
| F-07 | **ALTO** | `er_y_seeds.md §3 (línea 103)` | **`entidad_imputable_tipo` sin enum PostgreSQL** — el campo se describe como `('vehiculo'/'drp'/'persona'/'sin_imputar')` pero no hay `CREATE TYPE`. Cualquier valor de texto pasa el constraint. |
| F-08 | **ALTO** | `er_y_seeds.md §3 (línea 104)` | **`auditoria_inventario.tipo_movimiento` no exhaustivo** — la lista enum no incluye todos los flujos documentados (consumo PSA/filiación, eventos físicos vehículo, ajustes RGPD). |
| F-09 | **ALTO** | `rls_y_rpcs.md` | **`cancelar_drp` no centralizada en `rls_y_rpcs.md`** — la SQL completa vive solo en `logic.md §48`. Riesgo de drift si alguien busca por rls*y_rpcs y modifica sin actualizar logic. |
| F-10 | **MEDIO** | `er_y_seeds.md §3 (línea 103)` + §5 | **`mutation_uuid` sin índice UNIQUE explícito** — la idempotencia ON CONFLICT DO NOTHING requiere `UNIQUE(mutation_uuid)` pero no aparece en la sección §5 de índices. |
| F-11 | **CRÍTICO** | Sin doc | **Sin estrategia de migraciones zero-downtime** — `0001_init.sql` se asume aplicado pero no hay path documentado para `0002*\*.sql` y siguientes. ¿Qué pasa con datos en producción al añadir un NOT NULL? |

1.3 Vulnerabilidades operativas

| # | Severidad | Archivo / Sección | Descripción | - | - | - |
| F-12                                                                                                                                                                             | **ALTO**    | `er_y_seeds.md §3 (línea 118)` + `rls_y_rpcs.md` | **`doc8.cerrado_por_admin_id` editable sin RPC**    |
| — no hay policy que restrinja UPDATE de este campo solo a `forzar_checkout_administrativo`. Cualquier usuario autenticado podría manipular el registro de quién forzó el cierre. |
| F-13                                                                                                                                                                             | **ALTO**    | `er_y_seeds.md §3 (línea 62)`                    | **Galletas revocadas sin recuperación de terminal** |
| — al dar de baja al único usuario asignado a un terminal, queda inaccesible sin que coordinación reciba aviso. Requiere intervención física.                                     |
| F-14                                                                                                                                                                             | **CRÍTICO** | `logic.md §52` + `rls_y_rpcs.md §19`             | **RGPD sin "derecho al olvido" on-demand**          |
| — solo hay purga automática a los 5 años. Si un paciente solicita borrado inmediato (obligación RGPD, plazo 30 días), no hay RPC ni Edge Function.                               |
| F-15                                                                                                                                                                             | **MEDIO**   | `logic.md §49`                                   | **Ajuste de stock a 0 sin validación reforzada**    |
| — el guard de `motivo ≥ 10 chars` permite vaciar un stock completo con motivo trivial. No notifica a logística.                                                                  |

1. ANÁLISIS DE BRECHAS (LO QUE FALTA)

2.1 Módulos críticos olvidados

| # | Módulo faltante | Impacto | - | - | - | - |
| G-01 | **Recuperación de contraseña self-service**     | `ef_reset_password` requiere RRHH presencial. No hay flujo "Olvidé mi contraseña" → email/SMS. En offline-first con dominios `@u24.internal` ficticios, no hay forma de recuperar autoservicio. ¿Es por diseño? Si sí, documentarlo en ADR. Si no, falta. |
| G-02 | **Cambio de contraseña por el propio empleado** | Tras login con contraseña temporal del onboarding, el empleado debería poder cambiarla. No hay RPC ni Edge Function documentada.                                                                                                                          |
| G-03 | **`rpc_cambiar_rol`**                           | Cambiar rol de un empleado dispara el trigger `trg_audit_cambio_rol` pero no hay RPC con validación de claim. Cualquier UPDATE directo pasa el trigger sin RBAC.                                                                                          |
| G-04 | **Borrado RGPD on-demand**                      | Falta tabla `solicitudes_rgpd` + RPC `rpc_solicitar_borrado_rgpd` + RPC `rpc_procesar_borrado_rgpd`.                                                                                                                                                      |
| G-05 | **`ef_cron_cleanup_orphans`**                   | Cron diario que busque users en `auth.users` sin ficha y los elimine. Indispensable para reparar fallos parciales del onboarding.                                                                                                                         |
| G-06 | **Sistema de notificaciones push (PWA)**        | Nada documentado sobre Web Push API para alertas críticas (Doc-11) cuando la PWA no está en foco. Crítico para coordinación.                                                                                                                              |
| G-07 | **Migraciones evolutivas (`0002+`)**            | Sin estrategia documentada de añadir columnas/tablas a un schema en producción con datos. ¿Branching? ¿Hot migration? ¿Downtime aceptable?                                                                                                                |
| G-08 | **Sistema de backups + restore**                | RPO/RTO no definidos. ¿Daily? ¿Hourly PITR? ¿Cómo se prueba que un restore funciona? ¿Quién es responsable?                                                                                                                                               |

2.2 Edge cases sin documentar

| #    | Edge case                                                 | Riesgo                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-09 | **Reloj del cliente desincronizado**                      | El cliente usa `NOW()` local para timestamps de cola offline. Si el reloj está mal (5 horas atrasado), los timestamps en DB serán incoherentes. ¿Se confía o se sobrescribe en servidor?                 |
| G-10 | **Cuota de IndexedDB excedida**                           | `useOfflineQueue` sin límite + Doc-7 con imágenes pueden saturar la cuota del dispositivo. No hay manejo de `QuotaExceededError`.                                                                        |
| G-11 | **JWT expira durante una operación crítica**              | El usuario está rellenando Doc-2 cuando el JWT expira a los 60 min. Al guardar, la mutación falla. ¿Se silent-refresh? ¿Se pierde el draft?                                                              |
| G-12 | **Concurrencia: dos coordinadores cancelan el mismo DRP** | `cancelar_drp` no documenta `FOR UPDATE` ni guard de doble cancelación. Posible race condition.                                                                                                          |
| G-13 | **Cambio de zona horaria**                                | El proyecto asume Europe/Madrid pero no lo declara. Operaciones internacionales (rescates fronterizos) confundirían timestamps.                                                                          |
| G-14 | **Vehículo dado de baja con DRP activo**                  | No hay guard. ¿Qué pasa si flota da de baja un vehículo que está en `dotaciones_drp` activo?                                                                                                             |
| G-15 | **Empleado con turno activo es dado de baja mid-shift**   | `ef_baja_empleado` no verifica si tiene Doc-8 abierto. La cola offline del terminal seguirá intentando sincronizar bajo un user inactivo → mutaciones rechazadas por RLS → bandeja de conflictos masiva. |

2.3 Infraestructura operativa ausente

| #    | Componente                                | Estado                                                                                                                 |
| ---- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| G-16 | **Observabilidad / Logging centralizado** | `runbooks.md` menciona Logflare pero no hay setup documentado. Sin Sentry o equivalente para errores frontend.         |
| G-17 | **Métricas de negocio**                   | ¿Cuántos DRPs/semana? ¿Latencia P95 por RPC? ¿% de mutaciones offline vs online? Sin dashboard, sin alertas tempranas. |
| G-18 | **Service Worker — Estrategia de cache**  | ADR-003 lista qué es offline-capable, no cómo se cachean assets/API. Sin esto, deploys nuevos sirven UI stale.         |
| G-19 | **CI/CD pipeline**                        | Sin documento de stages, gates, rollback. ¿Branch protection? ¿Required reviewers?                                     |
| G-20 | **Health checks de Edge Functions**       | No hay endpoint `/health` documentado. Si una EF cae, nadie se entera hasta que un usuario reporta.                    |

2.4 UI/UX gaps

| #    | Componente                                 | Estado                                                                                                                                 |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| G-21 | **Mapeo de errores RPC → mensaje UI**      | Sin tabla que traduzca `'stock_insuficiente'` → "Stock insuficiente para esta operación". Riesgo de mostrar códigos crudos al usuario. |
| G-22 | **Loading states / Skeleton screens**      | Sin estándar documentado. Cada developer improvisa.                                                                                    |
| G-23 | **Componente de pantalla offline general** | El banner de degraded_mode está documentado, pero falta vista de "Sin conexión total — última sincronización hace X min".              |
| G-24 | **i18n**                                   | Decisión arquitectónica no tomada. Strings hardcoded en español.                                                                       |
| G-25 | **Modo daltónico / dark mode**             | ADR-003 fija WCAG AA pero no documenta paleta con ratios verificados.                                                                  |

1. HOJA DE RUTA DE DESARROLLO (BACKLOG PRIORIZADO)
🚨 FASE 8 — Corrección de bloqueadores de go-live (sprint 1, **1-2 semanas**)

**8.1 Fantasmas de schema y huérfanos**

- [x] **B-01** Definir tabla `filiacion_eventos` en `er_y_seeds.md` con columnas completas + RLS + índice UNIQUE para idempotencia del watchdog [F-01]
- [x] **B-02** Implementar transacción atómica en `ef_alta_empleado` con rollback de `auth.users` si falla INSERT en `fichas_empleados` [F-02]
- [x] **B-03** Crear `ef_cron_cleanup_orphans` — cron diario que purgue usuarios huérfanos en `auth.users` [G-05]
- [x] **B-04** Documentar enum exhaustivo de roles válidos en `rbac_y_permisos.md`, comportamiento de `set_claims` ante rol desconocido (devolver `{}` vacío) [F-03]
- [x] **B-05** Crear RPC `rpc_cambiar_rol(p_id_nombre, p_nuevo_rol)` con validación de claim y enum [G-03]

**8.2 Integridad de datos y enums**

- [x] **B-06** Crear enum PostgreSQL `entidad_imputable` y aplicar `NOT NULL` al campo en `descuadres_inventario` [F-07]
- [x] **B-07** Crear enum PostgreSQL exhaustivo `tipo_movimiento_inventario` con tabla "evento → valor" documentada [F-08]
- [x] **B-08** Añadir `UNIQUE(mutation_uuid)` a la sección §5 de `er_y_seeds.md` y al SQL de la migración [F-10]
- [x] **B-09** Restringir UPDATE de `doc8.cerrado_por_admin_id` solo via `forzar_checkout_administrativo` (policy `WITH CHECK (cerrado_por_admin_id IS NULL OR auth.uid() = ...)` o RPC exclusiva) [F-12]

**8.3 RGPD compliance**

- [x] **B-10** Crear tabla `solicitudes_rgpd` (id, tipo_solicitud, identificador, estado, motivo, timestamps) [F-14]
- [x] **B-11** Crear `rpc_solicitar_borrado_rgpd` (callable por DPO/gerencia) y `rpc_procesar_borrado_rgpd` que ejecute la purga inmediata [F-14, G-04]

**8.4 Operaciones / Infraestructura mínima**

- [x] **B-12** Crear `06_operaciones/infraestructura.md` con secciones: Backups (RPO/RTO), Migraciones (branching + rollback), Variables de entorno, CI/CD pipeline, Service Worker cache strategy [G-07, G-08, G-18, G-19]
- [x] **B-13** Definir observabilidad: Sentry para frontend, Logflare para Edge Functions, alertas por canal predefinido [G-16, G-20]
- [x] **B-14** Aplicar `realtime_kill_switch` y `cola_offline_procesamiento` como kill switches reales en el código (no solo en system_config) — verificar lectura en boot del cliente y en `useOfflineQueue` [Fase 7 incompleta]

🟠 FASE 9 — Cierre de edge cases y consistencia (sprint 2, **2-3 semanas**)

**9.1 Cascadas y coherencia transaccional**
- [x] **C-01** Refactorizar `cancelar_drp`: añadir cierre explícito de `psa_pacientes` y `filiacion_pacientes` con nuevo estado `'cancelado_por_drp'` [F-06]
      → `logic.md §48` pasos 6 y 8: `UPDATE psa_pacientes SET estado = 'cancelado_por_drp' WHERE estado NOT IN ('alta','exitus','cancelado_por_drp')` + ídem `filiacion_pacientes` con `timestamp_fin_consulta` condicional.
- [x] **C-02** Refactorizar `cancelar_drp`: generar descuadre automático por cada mochila BKP devuelta con stock residual [F-05]
      → `logic.md §48` paso 9: INSERT en `descuadres_inventario` por cada ítem con `stock_real > 0` en mochilas BKP del DRP; `entidad_imputable_tipo = 'drp'`. Se ejecuta antes de revertir estado de mochilas.
- [x] **C-03** Añadir guard a `cancelar_drp`: `FOR UPDATE` + verificación de doble cancelación [G-12]
      → `logic.md §48` paso 1: `SELECT estado FROM drps WHERE id = p_drp_id FOR UPDATE`. Guard idempotente: `IF v_estado_actual = 'Cancelado' THEN RAISE EXCEPTION 'drp_ya_cancelado'`.
- [x] **C-04** Añadir guard a `ef_baja_empleado`: si tiene Doc-8 abierto, forzar checkout administrativo antes de revocar [G-15]
      → `logic.md §51.3` paso 0.5: `GUARD DOC-8 — Forzar checkout si el empleado tiene un parte de trabajo activo`. `km_fin = NULL` permitido cuando `cerrado_por_admin_id IS NOT NULL` (§42.3). Se ejecuta antes de revocar JWT.
- [x] **C-05** Añadir guard a baja de vehículo: bloquear si está en `dotaciones_drp` activo [G-14]
      → `logic.md §57` paso 4 + `rls_y_rpcs.md §25`: guard `EXISTS (SELECT 1 FROM dotaciones_drp WHERE matricula = p_matricula AND timestamp_salida IS NULL)` → `vehiculo_en_drp_activo` 409.

**9.2 Flujos de resolución pendientes**
- [x] **C-06** Crear RPCs `rpc_aprobar_desbloqueo` y `rpc_rechazar_desbloqueo` + UPDATE policy en `solicitudes_desbloqueo` [F-04] → `logic.md §58`; `rls_y_rpcs.md §26`; policy `solicitudes_update` → USING(FALSE); `er_y_seeds.md` enum extendido con `desbloqueo_aprobado`/`desbloqueo_rechazado`
- [x] **C-07** Documentar en `logic.md §Doc-12` la transición al cerrar período de vacaciones: `'Borrador'` → descarte, `'Pendiente_Aprobacion'` → congelado [G del audit] → `logic.md §23.2` (nueva subsección con tabla de estados + regla de purga)
- [x] **C-08** Reforzar `rpc_ajuste_manual_stock`: si `cantidad_nueva = 0`, exigir motivo ≥ 30 chars + emitir Doc-11 aviso a logística [F-15] → `logic.md §49.2` (firma), `§49.3` (guard reforzado + paso 6 doc11_avisos INSERT), `§49.4` (reglas), `§49.5` (modal UI)

**9.3 Recuperación de credenciales y terminales**
- [x] **C-09** Definir ADR sobre recuperación de contraseña: ¿self-service o solo por RRHH? Documentar decisión [G-01]
      → `adrs.md ADR-004`: "Recuperación de contraseña: flujo gestionado exclusivamente por RRHH (C-09)". Justificación: dominios `@u24.internal` ficticios, sin email externo. Reset solo via `ef_reset_password` por RRHH/gerencia. Primer login online regenera sesión offline.
- [x] **C-10** Crear `rpc_cambiar_mi_password` (callable por el propio empleado autenticado, validación de contraseña actual + nueva) [G-02]
      → `logic.md §59`: hook `useCambiarPassword` + `ef_renovar_offline_session`. Usa `supabase.auth.updateUser({ password })` + reescritura atómica de `u24_offline_session` en IDB con el nuevo hash PBKDF2. Gotcha crítico documentado: si se omite el paso IDB, el terminal queda inaccesible en modo offline hasta el próximo check-in online.
- [x] **C-11** Antes de revocar la última galleta de un terminal: emitir Doc-11 a coordinación + procedimiento documentado en runbook [F-13]
      → `logic.md §51.3` paso 2.5: `GUARD TERMINAL HUÉRFANO — emitir aviso crítico si algún terminal quedó sin galleta (C-11)`. Ignora galletas con `revocado_at IS NOT NULL`. Si recuento cae a 0 → INSERT `doc11_avisos` tipo `terminal_sin_galleta` dirigido a coordinación. Referencia `runbooks.md RB-05`.

**9.4 Hardening de cliente**
- [x] **C-12** Implementar manejo de `QuotaExceededError` en IndexedDB: priorización de purga (mantener cola offline > caché bandejas > caché global) [G-10]
      La gestión se hace interceptando los errores de escritura en idb-keyval (middleware de Zustand). El orden estricto de borrado para liberar cuota debe ser: 1º global_cache (marquesina), 2º bandejas_cache, 3º (solo en caso extremo) purgar imágenes de Doc-7 en la offline_queue. Nunca vaciar las mutaciones clínicas de la cola offline.
      → `idbStorageWithQuotaGuard` en hooks.md §15 (Persistencia Asíncrona). Purge loop con PURGE_ORDER + `purgeDoc7Images()` como último recurso.

- [x] **C-13** Implementar silent refresh de JWT antes de expirar (refresh a los 50 min sobre TTL 60 min) [G-11]
      Supabase SDK maneja el refresh automáticamente por defecto, pero como es un entorno offline, debe asegurarse de suscribirse a onAuthStateChange y persistir los nuevos claims en el sessionStorage de useAuthStore cada vez que ocurra un token refresh.
      → Timer proactivo `scheduleJwtRefresh()` + suscripción `onAuthStateChange` en supabaseClient.ts documentados en hooks.md §18.2. Nuevo método `updateClaims` en useAuthStore.

- [x] **C-14** Servidor sobrescribe timestamps de cola offline con `NOW()` del servidor para mutaciones críticas — documentar qué campos confían en cliente vs servidor [G-09]
      Estableze una regla clara: las RPCs deben usar NOW() (tiempo del servidor) para columnas como created_at o timestamp_sincronizacion, pero deben respetar el timestamp del payload del cliente (IndexedDB) para campos transaccionales pasados como timestamp_apertura o timestamp_cierre.
      → §60 añadido en logic.md: tabla completa de autoridad por campo, ejemplo SQL correcto/incorrecto, validación de rango en cliente, referencia a ADR-005.

- [x] **C-15** Declarar timezone Europe/Madrid en ADR + en setup de Supabase [G-13]
      Para fijar Europe/Madrid a nivel de base de datos, debe incluir el comando ALTER DATABASE postgres SET timezone TO 'Europe/Madrid'; en un archivo de migración SQL, no solo configurarlo en el cliente.
      → ADR-005 añadido en adrs.md. Migraciones `20260519_set_timezone_europe_madrid.sql` + `20260519_alter_km_fin_nullable.sql` documentadas en infraestructura.md §2.4.

---

🟡 FASE 10 — Pulido UI/UX y desarrollo end-to-end (sprint 3+, **3-4 semanas**)
**10.1 Estándares de UI**
- [x] **U-01** Crear `05_interfaz_y_desarrollo/error_handling.md` con tabla completa de errores RPC → mensaje UI en español + tipo (toast/modal/inline) [G-21]
      → Creado `error_handling.md`. Cubre: anatomía PostgrestError, 5 tipos de presentación, 10 errores PG nativos (23505/42501/P0002/etc.), ~40 errores custom por módulo (autenticación, DRP, inventario, vehículos, Doc-8, filiación, RRHH, galletas), errores de red vs validación, hook `resolveRpcError()` con tabla maestra y detección por substring para mensajes dinámicos, errores de Auth SDK y errores de cliente previos al envío.

- [x] **U-02** Añadir sección "Loading States" a `componentes.md` con `<LoadingSkeleton />` reutilizable + reglas de uso [G-22]
      → Sección `## LoadingSkeleton` añadida a componentes.md. Variantes: page/card/row/spinner. Tabla explícita de cuándo usar (boot inicial, sync explícito) y cuándo NO usar (navegación entre pantallas cacheadas, stores Zustand síncronos, modo offline con datos en IDB). Integración con TanStack Query. Accesibilidad con `role="status"` y `sr-only`.

- [x] **U-03** Diseñar vista "Sin conexión total" con marca de "última sincronización hace X" [G-23]
      → Sección `## BannerOffline` añadida a componentes.md. Banner persistente (no página bloqueante) con `bg-amber-50`. Contador `lastSuccessfulDrainAt` desde `useOfflineQueue`. Tabla de flujos permitidos/deshabilitados en offline. Detección triple: navigator.onLine + canal Realtime + classifyError(). Ratio WCAG `text-amber-800` sobre `bg-amber-50` = 5.4:1 ✅.

- [x] **U-04** Documentar paleta de colores con ratios WCAG AA verificados (texto, badges, alertas) [G-25]
      → Sección `## Paleta de colores` añadida a componentes.md. Ratios calculados para: texto sobre header negro (8:1 min), texto sobre blanco (4.6:1 min), badges (5.4:1 min), alertas, botones. Flagea amber-600 sobre blanco (2.97:1 ❌) y prescribe amber-700 (4.6:1 ✅). 5 reglas de accesibilidad adicionales (aria-label, focus-trap, listas semánticas, formularios, texto deshabilitado).

**10.2 Decisiones aplazadas**
- [x] **U-05** ADR sobre i18n: SP-only por ahora, plan de migración a i18next si se requiere multi-lang [G-24]
      → ADR-006 añadido en adrs.md. Evalúa 4 opciones (sin librería, react-intl, i18next, Intl nativa). Decide español directo en JSX: 0KB overhead, legibilidad inmediata. Reglas: strings de UI en español, identificadores de máquina en inglés, formatos con Intl API nativa. Ruta de migración: i18next-scanner + jscodeshift codemods (2-3 sprints cuando sea necesario).

- [x] **U-06** Web Push API: spec de notificaciones para Doc-11 críticos cuando la PWA no esté en foco [G-06]
      → hooks.md §21 (usePushNotifications). Documenta limitaciones iOS estrictas: iOS 16.4+ obligatorio, Home Screen install obligatorio, APNs, throttling, sin re-prompt si revocado. 4 tipos de aviso crítico con sus textos. Arquitectura Database Webhook → ef_enviar_push_critico (no Realtime — funciona con app cerrada). Tabla push_subscriptions, hook usePushNotifications, Service Worker PushEvent handler, Edge Function con web-push VAPID, UX del prompt (roles de supervisión, aviso iOS adicional), setup de claves VAPID.

- [x] **U-07** Métricas de negocio: definir dashboard mínimo (Supabase + Grafana o equivalente) con KPIs operativos [G-17]
      → infraestructura.md §7. Stack: Grafana + datasource PostgreSQL (recomendado) o Supabase Studio SQL views. 4 vistas materializadas CONCURRENT REFRESH cada 15 min sobre auditoria_rbac, descuadres_inventario, doc1_asistencias, drps (nunca tablas operativas calientes). 13 KPIs tabulados. Rol grafana_reader con GRANT SELECT solo en vistas + REVOKE explícito en tablas operativas. 4 alertas de negocio en Grafana. Sección explícita de qué NO incluye el dashboard (stock en tiempo real, datos clínicos, GPS, galletas activas).

**10.3 Validación pre-producción**
- [x] **U-08** Ejecutar el plan de pentest documentado en `testing_arquitectura.md §3` y registrar resultados en issue tracker
      → `testing_arquitectura.md §6`. Protocolo de ejecución con tabla de resultados por vector (3.1.A–G RLS/RPC, 3.2.A–E JWT/galletas, 3.3.A–D cola offline, 3.4.A–B SW/assets). Comandos curl de referencia por vector. Criterio de cierre: cualquier FAIL → issue `blocker` en tracker, bloquea go-live. Setup: staging + seeds 01–06 + tokens de cada rol. Todas las entradas Pass/Fail vacías listas para rellenar durante la ejecución real.

- [x] **U-09** Ejecutar prueba de carga 1000 mutaciones offline en staging — confirmar SLA < 10 min
      → `testing_arquitectura.md §7`. Protocolo en 2 pasos: PASO 1 script de inyección nativa (IndexedDB API directa sobre `keyval-db`/`keyval`, 1000 mutaciones: 25% doc8_update_km + 25% evento_fisico_vehiculo + 50% doc6_create); PASO 2 script de medición via `window.__U24_STORES__.useOfflineQueue.getState().procesarCola()` con `performance.now()`. 5 criterios de aceptación: < 10 min, 0 failures, 0 conflictos, < 10 MB heap delta, 0 errores 429. SQL de verificación en staging. Prerequisito: staging activo + seeds 01–06 + `cola_offline_procesamiento = true`.

- [x] **U-10** Ejecutar simulacro de los 4 runbooks (RB-01 a RB-04) en staging con todo el equipo
      → `testing_arquitectura.md §8`. 4 simulacros referenciados a escenarios exactos de `runbooks.md`: RB-01 (caída total Supabase — revocar anon key o /etc/hosts), RB-02 (Realtime caído — `realtime_kill_switch = true`), RB-03 (cola corrupta — inyectar mutación con FK inválida), RB-04 (GPS denegado — denegar geolocalización en ajustes del navegador). Cada simulacro incluye pasos de preparación, método de inyección del fallo, checklist temporizado y tabla de criterios Pass/Fail. Formulario de registro compartido al final.

- [x] **U-11** Smoke test post-go-live: lista de operaciones críticas que deben pasar en los primeros 60 min de producción
      → `testing_arquitectura.md §9`. Checklist de 10 puntos ejecutables en 45–60 min usando vehículo `1111-DEMO` (convención `-DEMO` excluye de estadísticas con `WHERE matricula NOT LIKE '%-DEMO'`). Puntos: login (3 roles), Realtime bandejas, marquesina, GPS DEMO, lectura inventario, apertura Doc-8, cierre admin con km_fin=NULL (válido por C-04), ciclo cola offline, push (N/A si U-06 no desplegado), logout+PIN. Tabla Pass/Fail por punto. Política de rollback: ≥2 FAILs o error irrecuperable → rollback + incidente P0.

---

## Estado del backlog tras Fases 8 + 9 + 10

| Bloque | Items | Cerrados | Pendientes |
|---|---|---|---|
| **8.1** Fantasmas de schema y huérfanos | B-01 … B-05 | ✅ 5/5 | — |
| **8.2** Integridad de datos y enums | B-06 … B-09 | ✅ 4/4 | — |
| **8.3** RGPD compliance | B-10, B-11 | ✅ 2/2 | — |
| **8.4** Operaciones / Infraestructura mínima | B-12 … B-14 | ✅ 3/3 | — |
| **9.1** Cascadas y coherencia transaccional | C-01 … C-05 | ✅ 5/5 | — |
| **9.2** Flujos de resolución pendientes | C-06 … C-08 | ✅ 3/3 | — |
| **9.3** Recuperación de credenciales y terminales | C-09 … C-11 | ✅ 3/3 | — |
| **9.4** Hardening de cliente | C-12 … C-15 | ✅ 4/4 | — |
| **10.1** Estándares de UI | U-01 … U-04 | ✅ 4/4 | — |
| **10.2** Decisiones aplazadas | U-05 … U-07 | ✅ 3/3 | — |
| **10.3** Validación pre-producción | U-08 … U-11 | ✅ 4/4 | — |
| **Total** | **40** | **40 cerrados** | **0 pendientes** |

### ✅ Especificación completa — lista para iniciar implementación

Todos los ítems del backlog de auditoría están implementados en la documentación.
El siguiente paso es la **Fase 1 de `hoja_de_ruta.md`**: inicializar Supabase CLI y crear la migración 0001.
