# hooks

> Especificación de hooks React personalizados del sistema U24.
> Cada hook encapsula un dominio de lógica de negocio y actúa
> como interfaz entre componentes UI y los stores Zustand / Supabase.
> Este archivo es la referencia de diseño — no es implementación.
>
> Stack: React 19 · Zustand · TanStack Query · Supabase JS v2 · TypeScript

---

## Convenciones

```typescript
// Las interfaces usan tipos simplificados para legibilidad.
// Las implementaciones deben importar los tipos reales del proyecto.

type ID_nombre  = string   // identificador de persona
type ID_vehiculo = string  // identificador de vehículo
type ID_drp     = string   // identificador de DRP
type UUID       = string   // crypto.randomUUID()
type ISOString  = string   // UTC timestamp
```

Todos los hooks que realizan llamadas a Supabase devuelven `Promise`
y lanzan errores tipados que los componentes deben capturar con `try/catch`
o a través de `useMutation` de TanStack Query.

---

## 1. useTerminalAuth

> Gestiona el estado del terminal (bloqueado/desbloqueado), el tipo de sesión
> (cookie estándar, galleta, galleta_pequeña) y el rol activo del JWT.
> Es el hook de más alto nivel — todos los demás dependen de él.

```typescript
interface UseTerminalAuth {
  // Estado
  estado:        'estado_0' | 'estado_1'
  tipoSesion:    'sin_sesion' | 'estandar' | 'galleta_pequeña' | 'galleta'
  rolActivo:     string | null          // extraído del JWT claim 'rol'
  isAutenticado: boolean                // estado === 'estado_1'

  // Acciones
  login(ID_nombre: string, password: string): Promise<void>
  loginConPin(pin: string): Promise<void>
  logout(): Promise<void>
}
```

### Comportamiento

**`login`**

```
1. POST credenciales a Supabase Auth
2. Si error → throw Error('credenciales_incorrectas')
   (mensaje genérico — no revelar qué campo falló)
3. Si OK:
   - JWT guardado en sessionStorage
   - Cookie HTTPOnly establecida (tipoSesion = 'estandar')
   - useTerminalStore.estado → 'estado_1'
   - useAuthStore.{ ID_nombre, rol, JWT } cargado
```

**`loginConPin`**

```
1. Detecta patrón: campo usuario = 'PIN', campo password = 6 dígitos
2. Llama Edge Function 'validar_pin_emergencia' con el PIN
3. Edge Function valida: hash + expires_at > NOW() + consumido_at IS NULL
4. Si MATCH:
   - consumido_at = NOW() en sesiones_emergencia
   - Cookie inyectada: galleta_pequeña (tipo='temporal') o galleta (tipo='permanente')
   - useTerminalStore.tipoSesion actualizado
   - useAuthStore.rol = 'invitado'
   - estado_1 activo
5. Si NOT_FOUND o EXPIRED → throw Error('pin_invalido_o_expirado')
```

**`logout`**

```
1. Solo ejecuta si no quedan otros ID_nombre con checkin_on
   (si quedan, el logout es por useCheckin.checkout individual)
2. Destruye cookie según tipo:
   - 'estandar' → Supabase Auth signOut()
   - 'galleta_pequeña' → destruida automáticamente al llegar aquí
   - 'galleta' → NO se destruye (requiere acción manual en Supabase)
3. Limpia sessionStorage
4. useTerminalStore.estado → 'estado_0'
5. Limpia useAuthStore
```

### Stores: `useTerminalStore`, `useAuthStore`

---

## 2. useCheckin

> Gestiona la presencia de ID_nombre en el terminal: check-in, check-out,
> estados `pilot` y `carry`. Orquesta el `flujo_checkout_automatico`
> cuando el usuario que hace check-out tiene estado `pilot`.

```typescript
interface UseCheckin {
  // Estado
  personas: Map<ID_nombre, {
    estado:    'checkin_on'
    esPilot:   boolean
    esCarry:   boolean
    vehiculoId: ID_vehiculo | null
  }>
  hayAlguienCheckedIn: boolean

  // Acciones
  checkin(ID_nombre: string, password: string): Promise<void>
  checkout(ID_nombre: string): Promise<void>
  promoverCarryAPilot(ID_nombre: string, vehiculoId: ID_vehiculo): Promise<void>
}
```

### Comportamiento

**`checkin`**

```
1. Valida credenciales contra Supabase Auth
2. Si OK:
   - INSERT checkin en tabla personal_sesiones
   - usePersonaStore[ID_nombre].estado = 'checkin_on'
   - usePersonaStore[ID_nombre].timestamp_checkin = NOW()
3. Si el terminal estaba en rol 'invitado':
   - El ID_nombre eleva los permisos al rol propio del JWT
   - Rol visible en UI actualizado
```

**`checkout`**

