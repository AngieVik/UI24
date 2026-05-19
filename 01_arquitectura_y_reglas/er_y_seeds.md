# Esquema ER y Seeds — Proyecto U24

> Documento actualizado en Fase 1 (2026-05-18). Todas las tablas ⚠ han sido validadas contra `03_nucleos_de_negocio/`. Las tablas marcadas ✓ están listas para migración.
> Path de migración confirmado: `supabase/migrations/0001_init.sql`
> Proyecto Supabase: nuevo (sin `project_ref` asignado aún).

---

## 1. Nomenclatura canónica — galletas de terminal

| Capa | Término `permanente` | Término `temporal` |
|---|---|---|
| Base de datos (`galletas_terminales.tipo`) | `'permanente'` | `'temporal'` |
| Store Zustand (`useTerminalStore.tipoGalleta`) | `'permanente'` | `'temporal'` |
| RPCs PostgreSQL (parámetros) | `'permanente'` | `'temporal'` |
| Strings UI (etiquetas visibles) | `'Galleta'` | `'Galleta pequeña'` |
| Strings UI (descripciones largas) | `'Cookie permanente de terminal'` | `'Sesión temporal de terminal'` |

Ver `adrs.md` sección "Nomenclatura Canónica" para la regla completa.

---

## 2. Seed de datos demo

### 2.1 Vehículos demo (5 unidades)

| matricula | tipo | plantilla asociada | perfil |
|---|---|---|---|
| `1111-DEMO` | A1 | `plantilla_A1A2` | No asistencial — transporte |
| `1112-DEMO` | A1 | `plantilla_A1A2` | No asistencial — transporte |
| `2222-DEMO` | B | `plantilla_B` | Básica (SVB) |
| `3333-DEMO` | C | `plantilla_C` | SVA — Soporte Vital Avanzado |
| `4444-DEMO` | VIR | `plantilla_VIR` | Vehículo de Intervención Rápida |

### 2.2 Usuarios demo (6 roles)

| email demo | id_nombre demo | rol | descripción |
|---|---|---|---|
| `tes@demo.u24.internal` | `tes_demo` | `tes` | Técnico de emergencias sanitarias |
| `flota@demo.u24.internal` | `flota_demo` | `flota` | Gestión Doc-7 (averías), bandejas de flota |
| `coordinacion@demo.u24.internal` | `coordinacion_demo` | `coordinacion` | Gestión operativa, DRP, tablón |
| `logistica@demo.u24.internal` | `logistica_demo` | `logistica` | Inventario, Doc-9, Doc-10, almacén |
| `gerencia@demo.u24.internal` | `gerencia_demo` | `gerencia` | Supervisión global, marquesina |
| `rrhh@demo.u24.internal` | `rrhh_demo` | `rrhh` | Gestión de personal, fichas empleados |

> Email sintético: `id_nombre@u24.internal` — dominio ficticio, nunca real. Supabase Auth lo acepta como email válido para crear `auth.users`.
> Contraseña demo: definir en `supabase/seeds/04_admin_users.sql` usando la variable de entorno `SEED_ADMIN_PASSWORD`. Nunca versionar la contraseña en texto plano.

### 2.3 Catálogo

244 ítems (IDs 1–244 tras corrección del error de numeración — el ID original empezaba en 2 por error). Ver `catalogo_items.md`.

---

## 3. Esquema ER — Tablas

### Dominio: Identidad y acceso ✓

