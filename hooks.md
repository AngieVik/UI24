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
   - useVehiculo.cerrarEstadosActivos(vehiculoId, timestamp_checkout)
   - Doc-8: cierra todos los bloques de estado_operativo y tipo_servicio abiertos con timestamp_fin

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

6. Estado final del vehículo — **regla estricta**
   - vehiculo.estadoOperativo = 'en_espera' SIEMPRE (con o sin carries)
   - El vehículo NUNCA pasa a 'desactivado' como consecuencia del checkout del pilot
   - 'desactivado' solo es alcanzable por acción manual explícita posterior (useVehiculo.desactivar)
```

**`promoverCarryAPilot`**

```
1. Requiere: vehiculo en 'en_espera', ID_nombre con 'carry' en ese vehiculo
2. Modal solicita km_inicio (si el vehículo no tiene km_inicio activo)
3. useVehiculoStore[vehiculoId]:
   - pilot = ID_nombre
   - estadoOperativo = 'en_espera'
4. usePersonaStore[ID_nombre].esPilot = true, esCarry = false
5. useDoc8.abrir(vehiculoId, ID_nombre, km_inicio)
```

### Stores: `usePersonaStore`, `useAuthStore`, `useTerminalStore`

### Dependencias: `useVehiculo`, `useDRP`, `useDoc8`

---

## 3. useVehiculo

> Gestiona el ciclo de vida de ID_vehiculo: activación/desactivación,
> las dos dimensiones de estado independientes (`estado_operativo` y
> `condicion_tecnica`), el `tipo_servicio`, y la asignación de roles.
> Ver `estados.md §4` para la definición completa de cada dimensión.

```typescript
interface UseVehiculo {
  // Estado
  vehiculos:      Vehiculo[]          // todos los vehículos del sistema
  vehiculoActivo: Vehiculo | null     // el seleccionado en este terminal

  // Consultas
  getVehiculo(id: ID_vehiculo): Vehiculo | undefined

  // Selección UI
  seleccionarVehiculo(id: ID_vehiculo): void

  // Ciclo de vida (desactivado ↔ en_espera)
  activar(id: ID_vehiculo, kmInicio: number): Promise<void>
  desactivar(id: ID_vehiculo, kmFin: number): Promise<void>

  // Dimensión 1 — estado operativo (cambios manuales en ruta)
  setEstadoOperativo(
    id:     ID_vehiculo,
    estado: EstadoOperativo
  ): Promise<void>

  // Dimensión 2 — condición técnica (actualizada por Doc-7, no manual)
  setCondicionTecnica(
    id:       ID_vehiculo,
    condicion: CondicionTecnica
  ): Promise<void>

  // Dimensión 3 — tipo de servicio (actualizable en cualquier momento del turno)
  setTipoServicio(
    id:   ID_vehiculo,
    tipo: TipoServicio
  ): Promise<void>

  // Cierre de bloques activos (llamado por flujo_checkout_automatico)
  cerrarEstadosActivos(
    id:            ID_vehiculo,
    timestamp_fin: ISOString
  ): Promise<void>

  // Roles
  asignarPilot(vehiculoId: ID_vehiculo, personaId: ID_nombre): Promise<void>
  asignarCarry(vehiculoId: ID_vehiculo, personaId: ID_nombre): Promise<void>
  quitarPersona(vehiculoId: ID_vehiculo, personaId: ID_nombre): Promise<void>
  intercambiarRoles(
    vehiculoId: ID_vehiculo,
    personaA:   ID_nombre,
    personaB:   ID_nombre
  ): Promise<void>
}

// Dimensión 1: estado físico/operativo del vehículo
type EstadoOperativo =
  | 'desactivado'     // sin turno activo, sin Doc-8 — solo acción manual explícita
  | 'en_espera'       // pilot asignado, Doc-8 activo, sin servicio ni movimiento
  | 'activado'        // servicio activo despachado (tipo_servicio asignado)
  | 'ruta'            // en tránsito — captura GPS al iniciar y al finalizar
  | 'estacionado'     // parado fuera de base — captura GPS al activar
  | 'alerta'          // respuesta a emergencia activa (luces/sirenas) — captura GPS al activar y al desactivar