```
CASO A — ID_nombre tiene estado 'pilot':
  → Delega a flujo_checkout_automatico() (ver §2.1)

CASO B — ID_nombre tiene estado 'carry':
  1. Desempareja del vehículo
  2. Si vehículo queda sin pilot → vehiculo.estadoOperativo = 'en_espera'
  3. UPDATE checkin: timestamp_checkout = NOW()
  4. usePersonaStore[ID_nombre] = sin_sesion
  5. Si es el último ID_nombre con checkin_on → useTerminalAuth.logout()

CASO C — ID_nombre solo tiene 'checkin_on' (sin vehículo):
  1. UPDATE checkin: timestamp_checkout = NOW()
  2. usePersonaStore[ID_nombre] = sin_sesion
  3. Si es el último → useTerminalAuth.logout()
```

### §2.1 flujo_checkout_automatico (orquestado desde checkout)

```
Precondición: ID_nombre tiene estado 'pilot'

1. MODAL km_fin (bloqueante)
   - No se puede continuar sin introducir km_fin
   - Actualiza useVehiculoStore[vehiculoId].km_fin

2. Cierre de estados del vehículo
   - useVehiculo.cerrarFuncionOperativaActiva(vehiculoId, timestamp_checkout)
   - Doc-8: cierra todos los bloques de estado abiertos con timestamp_fin

3. Salida de DRP (si aplica)
   - Si useVehiculoStore[vehiculoId].drpId !== null:
     - useDRP.exitarDRP(vehiculoId, 'con_vehiculo')
     - Registra timestamp_salida_drp para ID_vehiculo y todos los ID_nombre emparejados

4. Cierre de Doc-8
   - useDoc8.cerrar(vehiculoId, km_fin, timestamp_checkout)
   - Doc-8 pasa a estado 'Enviado_Cerrado'

5. Limpieza de estados de personal
   - Estado 'pilot' eliminado del ID_nombre
   - Carries emparejados reciben pregunta:
     "¿Deseas permanecer emparejado al vehículo en espera?"
     SÍ → carry queda en usePersonaStore[carry].esCarry = true
          vehiculo.estadoOperativo = 'en_espera'
     NO  → desemparejado (usePersonaStore[carry].esCarry = false)

6. Estado final del vehículo
   - Si no quedan carries emparejados → vehiculo.estadoOperativo = 'en_espera'
   - El vehículo NO pasa a 'Desactivado'
```

**`promoverCarryAPilot`**

```
1. Requiere: vehiculo en 'en_espera', ID_nombre con 'carry' en ese vehiculo
2. Modal solicita km_inicio (si el vehículo no tiene km_inicio activo)
3. useVehiculoStore[vehiculoId]:
   - pilot = ID_nombre
   - estadoOperativo = 'Activado'
4. usePersonaStore[ID_nombre].esPilot = true, esCarry = false
5. useDoc8.abrir(vehiculoId, ID_nombre, km_inicio)
```

### Stores: `usePersonaStore`, `useAuthStore`, `useTerminalStore`

### Dependencias: `useVehiculo`, `useDRP`, `useDoc8`

---

## 3. useVehiculo

> Gestiona el ciclo de vida de ID_vehiculo: activación/desactivación,
> funciones operativas, asignación de roles, selección en home_area.

```typescript
interface UseVehiculo {
  // Estado
  vehiculos:       Vehiculo[]          // todos los vehículos del sistema
  vehiculoActivo:  Vehiculo | null     // el seleccionado en este terminal
  
  // Consultas
  getVehiculo(id: ID_vehiculo): Vehiculo | undefined
  
  // Selección UI
  seleccionarVehiculo(id: ID_vehiculo): void
  
  // Ciclo de vida
  activar(id: ID_vehiculo, kmInicio: number): Promise<void>
  desactivar(id: ID_vehiculo, kmFin: number): Promise<void>

  // Funciones operativas
  setFuncionOperativa(
    id: ID_vehiculo,
    funcion: FuncionOperativa
  ): Promise<void>
  cerrarFuncionOperativaActiva(
    id: ID_vehiculo,
    timestamp_fin: ISOString
  ): Promise<void>

  // Roles
  asignarPilot(vehiculoId: ID_vehiculo, personaId: ID_nombre): Promise<void>
  asignarCarry(vehiculoId: ID_vehiculo, personaId: ID_nombre): Promise<void>
  quitarPersona(vehiculoId: ID_vehiculo, personaId: ID_nombre): Promise<void>
  intercambiarRoles(
    vehiculoId: ID_vehiculo,
    personaA: ID_nombre,
    personaB: ID_nombre
  ): Promise<void>
}

type FuncionOperativa =
  | 'Programado' | 'Dispositivo' | 'Traslado'
  | 'Guardia_urgencias' | 'DRP'
  | 'En_espera' | 'Estacionado' | 'Ruta'
```

### Comportamiento

**`activar`**

```
1. Modal: "¿Activar ID_vehiculo?" — confirmación
2. Solicita km_inicio (entrada manual, obligatorio)
3. Muestra ID_nombre con checkin_on en terminal → asignar Pilot y Carry
4. Si confirmado:
   - useVehiculoStore[id].estadoOperativo = 'Activado'
   - useVehiculoStore[id].km_inicio = kmInicio
   - useDoc8.abrir(id, pilotId, kmInicio)
   - INSERT en vehiculo_sesiones con timestamp_activacion
```

