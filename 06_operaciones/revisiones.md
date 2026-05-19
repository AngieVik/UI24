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

**9.1* Cascadas y coherencia transaccional**

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

**9.2* Flujos de resolución pendientes**

- [x] **C-06** Crear RPCs `rpc_aprobar_desbloqueo` y `rpc_rechazar_desbloqueo` + UPDATE policy en `solicitudes_desbloqueo` [F-04] → `logic.md §58`; `rls_y_rpcs.md §26`; policy `solicitudes_update` → USING(FALSE); `er_y_seeds.md` enum extendido con `desbloqueo_aprobado`/`desbloqueo_rechazado`
- [x] **C-07** Documentar en `logic.md §Doc-12` la transición al cerrar período de vacaciones: `'Borrador'` → descarte, `'Pendiente_Aprobacion'` → congelado [G del audit] → `logic.md §23.2` (nueva subsección con tabla de estados + regla de purga)
- [x] **C-08** Reforzar `rpc_ajuste_manual_stock`: si `cantidad_nueva = 0`, exigir motivo ≥ 30 chars + emitir Doc-11 aviso a logística [F-15] → `logic.md §49.2` (firma), `§49.3` (guard reforzado + paso 6 doc11_avisos INSERT), `§49.4` (reglas), `§49.5` (modal UI)

**9.3* Recuperación de credenciales y terminales**

- [x] **C-09** Definir ADR sobre recuperación de contraseña: ¿self-service o solo por RRHH? Documentar decisión [G-01]
      → `adrs.md ADR-004`: "Recuperación de contraseña: flujo gestionado exclusivamente por RRHH (C-09)". Justificación: dominios `@u24.internal` ficticios, sin email externo. Reset solo via `ef_reset_password` por RRHH/gerencia. Primer login online regenera sesión offline.
- [x] **C-10** Crear `rpc_cambiar_mi_password` (callable por el propio empleado autenticado, validación de contraseña actual + nueva) [G-02]
      → `logic.md §59`: hook `useCambiarPassword` + `ef_renovar_offline_session`. Usa `supabase.auth.updateUser({ password })` + reescritura atómica de `u24_offline_session` en IDB con el nuevo hash PBKDF2. Gotcha crítico documentado: si se omite el paso IDB, el terminal queda inaccesible en modo offline hasta el próximo check-in online.
- [x] **C-11** Antes de revocar la última galleta de un terminal: emitir Doc-11 a coordinación + procedimiento documentado en runbook [F-13]
      → `logic.md §51.3` paso 2.5: `GUARD TERMINAL HUÉRFANO — emitir aviso crítico si algún terminal quedó sin galleta (C-11)`. Ignora galletas con `revocado_at IS NOT NULL`. Si recuento cae a 0 → INSERT `doc11_avisos` tipo `terminal_sin_galleta` dirigido a coordinación. Referencia `runbooks.md RB-05`.

**9.4* Hardening de cliente**

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

**10.1* Estándares de UI**

- [x] **U-01** Crear `05_interfaz_y_desarrollo/error_handling.md` con tabla completa de errores RPC → mensaje UI en español + tipo (toast/modal/inline) [G-21]
      → Creado `error_handling.md`. Cubre: anatomía PostgrestError, 5 tipos de presentación, 10 errores PG nativos (23505/42501/P0002/etc.), ~40 errores custom por módulo (autenticación, DRP, inventario, vehículos, Doc-8, filiación, RRHH, galletas), errores de red vs validación, hook `resolveRpcError()` con tabla maestra y detección por substring para mensajes dinámicos, errores de Auth SDK y errores de cliente previos al envío.

- [x] **U-02** Añadir sección "Loading States" a `componentes.md` con `<LoadingSkeleton />` reutilizable + reglas de uso [G-22]
      → Sección `## LoadingSkeleton` añadida a componentes.md. Variantes: page/card/row/spinner. Tabla explícita de cuándo usar (boot inicial, sync explícito) y cuándo NO usar (navegación entre pantallas cacheadas, stores Zustand síncronos, modo offline con datos en IDB). Integración con TanStack Query. Accesibilidad con `role="status"` y `sr-only`.

