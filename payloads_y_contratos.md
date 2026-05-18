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
  timestamp_encolado: string;  // Fecha/hora local con el time_offset aplicado (ISO-8601).
  
  // ENRUTAMIENTO
  tipo: TipoMutacionOffline;   // El nombre exacto de la RPC en Supabase o acción especial.
  
  // CARGA ÚTIL
  payload: PayloadDoc1 | PayloadDoc2_5 | PayloadDoc6 | PayloadDoc7 | PayloadPurge;
  
  // ESTADO DE RESOLUCIÓN LOCAL
  estado: 'pendiente' | 'fallido'; 
  error_detalle?: string;      // Relleno por el SW si falla tras recuperar la red (ej. HTTP 409).
}

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
  // Las imágenes adjuntas en Base64 no deben superar los 500KB para no colapsar IndexedDB.
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

**Conclusión Arquitectónica:**
Con la redacción de este tercer bloque, tu equipo de desarrollo tiene un **mapa de contratos estricto (Interfaces TypeScript)** para toda la comunicación Cliente-Servidor. Esta estandarización evitará que el frontend envíe tipos incorrectos o que la base de datos rechace peticiones malformadas.