**`desactivar`**

```
1. Modal: "¿Desactivar ID_vehiculo?" — confirmación
2. Solicita km_fin
3. Si confirmado:
   - Cierra todos los bloques de función activos con timestamp_fin
   - useVehiculoStore[id].estadoOperativo = 'Desactivado'
   - Elimina pilot y carry del vehículo
   - useDoc8.cerrar(id, kmFin, NOW())
```

**`setFuncionOperativa`**

```
1. Si hay función activa → cerrar con timestamp_fin en Doc-8
2. Si nueva función requiere GPS (Estacionado, Ruta):
   - useGPS.capturar() → coordenadas con fallback chain
3. Abrir nuevo bloque en Doc-8: { funcion, timestamp_inicio, coords? }
4. useVehiculoStore[id].funcionOperativa = funcion
```

**`activar` y `desactivar` desde Supabase Realtime:**
Los cambios de estado de vehículo se reciben via Realtime y actualizan
`useVehiculoStore` para todos los terminales que muestran ese vehículo.

### Stores: `useVehiculoStore`, `usePersonaStore`

### Dependencias: `useDoc8`, `useGPS`

---

## 4. useDRP

> Gestiona el ciclo de vida de los DRP: creación, transiciones de estado,
> entrada y salida de dotaciones, finalización. Suscribe a cambios en tiempo real.

```typescript
interface UseDRP {
  // Estado
  drpActivos:      DRP[]               // En_espera | En_preparacion | En_curso
  drpSeleccionado: DRP | null          // DRP expandido en visor_drp
  drpDelTerminal:  DRP | null          // DRP al que pertenece este terminal

  // Consultas
  getDRP(id: ID_drp): DRP | undefined
  getDotaciones(drpId: ID_drp): Dotacion[]

  // Selección UI
  seleccionarDRP(id: ID_drp): void

  // Creación y gestión
  crearDRP(data: CrearDRPInput): Promise<ID_drp>
  editarRecursosDRP(drpId: ID_drp, data: EditarDRPInput): Promise<void>

  // Transiciones de estado (RBAC: coordinación, gerencia)
  activarDRP(drpId: ID_drp, opcion: 'cuenta_atras' | 'ahora'): Promise<void>
  finalizarDRP(drpId: ID_drp): Promise<void>
  cancelarDRP(drpId: ID_drp): Promise<void>
  archivarDRP(drpId: ID_drp, guardarPDF: boolean): Promise<void>

  // Dotaciones — entrada
  entrarConVehiculo(drpId: ID_drp, vehiculoId: ID_vehiculo): Promise<void>
  entrarAPie(drpId: ID_drp, personaId: ID_nombre): Promise<void>

  // Dotaciones — salida
  salirConVehiculo(drpId: ID_drp, vehiculoId: ID_vehiculo): Promise<void>
  salirIndividual(drpId: ID_drp, personaId: ID_nombre): Promise<void>

  // Alias interno (llamado por flujo_checkout_automatico)
  exitarDRP(vehiculoId: ID_vehiculo, modo: 'con_vehiculo' | 'individual'): Promise<void>
}

interface CrearDRPInput {
  nombre_drp: string
  fecha:      string
  hora:       string
  ubicacion:  string
  dotaciones_vehiculo?: DotacionVehiculo[]
  dotaciones_terrestre?: DotacionTerrestre[]
  backpack_id?: string
}
```

### Comportamiento

**`entrarConVehiculo`**

```
1. Recopila: vehiculoId + todos los ID_nombre emparejados EN ESE MOMENTO
2. Modal de confirmación mostrando exactamente quién entra
3. Si confirmado:
   - INSERT en drp_dotaciones por cada elemento
   - timestamp_entrada_drp individual por elemento
4. Si DRP estaba 'En_espera' y es la primera dotación:
   - DRP → 'En_preparacion' (trigger automático en BBDD o RPC)
   - timestamp_inicio_preparacion = NOW()
```

**`finalizarDRP`**

```
1. Para dotaciones que siguen dentro:
   - timestamp_salida_drp = timestamp_finalizacion (para cada una)
2. Cierra módulos activos (PSA, filiación):
   - useModuloPSA.cerrar() → subinventario ID_DRP → 'En_Transito'
   - useModuloFiliacion.cerrar()
3. Doc-1 → 'Finalizado_Cerrado'
4. DRP → 'Finalizado'
5. Si finaliza antes de hora programada:
   - Notificación a bandeja_entrada_coordinacion
```

**`cancelarDRP`**

```
Precondición: Doc-1 sin asistencias
  → Si Doc-1 tiene asistencias → throw Error('drp_con_asistencias_no_cancelable')
  → Si OK → DELETE DRP y recursos asociados
```

**`activarDRP`** — si hora actual < hora programada:

```
Modal: "¿Cuenta atrás o Marcar hora actual?"
  'cuenta_atras' → DRP pasa a 'En_curso', UI muestra countdown
  'ahora'        → timestamp_inicio_curso = NOW()
```