// Dimensión 2: condición mecánica del vehículo (badge, no selector manual)
type CondicionTecnica =
  | 'operativo'           // sin incidencias
  | 'averiado_leve'       // incidencia leve/moderada (Doc-7) — badge amarillo
  | 'inoperativo_critico' // fallo grave (Doc-7) — badge rojo, confirmación requerida

// Dimensión 3: tipo de servicio asignado al turno
type TipoServicio =
  | 'Programado' | 'Dispositivo' | 'Traslado' | 'Guardia_urgencias'
  | 'DRP' | 'Privado' | 'Simulacro' | 'Formacion' | 'Sin_asignar'
```

### Comportamiento

**`activar`** (`desactivado → en_espera`)

```
1. Modal: "¿Activar ID_vehiculo?" — Sí | No
2. Si condicion_tecnica = 'inoperativo_critico':
   - Advertencia bloqueante adicional
   - Requiere confirmación de gerencia o coordinación (RBAC)
3. Solicita km_inicio (obligatorio)
4. Muestra ID_nombre con checkin_on en terminal → asignar Pilot y Carry
5. Si confirmado:
   - useVehiculoStore[id].estadoOperativo = 'en_espera'
   - useVehiculoStore[id].km_inicio = kmInicio
   - useDoc8.abrir(id, pilotId, kmInicio)
   - INSERT en vehiculo_sesiones con timestamp_activacion
```

**`desactivar`** (`en_espera → desactivado`) — **acción manual explícita. NUNCA es consecuencia del checkout del pilot.**

```
Precondición: estadoOperativo = 'en_espera'

1. Modal: "¿Desactivar [ID_vehiculo]? El vehículo quedará fuera de servicio."

2. CASO A — Hay pilot activo (Doc-8 abierto):
   - Solicita km_fin (obligatorio)
   - cerrarEstadosActivos(id, NOW())
   - useDoc8.cerrar(id, kmFin, NOW())
   - Desempareja pilot del vehículo

3. CASO B — No hay pilot activo (en_espera tras checkout previo, sin Doc-8):
   - No se solicita km_fin (el Doc-8 ya fue cerrado por el pilot anterior)
   - Sin operación sobre Doc-8

4. Desempareja cualquier carry restante del vehículo
5. useVehiculoStore[id].estadoOperativo = 'desactivado'
```

**`setEstadoOperativo`** (cambios manuales: en_espera ↔ activado ↔ ruta ↔ alerta ↔ estacionado)

```
INTERCEPTOR (ejecutar ANTES si nuevoEstado ∈ { 'ruta', 'alerta' }):
  Condición: vehiculo.timestamp_entrada_drp !== null
             ∧ vehiculo.timestamp_salida_drp === null
  → Modal: "El vehículo pertenece al DRP [nombre_drp].
            ¿Desea registrar su salida del dispositivo?"
    SÍ → useDRP.salirConVehiculo(drpId, vehiculoId)
         (registra timestamp_salida_drp para vehículo y todos los ID_nombre emparejados)
         → continúa con el cambio de estado
    NO → aborta la función. Estado permanece sin cambio.

FLUJO PRINCIPAL:
1. Si estado requiere GPS (ruta, alerta, estacionado):
   - useGPS.capturar(id) → coordenadas con fallback chain
2. Cierra el bloque de estado_operativo activo con timestamp_fin en Doc-8
3. Abre nuevo bloque: { estado, timestamp_inicio, coords? }
4. useVehiculoStore[id].estadoOperativo = estado