| Tabla | PK | Descripción |
|---|---|---|
| `fichas_empleados` | `id_persona` (UUID) | Personal registrado. `auth_user_id` (FK → `auth.users.id`), `id_nombre` (alias operativo único, NOT NULL), `nombre_real`, `dni`, `rol` (tes/flota/coordinacion/logistica/gerencia/rrhh), `activo` boolean, `fecha_alta`, `fecha_baja`. El `id_nombre` es el identificador operativo visible; el email en `auth.users` es `id_nombre@u24.internal` (dominio ficticio). |
| `galletas_terminales` | `id_galleta` (UUID) | Cookies de terminal registrado. `id_terminal` (SHA-256 fingerprint — canvas + userAgent + screen + timezone), `tipo` ('permanente'/'temporal'), `id_nombre` (FK `fichas_empleados`), `created_at`, `expires_at` (null para permanente), `revocado_at` (nullable — null = galleta activa; timestamp = revocada, soft delete). Partial unique index: UNIQUE(`id_terminal`) WHERE `revocado_at IS NULL` — permite historial de revocaciones por terminal. RLS DELETE: `USING (FALSE)`. RLS UPDATE: solo via `rpc_revocar_y_reemitir_galleta` (SECURITY DEFINER). |
| `sesiones_emergencia` | `id_sesion` (UUID) | Tokens PIN de emergencia. `pin_hash` (PBKDF2-SHA256), `tipo` ('permanente'/'temporal'), `id_nombre_emisor`, `created_at`, `consumido_at`, `expires_at` (TTL 10 min para no-consumidas). Purgados por Edge Function cronjob. RLS UPDATE/DELETE: `USING (FALSE)`. |
| `solicitudes_desbloqueo` | `id_solicitud` (UUID) | Solicitudes de desbloqueo de terminal. `id_terminal`, `id_nombre_solicitante`, `motivo` (text), `estado` ('pendiente'/'aprobada'/'rechazada'/'expirada'), `id_nombre_revisor` (null hasta revisión), `created_at`, `expires_at`. El cron purge marca las pendientes expiradas como 'expirada' (no las elimina). |
| `auditoria_rbac` | `id_evento` (UUID) | Log inmutable de eventos de seguridad. `tipo_evento` (ver enum abajo), `id_nombre`, `id_terminal` (nullable), `ip` (nullable), `metadata` (jsonb), `created_at`. RLS INSERT: política de servicio (solo Edge Functions/triggers). RLS UPDATE/DELETE: `USING (FALSE)`. |

**Enum `tipo_evento` de `auditoria_rbac`:**

| Valor | Descripción |
|---|---|
| `login_exitoso` | Autenticación Supabase Auth completada |
| `fallo_autenticacion` | Intento fallido de login (PIN, contraseña o galleta inválida) |
| `logout` | Cierre de sesión explícito |
| `cambio_rol` | Modificación de rol de un empleado |
| `cambio_password` | Reset de contraseña (solo admin) |
| `sesion_emergencia_generada` | RPC `rpc_generar_token_emergencia` ejecutada |
| `sesion_emergencia_consumida` | PIN consumido correctamente |
| `galleta_emitida` | Nueva galleta de terminal registrada |
| `galleta_revocada` | Galleta revocada (por `rpc_revocar_y_reemitir_galleta`) |
| `logout_forzado` | Sesión invalidada forzosamente por coordinacion/gerencia via `ef_revocar_sesion_usuario` |
| `checkout_forzado` | Checkout administrativo de Doc-8 forzado por coordinacion/gerencia via `forzar_checkout_administrativo` |
| `alta_empleado` | Nuevo empleado dado de alta via `ef_alta_empleado` (Gap F3) |
| `baja_empleado` | Empleado dado de baja via `ef_baja_empleado` — JWT + galletas revocados, cuadrante futuro eliminado (Gap F3) |

### Dominio: Vehículos y turnos ✓

| Tabla | PK | Descripción |
|---|---|---|
| `vehiculos` | `matricula` (text) | Matrícula, tipo (A1/A2/B/C/VIR/Quad/BKP), `condicion_tecnica`, `estado_operativo`, GPS (`lat`, `lng`, `gps_timestamp`). FK `plantilla_id`. |
| `activaciones_vehiculo` | `id_activacion` (UUID) | Registro de turno activo por vehículo. FK `matricula`. `pilot` (id_nombre), `carry` (id_nombre), `km_inicio`, `km_fin` (manuales), `timestamp_apertura`, `timestamp_cierre`. |
| `eventos_fisicos_vehiculo` | `id_evento` (UUID) | Registro de eventos físicos del vehículo: ITV, revisión, baja temporal, reincorporación. `tipo_evento`, `descripcion`, `timestamp_evento`, `id_nombre_registrador`. FK `matricula`. Append-only. |

### Dominio: Inventario ✓

