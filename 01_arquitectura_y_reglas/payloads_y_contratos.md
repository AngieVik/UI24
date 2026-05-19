# Payloads y Contratos

## Dominio A: Mutaciones de la Cola Offline (IndexedDB -> Supabase RPC)

* Este dominio define la estructura de las operaciones diferidas. Son acciones que el usuario ejecuta sin red (o con red intermitente) y que el sistema garantiza que se procesarán al menos una vez (At-Least-Once delivery) garantizando la idempotencia mediante UUIDs.

### A.1. Estructura Base del Envoltorio (La Cola)

* Todo elemento insertado en la base de datos local (IndexedDB) debe cumplir con esta interfaz estricta. Ninguna mutación viaja "suelta".

```typescript
interface OfflineMutation {
  // IDENTIFICADORES Y METADATOS
  mutation_uuid: string;       // UUID v4 generado en el cliente. Clave de idempotencia.
  ejecutorId: string;          // ID_nombre del usuario que realizó la acción.
  timestamp_encolado: string;  // ISO-8601 corregido con clock_offset (ver §A.4).
  
  // ENRUTAMIENTO
  tipo: TipoMutacionOffline;   // El nombre exacto de la RPC en Supabase o acción especial.
  
  // CARGA ÚTIL
  payload: PayloadDoc1 | PayloadDoc2_5 | PayloadDoc6 | PayloadDoc7 | PayloadPurge;
  
  // ESTADO Y POLÍTICA DE REINTENTOS (B-07)
  estado: 'pendiente' | 'fallido' | 'descartado';
  error_detalle?: string;      // Relleno por el procesador de cola en cada fallo (red o validación 5xx).
  retry_count: number;         // Inicialmente 0. Incrementado en cada reintento fallido de red.
  max_retries: number;         // DEFAULT 5. Al superar → estado = 'descartado' + notificación usuario.
  ultima_falla?: string;       // ISO-8601 del último intento fallido.
  ttl_descarte: string;        // ISO-8601 = timestamp_encolado + 7 días. Al superar → 'descartado'.
}

// Política de descarte — reglas evaluadas en este orden al procesar la cola:
// 1. Si estado === 'descartado': saltar (ya procesado).
// 2. Si new Date(ttl_descarte) < new Date(): marcar 'descartado', insertar en bandeja_conflictos.
// 3. Si retry_count >= max_retries: marcar 'descartado', insertar en bandeja_conflictos.
// 4. Si el error de la última ejecución fue de VALIDACIÓN (4xx): marcar 'descartado' directamente
//    (no reencolar — nunca va a pasar). Ver classifyError() en error_handling.md §5.
// 5. Si el error fue de RED (5xx / no-fetch): incrementar retry_count, mantener 'pendiente'.
// Los ítems 'descartados' persisten en IndexedDB y se muestran en bandeja_conflictos
// hasta que el usuario los revisa y los descarta manualmente.

type TipoMutacionOffline = 
  | 'rpc_insertar_asistencia_doc1'
  | 'rpc_upsert_doc_clinico'
  | 'rpc_registrar_gasto_doc6'
  | 'rpc_reportar_averia_doc7'
  | 'purge_drafts';
```

### A.2. Contratos Específicos por Documento (Payloads)

* Cada tipo exige un payload con una validación estructural específica. Los UUIDs de los propios registros se generan en el cliente para mantener las relaciones foráneas (Foreign Keys) intactas incluso offline.

* **Doc-1 (Asistencias DRP - Append Only)**
  Canal/Destino: RPC insertar_asistencia_doc1
  Condición de Red: Offline-queueable (Inmutable)

```typescript
interface PayloadDoc1 {
  id_asistencia: string;       // UUID v4 pre-generado.
  drp_id: string;              // UUID del DRP activo.
  timestamp_registro: string;  // Hora real del evento (Date.now() + time_offset).
  filiacion: {
    nombre_apellidos: string;
    edad: number;
    dni_nie_pasaporte: string;
    ciudad_residencia: string;
    sexo: 'M' | 'F' | 'Otro';
    telefono: string;
    // ... datos del tutor si es menor
  };
  motivo_asistencia: string;
  resolucion: string;
}
```