Ver logic.md §28 para la justificación y los casos límite del interceptor.
```

**`setCondicionTecnica`**

```
Llamado exclusivamente por el flujo de Doc-7 (averías).
1. UPDATE vehiculos SET condicion_tecnica = condicion en Supabase
2. useVehiculoStore[id].condicionTecnica = condicion
3. Sin entrada en Doc-8 (la avería ya genera Doc-7 propio)
```

**`setTipoServicio`**

```
1. Cierra el bloque de tipo_servicio activo con timestamp_fin en Doc-8
2. Abre nuevo bloque: { tipo_servicio, timestamp_inicio }
3. useVehiculoStore[id].tipoServicio = tipo
Nota: visible solo mientras estadoOperativo ≠ 'desactivado'
```

**Propagación via Supabase Realtime:**
Los cambios de `estadoOperativo`, `condicionTecnica` y `tipoServicio` se
emiten por Realtime y actualizan `useVehiculoStore` en todos los terminales.

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

  // Escritura de eventos (llamados internamente por useVehiculo)
  registrarCambioEstadoOperativo(
    vehiculoId:    ID_vehiculo,
    estado:        EstadoOperativo,
    timestamp_ini: ISOString,
    coords?:       Coords          // obligatorio si estado = 'ruta' | 'estacionado'
  ): Promise<void>
  registrarCambioTipoServicio(
    vehiculoId:    ID_vehiculo,
    tipo:          TipoServicio,
    timestamp_ini: ISOString
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
interface StockItem {
  itemId:           string
  stock_real:       number    // fuente de verdad en BBDD (última confirmación)
  stock_real_local: number    // cache optimista en Zustand (puede diferir temporalmente)
  stock_objetivo:   number
  sync_pending:     boolean   // true → delta descontado localmente aún no confirmado por RPC
  pending_delta:    number    // cantidad descontada pendiente de reconciliar (positivo = descuento)
}

interface UseInventario {
  // Consultas (TanStack Query para stock_real; Zustand para stock_real_local)
  stockPorLocation: (locationId: string) => StockItem[]
  stockItem:        (locationId: string, itemId: string) => StockItem | undefined
  descuadres:       Descuadre[]
  enTransito:       ItemTransito[]
  subinventariosEstado: Map<string, 'Operativo' | 'Operativo_Condicionado' | 'Asignado' | 'En_Transito'>

  // Mutaciones via RPC (siempre requieren conexión)
  registrarGasto(data: Doc6Input): Promise<void>
  enviarMaterial(data: Doc10Input): Promise<Doc10Id>
  confirmarRecepcion(
    doc10Id:        string,
    itemsRecibidos: ItemRecibido[]
  ): Promise<void>
  resolverDescuadre(
    descuadreId:           string,
    clasificacion:         'perdida_rotura' | 'recuperacion',
    destinoRecuperacion?:  'ID_origen' | 'ID_destino'  // obligatorio si clasificacion = 'recuperacion'
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

**`registrarGasto`** (Doc-6) — flujo optimista en 3 pasos

```
PASO 1 — INMEDIATO (local, sin red):
  - Precheck: stock_real_local >= cantidad (validación visual)
  - Si falla precheck → throw Error('stock_insuficiente_local') sin llamar RPC
  - Si OK:
    · stock_real_local -= cantidad
    · sync_pending = true
    · pending_delta = cantidad
    · UI muestra badge 'sincronizando...' en el item

PASO 2 — PARALELO (llamada RPC en background):
  - Llama RPC 'registrar_gasto_material' con los datos
  - RPC ejecuta en transacción atómica:
    · guard: stock_real >= cantidad (contra el valor de BBDD — fuente de verdad)
    · UPDATE stock_real = stock_real - cantidad
    · INSERT en auditoria_inventario
    · Si stock_real_resultante < stock_objetivo → trigger notificación alerta

PASO 3 — RECONCILIACIÓN:
  A. RPC éxito:
     · stock_real = valor devuelto por RPC
     · stock_real_local = stock_real (sincronizado)
     · sync_pending = false, pending_delta = 0
     · Badge 'sincronizando' desaparece
     · Invalida TanStack Query cache para locationId

  B. RPC error 'stock_insuficiente' (race condition con otro terminal):
     · REVERTIR: stock_real_local += pending_delta
     · sync_pending = false, pending_delta = 0
     · throw Error('stock_insuficiente') → UI muestra aviso

  C. RPC error de red (timeout / offline):
     · stock_real_local permanece decrementado (badge persiste)
     · sync_pending = true
     · Encola reintento via useOfflineQueue ('doc6_metadata')
     · Al reconectar: useOfflineQueue replaya → PASO 2 y 3

NOTA: El flujo optimista aplica exclusivamente a Doc-6 (gasto asistencial).
      Doc-10 (envío entre locations) no usa optimismo — requiere confirmación
      explícita del receptor antes de actualizar stock en destino.