### Stores: `useDRPStore`

### Dependencias: `useModuloPSA`, `useModuloFiliacion`, `useRealtime`

---

## 5. useDoc8

> Gestiona el parte de trabajo (Doc-8) activo. Los eventos se escriben
> automáticamente — este hook es la interfaz para escritura y consulta.

```typescript
interface UseDoc8 {
  // Estado
  doc8Activo:     Doc8 | null          // Doc-8 del turno en curso
  doc8UltimoCerrado: Doc8 | null       // último Doc-8 cerrado (lectura)
  estaAbierto:    boolean

  // Ciclo de vida (llamados por useVehiculo y useCheckin)
  abrir(
    vehiculoId: ID_vehiculo,
    pilotId:    ID_nombre,
    km_inicio:  number
  ): Promise<void>
  cerrar(
    vehiculoId: ID_vehiculo,
    km_fin:     number,
    timestamp:  ISOString
  ): Promise<void>

  // Escritura de eventos (llamados internamente)
  registrarCambioFuncion(
    vehiculoId:    ID_vehiculo,
    funcion:       FuncionOperativa,
    timestamp_ini: ISOString,
    coords?:       Coords
  ): Promise<void>
  registrarCierreFuncion(
    vehiculoId:    ID_vehiculo,
    timestamp_fin: ISOString,
    coords?:       Coords
  ): Promise<void>
  registrarEntradaDRP(drpId: ID_drp, timestamp: ISOString): Promise<void>
  registrarSalidaDRP(drpId: ID_drp, timestamp: ISOString): Promise<void>
  registrarRepostaje(data: RepostajeData): Promise<void>
  cerrarBloquesAbiertos(timestamp_fin: ISOString): Promise<void>
}

interface RepostajeData {
  tipo:        'combustible' | 'adblue'
  km_marcador: number
  litros?:     number           // solo combustible
  euros?:      number           // solo gasolinera
  ubicacion?:  'gasolinera' | 'base'
}
```

### Comportamiento

**`abrir`**

```
1. Genera UUID en cliente: doc8Id = crypto.randomUUID()
2. INSERT en doc8:
   { id: doc8Id, vehiculoId, pilotId, km_inicio, estado: 'Abierto_En_Turno',
     timestamp_apertura: NOW() }
3. useDocumentosStore.doc8[vehiculoId] = doc8Id
4. Abre Bloque_Sesion con timestamp_inicio
```

**`cerrar`**

```
1. cerrarBloquesAbiertos(timestamp_fin)
2. UPDATE doc8: { km_fin, estado: 'Enviado_Cerrado', timestamp_cierre }
3. useDocumentosStore.doc8[vehiculoId] = null
4. doc8UltimoCerrado = copia local del Doc-8 cerrado
```

**`cerrarBloquesAbiertos`**

```
Busca en useDocumentosStore todos los bloques de estado sin timestamp_fin
→ Para cada uno: UPDATE bloque SET timestamp_fin = timestamp_fin proporcionado
→ Garantiza que no quedan bloques abiertos en el Doc-8 cerrado
```

**Nota de offline:** Doc-8 se persiste en IndexedDB via `useDocumentosStore`.
Si hay pérdida de conexión, los eventos se encolan y se replayan al reconectar
(los eventos de Doc-8 son aptos para cola offline — ver `useOfflineQueue`).

### Stores: `useDocumentosStore`

---

## 6. useInventario

> Interfaz para consultas de stock y operaciones de inventario.
> Todas las mutaciones de stock se ejecutan via RPC Supabase (atómicas).
> Las lecturas usan TanStack Query con revalidación via Supabase Realtime.

```typescript
interface UseInventario {
  // Consultas (TanStack Query)
  stockPorLocation: (locationId: string) => StockItem[]
  stockItem:        (locationId: string, itemId: string) => StockItem | undefined
  descuadres:       Descuadre[]
  enTransito:       ItemTransito[]
  subinventariosEstado: Map<string, 'Operativo' | 'Asignado' | 'En_Transito'>

  // Mutaciones via RPC (siempre requieren conexión)
  registrarGasto(data: Doc6Input): Promise<void>
  enviarMaterial(data: Doc10Input): Promise<Doc10Id>
  confirmarRecepcion(
    doc10Id:        string,
    itemsRecibidos: ItemRecibido[]
  ): Promise<void>
  resolverDescuadre(
    descuadreId: string,
    resolucion:  string
  ): Promise<void>
  archivarDescuadre(descuadreId: string): Promise<void>
}

interface Doc6Input {
  locationId:  string               // vehículo, backpack o subinventario
  items:       { itemId: string; cantidad: number }[]
  ID_nombre:   ID_nombre
  drpId?:      ID_drp               // si se registra durante un DRP
}

interface ItemRecibido {
  itemId:           string
  cantidad_recibida: number          // puede diferir de cantidad_enviada
}
```

### Comportamiento

**`registrarGasto`** (Doc-6)