| Tabla | PK | Descripción |
|---|---|---|
| `catalogo_items` | `id_item` (integer, 1–244) | Catálogo maestro. `categoria`, `nombre`, `especificacion`. |
| `plantillas_stock` | `plantilla_id` (text) | Definición de plantilla por tipo de vehículo. `tipo`, `perfil`. |
| `plantilla_lineas` | `(plantilla_id, subgrupo, id_item)` | Líneas de plantilla. `stock_objetivo`. FK `plantilla_id` + `id_item`. |
| `inventario_vehiculo` | `(matricula, id_item, subgrupo)` | Stock actual por vehículo y subgrupo. `stock_real`, `ultima_actualizacion`. Modificable solo por RPC atómica. |
| `inventario_base` | `(location_id, id_item)` | Stock del almacén central. `stock_real`. Modificable solo por RPC atómica. |
| `inventario_en_transito` | `id_transito` (UUID) | Material en tránsito entre locations (origen → destino). `id_transferencia` (FK `doc10_transferencias`), `id_item`, `cantidad`, `estado` ('en_transito'/'confirmado'/'cancelado'), `timestamp_envio`, `timestamp_confirmacion`. No modifica `inventario_vehiculo` ni `inventario_base` hasta confirmación. |
| `descuadres_inventario` | `id_descuadre` (UUID) | Registro de discrepancias de stock generadas por Doc-10. `id_doc10` (FK), `id_item`, `cantidad_diferencia` (INT — enviado − recibido), `location_origen`, `location_destino`, `estado` ('Pendiente_Revision'/'Resuelto'/'Archivado'), `id_nombre_resolutor` (nullable), `timestamp_generacion`, `timestamp_resolucion` (nullable), `mutation_uuid` (idempotencia ON CONFLICT DO NOTHING), `entidad_imputable_tipo` ('vehiculo'/'drp'/'persona'/'sin_imputar' — obligatorio en Resolver_Manual), `entidad_imputable_id` (text nullable — matricula / id_drp / id_nombre). RLS UPDATE: `can_edit_inventory`. |
| `auditoria_inventario` | `id_auditoria` (UUID) | Log inmutable de movimientos de inventario. `tipo_movimiento` (deduccion/entrada/transferencia/ajuste/merma/recuperacion_descuadre/merma_definitiva_residual), `id_item`, `cantidad_delta`, `location_origen`, `location_destino`, `id_nombre_operador`, `rpc_ejecutada`, `motivo` (text nullable), `entidad_imputable_tipo` (nullable — mismo discriminador que descuadres), `entidad_imputable_id` (text nullable), `created_at`. RLS UPDATE/DELETE: `USING (FALSE)`. |
| `locations` | `location_id` (UUID) | Almacenes y bases operativas. `nombre`, `tipo` (base/almacen/punto_drp). |

### Dominio: Documentos operativos ✓

| Tabla | PK | Descripción |
|---|---|---|
| `doc1_asistencias` | `id_entrada` (UUID) | Append-only. `id_nombre`, `timestamp_checkin`, `terminal_id`. RLS UPDATE/DELETE: `USING (FALSE)`. |
| `doc2_informes_svb` | `id_doc` (UUID) | Informe de asistencia SVB (Soporte Vital Básico). `id_activacion`, `id_nombre_redactor`, `auth_uid_redactor` (UUID = `auth.uid()` del creador — usado en RLS UPDATE), `timestamp_asistencia`, `datos_paciente` (jsonb), `estado` ('borrador'/'cerrado'). Offline-queueable. |
| `doc3_informes_sva` | `id_doc` (UUID) | Informe de asistencia SVA (Soporte Vital Avanzado). Estructura análoga a `doc2_informes_svb` con campos clínicos ampliados para unidades tipo C. `auth_uid_redactor` incluido. Offline-queueable. |
| `doc4_consentimientos` | `id_doc` (UUID) | Consentimiento informado del paciente. `id_activacion`, `id_nombre_redactor`, `auth_uid_redactor` (UUID), `timestamp_firma`, `tipo_consentimiento`, `firmado` boolean. Offline-queueable. |
| `doc5_rechazos_alta` | `id_doc` (UUID) | Rechazo de asistencia o alta voluntaria. `id_activacion`, `id_nombre_redactor`, `auth_uid_redactor` (UUID), `timestamp_rechazo`, `motivo_rechazo`, `firmado` boolean. Offline-queueable. |
| `doc6_deducciones` | `id_deduccion` (UUID) | Deducciones de stock. Ejecutadas por RPC atómica exclusivamente. FK `matricula` + `id_item`. |
| `doc7_averias` | `id_averia` (UUID) | Informe de avería. `nivel_criticidad` (Leve/Moderada/Grave), `sistema_afectado`, `descripcion_detallada`, `timestamp_incidencia`. FK `matricula`. Offline-queueable. Imágenes: Blob en Supabase Storage (no Base64). |
| `doc8_partes_trabajo` | `id_parte` (UUID) | Parte de vehículo. `km_inicio`, `km_fin` (entrada manual), `timestamp_inicio`, `timestamp_fin`, `estado` ('Borrador_En_Curso'/'Activo'/'Enviado_Cerrado'), `cerrado_por_admin_id` (UUID nullable, FK `fichas_empleados` — null si cierre normal por el pilot; UUID del coordinador si cierre administrativo forzado). FK `id_activacion`. |
| `doc9_entradas_almacen` | `id_entrada` (UUID) | Recepción de material en almacén. `fecha_recepcion` (entrada manual). FK `location_id`. |
| `doc10_transferencias` | `id_transferencia` (UUID) | Transferencia de material entre unidades. `timestamp_envio`, `timestamp_confirmacion`, `location_origen`, `location_destino`. |
| `doc11_avisos` | `id_aviso` (UUID) | Avisos críticos del sistema. `tipo_aviso` (rotura_stock/averia_grave/drp_activado/alerta_seguridad/aviso_coordinacion), `nivel` (informativo/aviso/critico), `id_nombre_emisor`, `texto`, `timestamp_publicacion`, `leido_por` (jsonb — array de id_nombre). |