```

**`enviarMaterial`** (Doc-10) — **requiere conexión sincrónica obligatoria**

```
PRECONDICIÓN: isOnline === true
  Si offline → throw Error('doc10_requiere_conexion')
  El guard atómico stock_real >= p_cantidad debe evaluarse en el instante exacto
  de la transferencia. Un Doc-10 encolado offline podría ejecutarse cuando otro
  terminal ya ha consumido el stock, generando stock negativo. Ver logic.md §17.3.

1. Llama RPC 'emitir_doc10' (síncrono, sin optimismo local):
   - Guard: stock_real >= p_cantidad (falla si no hay suficiente stock en DB)
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

**Soporte offline parcial:**
- `registrarGasto` (Doc-6): soporte offline via optimismo local. El descuento es inmediato en Zustand; el RPC se encola y se replaya al reconectar (ver PASO 3-C arriba).
- `enviarMaterial` (Doc-10): **sin soporte offline** — requiere conexión sincrónica para ejecutar el guard atómico `stock_real >= p_cantidad`. Ver justificación en `logic.md §17.3`.
- `confirmarRecepcion`: sin soporte offline — la reconciliación de stock en destino es atómica.
- `resolverDescuadre`: sin soporte offline — la RPC de clasificación contable (`merma` / `recuperacion_descuadre`) requiere transacción atómica en Supabase.

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
| `doc6_metadata` | Metadata del gasto (stock descontado localmente por optimismo; RPC reconcilia al reconectar) |

**Operaciones NO aptas para cola:**

| Tipo | Motivo |
| --- | --- |
| Doc-6 RPC (stock) | Transacción atómica Supabase |
| **Doc-10 completo** | Guard atómico `stock_real >= p_cantidad` debe evaluarse en tiempo real — riesgo de stock negativo si se encola |
| Doc-10 confirmación | Transacción atómica Supabase |
| `resolverDescuadre` | RPC contable (merma / recuperación) requiere transacción atómica |
| Login / check-in | Validación JWT en tiempo real |
| Tokens emergencia | Requiere reautenticación |
| Cambios de estado DRP | Sincronización inmediata multi-terminal |

Ver `logic.md §17.3` para la justificación completa.

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
   - Para Doc-6: llama useInventario.registrarGasto() — aplica flujo optimista local
   - estado = estado final según tipo de doc
   - DELETE borrador de IndexedDB
3. Si offline (doc apto para cola — incluyendo Doc-6 via optimismo local):
   - Doc-6: descuento ya aplicado localmente (PASO 1 del flujo optimista);
     metadata encola en useOfflineQueue para sincronizar al reconectar
   - Resto de docs aptos: useOfflineQueue.enqueue(tipo, data)
   - Borrador permanece en IndexedDB hasta confirmación del RPC
4. Si offline (doc NO apto para cola):
   - **Doc-10**: throw Error('doc10_requiere_conexion') — el guard atómico
     stock_real >= p_cantidad requiere conexión sincrónica. Ver logic.md §17.3.
   - confirmarRecepcion y resolverDescuadre: throw Error('requiere_conexion')
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

## 13. useIdleTimeout

> Monitoriza la inactividad DOM en terminales con sesión de emergencia
> (rol `invitado`). Si no hay interacción durante 20 minutos, fuerza
> la regresión a `estado_0` sin destruir la cookie de la BBDD.
> El terminal requiere reintroducir el PIN para volver a `estado_1`.
> Ver `logic.md §26` para la justificación completa.

```typescript
interface UseIdleTimeout {
  // Estado
  isActivo:       boolean   // true si el timer de inactividad está corriendo
  isIdle:         boolean   // true si el timeout expiró (estado_0 forzado)
  tiempoRestante: number    // segundos hasta expiración (0 si isIdle)

  // Acciones (llamadas por useTerminalAuth, no por componentes)
  iniciar(): void           // activa monitoreo al detectar rol invitado
  detener(): void           // cancela timer (al cambiar a rol no-invitado o logout)
  resetTimer(): void        // reinicia contador a 1200s (llamado por los event listeners)
}
```

### Condición de activación