```
1. Validación cliente: stock_real >= cantidad solicitada (precheck visual)
2. Llama RPC 'registrar_gasto_material' con los datos
3. RPC ejecuta en transacción:
   - UPDATE stock_real = stock_real - cantidad (con guard: stock_real >= cantidad)
   - INSERT en auditoria_inventario
   - Si stock_real < stock_objetivo → trigger notificación alerta
4. Si RPC lanza error 'stock_insuficiente':
   - throw Error('stock_insuficiente') → UI muestra aviso
5. Invalida TanStack Query cache para el locationId
```

**`enviarMaterial`** (Doc-10)

```
1. Llama RPC 'emitir_doc10':
   - Resta del location origen → inventario_en_transito
   - Doc-10 en estado 'En_Transito'
   - INSERT notificación a bandeja_entrada destino (Pendiente_Validacion)
2. Retorna doc10Id para seguimiento
```

**`confirmarRecepcion`**

```
Para cada item:
  A. cantidad_recibida === cantidad_enviada:
     → RPC suma al location destino
  B. cantidad_recibida !== cantidad_enviada:
     → RPC suma la cantidad_recibida al destino
     → RPC genera descuadre: {
         diferencia = enviada - recibida,
         estado: 'Pendiente_Revision'
       }
     → Doc-10 → 'Descuadre_Pendiente_Revision'
     → Notificación automática a bandeja_entrada_logistica
     
Si todo coincidió → Doc-10 → 'Completado'
Registra timestamp_confirmacion e ID_nombre_receptor_confirmador
```

**Sin soporte offline:** `registrarGasto`, `enviarMaterial` y `confirmarRecepcion`
requieren conexión activa. Si no hay red → UI muestra mensaje de error,
la operación no se encola (riesgo de race condition al reproducir).

### Stores: `useInventarioStore`

### Dependencias: Supabase RPC (obligatorio online), `useRealtime`

---

## 7. useBandeja

> Hook parametrizable para gestionar cualquier instancia de bandeja de entrada.
> Suscribe a Supabase Realtime para actualizaciones en tiempo real.
> Ilumina el icono `ti-mail` cuando hay mensajes sin leer.

```typescript
type BandejaInstancia =
  | 'bandeja_entrada_flota'
  | 'bandeja_entrada_logistica'
  | 'bandeja_entrada_coordinacion'
  | 'bandeja_entrada_rrhh'
  | 'bandeja_entrada_logistica_drp'
  | 'bandeja_entrada_vehiculo'
  | 'bandeja_entrada_personal'

interface UseBandeja {
  // Estado
  mensajes:         Mensaje[]
  unreadCount:      number
  hayMensajesSinLeer: boolean         // → icono ti-mail amarillo

  // Acciones base (todas las instancias)
  marcarLeida(mensajeId: string): Promise<void>
  marcarEnProceso(mensajeId: string): Promise<void>
  marcarSolucionada(mensajeId: string): Promise<void>
  archivar(mensajeId: string): Promise<void>

  // Acciones extendidas (bandeja_entrada_rrhh)
  aprobarDoc12?(mensajeId: string): Promise<void>
  denegarDoc12?(mensajeId: string): Promise<void>
  marcarLeidaDoc13?(mensajeId: string): Promise<void>

  // Acciones extendidas (bandeja_entrada_logistica_drp)
  confirmarRecepcionDoc10?(
    mensajeId: string,
    itemsRecibidos: ItemRecibido[]
  ): Promise<void>
}

function useBandeja(
  instancia: BandejaInstancia,
  filtro?:   { vehiculoId?: string; personaId?: string; drpId?: string }
): UseBandeja
```

### Comportamiento

**Suscripción Realtime**

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`bandeja:${instancia}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table:  'mensajes_bandeja',
      filter: `instancia=eq.${instancia}`
    }, (payload) => {
      useBandejasStore.getState().upsertMensaje(instancia, payload.new)
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [instancia])
```

**`marcarLeida`**

```
1. UPDATE mensaje SET estado = 'En_Proceso_Lectura',
                      ID_nombre_lector = rolActivo,
                      timestamp_lectura = NOW()
2. useBandejasStore actualizado localmente (optimistic update)
3. unreadCount decrementado si estaba en 'Emitida_Pendiente'
```

**Instancias de solo lectura** (`bandeja_entrada_vehiculo`, `bandeja_entrada_personal`):
Las acciones de cambio de estado no están disponibles. Solo se reciben mensajes del sistema.
`marcarEnProceso`, `marcarSolucionada` y `archivar` → no implementadas.

**Bandeja logística DRP** (`bandeja_entrada_logistica_drp`):
Recibe también: Doc-6 en tiempo real (solo lectura) y alertas de stock.
`confirmarRecepcionDoc10` delega a `useInventario.confirmarRecepcion`.

### Stores: `useBandejasStore`

### Dependencias: `useRealtime`, `useInventario` (para DRP)

---

## 8. useRealtime

> Hook de infraestructura para gestionar suscripciones Supabase Realtime.
> Centraliza la creación, reutilización y limpieza de canales.
> No se usa directamente en componentes — lo consumen otros hooks.