### Dominio: DRP ✓

| Tabla | PK | Descripción |
|---|---|---|
| `drps` | `id_drp` (UUID) | Plan de Respuesta a Desastres. `estado` ('En_espera'/'En_preparacion'/'En_curso'/'Finalizado'/'Finalizado_Retenido'/'Archivado'/**'Cancelado'**), `id_coordinacion`, `cancelado_por_id` (UUID nullable, FK `fichas_empleados` — null si no cancelado), timestamps (`preparacion`/`inicio`/`fin`/`archivado`/`cancelacion`). Un DRP que alcanzó `En_curso` nunca se borra (audit trail). |
| `dotaciones_drp` | `(id_drp, matricula)` | Vehículos y personal motorizado asignados al DRP. `timestamp_entrada`, `timestamp_salida`. Partial unique index: `UNIQUE(matricula) WHERE timestamp_salida IS NULL` (`uq_vehiculo_drp_activo`) — un vehículo solo puede estar activo en un DRP simultáneamente. |
| `drp_personal_a_pie` | `(id_drp, id_nombre)` | Personal del DRP que opera sin vehículo asignado (a pie, en zona de exclusión). `timestamp_entrada`, `timestamp_salida`, `zona_asignada`. FK `id_drp` + `id_nombre` (fichas_empleados). |
| `mochilas_backpack` | `id_mochila` (UUID) | Stock de mochilas BKP1–BKP8. `codigo` ('BKP1'–'BKP8'), `estado` (disponible/desplegada/en_revision), `location_id` actual, `id_drp_activo` (nullable). |

### Dominio: Módulos especiales ✓

| Tabla | PK | Descripción |
|---|---|---|
| `psa_sesiones` | `id_sesion` (UUID) | Sesiones del módulo PSA. `timestamp_apertura`, `timestamp_cierre`. FK `matricula`. |
| `psa_pacientes` | `id_paciente` (UUID) | Pacientes en PSA. FK `id_sesion`. Datos clínicos básicos. |
| `filiacion_sesiones` | `id_sesion` (UUID) | Sesiones del módulo de filiación. Análogo a `psa_sesiones`. |
| `filiacion_pacientes` | `id_paciente` (UUID) | Pacientes en filiación. `timestamp_admision`, `timestamp_inicio_consulta`, `timestamp_fin_consulta`. FK `id_sesion`. |

### Dominio: Comunicación ✓

| Tabla | PK | Descripción |
|---|---|---|
| `mensajes_bandeja` | `id_mensaje` (UUID) | Mensajes por instancia (flota, logística, coordinación…). `timestamp_lectura`, `estado`. |
| `tablon_anuncios` | `id_anuncio` (UUID) | Anuncios del tablón corporativo. `seccion` ('normativas'/'protocolos'/'avisos_corporativos'), `titulo` (text), `contenido` (text), `estado` ('activo'/'archivado'), `id_nombre_autor` (FK fichas_empleados), `timestamp_publicacion`, `timestamp_ultima_edicion`. RLS SELECT: authenticated. RLS INSERT/UPDATE: `can_manage_rrhh` (rrhh/gerencia) o `can_manage_rbac` (coordinacion/gerencia). |

### Dominio: Gestión y RRHH

| Tabla | PK | Descripción |
|---|---|---|
| `cuadrante_turnos` | `id` (serial) | Asignaciones de turno por empleado y fecha. `id_nombre` (FK fichas_empleados), `fecha` (date), `tipo_turno` ('T'/'L'/'V'/'B'/'C' — Trabaja/Libre/Vacaciones/Baja/Compensación), `es_excepcion_absoluta` (boolean, default false), `doc12_id` (UUID nullable, FK doc_solicitudes_vacaciones — solo cuando la excepción viene de una vacación aprobada), `timestamp_inyeccion` (timestamptz). UNIQUE(id_nombre, fecha). |
| `cuadrante_patrones` | `id` (UUID) | Patrones de turno reutilizables. `nombre` (text), `secuencia` (text[] — array ordenado de códigos tipo_turno, p.ej. `['T','T','T','T','L','L']`), `creado_por` (text, FK fichas_empleados), `created_at`. |
| `cuadrante_grupos` | `id` (UUID) | Agrupaciones de empleados para aplicar patrones en masa. `nombre` (text), `created_at`. |
| `cuadrante_grupo_miembros` | `(grupo_id, id_nombre)` | Pertenencia de empleados a grupos. `grupo_id` (FK cuadrante_grupos), `id_nombre` (FK fichas_empleados). |
| `doc_solicitudes_vacaciones` | `id` (UUID) | Doc-12: solicitudes de vacaciones. `id_nombre` (FK fichas_empleados), `periodo_anual` (text — año aplicable), `fecha_inicio` (date), `fecha_fin` (date), `preferencia_seleccion` ('opcion_1'/'opcion_2'/'opcion_3'), `observaciones` (text nullable), `resolucion_rrhh` (text nullable — nota de resolución), `id_nombre_resolutor` (text nullable, FK fichas_empleados), `estado` ('Borrador'/'Pendiente_Aprobacion'/'Aprobada'/'Denegada'), `created_at`, `timestamp_resolucion` (nullable). Visible al empleado solo cuando `sistema_config['periodo_vacaciones_abierto'].activo = true`. |

### Dominio: Configuración del sistema (Gap F5)

| Tabla | PK | Descripción |
|---|---|---|
| `system_config` | `clave` (text) | Almacén clave-valor de configuración global. `valor` (jsonb — ver claves canónicas abajo), `descripcion` (text — para legibilidad en admin), `id_nombre_modificador` (text FK fichas_empleados — quién editó por última vez), `updated_at` (timestamptz). RLS SELECT: authenticated. RLS INSERT/UPDATE: solo `gerencia` (claim `can_manage_rbac`). |

**Claves canónicas de `system_config` (seeds iniciales):**

| `clave` | `valor` (jsonb) | Descripción |
|---|---|---|
| `periodo_vacaciones_abierto` | `{"activo": false, "fecha_inicio": null, "fecha_fin": null}` | Toggle global del período de solicitud de vacaciones (Doc-12). Cuando `activo = false`, Doc-12 queda oculto para todos los empleados. |
| `marquesina` | `{"texto": "", "velocidad": 50}` | Texto del ticker del header negro + velocidad de desplazamiento (0–100). Refleja en tiempo real via `useGlobalStore` + Realtime. |
| `box_timeout_minutos` | `{"valor": 45}` | Minutos sin cambio de estado en `en_consulta` antes de que el watchdog emita alerta (Gap B2). Actualmente hardcodeado en `ef_cron_purge`; con esta clave se vuelve configurable. |
| `offline_session_ttl_dias` | `{"valor": 7}` | TTL de la sesión offline PBKDF2 cacheada en `u24_offline_session`. Cambiar requiere redeploy del cliente (se lee en boot). |
| `modulo_psa_habilitado` | `{"enabled": true}` | Kill switch del módulo PSA. Si `false`, el cliente oculta el acceso y rechaza nuevas sesiones PSA. Las sesiones abiertas no se cierran automáticamente — coordinación debe gestionarlas manualmente. |
| `modulo_filiacion_habilitado` | `{"enabled": true}` | Kill switch del módulo de filiación. Mismo comportamiento que PSA. |
| `modulo_drp_habilitado` | `{"enabled": true}` | Kill switch del módulo DRP. Si `false`, se bloquea la creación de nuevos DRPs; los DRPs en curso no se cancelan automáticamente. |
| `realtime_kill_switch` | `{"enabled": false}` | Si `true`, todos los clientes pasan a `degraded_mode` forzado (polling 30s solo canales críticos) sin esperar a detectar desconexión. Útil durante mantenimiento de Supabase Realtime. |
| `cola_offline_procesamiento` | `{"enabled": true}` | Si `false`, `useOfflineQueue` suspende el procesamiento de la cola (no encolade, solo acumula). Reservado para emergencias de consistencia de datos. Las mutaciones ya encoladas no se descartan. |

### Solo IndexedDB (sin tabla Supabase)

| Store local | Descripción |
|---|---|
| `offline_queue` | Cola de mutaciones pendientes. Gestionada por `idb-keyval`. Se vacía al reconectar y confirmar con el servidor. |
| `bandejas_cache` | Caché offline de `useBandejasStore`. Rehidratado desde Supabase Realtime al reconectar. |
| `global_cache` | Caché offline de `useGlobalStore`. Marquesina y estado tablón. |
| `u24_offline_session` | Sesión offline para verificación PBKDF2 sin red. Estructura: `{ id_nombre, password_hash, password_salt, iterations: 100000, cached_at, ttl_expires_at }`. TTL: 7 días estrictos desde `cached_at`. Nunca se sincroniza con Supabase. Se invalida y reescribe en cada login online exitoso. |

---

## 4. Estructura de seeds confirmada

```
supabase/
  migrations/
    0001_init.sql           ← Esquema completo: tablas, índices, RLS, triggers, funciones RPC
  seeds/
    01_catalogo.sql         ← 244 ítems del catálogo (IDs 1–244)
    02_plantillas.sql       ← Plantillas y líneas de plantilla
    03_vehiculos.sql        ← 5 vehículos demo con matrículas fijas
    04_admin_users.sql      ← 6 usuarios demo (contraseña vía $SEED_ADMIN_PASSWORD)
```

---

## 5. Índices y restricciones clave

| Tabla | Índice / Constraint | Tipo |
|---|---|---|
| `fichas_empleados` | UNIQUE(`id_nombre`) | Alias operativo único en todo el sistema |
| `fichas_empleados` | UNIQUE(`auth_user_id`) | Un empleado = una cuenta Supabase Auth |
| `galletas_terminales` | UNIQUE(`id_terminal`) | Un fingerprint = un registro (nunca duplicar) |
| `inventario_vehiculo` | Solo modificable por RPC atómica | Regla de negocio — ver `rules.md §5` |
| `inventario_base` | Solo modificable por RPC atómica | Regla de negocio — ver `rules.md §5` |
| `auditoria_rbac` | RLS UPDATE/DELETE `USING (FALSE)` | Inmutable por diseño |
| `auditoria_inventario` | RLS UPDATE/DELETE `USING (FALSE)` | Inmutable por diseño |
| `doc1_asistencias` | RLS UPDATE/DELETE `USING (FALSE)` | Append-only por diseño |
| `sesiones_emergencia` | RLS UPDATE/DELETE `USING (FALSE)` | Solo purgadas por Edge Function cron |
| `galletas_terminales` | RLS UPDATE/DELETE `USING (FALSE)` | Revocar = insertar nueva + marcar antigua |
| `cuadrante_turnos` | UNIQUE(`id_nombre`, `fecha`) | Un empleado tiene un único turno por día |
| `descuadres_inventario` | UNIQUE(`location_id`, `id_item`) WHERE `estado = 'Pendiente_Revision'` | Un descuadre activo por ítem/location |
| `system_config` | RLS INSERT `USING (FALSE)` para non-gerencia | Solo gerencia puede crear o editar claves |