```
isActivo = true   sii   tipoSesion ∈ { 'galleta_pequeña', 'galleta' }
                  ∧     rolActivo === 'invitado'

useTerminalAuth llama a iniciar() cuando detecta esta condición.
useTerminalAuth llama a detener() cuando:
  - el rol sube (ID_nombre con rol propio hace checkin)
  - el usuario hace checkout y la cookie se autodestruye (galleta_pequeña)
```

### Comportamiento

**Event listeners DOM**

```typescript
const IDLE_MS = 20 * 60 * 1000   // 20 minutos

useEffect(() => {
  if (!isActivo) return

  const eventos = ['click', 'keydown', 'touchstart', 'mousemove', 'scroll']
  const reset = () => resetTimer()

  eventos.forEach(e => window.addEventListener(e, reset, { passive: true }))

  return () => {
    eventos.forEach(e => window.removeEventListener(e, reset))
  }
}, [isActivo])
```

**Al expirar el timer**

```
1. isIdle = true
2. useTerminalStore.estado → 'estado_0'
3. La cookie de BBDD NO se destruye:
   - 'galleta_pequeña' → sigue en BBDD con su expires_at original
   - 'galleta'         → sigue en BBDD como permanente
4. useAuthStore → limpiado (JWT, rolActivo)
5. UI presenta la pantalla de estado_0 con campo PIN preseleccionado
6. Al reintroducir el PIN válido → useTerminalAuth.loginConPin() →
   valida cookie existente (no genera nueva) → estado_1 restaurado
```

**Persistencia del timer**

```
El contador se guarda en Zustand (localStorage) para sobrevivir recargas
del navegador. Si el usuario recarga la página con isActivo=true, el
timer se restaura con el tiempo restante — no se reinicia a 20 minutos.
```

### Stores: `useTerminalStore`, `useAuthStore`

### Dependencias: `useTerminalAuth` (orquesta inicio/detención)

---

## 14. Árbol de dependencias entre hooks

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

useIdleTimeout
  ├── useTerminalStore (fuerza estado → 'estado_0' al expirar)
  └── useAuthStore     (limpia JWT y rolActivo al expirar)
  Condición: tipoSesion ∈ {galleta_pequeña, galleta} ∧ rolActivo = 'invitado'
  Orquestado por: useTerminalAuth (llama a iniciar/detener)
```

*`useModuloPSA` y `useModuloFiliacion` no están especificados en detalle aquí —
siguen el mismo patrón que `useDocumento` sobre `useModulosStore`.*

---

## 15. Notas de implementación

### TanStack Query vs Zustand

| Dato | Gestión | Motivo |
|---|---|---|
| Estado de turno activo (checkin, vehiculo, DRP) | Zustand + localStorage | Sobrevive recargas; dispositivos compartidos de flota |
| Stock de inventario (fuente de verdad) | TanStack Query + Supabase Realtime | Sincronizado con BBDD; invalidado tras cada RPC |
| Stock optimista local Doc-6 (`stock_real_local`) | Zustand (sin persist) | Revertible; no persiste en localStorage para evitar estado huérfano |
| Formularios en progreso | Zustand + IndexedDB | Offline-first, borradores persistentes |
| Mensajes de bandeja | Zustand + Supabase Realtime | Actualización en tiempo real sin polling |
| Estado global (marquesina, tablón, vacaciones) | Zustand + Supabase Realtime | Broadcast a todos los terminales |
| Timer de inactividad (`useIdleTimeout`) | Zustand + localStorage | Sobrevive recarga; tiempo restante recuperable |

### Convención de persistencia

```
localStorage  → OBLIGATORIO para todos los estados operativos de turno:
                estadoOperativo, condicionTecnica, tipoServicio, checkin_on,
                pilot, carry, drp_activo, turno_iniciado, idle_timer.
                Garantiza coherencia entre pestañas en dispositivos compartidos.

sessionStorage → PROHIBIDO para estado operativo.
                 Único uso permitido: JWT crudo en useAuthStore.
                 (sessionStorage es por-pestaña y no garantiza coherencia
                 en terminales de flota donde múltiples pestañas pueden
                 estar abiertas simultáneamente.)

Ver rules.md §3 para la directiva arquitectónica completa.
```

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