```typescript
interface RealtimeChannelConfig {
  channelName: string
  table:       string
  schema?:     string            // default: 'public'
  event?:      'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?:     string            // ej: 'drp_id=eq.abc123'
}

interface UseRealtime {
  isConnected:  boolean
  subscribe(
    config:    RealtimeChannelConfig,
    callback:  (payload: RealtimePayload) => void
  ): () => void                  // retorna función de cleanup
  reconnect(): void
}

function useRealtime(): UseRealtime
```

### Comportamiento

**`subscribe`**

```typescript
const unsubscribe = useRealtime().subscribe(
  { channelName: 'drp-estado', table: 'drp', filter: 'id=eq.xxx' },
  (payload) => { /* actualizar store */ }
)
// cleanup:
useEffect(() => unsubscribe, [])
```

**Reconexión automática:**

```
Si conexión perdida (WebSocket cierra):
  → isConnected = false
  → Reintentos exponenciales: 1s, 2s, 4s, 8s, 16s (máx 30s)
  → Al reconectar: re-fetch del estado completo via TanStack Query
    (Realtime puede haber perdido eventos durante la desconexión)
  → isConnected = true
```

**Gestión de canales:**

```
Los canales se registran en un Map global (singleton fuera del árbol React).
Si el mismo channelName ya existe → reutiliza el canal existente.
Cada subscribe devuelve un cleanup individual.
El canal se destruye cuando no quedan suscriptores.
```

**Estado global de conexión:**
`isConnected` refleja si la suscripción Realtime está activa.
Se propaga a `useGlobalStore.isOnline` para mostrar indicadores en UI.

### Stores: `useGlobalStore` (isOnline)

### Nota: Solo para uso interno de otros hooks. No instanciar en componentes

---

## 9. useOfflineQueue

> Gestiona la cola de mutaciones para soporte offline-first.
> Persiste en IndexedDB. Reproduce en orden FIFO al recuperar conexión.
> Solo para operaciones aptas para cola (ver `logic.md §17`).

```typescript
interface Mutation {
  id:          UUID                   // crypto.randomUUID()
  tipo:        string                 // 'doc2_create' | 'doc1_asistencia' | etc.
  payload:     unknown
  timestamp:   ISOString
  intentos:    number
  estado:      'pendiente' | 'enviando' | 'fallido'
  errorMsg?:   string
}

interface UseOfflineQueue {
  // Estado
  isOnline:     boolean
  pendingCount: number
  failedCount:  number
  hasFailed:    boolean

  // Acciones
  enqueue(tipo: string, payload: unknown): UUID
  procesarCola(): Promise<void>        // llamado automáticamente al reconectar
  reintentarFallidos(): Promise<void>
  descartarFallido(mutationId: UUID): void
}
```

### Comportamiento

**`enqueue`**

```
1. Genera id = crypto.randomUUID()
2. INSERT en IndexedDB ('mutation_queue' store):
   { id, tipo, payload, timestamp: NOW(), intentos: 0, estado: 'pendiente' }
3. Si isOnline → dispara procesarCola() inmediatamente
4. Retorna id para tracking
```

**`procesarCola`** (FIFO)

```
1. Lee mutaciones en orden timestamp ASC de IndexedDB
2. Para cada mutación en estado 'pendiente':
   a. Marca como 'enviando'
   b. Ejecuta la mutación contra Supabase
   c. Si éxito → DELETE de IndexedDB
   d. Si fallo:
      - intentos++
      - Si intentos < 3 → estado = 'pendiente' (reintento posterior)
      - Si intentos >= 3 → estado = 'fallido'
3. Actualiza pendingCount y failedCount en store
```

**Detección de estado de red:**

```typescript
useEffect(() => {
  const online  = () => { setIsOnline(true);  procesarCola() }
  const offline = () => { setIsOnline(false) }
  window.addEventListener('online',  online)
  window.addEventListener('offline', offline)
  return () => {
    window.removeEventListener('online',  online)
    window.removeEventListener('offline', offline)
  }
}, [])
```

**Operaciones aptas para cola offline:**

| Tipo | Descripción |
| --- | --- |
| `doc1_asistencia` | Añadir asistencia a Doc-1 del DRP |
| `doc2_create` | Nuevo informe asistencial |
| `doc3_create` | Nuevo informe clínico |
| `doc4_create` | Alta voluntaria |
| `doc5_create` | Descargo de responsabilidad |
| `doc11_create` | Aviso urgente |
| `doc6_metadata` | Metadata del gasto (stock se aplica al reconectar via RPC) |

**Operaciones NO aptas para cola:**
Stock mutations (Doc-6 RPC, Doc-10 confirmación), login/checkin,
cambios de estado DRP, generación de tokens. Ver `logic.md §17.3`.

### Persistencia: IndexedDB (via `idb` o similar)

### Stores: `useDocumentosStore` (borradores en curso)

---

## 10. useGPS