* **Doc-6 (Gasto de Material / Optimistic UI)**
  Canal/Destino: RPC registrar_gasto_material_offline (Maneja el fallback de stock insuficiente)
  Condición de Red: Offline-queueable (Stock optimista local)

```typescript
interface PayloadDoc6 {
  doc6_id: string;             // UUID v4 pre-generado.
  location_id: string;         // UUID del vehículo, mochila o subinventario.
  item_id: string;             // UUID del catálogo de ítems.
  cantidad: number;            // Entero positivo.
  terminal_id: string;         // Fingerprint de la tablet (para auditar descuadres).
  lote_y_caducidad?: string;
  observaciones?: string;
}
```

* **Doc-7 (Averías y Flota)**
  Canal/Destino: RPC reportar_averia_vehiculo
  Condición de Red: Offline-queueable (Afecta condición técnica optimista)

```typeScript
interface PayloadDoc7 {
  doc7_id: string;             // UUID v4 pre-generado.
  id_vehiculo: string;         // Matrícula o ID del vehículo.
  nivel_criticidad: 'Leve' | 'Moderada' | 'Grave';
  sistema_afectado: string;
  descripcion_detallada: string;
  timestamp_generacion: string; // Hora real del reporte.
  // Las imágenes se comprimen con Canvas API → WebP Blob antes de persistirse en IndexedDB. Base64 prohibido. Ver ADR-002.
}
```

* **Acción Administrativa: Purga de Borradores**
  Canal/Destino: RPC purgar_borradores_descartados
  Condición de Red: Offline-queueable especial.
  Justificación: Si el usuario descarta un formulario offline, limpiamos el estado local de Zustand e instruimos al servidor que libere esos UUIDs (si estuvieran pre-reservados) o limpie la auditoría.

```TypeScript
interface PayloadPurge {
  entidad_tipo: 'doc2' | 'doc3' | 'doc4' | 'doc5';
  borrador_uuid: string; // El ID del documento que el usuario decidió cancelar.
}
```

* **A.3. Reglas de Idempotencia Estricta (Para la Base de Datos)**
El programador del backend (Supabase) debe implementar la siguiente lógica en todas las funciones RPC mencionadas arriba para evitar duplicidades si la red fluctúa:
  La tabla destino (ej. doc1_asistencias, doc6, descuadres_inventario) debe tener una columna oculta mutation_uuid con una restricción UNIQUE.
  La sentencia SQL de inserción debe ser:
    INSERT INTO tabla (...) VALUES (...) ON CONFLICT (mutation_uuid) DO NOTHING;
  Si el insert falla por conflicto, el RPC no debe devolver error HTTP 409 o 500. Debe devolver HTTP 200 (Éxito), porque significa que el dato ya está guardado. Esto permite que el Service Worker elimine el elemento de la cola en IndexedDB y continúe con el siguiente.

## DOMINIO B: EVENTOS REALTIME (Supabase WebSockets -> Cliente)

Este dominio define los *payloads* efímeros que viajan a través de los canales de Supabase Realtime (Broadcast y Presence). Estos eventos no se guardan directamente en bases de datos a través de esta vía (la persistencia ya ocurrió en el servidor), sino que sirven para actualizar la UI en vivo o disparar acciones de hardware (como el GPS).

### B.1. Canal de Telemetría (Ping/Pong GPS)

* **Canal / Topic:** `coordinacion:flota`
* **Condición:** Los terminales embarcados aplican un Throttle de 15 segundos incondicional antes de procesar un nuevo `ping_location`.

```typescript
// 1. Petición del Coordinador al Vehículo
interface PayloadPingLocation {
  id_vehiculo: string;       // El terminal que debe despertar su hardware GPS.
  solicitante_id: string;    // ID_nombre del coordinador que hace la petición.
  timestamp_ping: string;    // ISO-8601
}
```

```typescript
// 2. Respuesta de Éxito del Vehículo al Coordinador
interface PayloadPongLocation {
  id_vehiculo: string;
  lat: number;
  lon: number;
  accuracy: number | null;
  timestamp_gps: string;
}
```