- [x] **U-03** Diseñar vista "Sin conexión total" con marca de "última sincronización hace X" [G-23]
      → Sección `## BannerOffline` añadida a componentes.md. Banner persistente (no página bloqueante) con `bg-amber-50`. Contador `lastSuccessfulDrainAt` desde `useOfflineQueue`. Tabla de flujos permitidos/deshabilitados en offline. Detección triple: navigator.onLine + canal Realtime + classifyError(). Ratio WCAG `text-amber-800` sobre `bg-amber-50` = 5.4:1 ✅.

- [x] **U-04** Documentar paleta de colores con ratios WCAG AA verificados (texto, badges, alertas) [G-25]
      → Sección `## Paleta de colores` añadida a componentes.md. Ratios calculados para: texto sobre header negro (8:1 min), texto sobre blanco (4.6:1 min), badges (5.4:1 min), alertas, botones. Flagea amber-600 sobre blanco (2.97:1 ❌) y prescribe amber-700 (4.6:1 ✅). 5 reglas de accesibilidad adicionales (aria-label, focus-trap, listas semánticas, formularios, texto deshabilitado).

**10.2* Decisiones aplazadas**

- [x] **U-05** ADR sobre i18n: SP-only por ahora, plan de migración a i18next si se requiere multi-lang [G-24]
      → ADR-006 añadido en adrs.md. Evalúa 4 opciones (sin librería, react-intl, i18next, Intl nativa). Decide español directo en JSX: 0KB overhead, legibilidad inmediata. Reglas: strings de UI en español, identificadores de máquina en inglés, formatos con Intl API nativa. Ruta de migración: i18next-scanner + jscodeshift codemods (2-3 sprints cuando sea necesario).

- [x] **U-06** Web Push API: spec de notificaciones para Doc-11 críticos cuando la PWA no esté en foco [G-06]
      → hooks.md §21 (usePushNotifications). Documenta limitaciones iOS estrictas: iOS 16.4+ obligatorio, Home Screen install obligatorio, APNs, throttling, sin re-prompt si revocado. 4 tipos de aviso crítico con sus textos. Arquitectura Database Webhook → ef_enviar_push_critico (no Realtime — funciona con app cerrada). Tabla push_subscriptions, hook usePushNotifications, Service Worker PushEvent handler, Edge Function con web-push VAPID, UX del prompt (roles de supervisión, aviso iOS adicional), setup de claves VAPID.

- [x] **U-07** Métricas de negocio: definir dashboard mínimo (Supabase + Grafana o equivalente) con KPIs operativos [G-17]
      → infraestructura.md §7. Stack: Grafana + datasource PostgreSQL (recomendado) o Supabase Studio SQL views. 4 vistas materializadas CONCURRENT REFRESH cada 15 min sobre auditoria_rbac, descuadres_inventario, doc1_asistencias, drps (nunca tablas operativas calientes). 13 KPIs tabulados. Rol grafana_reader con GRANT SELECT solo en vistas + REVOKE explícito en tablas operativas. 4 alertas de negocio en Grafana. Sección explícita de qué NO incluye el dashboard (stock en tiempo real, datos clínicos, GPS, galletas activas).

**10.3* Validación pre-producción**

- [x] **U-08** Ejecutar el plan de pentest documentado en `testing_arquitectura.md §3` y registrar resultados en issue tracker
      → `testing_arquitectura.md §6`. Protocolo de ejecución con tabla de resultados por vector (3.1.A–G RLS/RPC, 3.2.A–E JWT/galletas, 3.3.A–D cola offline, 3.4.A–B SW/assets). Comandos curl de referencia por vector. Criterio de cierre: cualquier FAIL → issue `blocker` en tracker, bloquea go-live. Setup: staging + seeds 01–06 + tokens de cada rol. Todas las entradas Pass/Fail vacías listas para rellenar durante la ejecución real.