> Captura coordenadas con la cadena de fallback completa documentada en
> `logic.md §5`. El componente que llama a `capturar()` recibe las mejores
> coordenadas disponibles sin preocuparse de la fuente.

```typescript
interface Coords {
  lat:       number
  lng:       number
  accuracy?: number              // metros (solo GPS real)
  fuente:    'gps' | 'historial_vehiculo' | 'ultimo_evento' | 'ip' | 'ninguna'
}

interface UseGPS {
  // Estado
  ultimasCoordsConocidas: Coords | null
  isDisponible:           boolean

  // Acción principal
  capturar(vehiculoId?: ID_vehiculo): Promise<Coords | null>
}
```

### Comportamiento

**`capturar`** — cadena de fallback completa:

```
PASO 1: GPS del dispositivo
  navigator.geolocation.getCurrentPosition(
    timeout: 5000,
    maximumAge: 30000
  )
  → Si éxito: { lat, lng, accuracy, fuente: 'gps' }
  → Guarda en useVehiculoStore[vehiculoId].ultimasCoordsGPS

PASO 2: Último historial GPS del vehículo (si vehiculoId provisto)
  → SELECT coords FROM gps_historial
    WHERE vehiculo_id = vehiculoId
    ORDER BY timestamp DESC LIMIT 1
  → Si encontrado: { lat, lng, fuente: 'historial_vehiculo' }

PASO 3: Último evento con ubicación del vehículo
  → SELECT coords FROM doc8_eventos
    WHERE vehiculo_id = vehiculoId AND coords IS NOT NULL
    ORDER BY timestamp DESC LIMIT 1
  → Si encontrado: { lat, lng, fuente: 'ultimo_evento' }

PASO 4: Coordenadas del terminal por IP/WiFi
  → Intenta geolocalización por IP (servicio externo o Supabase Edge Function)
  → Si encontrado: { lat, lng, fuente: 'ip' }

PASO 5: Sin datos
  → Retorna null
  → fuente: 'ninguna'
  → Muestra aviso en UI: "Ubicación no disponible"
  → La operación continúa sin coordenadas (no bloquea)
```

**Silencio en pasos 2–4:**
Los pasos 2, 3 y 4 se ejecutan sin mostrar ningún aviso al usuario.
Solo el paso 5 genera mensaje visible en UI.

**`isDisponible`:**
`true` si la última llamada a `capturar()` retornó coords de fuente `'gps'`.
`false` si la última llamada usó fallback o retornó null.

### Stores: `useVehiculoStore` (cache de últimas coords)

---

## 11. useNavigation

> Gestiona el estado de navegación del home_area: qué vista está activa,
> qué modal está abierto, y el historial para el botón de atrás.
> Implementa el modelo de profundidad máxima 1 documentado en `mapeo_visual_ui.md §7`.

```typescript
type HomeView  = string | null         // nombre de la vista in-place activa
type ModalView = string | null         // nombre del modal activo

interface UseNavigation {
  // Estado
  activeView:     HomeView             // null = visual_info_home
  activeModal:    ModalView            // null = sin modal
  canGoBack:      boolean              // true si activeView !== null
  accordionActivo: string | null       // núcleo de black_column expandido

  // Acciones
  navigate(view: string): void         // abre vista in-place, cierra modal si hay
  openModal(modal: string): void       // abre modal sobre vista actual
  closeModal(): void                   // cierra modal
  goBack(): void                       // cierra in-place o modal → visual_info_home
  goHome(): void                       // fuerza visual_info_home, colapsa acordeón
  toggleAccordion(nucleo: string): void // expande/colapsa sin cambiar home_area
}
```

### Comportamiento

**`navigate(view)`**

```
1. Si hay modal activo → closeModal()
2. activeView = view
3. canGoBack = true
4. El acordeón permanece expandido (no se colapsa)
```

**`goBack()`**

```
Si activeModal !== null:
  → closeModal()
  → activeView sin cambio

Si activeModal === null && activeView !== null:
  → activeView = null (visual_info_home)
  → canGoBack = false

Si todo null → no-op (botón no debe estar visible)
```

**`goHome()`**

```
→ activeView = null
→ activeModal = null
→ accordionActivo = null
→ canGoBack = false
```

**`toggleAccordion`**

```
Si accordionActivo === nucleo → accordionActivo = null (colapsa)
Si accordionActivo !== nucleo → accordionActivo = nucleo (expande y colapsa anterior)
No modifica activeView ni activeModal
```

### Stores: Estado local del hook (no requiere store global)

### Nota: `activeView` y `activeModal` son strings de nombre de componente

### no rutas de URL — U24 no usa React Router

---

## 12. useDocumento

> Hook genérico para el ciclo de vida de formularios de documentos.
> Gestiona borrador persistido en IndexedDB y la transición final a Supabase.
> Parametrizable por tipo de documento.