```typescript
// 3. Respuesta de Fallo del Vehículo al Coordinador
interface PayloadPongError {
  id_vehiculo: string;
  codigo: number;            // Ej. 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  mensaje: string;
  timestamp: string;
}
```

### B.2. Canal de Vehículo (Desbloqueo Crítico)

* **Canal / Topic:** vehiculo:{id_vehiculo}
* **Seguridad:** Canal privado. Solo se suscriben terminales con ese vehículo activo y roles de coordinación.

```typescript
// Evento emitido por la Edge Function cuando Coordinación autoriza la activación
interface PayloadDesbloqueoConcedido {
  id_vehiculo: string;
  autorizante: string;       // ID_nombre del coordinador que levantó el bloqueo.
  timestamp_autorizacion: string;
}
```

```typescript
// Evento emitido si Coordinación rechaza la activación
interface PayloadDesbloqueoDenegado {
  id_vehiculo: string;
  motivo?: string;           // Opcional, feedback para el pilot.
}
```

### B.3. Canal de Aprovisionamiento Offline (Pre-caché de Relevos)

* **Canal / Topic:** terminal:{device_id}:precache
* **Condición:** Emitido por un CRON (Edge Function) 2 horas antes de cada cambio de turno.

```typescript
// Evento 'shift_tokens_ready'
type PayloadShiftTokensReady = Array<{
  user_id: string;           // ID_nombre del trabajador del SIGUIENTE turno.
  signed_payload: string;    // String codificado en base64 (Contiene hash PBKDF2 y firma HMAC).
}>;
```

### B.4. Alertas Críticas Globales

* **Canal / Topic:** global:alertas_criticas
* **Condición:** Notificaciones push de máxima severidad que rompen la UI (Modal o Banner rojo).

```typescript
interface PayloadAlertaCritica {
  tipo: 'inmovilizacion_automatica' | 'aviso_urgente_critico';
  titulo: string;
  mensaje: string;
  id_referencia: string;     // ID_vehiculo o doc_id para navegación rápida.
  timestamp: string;
}
```

Reglas para el Programador (Filtro de Eco en Inventario)
Los cambios en la tabla inventario_items llegarán a los clientes a través del canal estándar de Supabase postgres_changes. Para evitar el doble descuento visual al usar Optimistic UI, el payload de la tabla de inventario debe incluir el mutation_uuid del causante:

Manejo Local: En el useInventarioStore, si se recibe un evento Realtime UPDATE sobre un item_id, el handler debe comprobar:
if (evento.new.mutation_uuid === local_mutation_uuid && item.sync_pending) return;

Si coincide, se ignora el WebSocket y se confía en la respuesta del HTTP RPC para cuadrar el número.

## DOMINIO C: PETICIONES SÍNCRONAS Y EDGE FUNCTIONS (Online-Only)

Este dominio abarca las operaciones que mutan inventario primario (multi-location), gestionan seguridad estricta o requieren bloqueos atómicos en tiempo real. La PWA debe bloquear la UI si `isOnline === false` antes de intentar enviar estos payloads.

### C.1. Operaciones de Inventario Estricto (Transacciones)

Estas operaciones utilizan funciones RPC en Supabase para garantizar los bloqueos (`FOR UPDATE` / OCC) a nivel de fila en la base de datos.

#### 1. Emisión de Envío (Doc-10)

* **RPC:** `rpc_emitir_doc10`
* **Condición:** Verifica atómicamente que el origen tiene `stock_real >= cantidad` para cada ítem. Si falla, aborta la transacción completa.

```typescript
interface PayloadEmitirDoc10 {
  doc10_id: string;            // UUID v4.
  id_origen: string;           // UUID del location origen.
  id_destino: string;          // UUID del location destino.
  ejecutor_id: string;         // ID_nombre del usuario emisor.
  items: Array<{
    item_id: string;
    cantidad_enviada: number;
    lote?: string;
  }>;
}
```

#### 2. Confirmación de Recepción (Doc-10)

* **RPC:** `rpc_confirmar_recepcion_doc10`

