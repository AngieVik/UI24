-- ============================================================
--  U24 — Migración inicial del esquema completo
--  Fecha: 2026-05-19
--  ADR-005: zona horaria canónica Europe/Madrid
-- ============================================================

ALTER DATABASE postgres SET timezone TO 'Europe/Madrid';

-- ============================================================
--  PASO 1 — TIPOS ENUM
--  Se declaran ANTES que cualquier tabla que los use.
-- ============================================================

-- Entidad contable para imputación de descuadres e inventario
CREATE TYPE entidad_imputable AS ENUM (
  'sin_imputar',
  'vehiculo',
  'drp',
  'persona'
);

-- Movimientos de inventario
CREATE TYPE tipo_movimiento_inventario AS ENUM (
  'deduccion',
  'entrada',
  'transferencia',
  'redireccion_forzosa',
  'ajuste',
  'merma',
  'recuperacion_descuadre',
  'merma_definitiva_residual'
);

-- Eventos de auditoría RBAC
CREATE TYPE tipo_evento_rbac AS ENUM (
  'login_exitoso',
  'fallo_autenticacion',
  'logout',
  'cambio_rol',
  'cambio_password',
  'sesion_emergencia_generada',
  'sesion_emergencia_consumida',
  'galleta_emitida',
  'galleta_revocada',
  'logout_forzado',
  'checkout_forzado',
  'alta_empleado',
  'baja_empleado',
  'baja_vehiculo',
  'desbloqueo_aprobado',
  'desbloqueo_rechazado'
);

-- Roles de empleado
CREATE TYPE rol_empleado AS ENUM (
  'tes',
  'flota',
  'coordinacion',
  'logistica',
  'gerencia',
  'rrhh',
  'due',
  'medico',
  'responsable_flota',
  'responsable_logistica'
);

-- Tipo de galleta de terminal
CREATE TYPE tipo_galleta AS ENUM (
  'permanente',
  'temporal'
);

-- Condición técnica del vehículo
CREATE TYPE condicion_tecnica AS ENUM (
  'operativo',
  'averiado_leve',
  'averiado_grave',
  'en_taller',
  'dado_de_baja'
);

-- Estado operativo del vehículo
CREATE TYPE estado_operativo AS ENUM (
  'inactivo',
  'activo',
  'en_drp'
);

-- Tipo de vehículo
CREATE TYPE tipo_vehiculo AS ENUM (
  'A1',
  'A2',
  'B',
  'C',
  'VIR',
  'Quad',
  'BKP'
);

-- Estado de DRP
CREATE TYPE estado_drp AS ENUM (
  'En_espera',
  'En_preparacion',
  'En_curso',
  'Finalizado',
  'Finalizado_Retenido',
  'Archivado',
  'Cancelado'
);

-- Estado de paciente PSA / filiación
CREATE TYPE estado_paciente_psa AS ENUM (
  'en_espera',
  'en_atencion',
  'alta',
  'exitus',
  'cancelado_por_drp'
);

CREATE TYPE estado_paciente_filiacion AS ENUM (
  'en_espera',
  'en_consulta',
  'alta',
  'exitus',
  'cancelado_por_drp'
);

-- Estado de mochila BKP
CREATE TYPE estado_mochila AS ENUM (
  'disponible',
  'desplegada',
  'en_revision'
);

-- Tipo de turno en cuadrante
CREATE TYPE tipo_turno AS ENUM (
  'T',
  'L',
  'V',
  'B',
  'C'
);

-- Estado de solicitud de vacaciones (Doc-12)
CREATE TYPE estado_solicitud_vacaciones AS ENUM (
  'Borrador',
  'Pendiente_Aprobacion',
  'Aprobada',
  'Denegada'
);

-- Sección del tablón de anuncios
CREATE TYPE seccion_tablon AS ENUM (
  'normativas',
  'protocolos',
  'avisos_corporativos'
);

-- Estado del tablón
CREATE TYPE estado_tablon AS ENUM (
  'activo',
  'archivado'
);