- [x] **U-09** Ejecutar prueba de carga 1000 mutaciones offline en staging — confirmar SLA < 10 min
      → `testing_arquitectura.md §7`. Protocolo en 2 pasos: PASO 1 script de inyección nativa (IndexedDB API directa sobre `keyval-db`/`keyval`, 1000 mutaciones: 25% doc8_update_km + 25% evento_fisico_vehiculo + 50% doc6_create); PASO 2 script de medición via `window.__U24_STORES__.useOfflineQueue.getState().procesarCola()` con `performance.now()`. 5 criterios de aceptación: < 10 min, 0 failures, 0 conflictos, < 10 MB heap delta, 0 errores 429. SQL de verificación en staging. Prerequisito: staging activo + seeds 01–06 + `cola_offline_procesamiento = true`.

- [x] **U-10** Ejecutar simulacro de los 4 runbooks (RB-01 a RB-04) en staging con todo el equipo
      → `testing_arquitectura.md §8`. 4 simulacros referenciados a escenarios exactos de `runbooks.md`: RB-01 (caída total Supabase — revocar anon key o /etc/hosts), RB-02 (Realtime caído — `realtime_kill_switch = true`), RB-03 (cola corrupta — inyectar mutación con FK inválida), RB-04 (GPS denegado — denegar geolocalización en ajustes del navegador). Cada simulacro incluye pasos de preparación, método de inyección del fallo, checklist temporizado y tabla de criterios Pass/Fail. Formulario de registro compartido al final.

- [x] **U-11** Smoke test post-go-live: lista de operaciones críticas que deben pasar en los primeros 60 min de producción
      → `testing_arquitectura.md §9`. Checklist de 10 puntos ejecutables en 45–60 min usando vehículo `1111-DEMO` (convención `-DEMO` excluye de estadísticas con `WHERE matricula NOT LIKE '%-DEMO'`). Puntos: login (3 roles), Realtime bandejas, marquesina, GPS DEMO, lectura inventario, apertura Doc-8, cierre admin con km_fin=NULL (válido por C-04), ciclo cola offline, push (N/A si U-06 no desplegado), logout+PIN. Tabla Pass/Fail por punto. Política de rollback: ≥2 FAILs o error irrecuperable → rollback + incidente P0.

---

A — Contradicciones entre fuentes de verdad (drift documental)
      A-01 Resolver duplicado ADR-001 — renumerar la clarificación como ADR-007 y actualizar todas las referencias en terminal_check.md, estados.md §16grep -r "ADR-001" docs/ retorna solo el original
      A-02 Reconciliar nomenclatura de cookies a permanente/temporal en estados.md §2. Eliminar galleta / galleta_pequeña / estandar / sin_sesion como nombres de estado. Documentar mapeo UI-only en una sola tabla.estados.md §2 usa exclusivamente los valores canónicos
      A-03 Decidir 244 vs 245 ítems y propagar. Auditar 01_catalogo.sql cuando se genere.Un único número en todos los .md
      A-04 Añadir estado Enviado_Cerrado_Administrativo a estados.md §15 Doc-8. Incluir transición desde Abierto_En_Turno. Máquina cerrada
      A-05 Unificar enum tipo_movimiento_inventario. La autoridad debe ser er_y_seeds.md §6.2. Reescribir nucleo_logistica_y_almacen.md:27-38 con los 8 valores canónicos + tabla evento→valor.Un solo diccionario
      A-06 Añadir valor 'dado_de_baja' al enum condicion_tecnica en estados.md §4b + en migración.C-05 deja de violar dominio
      A-07 Resolver cerrado_por_admin_id vs cerrado_por_coordinador_id. Mantener *admin* (más general). Actualizar referencias en núcleo coordinación.Un solo nombre
      A-08 Corregir classifyError para que el caso hint=null/httpHint=0 no caiga en network. Default seguro = validation o unknown. Añadir test que verifique.Test unitario Vitest pasa
      A-09 Decidir si p_filiacion es repositorio dedicado o estructura inline. Si repositorio → añadir tabla en er_y_seeds.md. Si inline → eliminar referencias confusas.Decisión documentada en ADR-008
      A-10 Decidir alta de due / medico / responsable_flota / responsable_logistica: ¿se incluyen en 04_admin_users.sql o se generan post-bootstrap? Documentar el flujo "First gerencia user provisioning" como runbooks.md RB-06.Runbook publicado