* **Condición:** Evalúa si hay discrepancias. Si cantidad_recibida < cantidad_enviada, el RPC genera automáticamente la entrada en descuadres_inventario.

```typescript
interface PayloadConfirmarDoc10 {
  doc10_id: string;            // El ID del documento en tránsito.
  receptor_id: string;         // ID_nombre de quien confirma.
  items_recibidos: Array<{
    item_id: string;
    cantidad_recibida: number; // El usuario introduce lo que realmente llegó.
  }>;
}
```

#### 3. Entrada Física a Almacén (Doc-9)

* **RPC:** `rpc_registrar_doc9`

* **Condición:** Suma stock al sistema. Peligro de generación de stock fantasma si se encola offline.

```typescript
interface PayloadRegistrarDoc9 {
  doc9_id: string;             // UUID v4.
  proveedor: string;
  albaran_factura: string;
  fecha_recepcion: string;     // Fecha del papel (no necesariamente el NOW()).
  ejecutor_id: string;
  items: Array<{
    item_id: string;
    cantidad_recibida: number;
    lote?: string;
    caducidad?: string;        // ISO-8601 Date
  }>;
}
```

#### 2. Operaciones de Autoridad y Seguridad

Estas acciones requieren validación de JWT fresca y actúan sobre tablas críticas de auditoría.
  *Generación de Galleta (Token de Emergencia)
    * **Edge Function / RPC:** `rpc_generar_token_emergencia`
    * **Condición:** El servidor genera el PIN y la fecha de expiración (expires_at), nunca el cliente.

```typescript
interface PayloadGenerarGalleta {
  tipo: 'temporal' | 'permanente';
  descripcion: string;         // OBLIGATORIO. Ej: "Tablet Ambulancia 7" (solo útil si es permanente).
  coordinador_id: string;      // ID_nombre del autorizante.
}

// RESPUESTA ESPERADA DEL SERVIDOR:
interface ResponseGenerarGalleta {
  pin: string;                 // El PIN de 6 dígitos para mostrar por pantalla.
  expires_at: string;
}
```

  *Flujo de Desbloqueo Crítico (Vehículo Inoperativo)
    * **RPC Solicitar:** `rpc_solicitar_desbloqueo_excepcional`
    * **RPC Autorizar:** `rpc_conceder_desbloqueo`

```typescript
// Enviado por la tablet de la ambulancia
interface PayloadSolicitarDesbloqueo {
  id_vehiculo: string;
  id_piloto_solicitante: string;
  motivo_urgencia: string;
}

// Enviado por el terminal de Coordinación/Gerencia
interface PayloadAutorizarDesbloqueo {
  solicitud_id: string;        // UUID de la solicitud en Supabase.
  id_vehiculo: string;
  id_coordinador_autorizante: string;
  decision: 'autorizado' | 'denegado';
}
```

  *Resolución Manual de Descuadres Logísticos
    * **RPC:** `rpc_resolver_descuadre`
    * **Condición:** Cierra el ciclo de merma/pérdida. Exige transaccionalidad.

```typescript
interface PayloadResolverDescuadre {
  descuadre_id: string;        // ID de la fila en descuadres_inventario.
  resolutor_id: string;
  accion: 'perdida' | 'recuperacion_fraccionada' | 'archivar';
  
  // Solo requerido si accion === 'recuperacion_fraccionada'
  cantidad_recuperada?: number;
  destino_recuperacion?: string; // location_id donde se reingresa el stock.
}
```

---

## DOMINIO D: CORRECCIÓN DE RELOJ Y CANAL DE SEGURIDAD

### D.1 Corrección de drift de reloj (B-12)

Los dispositivos embarcados en ambulancias pueden tener el reloj desincronizado respecto al servidor.
Un timestamp_encolado erróneo puede causar rechazo de la mutación por la validación de timestamps.

**Mecanismo:** el servidor incluye el header `X-Server-Time` (ISO-8601 UTC) en cada respuesta HTTP.
El cliente calcula y mantiene un `clock_offset` en memoria:

```typescript
// lib/clockSync.ts
let clockOffset = 0  // milisegundos; positivo = reloj cliente adelantado; negativo = atrasado

export function syncClock(serverTimeHeader: string | null): void {
  if (!serverTimeHeader) return
  const serverMs = new Date(serverTimeHeader).getTime()
  const clientMs = Date.now()
  clockOffset = clientMs - serverMs  // >0: cliente adelantado; <0: cliente atrasado
}

export function nowCorrected(): string {
  return new Date(Date.now() - clockOffset).toISOString()
}

// Drift máximo tolerado: ±5 minutos (B-12)
export const MAX_DRIFT_MS = 5 * 60 * 1000

export function isClockDrifted(): boolean {
  return Math.abs(clockOffset) > MAX_DRIFT_MS
}
```

**Reglas:**
- `timestamp_encolado` en `OfflineMutation` se genera con `nowCorrected()`, no `new Date().toISOString()`.
- Si `isClockDrifted() === true`: banner de advertencia discreta en UI: *"El reloj del dispositivo difiere del servidor. Sincroniza la hora."*
- El header `X-Server-Time` se lee en el interceptor de respuesta del cliente Supabase (no requiere cambios en las RPCs).

**Validación al encolar** (actualización de `error_handling.md §8`):

| Condición | Acción |
|---|---|
| `timestamp_encolado` corregido > 5 min en el futuro | Rechazar encolado + toast-error "Timestamp en el futuro. Verifica el reloj del dispositivo." |
| `timestamp_encolado` corregido > 5 min en el pasado | Rechazar encolado + toast-error "Timestamp demasiado antiguo. Verifica el reloj del dispositivo." |

> **Nota:** la validación anterior toleraba 72h en el pasado y 5min en el futuro. B-12 la ajusta a ±5min para detectar drift de reloj antes de encolar mutaciones que el servidor rechazará.

### D.2 Canal `terminal:{device_id}:security` (B-02)

Canal Realtime broadcast de seguridad por terminal. El cliente se suscribe al conectar.

```typescript
// Canal / Topic: terminal:{id_terminal}:security
// Dirección: servidor → cliente (broadcast unidireccional)
// Suscripción: al activar terminal (estado_1); desuscripción: al destruir el terminal

interface PayloadOfflineSessionInvalidated {
  event: 'offline_session_invalidated'
  payload: {
    id_nombre: string    // El empleado cuya sesión offline fue invalidada
    reason: 'password_reset' | 'baja_empleado' | 'admin_force'
  }
}
```

**Comportamiento del cliente al recibir `offline_session_invalidated`:**
1. `idbDel('u24_offline_session')` — borrar hash PBKDF2 local
2. Si `useAuthStore.idNombre === payload.id_nombre`:
   - `useAuthStore.clear()`
   - Modal bloqueante: *"Tu contraseña fue modificada por un administrador. Inicia sesión de nuevo para continuar."*
   - Redirigir a estado_0

### D.3 Backup cifrado de la cola offline al cambio de turno (C-10)

Mecanismo de seguro contra pérdida física del dispositivo con mutaciones pendientes.
Si un terminal se daña, pierde batería de forma irrecuperable o se extravía, las
mutaciones encoladas en su IndexedDB se perderían. El backup cifrado las preserva.

#### D.3.1 Clave de cifrado de sesión

Al completar el login online (checkin exitoso), el servidor genera una clave de sesión
para backup y la retorna junto con la respuesta de checkin:

```typescript
// Parte de la respuesta de ef_alta_sesion / set_claims tras login exitoso:
interface CheckinResponse {
  // ... campos existentes ...
  queue_backup_key: string   // base64url — 32 bytes aleatorios (AES-256)
}
```

El cliente la recibe y almacena **exclusivamente en sessionStorage** (es ephemera —
debe perderse con el cierre del navegador, que también cierra la sesión):

```typescript
sessionStorage.setItem('u24_queue_backup_key', response.queue_backup_key)
```

El servidor almacena la clave en la tabla `queue_backup_sessions` con TTL = 24h:

```sql
-- Tabla nueva: queue_backup_sessions
CREATE TABLE queue_backup_sessions (
  id_nombre    TEXT NOT NULL REFERENCES fichas_empleados(id_nombre),
  id_terminal  TEXT NOT NULL,
  backup_key   TEXT NOT NULL,   -- base64url, 32 bytes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (id_nombre, id_terminal)
);
-- RLS: USING (FALSE) en SELECT/UPDATE/DELETE desde JWT — solo accesible con service_role
```

#### D.3.2 Payload `QueueBackup`

```typescript
interface QueueBackupPayload {
  version:          1
  id_nombre:        string   // empleado que tenía la cola
  id_terminal:      string   // fingerprint SHA-256 del terminal
  timestamp_backup: string   // ISO-8601, nowCorrected()
  mutations_count:  number   // número de mutaciones incluidas
  iv:               string   // base64url — IV AES-GCM de 12 bytes (generado por crypto.subtle)
  encrypted_queue:  string   // base64url(AES-256-GCM(JSON.stringify(OfflineMutation[])))
}
```

#### D.3.3 Proceso de cifrado (cliente — Web Crypto API, Main Thread)

```typescript
async function encryptQueue(
  mutations: OfflineMutation[],
  backupKeyBase64: string,
  idNombre: string,
  idTerminal: string
): Promise<QueueBackupPayload> {
  const rawKey = Uint8Array.from(atob(backupKeyBase64), c => c.charCodeAt(0))
  const key    = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt'])

  const iv         = crypto.getRandomValues(new Uint8Array(12))
  const plaintext  = new TextEncoder().encode(JSON.stringify(mutations))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

  return {
    version:          1,
    id_nombre:        idNombre,
    id_terminal:      idTerminal,
    timestamp_backup: nowCorrected(),
    mutations_count:  mutations.length,
    iv:               btoa(String.fromCharCode(...iv)),
    encrypted_queue:  btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  }
}
```

> **Sin bcrypt en Main Thread:** el cifrado AES-GCM usa `crypto.subtle` nativo — no añade
> dependencias de terceros y no bloquea el Main Thread para backups de < 1000 mutaciones.
> Para colas de > 1000 mutaciones (excepcional), mover la operación a un Web Worker.

#### D.3.4 Destino del backup

Supabase Storage — bucket privado `offline-queue-backups` con RLS:

```
Path: offline-queue-backups/{id_nombre}/{id_terminal}/{timestamp_backup}.json
Política RLS Storage: solo service_role puede leer — el cliente solo puede hacer PUT
```

```typescript
await supabase.storage
  .from('offline-queue-backups')
  .upload(
    `${idNombre}/${idTerminal}/${Date.now()}.json`,
    JSON.stringify(payload),
    { contentType: 'application/json', upsert: true }
  )
```

La política `upsert: true` sobreescribe el backup anterior del mismo terminal — solo
se retiene el backup más reciente por terminal.

#### D.3.5 Disparadores del backup

| Evento | Condición | Acción |
|---|---|---|
| Periódico | Cada 5 min, `pendingCount > 0`, red disponible | `useOfflineQueueBackup.runBackup()` |
| Checkout del empleado | Siempre, antes de `check_out` | Backup síncrono (awaited) antes de limpiar sesión |
| Transición `offline → online` | `pendingCount > 0` | Backup antes de `procesarCola()` |

#### D.3.6 Recuperación técnica (procedimiento manual)

En caso de pérdida física del terminal con cola pendiente, el técnico puede:

1. Obtener la `backup_key` de `queue_backup_sessions` con `service_role`
2. Descargar el blob de Storage
3. Descifrar con AES-GCM usando la `backup_key` y el `iv` del payload
4. Importar las mutaciones manualmente (vía Supabase Studio o script de recuperación)

Este procedimiento no está automatizado — requiere intervención técnica deliberada.

---

**Conclusión Arquitectónica:**
Con la redacción de este documento, el equipo de desarrollo dispone de un **mapa de contratos estricto (Interfaces TypeScript)** para toda la comunicación cliente-servidor. Esta estandarización evita que el frontend envíe tipos incorrectos o que la base de datos rechace peticiones malformadas.