-- Tipo de aviso en doc11
CREATE TYPE tipo_aviso AS ENUM (
  'rotura_stock',
  'averia_grave',
  'drp_activado',
  'drp_cancelado',
  'transito_vencido',
  'alerta_seguridad',
  'aviso_coordinacion'
);

-- Nivel de aviso en doc11
CREATE TYPE nivel_aviso AS ENUM (
  'informativo',
  'aviso',
  'critico'
);

-- Estado de solicitudes de desbloqueo
CREATE TYPE estado_desbloqueo AS ENUM (
  'pendiente',
  'aprobada',
  'rechazada',
  'expirada'
);

-- Estado de inventario en tránsito
CREATE TYPE estado_transito AS ENUM (
  'en_transito',
  'confirmado',
  'cancelado'
);

-- Estado de descuadre de inventario
CREATE TYPE estado_descuadre AS ENUM (
  'Pendiente_Revision',
  'Resuelto',
  'Archivado'
);

-- Estado de doc8 parte de trabajo
-- Fase 2: 'Enviado_Cerrado_Administrativo' no existe como estado.
-- El cierre forzado se distingue por cerrado_por_admin_id NOT NULL.
CREATE TYPE estado_parte AS ENUM (
  'Abierto_En_Turno',
  'Enviado_Cerrado'
);

-- Estado de solicitud RGPD
CREATE TYPE estado_rgpd AS ENUM (
  'pendiente',
  'procesada',
  'denegada'
);

-- Tipo de location de almacén
CREATE TYPE tipo_location AS ENUM (
  'base',
  'almacen',
  'punto_drp',
  'vehiculo'
);

-- Nivel de criticidad avería (doc7)
CREATE TYPE nivel_criticidad AS ENUM (
  'Leve',
  'Moderada',
  'Grave'
);

-- Estado de doc2/doc3 informes
CREATE TYPE estado_informe AS ENUM (
  'borrador',
  'cerrado'
);

-- Preferencia de selección de vacaciones
CREATE TYPE preferencia_vacaciones AS ENUM (
  'opcion_1',
  'opcion_2',
  'opcion_3'
);


-- ============================================================
--  PASO 2 — TABLAS DE DOMINIO
-- ============================================================

-- ------------------------------------------------------------
--  Dominio: Identidad y acceso
-- ------------------------------------------------------------

CREATE TABLE fichas_empleados (
  id_persona        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id      UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_nombre         TEXT        UNIQUE NOT NULL,
  nombre_real       TEXT        NOT NULL,
  dni               TEXT,
  rol               rol_empleado NOT NULL,
  activo            BOOLEAN     NOT NULL DEFAULT TRUE,
  fecha_alta        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_baja        TIMESTAMPTZ
);

CREATE TABLE galletas_terminales (
  id_galleta            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_terminal           TEXT        NOT NULL,
  tipo                  tipo_galleta NOT NULL,
  id_nombre             TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  revocado_at           TIMESTAMPTZ,
  ultima_activacion_at  TIMESTAMPTZ
);