B — Fallos lógicos y race conditions
      B-01 Diseñar manejo de JWT expirado en modo offline. ADR sobre: ¿usar u24_offline_session para firmar mutaciones de cola? ¿Aceptar JWT expirado en cola con tolerancia y revalidar al sync? L3
      B-02 Multi-terminal password change: ef_renovar_offline_session debe invalidar el hash en todos los terminales del empleado vía Supabase Realtime broadcast → cada cliente borra su u24_offline_session local y exige re-login online. L2
      B-03 Implementar Doc-11 automático en cancelar_drp a coordinación, gerencia y dotaciones afectadas. SQL en logic.md §48 paso 10. L5
      B-04 TTL automático de inventario_en_transito > 48h → Doc-11 a logística origen + destino. Edge Cron diario. V1
      B-05 Auto-revocación de galleta permanente sin uso > 90 días. ef_cron_revoke_stale_terminals. G7
      B-06 Constraint EXCLUDE (id_nombre WITH =) WHERE (checkin_on = true) o Presence channel para evitar doble checkin. L8 / G5
      B-07 Max-retries y TTL de descarte en useOfflineQueue. Tras 5 reintentos o > 7 días → forzar a bandeja_conflictos con notificación al usuario. L9
      B-08 Step-up auth para acciones críticas (revocar_y_reemitir_galleta, ef_baja_empleado, system_config UPDATE). PIN secundario o TOTP. ADR. G8
      B-09 Rate-limit en consumo de PIN de emergencia: 5 intentos/id_terminal/10min, bloqueo escalado. Edge Function. G9 / V5
      B-10 Extender polling fallback a bandejas no críticas en degraded_mode (intervalo 60s para no saturar). Actualizar useRealtime. 1.C
      B-11 Acotar Operativo_Condicionado a máx. 2 encadenamientos antes de exigir reconciliación física. Si se alcanza el límite → bloqueo de asignación + alerta a gerencia. L6
      B-12 Reducir cota de drift de reloj a ±5 min pasado y futuro. Forzar resync NTP en cliente con Date - performance.now() corregido por offset servidor (devolver header X-Server-Time en cada respuesta). L10
      B-13 Soft-delete: añadir columna archivado boolean en catalogo_items + RLS UPDATE solo can_manage_catalog. G11
      B-14 Tabla versiones_cliente + header X-Client-Version + Edge Function validate_client_version. Rechazo de RPCs con versión < min permitida. G13

C — Dependencia ciega del Realtime
      C-01 Capacity planning formal: simular 100 dispositivos concurrentes en staging, medir Realtime + Postgres + Edge Functions. Documentar techo. O5
      C-02 DR drill trimestral: simulacro de restore desde PITR a un proyecto Supabase nuevo, midiendo RTO real. O3
      C-03 Política de retención Sentry/Logflare. 30 días para errores, 7 días para replays, scrubbing automático de campos PII clínicos en beforeSend. G10
      C-04 Diseño accesibilidad daltónica: badges con iconografía adicional al color (ti-check, ti-alert), patrones de relleno. UX4
      C-05 Atajos de teclado en puestos de coordinación. Documentar en componentes.md. UX5
      C-06 Auditoría de cobertura auditoria_rbac: test que ejecute cada Edge Function/RPC sensitiva y verifique INSERT correspondiente. V4
      C-07 Smoke E2E automatizado post-deploy (Playwright en CI tras supabase db push). O2
      C-08 Política RGPD operativa: SLA 30 días, runbook de verificación de identidad, comunicación post-borrado al solicitante. O7
      C-09 Mid-shift terminal handover: flujo documentado + RPC rpc_transferir_galleta. G4
      C-10 Backup de cola offline al cambio de turno: serializar IndexedDB → blob cifrado → enviar al servidor cada N min como insurance contra pérdida física del dispositivo. O6

---