```typescript
type TipoDocumento =
  | 'doc2' | 'doc3' | 'doc4' | 'doc5'
  | 'doc6' | 'doc9' | 'doc10' | 'doc11'
  | 'doc12' | 'doc13' | 'doc_checklist360'

interface UseDocumento<T> {
  // Estado
  draft:        T | null              // borrador en IndexedDB
  estado:       EstadoDocumento
  isGuardando:  boolean
  isEnviando:   boolean
  errorMsg:     string | null

  // Acciones
  inicializar(prefill?: Partial<T>): void
  guardarBorrador(data: Partial<T>): void
  enviar(data: T): Promise<void>
  anular(): Promise<void>             // solo en estado Borrador_En_Curso
  descartar(): void                   // limpia borrador de IndexedDB sin enviar
}

function useDocumento<T>(tipo: TipoDocumento, id?: UUID): UseDocumento<T>
```

### Comportamiento

**`inicializar`**

```
1. Genera id = crypto.randomUUID() (usado como PK en Supabase al enviar)
2. Prepopula campos automáticos:
   - timestamp, ID_nombre activo, ID_vehiculo activo (si aplica)
   - drp_id (si hay DRP activo)
3. Guarda borrador inicial en IndexedDB
4. estado = 'Borrador_En_Curso'
```

**`guardarBorrador`**

```
→ Merge data con draft existente en IndexedDB
→ Sin llamada a Supabase (offline-safe)
→ Debounced 500ms para no saturar IndexedDB
```

**`enviar`**

```
1. Validación de campos obligatorios
2. Si isOnline:
   - INSERT en Supabase con el UUID pre-generado
   - Para Doc-6: llama useInventario.registrarGasto() via RPC (requiere online)
   - estado = estado final según tipo de doc
   - DELETE borrador de IndexedDB
3. Si offline (doc apto para cola):
   - useOfflineQueue.enqueue(tipo, data)
   - Borrador permanece en IndexedDB hasta confirmación
4. Si offline (doc NO apto para cola como Doc-6):
   - throw Error('requiere_conexion')
```

**`anular`**

```
Solo disponible en estado 'Borrador_En_Curso'.
→ UPDATE en Supabase: estado = 'Anulado_Por_Error'
→ DELETE borrador de IndexedDB
```

### Stores: `useDocumentosStore`

### Dependencias: `useOfflineQueue`, `useInventario` (para Doc-6)

---

## 13. Árbol de dependencias entre hooks

```
useTerminalAuth
  └── (base para todos)

useCheckin
  ├── useTerminalAuth (lee estado terminal)
  ├── useVehiculo     (desacopla carry al checkout)
  ├── useDRP          (sale del DRP en checkout pilot)
  └── useDoc8         (cierra Doc-8 en checkout pilot)

useVehiculo
  ├── useDoc8         (abre/cierra Doc-8, registra eventos)
  └── useGPS          (captura coords en funciones operativas)

useDRP
  ├── useRealtime     (suscripción a cambios del DRP)
  ├── useModuloPSA*   (cierra módulo al finalizar DRP)
  └── useModuloFiliacion* (cierra módulo al finalizar DRP)

useDoc8
  └── useDocumentosStore (IndexedDB)

useInventario
  ├── useRealtime     (actualizaciones de stock en tiempo real)
  └── Supabase RPC    (obligatorio online)

useBandeja(instancia)
  ├── useRealtime     (suscripción por instancia)
  └── useInventario   (solo bandeja_logistica_drp para confirmar Doc-10)

useOfflineQueue
  └── IndexedDB       (persistencia)

useGPS
  └── useVehiculoStore (cache coords)

useNavigation
  └── (estado local, sin dependencias)

useDocumento(tipo)
  ├── useOfflineQueue  (encola si offline)
  └── useInventario    (solo Doc-6 para RPC de stock)
```

*`useModuloPSA` y `useModuloFiliacion` no están especificados en detalle aquí —
siguen el mismo patrón que `useDocumento` sobre `useModulosStore`.*

---

## 14. Notas de implementación

### TanStack Query vs Zustand

| Dato | Gestión | Motivo |
|---|---|---|
| Estado de turno activo (checkin, vehiculo, DRP) | Zustand + localStorage | Sobrevive recargas, mutaciones optimistas |
| Stock de inventario | TanStack Query + Supabase Realtime | Sin estado local — siempre fuente de verdad es BBDD |
| Formularios en progreso | Zustand + IndexedDB | Offline-first, borradores persistentes |
| Mensajes de bandeja | Zustand + Supabase Realtime | Actualización en tiempo real sin polling |
| Estado global (marquesina, tablón, vacaciones) | Zustand + Supabase Realtime | Broadcast a todos los terminales |

### Gestión de errores

Todos los hooks que realizan llamadas async deben exponer `errorMsg: string | null`.
Los componentes muestran el error en un `toast` o `banner` no bloqueante,
excepto `km_fin` en checkout (bloqueante — el flujo no puede continuar).

### Nomenclatura de canales Realtime

```
drp:{drp_id}                  → cambios de DRP específico
bandeja:{instancia}           → mensajes de una bandeja
inventario:{location_id}      → stock de un location
global:marquesina             → texto del ticker
global:tablon                 → anuncios del tablón
global:vacaciones             → estado periodo vacaciones
```