CREATE TABLE sesiones_emergencia (
  id_sesion         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash          TEXT        NOT NULL,
  tipo              tipo_galleta NOT NULL,
  id_nombre_emisor  TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumido_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE solicitudes_desbloqueo (
  id_solicitud          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  id_terminal           TEXT              NOT NULL,
  id_nombre_solicitante TEXT              NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  motivo                TEXT              NOT NULL,
  estado                estado_desbloqueo NOT NULL DEFAULT 'pendiente',
  id_nombre_revisor     TEXT              REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ       NOT NULL
);

CREATE TABLE presencias_activas_terminal (
  id_nombre   TEXT        PRIMARY KEY,
  id_terminal TEXT        NOT NULL,
  checkin_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_presencia_id_nombre FOREIGN KEY (id_nombre) REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE
);

CREATE TABLE auditoria_rbac (
  id_evento   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento tipo_evento_rbac NOT NULL,
  id_nombre   TEXT,
  id_terminal TEXT,
  ip          TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Rate-limit PIN
CREATE TABLE pin_intentos_fallidos (
  id_terminal     TEXT        NOT NULL,
  ventana_inicio  TIMESTAMPTZ NOT NULL,
  intentos        INT         NOT NULL DEFAULT 1,
  bloqueado_hasta TIMESTAMPTZ,
  PRIMARY KEY (id_terminal, ventana_inicio)
);

-- Backup de claves AES de cola offline (C-10)
CREATE TABLE queue_backup_sessions (
  id_nombre   TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE,
  id_terminal TEXT        NOT NULL,
  backup_key  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (id_nombre, id_terminal)
);


-- ------------------------------------------------------------
--  Dominio: Vehículos y turnos
-- ------------------------------------------------------------

CREATE TABLE plantillas_stock (
  plantilla_id  TEXT  PRIMARY KEY,
  tipo          TEXT  NOT NULL,
  perfil        TEXT
);

CREATE TABLE vehiculos (
  matricula         TEXT              PRIMARY KEY,
  tipo              tipo_vehiculo     NOT NULL,
  condicion_tecnica condicion_tecnica NOT NULL DEFAULT 'operativo',
  estado_operativo  estado_operativo  NOT NULL DEFAULT 'inactivo',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  gps_timestamp     TIMESTAMPTZ,
  plantilla_id      TEXT              REFERENCES plantillas_stock(plantilla_id) ON DELETE RESTRICT
);

CREATE TABLE activaciones_vehiculo (
  id_activacion     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula         TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  pilot             TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  carry             TEXT        REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  km_inicio         INT,
  km_fin            INT,
  timestamp_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_cierre   TIMESTAMPTZ
);

CREATE TABLE eventos_fisicos_vehiculo (
  id_evento           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula           TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  tipo_evento         TEXT        NOT NULL,
  descripcion         TEXT,
  timestamp_evento    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  id_nombre_registrador TEXT      NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT
);


-- ------------------------------------------------------------
--  Dominio: Inventario
-- ------------------------------------------------------------

CREATE TABLE catalogo_items (
  id_item       INTEGER  PRIMARY KEY,
  categoria     TEXT     NOT NULL,
  nombre        TEXT     NOT NULL,
  especificacion TEXT,
  archivado     BOOLEAN  NOT NULL DEFAULT FALSE
);

CREATE TABLE plantilla_lineas (
  plantilla_id  TEXT    NOT NULL REFERENCES plantillas_stock(plantilla_id) ON DELETE CASCADE,
  subgrupo      TEXT    NOT NULL,
  id_item       INTEGER NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  stock_objetivo INT    NOT NULL DEFAULT 0,
  PRIMARY KEY (plantilla_id, subgrupo, id_item)
);

-- location_id es TEXT para soportar tanto UUIDs (bases) como matrículas
-- (vehículos). rpc_alta_vehiculo inserta con location_id = matricula.
CREATE TABLE locations (
  location_id TEXT          PRIMARY KEY,
  nombre      TEXT          NOT NULL,
  tipo        tipo_location NOT NULL
);

CREATE TABLE inventario_vehiculo (
  matricula           TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  id_item             INTEGER     NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  subgrupo            TEXT        NOT NULL,
  stock_real          INT         NOT NULL DEFAULT 0 CHECK (stock_real >= 0),
  ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (matricula, id_item, subgrupo)
);

CREATE TABLE inventario_base (
  location_id TEXT    NOT NULL,
  id_item     INTEGER NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  stock_real  INT     NOT NULL DEFAULT 0 CHECK (stock_real >= 0),
  PRIMARY KEY (location_id, id_item)
);

CREATE TABLE inventario_en_transito (
  id_transito           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transferencia      UUID            NOT NULL,
  id_item               INTEGER         NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  cantidad              INT             NOT NULL,
  estado                estado_transito NOT NULL DEFAULT 'en_transito',
  timestamp_envio       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  timestamp_confirmacion TIMESTAMPTZ
);

CREATE TABLE descuadres_inventario (
  id_descuadre          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  id_doc10              UUID,
  id_item               INTEGER           NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  cantidad_diferencia   INT               NOT NULL,
  location_origen       TEXT              NOT NULL,
  location_destino      TEXT              NOT NULL,
  estado                estado_descuadre  NOT NULL DEFAULT 'Pendiente_Revision',
  id_nombre_resolutor   TEXT              REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  timestamp_generacion  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  timestamp_resolucion  TIMESTAMPTZ,
  mutation_uuid         UUID              UNIQUE,
  entidad_imputable_tipo entidad_imputable NOT NULL DEFAULT 'sin_imputar',
  entidad_imputable_id  TEXT
);

CREATE TABLE auditoria_inventario (
  id_auditoria          UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_movimiento       tipo_movimiento_inventario NOT NULL,
  id_item               INTEGER                    NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  cantidad_delta        INT                        NOT NULL,
  location_origen       TEXT,
  location_destino      TEXT,
  id_nombre_operador    TEXT                       NOT NULL,
  rpc_ejecutada         TEXT,
  motivo                TEXT,
  entidad_imputable_tipo entidad_imputable,
  entidad_imputable_id  TEXT,
  created_at            TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
--  Dominio: Documentos operativos
-- ------------------------------------------------------------

CREATE TABLE doc1_asistencias (
  id_entrada      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nombre       TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  timestamp_checkin TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminal_id     TEXT
);

CREATE TABLE doc2_informes_svb (
  id_doc              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  id_activacion       UUID          NOT NULL REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  id_nombre_redactor  TEXT          NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  auth_uid_redactor   UUID          NOT NULL,
  timestamp_asistencia TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  datos_paciente      JSONB         NOT NULL DEFAULT '{}',
  estado              estado_informe NOT NULL DEFAULT 'borrador'
);

CREATE TABLE doc3_informes_sva (
  id_doc              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  id_activacion       UUID          NOT NULL REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  id_nombre_redactor  TEXT          NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  auth_uid_redactor   UUID          NOT NULL,
  timestamp_asistencia TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  datos_paciente      JSONB         NOT NULL DEFAULT '{}',
  estado              estado_informe NOT NULL DEFAULT 'borrador'
);

CREATE TABLE doc4_consentimientos (
  id_doc              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_activacion       UUID        NOT NULL REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  id_nombre_redactor  TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  auth_uid_redactor   UUID        NOT NULL,
  timestamp_firma     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_consentimiento TEXT        NOT NULL,
  firmado             BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE doc5_rechazos_alta (
  id_doc              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_activacion       UUID        NOT NULL REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  id_nombre_redactor  TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  auth_uid_redactor   UUID        NOT NULL,
  timestamp_rechazo   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo_rechazo      TEXT        NOT NULL,
  firmado             BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE doc6_deducciones (
  id_deduccion  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula     TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  id_item       INTEGER     NOT NULL REFERENCES catalogo_items(id_item) ON DELETE RESTRICT,
  cantidad      INT         NOT NULL,
  id_activacion UUID        REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  id_nombre_operador TEXT   NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doc7_averias (
  id_averia             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula             TEXT             NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  nivel_criticidad      nivel_criticidad NOT NULL,
  sistema_afectado      TEXT             NOT NULL,
  descripcion_detallada TEXT,
  timestamp_incidencia  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  id_nombre_redactor    TEXT             NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  imagen_url            TEXT
);

CREATE TABLE doc8_partes_trabajo (
  id_parte          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  id_activacion     UUID         NOT NULL UNIQUE REFERENCES activaciones_vehiculo(id_activacion) ON DELETE RESTRICT,
  km_inicio         INT,
  km_fin            INT,
  timestamp_inicio  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  timestamp_fin     TIMESTAMPTZ,
  estado            estado_parte NOT NULL DEFAULT 'Abierto_En_Turno',
  cerrado_por_admin_id UUID      REFERENCES fichas_empleados(id_persona) ON DELETE RESTRICT
);

CREATE TABLE doc9_entradas_almacen (
  id_entrada      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     TEXT        NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
  fecha_recepcion DATE        NOT NULL,
  id_nombre_operador TEXT     NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doc10_transferencias (
  id_transferencia    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp_envio     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_confirmacion TIMESTAMPTZ,
  location_origen     TEXT        NOT NULL,
  location_destino    TEXT        NOT NULL,
  id_nombre_operador  TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT
);

CREATE TABLE doc11_avisos (
  id_aviso              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_aviso            tipo_aviso  NOT NULL,
  nivel                 nivel_aviso NOT NULL,
  id_nombre_emisor      TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  texto                 TEXT        NOT NULL,
  timestamp_publicacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leido_por             JSONB       NOT NULL DEFAULT '[]'
);


-- ------------------------------------------------------------
--  Dominio: DRP
-- ------------------------------------------------------------

CREATE TABLE drps (
  id_drp                UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  estado                estado_drp NOT NULL DEFAULT 'En_espera',
  id_coordinacion       TEXT       NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  cancelado_por_id      UUID       REFERENCES fichas_empleados(id_persona) ON DELETE RESTRICT,
  timestamp_preparacion TIMESTAMPTZ,
  timestamp_inicio      TIMESTAMPTZ,
  timestamp_fin         TIMESTAMPTZ,
  timestamp_archivado   TIMESTAMPTZ,
  timestamp_cancelacion TIMESTAMPTZ
);

CREATE TABLE dotaciones_drp (
  id_drp            UUID        NOT NULL REFERENCES drps(id_drp) ON DELETE RESTRICT,
  matricula         TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  timestamp_entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_salida  TIMESTAMPTZ,
  PRIMARY KEY (id_drp, matricula)
);

CREATE TABLE drp_personal_a_pie (
  id_drp            UUID        NOT NULL REFERENCES drps(id_drp) ON DELETE RESTRICT,
  id_nombre         TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  timestamp_entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_salida  TIMESTAMPTZ,
  zona_asignada     TEXT,
  PRIMARY KEY (id_drp, id_nombre)
);

CREATE TABLE mochilas_backpack (
  id_mochila    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        TEXT           NOT NULL UNIQUE CHECK (codigo IN ('BKP1','BKP2','BKP3','BKP4','BKP5','BKP6','BKP7','BKP8')),
  estado        estado_mochila NOT NULL DEFAULT 'disponible',
  location_id   TEXT           REFERENCES locations(location_id) ON DELETE RESTRICT,
  id_drp_activo UUID           REFERENCES drps(id_drp) ON DELETE RESTRICT
);


-- ------------------------------------------------------------
--  Dominio: Módulos especiales
-- ------------------------------------------------------------

CREATE TABLE psa_sesiones (
  id_sesion         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula         TEXT        NOT NULL REFERENCES vehiculos(matricula) ON DELETE RESTRICT,
  timestamp_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_cierre  TIMESTAMPTZ
);

CREATE TABLE psa_pacientes (
  id_paciente UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sesion   UUID                  NOT NULL REFERENCES psa_sesiones(id_sesion) ON DELETE RESTRICT,
  estado      estado_paciente_psa   NOT NULL DEFAULT 'en_espera',
  datos_clinicos JSONB              NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE TABLE filiacion_sesiones (
  id_sesion         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_drp            UUID        REFERENCES drps(id_drp) ON DELETE RESTRICT,
  timestamp_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_cierre  TIMESTAMPTZ
);

CREATE TABLE filiacion_pacientes (
  id_paciente                UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  id_sesion                  UUID                       NOT NULL REFERENCES filiacion_sesiones(id_sesion) ON DELETE RESTRICT,
  estado                     estado_paciente_filiacion  NOT NULL DEFAULT 'en_espera',
  timestamp_admision         TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  timestamp_inicio_consulta  TIMESTAMPTZ,
  timestamp_fin_consulta     TIMESTAMPTZ
);

CREATE TABLE filiacion_eventos (
  id_evento         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filiacion_id      UUID        NOT NULL REFERENCES filiacion_sesiones(id_sesion) ON DELETE RESTRICT,
  paciente_id       UUID        NOT NULL REFERENCES filiacion_pacientes(id_paciente) ON DELETE RESTRICT,
  tipo_evento       TEXT        NOT NULL,
  id_nombre_actor   TEXT        NOT NULL,
  timestamp_evento  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detalle           TEXT
);


-- ------------------------------------------------------------
--  Dominio: Comunicación
-- ------------------------------------------------------------

CREATE TABLE mensajes_bandeja (
  id_mensaje        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nombre_destino TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  contenido         TEXT        NOT NULL,
  estado            TEXT        NOT NULL DEFAULT 'no_leido',
  timestamp_lectura TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tablon_anuncios (
  id_anuncio               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  seccion                  seccion_tablon NOT NULL,
  titulo                   TEXT           NOT NULL,
  contenido                TEXT           NOT NULL,
  estado                   estado_tablon  NOT NULL DEFAULT 'activo',
  id_nombre_autor          TEXT           NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  timestamp_publicacion    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  timestamp_ultima_edicion TIMESTAMPTZ
);


-- ------------------------------------------------------------
--  Dominio: Gestión y RRHH
-- ------------------------------------------------------------

CREATE TABLE cuadrante_turnos (
  id                    SERIAL      PRIMARY KEY,
  id_nombre             TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE,
  fecha                 DATE        NOT NULL,
  tipo_turno            tipo_turno  NOT NULL,
  es_excepcion_absoluta BOOLEAN     NOT NULL DEFAULT FALSE,
  doc12_id              UUID,
  timestamp_inyeccion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_nombre, fecha)
);

CREATE TABLE cuadrante_patrones (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT    NOT NULL,
  secuencia  TEXT[]  NOT NULL,
  creado_por TEXT    NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cuadrante_grupos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cuadrante_grupo_miembros (
  grupo_id  UUID NOT NULL REFERENCES cuadrante_grupos(id) ON DELETE CASCADE,
  id_nombre TEXT NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, id_nombre)
);

CREATE TABLE doc_solicitudes_vacaciones (
  id                   UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nombre            TEXT                        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  periodo_anual        TEXT                        NOT NULL,
  fecha_inicio         DATE                        NOT NULL,
  fecha_fin            DATE                        NOT NULL,
  preferencia_seleccion preferencia_vacaciones     NOT NULL DEFAULT 'opcion_1',
  observaciones        TEXT,
  resolucion_rrhh      TEXT,
  id_nombre_resolutor  TEXT                        REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  estado               estado_solicitud_vacaciones NOT NULL DEFAULT 'Borrador',
  created_at           TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
  timestamp_resolucion TIMESTAMPTZ
);


-- ------------------------------------------------------------
--  Dominio: Cumplimiento RGPD
-- ------------------------------------------------------------

CREATE TABLE solicitudes_rgpd (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_solicitud       TEXT        NOT NULL CHECK (tipo_solicitud IN ('borrado_clinico', 'borrado_empleado')),
  identificador        TEXT        NOT NULL,
  estado               estado_rgpd NOT NULL DEFAULT 'pendiente',
  motivo               TEXT        NOT NULL,
  solicitado_por       TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  timestamp_solicitud  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_procesado  TIMESTAMPTZ,
  procesado_por        TEXT        REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  notas_procesamiento  TEXT
);


-- ------------------------------------------------------------
--  Dominio: Configuración del sistema
-- ------------------------------------------------------------

CREATE TABLE system_config (
  clave                TEXT        PRIMARY KEY,
  valor                JSONB       NOT NULL,
  descripcion          TEXT,
  id_nombre_modificador TEXT       REFERENCES fichas_empleados(id_nombre) ON DELETE RESTRICT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
--  Dominio: Infraestructura y versiones
-- ------------------------------------------------------------

CREATE TABLE versiones_cliente (
  version_semver       TEXT        PRIMARY KEY,
  min_version_permitida TEXT        NOT NULL,
  publicada_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activa               BOOLEAN     NOT NULL DEFAULT TRUE,
  notas                TEXT
);


-- ============================================================
--  PASO 3 — ÍNDICES PARCIALES Y RESTRICCIONES ADICIONALES
-- ============================================================

-- galletas_terminales: un terminal activo = una galleta activa
CREATE UNIQUE INDEX uq_galleta_terminal_activa
  ON galletas_terminales (id_terminal)
  WHERE revocado_at IS NULL;

-- descuadres_inventario: un descuadre activo por ítem/location
CREATE UNIQUE INDEX uq_descuadre_pendiente
  ON descuadres_inventario (location_origen, id_item)
  WHERE estado = 'Pendiente_Revision';

-- descuadres_inventario: idempotencia cola offline
ALTER TABLE descuadres_inventario
  ADD CONSTRAINT uq_descuadre_mutation_uuid UNIQUE (mutation_uuid);

-- dotaciones_drp: un vehículo activo en un solo DRP simultáneamente
CREATE UNIQUE INDEX uq_vehiculo_drp_activo
  ON dotaciones_drp (matricula)
  WHERE timestamp_salida IS NULL;

-- filiacion_eventos: idempotencia del watchdog (sin duplicados de alerta)
CREATE UNIQUE INDEX uq_filiacion_evento_idempotente
  ON filiacion_eventos (filiacion_id, paciente_id, tipo_evento);

-- versiones_cliente: una entrada por versión
-- (ya garantizado por PRIMARY KEY TEXT)

-- Índices de rendimiento para consultas frecuentes
CREATE INDEX idx_fichas_empleados_activo ON fichas_empleados (activo) WHERE activo = TRUE;
CREATE INDEX idx_galletas_terminales_id_nombre ON galletas_terminales (id_nombre);
CREATE INDEX idx_auditoria_rbac_created_at ON auditoria_rbac (created_at DESC);
CREATE INDEX idx_auditoria_inventario_created_at ON auditoria_inventario (created_at DESC);
CREATE INDEX idx_doc8_estado ON doc8_partes_trabajo (estado);
CREATE INDEX idx_drps_estado ON drps (estado);
CREATE INDEX idx_cuadrante_turnos_fecha ON cuadrante_turnos (fecha);
CREATE INDEX idx_catalogo_archivado ON catalogo_items (archivado) WHERE archivado = FALSE;
CREATE INDEX idx_descuadres_estado ON descuadres_inventario (estado);
CREATE INDEX idx_inventario_vehiculo_matricula ON inventario_vehiculo (matricula);


-- ============================================================
--  PASO 4 — RLS (Row Level Security)
--  Habilitado en todas las tablas. Las políticas explícitas
--  se declaran por tabla; el resto usa DENY-BY-DEFAULT.
-- ============================================================

ALTER TABLE fichas_empleados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE galletas_terminales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_emergencia        ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_desbloqueo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencias_activas_terminal ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_rbac             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_intentos_fallidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_backup_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_lineas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE activaciones_vehiculo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_fisicos_vehiculo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_vehiculo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_base            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_en_transito     ENABLE ROW LEVEL SECURITY;
ALTER TABLE descuadres_inventario      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_inventario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc1_asistencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc2_informes_svb          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc3_informes_sva          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc4_consentimientos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc5_rechazos_alta         ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc6_deducciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc7_averias               ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc8_partes_trabajo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc9_entradas_almacen      ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc10_transferencias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc11_avisos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drps                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dotaciones_drp             ENABLE ROW LEVEL SECURITY;
ALTER TABLE drp_personal_a_pie         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mochilas_backpack          ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_sesiones               ENABLE ROW LEVEL SECURITY;
ALTER TABLE psa_pacientes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiacion_sesiones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiacion_pacientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiacion_eventos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_bandeja           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tablon_anuncios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrante_turnos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrante_patrones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrante_grupos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrante_grupo_miembros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_rgpd           ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config              ENABLE ROW LEVEL SECURITY;
ALTER TABLE versiones_cliente          ENABLE ROW LEVEL SECURITY;

-- Tablas de solo lectura para authenticated (políticas generales)
CREATE POLICY "authenticated puede leer catalogo"
  ON catalogo_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer plantillas"
  ON plantillas_stock FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer plantilla_lineas"
  ON plantilla_lineas FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer vehiculos"
  ON vehiculos FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer system_config"
  ON system_config FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer versiones_cliente"
  ON versiones_cliente FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer tablon_anuncios"
  ON tablon_anuncios FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "authenticated puede leer doc11_avisos"
  ON doc11_avisos FOR SELECT
  TO authenticated
  USING (TRUE);

-- auditoria_rbac: inmutable — solo INSERT vía service_role
CREATE POLICY "auditoria_rbac no update"
  ON auditoria_rbac FOR UPDATE
  USING (FALSE);

CREATE POLICY "auditoria_rbac no delete"
  ON auditoria_rbac FOR DELETE
  USING (FALSE);

-- auditoria_inventario: inmutable
CREATE POLICY "auditoria_inventario no update"
  ON auditoria_inventario FOR UPDATE
  USING (FALSE);

CREATE POLICY "auditoria_inventario no delete"
  ON auditoria_inventario FOR DELETE
  USING (FALSE);

-- doc1_asistencias: append-only
CREATE POLICY "doc1 no update"
  ON doc1_asistencias FOR UPDATE
  USING (FALSE);

CREATE POLICY "doc1 no delete"
  ON doc1_asistencias FOR DELETE
  USING (FALSE);

-- sesiones_emergencia: solo service_role puede UPDATE/DELETE
CREATE POLICY "sesiones_emergencia no update por usuario"
  ON sesiones_emergencia FOR UPDATE
  USING (FALSE);

CREATE POLICY "sesiones_emergencia no delete por usuario"
  ON sesiones_emergencia FOR DELETE
  USING (FALSE);

-- galletas_terminales: UPDATE/DELETE solo por RPC SECURITY DEFINER
CREATE POLICY "galletas no update directo"
  ON galletas_terminales FOR UPDATE
  USING (FALSE);

CREATE POLICY "galletas no delete directo"
  ON galletas_terminales FOR DELETE
  USING (FALSE);

-- filiacion_eventos: append-only
CREATE POLICY "filiacion_eventos no update"
  ON filiacion_eventos FOR UPDATE
  USING (FALSE);

CREATE POLICY "filiacion_eventos no delete"
  ON filiacion_eventos FOR DELETE
  USING (FALSE);

-- queue_backup_sessions: solo service_role
CREATE POLICY "queue_backup_sessions no select usuario"
  ON queue_backup_sessions FOR SELECT
  USING (FALSE);

CREATE POLICY "queue_backup_sessions no update usuario"
  ON queue_backup_sessions FOR UPDATE
  USING (FALSE);

CREATE POLICY "queue_backup_sessions no delete usuario"
  ON queue_backup_sessions FOR DELETE
  USING (FALSE);

-- solicitudes_rgpd: no DELETE (inmutable por auditoría)
CREATE POLICY "solicitudes_rgpd no delete"
  ON solicitudes_rgpd FOR DELETE
  USING (FALSE);


-- ============================================================
--  PASO 5 — TRIGGER: Checklist360 → Doc-7 + condicion_tecnica
--  (lógica de negocio; el checklist no tiene tabla aquí pero
--   el trigger se crea en doc_checklist360 cuando se implemente)
-- ============================================================
-- Placeholder: la tabla doc_checklist360 se crea en la siguiente
-- migración junto con el trigger trg_checklist_genera_doc7.


-- ============================================================
--  FIN DE MIGRACIÓN
-- ============================================================
