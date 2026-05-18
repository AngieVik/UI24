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
   - Cookie HTTPOnly establecida (tipoSesion = 'estandar')
   - useTerminalStore.estado → 'estado_1'
   - useAuthStore.addJwt(ID_nombre, jwt)   ← JWT añadido al mapa de sesiones
   - useAuthStore.rolActivo = rol          ← rol activo de UI actualizado
   - JWT NO se guarda en sessionStorage como string plano;
     el mapa en Zustand (con persist en sessionStorage) es la única fuente de verdad
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
3. useAuthStore.removeJwt(ID_nombre)   ← elimina el JWT de ese usuario del mapa
4. useTerminalStore.estado → 'estado_0'
5. Si jwtMap queda vacío: useAuthStore.clearJwt() — limpia el store completo
```

**Detección de galleta en `estado_0` (renderizado condicional):**

```
Al montar useTerminalAuth (y al arrancar la PWA):
  Si useTerminalStore.estado === 'estado_0':
    Comprobar localStorage por cookie tipo 'galleta' (permanente):
      const galleta = localStorage.getItem('sb_galleta_permanente')
      Si galleta != null AND JSON.parse(galleta).valid === true:
        → useAuthStore.galletaPersistente = true
        → El componente terminal_check renderiza el botón
          "Acceder como Invitado Operativo"
          
accederComoInvitado():
  1. Validar que galletaPersistente === true (guard)
  2. useAuthStore.rolActivo = 'invitado'
  3. useTerminalStore.tipoSesion = 'galleta'
  4. useTerminalStore.estado → 'estado_1'
  (sin ID_nombre en checkin_on — idéntico a sesión por PIN de emergencia)
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
  → Comprueba retención de sync (ver lógica abajo)
  → Delega a flujo_checkout_automatico() (ver §2.1)

CASO B — ID_nombre tiene estado 'carry':
  0. LIQUIDACIÓN DRP POR FIN DE TURNO:
     Si useVehiculoStore[vehiculoId].drpId !== null (vehículo en DRP activo):
       → RPC registrar_salida_drp_individual(drpId, ID_nombre)
         (liquida en drp_dotaciones Y drp_personal_a_pie — ver logic.md §11.5)
       → timestamp_salida_drp registrado automáticamente
       → No se muestra modal de decisión: el checkout es intención inequívoca de abandono
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

**Retención de JWT en checkout offline (aplica solo a CASO A):**

```
Antes de ejecutar flujo_checkout_automatico:

  if (!useOfflineQueue.isOnline && useOfflineQueue.pendingCount > 0):
    → useTerminalStore.estado = 'estado_0'   ← UI bloqueada visualmente
    → useBackgroundSyncStore.congelarJwt(jwt, ID_nombre)  ← JWT aislado en store independiente
    → UI muestra banner: "Sincronizando datos... No cierre el navegador"
    → flujo_checkout_automatico ejecuta todos sus pasos normales
      EXCEPTO useAuthStore.clearJwt() (omitido hasta que la cola se vacíe)
    → El Service Worker lee useBackgroundSyncStore.getFrozenJwt() para autenticarse
    → Al completar: useOfflineQueue.clearJwtAfterSync()
        → useBackgroundSyncStore.liberarJwt() + useAuthStore.clearJwt()

  if (isOnline || pendingCount === 0):
    → flujo normal → useAuthStore.clearJwt() incluido
```

### §2.1 flujo_checkout_automatico (orquestado desde checkout)

```
Precondición: ID_nombre tiene estado 'pilot'

1. MODAL km_fin (bloqueante)
   - No se puede continuar sin introducir km_fin
   - Actualiza useVehiculoStore[vehiculoId].km_fin

1.5 ABORTO DE BORRADORES INCOMPLETOS (ejecutar ANTES de cerrar estados)

   Documentos afectados: Doc-Checklist360, Doc-2, Doc-3, Doc-4, Doc-5.
   Son "documentos legales" cuya integridad como inspección / informe firmado
   es requisito. Un borrador no firmado no tiene validez jurídica ni operativa
   y no debe permanecer en la base de datos como si fuera una revisión iniciada.

   PASO A — Documentos en base de datos (estado 'Borrador_En_Curso'):
     Consulta: SELECT id, tipo FROM documentos_borradores
                WHERE id_vehiculo = vehiculoId
                  AND id_nombre_creador = pilotId
                  AND estado = 'Borrador_En_Curso'
                  AND tipo IN ('doc_checklist360', 'doc2', 'doc3', 'doc4', 'doc5')

     Para cada resultado:
       → Intento de Hard Delete: DELETE FROM [tabla_tipo] WHERE id = doc.id
       → Si la FK constraint impide el DELETE (el registro ya tiene hijos):
           UPDATE [tabla_tipo] SET estado = 'Anulado_Por_Error_Auto',
                                   timestamp_anulacion_auto = NOW()
            WHERE id = doc.id
       → Nunca se intenta guardar ni firmar el borrador

   PASO B — Mutaciones en cola IndexedDB (documentos no enviados aún):
     Para cada mutación en IndexedDB con:
       tipo IN ('checklist360_create', 'doc2_create', 'doc3_create',
                'doc4_create', 'doc5_create')
       AND payload.id_vehiculo = vehiculoId
       AND payload.id_nombre_registrador = pilotId
       AND mutacion.estado = 'pendiente'   ← no enviada todavía

       → DELETE de IndexedDB (la mutación nunca llega al servidor)
       → Si la mutación tenía hijos (parentMutationId): propagar cancelación
         en cascada (mismo mecanismo que GUARDIA DE DEPENDENCIA en procesarCola)

   PASO C — IndexedDB local sin UUID de DB (borradores puros en memoria):
     useDocumentosStore limpia cualquier borrador activo de los tipos afectados
     que no tenga ID de base de datos asignado todavía.

   Resultado: al llegar al paso 2, NO existe ningún Doc-Checklist360, Doc-2,
   Doc-3, Doc-4 ni Doc-5 en estado borrador asociado a este turno/vehículo/pilot.

2. Cierre de estados del vehículo
   - useVehiculo.cerrarEstadosActivos(vehiculoId, timestamp_checkout)
   - Doc-8: cierra todos los bloques de estado_operativo y tipo_servicio abiertos con timestamp_fin

3. Salida de DRP (si aplica)
   - Si useVehiculoStore[vehiculoId].drpId !== null:

     DESACOPLE DE RETIRADA — decisión binaria obligatoria:
     Modal bloqueante antes de ejecutar ninguna acción de salida:

       "La unidad [ID_vehiculo] está desplegada en el DRP [nombre_drp].
        ¿Qué ocurre con el vehículo al finalizar este turno?"

       [ A: Finaliza su despliegue en el DRP ]
       [ B: Permanece operativa para el turno de relevo ]

       No se puede omitir ni cancelar — el checkout del pilot requiere
       una decisión explícita sobre el vehículo cuando hay DRP activo.

     OPCIÓN A — "Finaliza su despliegue":
       - useDRP.exitarDRP(vehiculoId, 'con_vehiculo')
       - Registra timestamp_salida_drp para ID_vehiculo y todos los
         ID_nombre emparejados en ese momento
       - El vehículo sale del DRP — puede ser desactivado o reasignado

     OPCIÓN B — "Permanece operativa para el turno de relevo":
       - Solo los ID_nombre emparejados salen del DRP individualmente:
           Para cada ID_nombre emparejado al vehículo:
             useDRP.salirIndividual(drpId, ID_nombre)
             Registra timestamp_salida_drp exclusivamente para el ID_nombre
       - El ID_vehiculo permanece dentro del DRP sin modificación:
           drpId no se limpia en useVehiculoStore[vehiculoId]
           El vehículo sigue apareciendo en la dotación del DRP como
           unidad vehicular sin personal asignado (dotación vacante)
       - Lógica de carries (ver paso 5): si queda algún carry,
         se le ofrece también la opción de salir o permanecer en el DRP

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

3. CERROJO ATÓMICO (OCC):
   RPC `promover_carry_a_pilot_atomico(p_vehiculo_id, p_id_nombre, p_km_inicio)`:
     UPDATE vehiculos
        SET pilot_id = p_id_nombre
      WHERE id = p_vehiculo_id
        AND pilot_id IS NULL    ← guard de concurrencia
   → Si 0 rows affected → throw Error('vehiculo_ya_tiene_pilot')
     Toast: "Este vehículo ya tiene un pilot asignado. Recarga y comprueba el estado."
   → Si 1 row affected → continuar

4. useVehiculoStore[vehiculoId]:
   - pilot = ID_nombre
   - estadoOperativo = 'en_espera'
5. usePersonaStore[ID_nombre].esPilot = true, esCarry = false
6. useDoc8.abrir(vehiculoId, ID_nombre, km_inicio)
```

**Justificación del cerrojo:**
Dos terminales pueden intentar simultáneamente promover carries distintos sobre el mismo
vehículo en `en_espera`. Sin el guard `AND pilot_id IS NULL`, ambos UPDATEs tienen éxito
y el vehículo queda con dos pilots activos. El primer UPDATE que llegue al servidor gana;
el segundo recibe 0 rows afectados y falla limpiamente sin corromper el estado.

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

  // Acción administrativa (RBAC: coordinación, gerencia)
  forzarCheckoutAdministrativo(
    vehiculoId:    ID_vehiculo,
    pilotId:       ID_nombre,
    kmFin:         number,
    coordinadorId: ID_nombre   // ID del coordinador que autoriza la acción
  ): Promise<void>
}

// Dimensión 1: estado físico/operativo del vehículo
type EstadoOperativo =
  | 'desactivado'     // sin turno activo, sin Doc-8 — solo acción manual explícita
  | 'en_espera'       // operativo y disponible — con pilot (Doc-8 activo) o sin pilot (sin Doc-8)
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
   FLUJO DE DESBLOQUEO EXCEPCIONAL (ver logic.md §32):

   A. Si vehiculoStore[id].overrideCritico = false (estado por defecto):
      - Bloqueo visible: "Vehículo INOPERATIVO CRÍTICO. Activación bloqueada."
      - Botón habilitado: "Solicitar Desbloqueo Excepcional"
        → POST Edge Function 'solicitar_desbloqueo_excepcional'
          { id_vehiculo, pilotId, timestamp }
        → Notificación push en bandeja_entrada_coordinacion (ver logic.md §32)
        → UI muestra: "Solicitud enviada — aguardando autorización de coordinación"
        → El terminal queda en espera de evento Realtime 'desbloqueo_concedido'
          en canal vehiculo:{id}
      - Cuando llega 'desbloqueo_concedido':
        → vehiculoStore[id].overrideCritico = true
        → Continúa con el paso 3 (km_inicio)

   B. Si vehiculoStore[id].overrideCritico = true (ya autorizado por coordinación):
      - Advertencia visible pero no bloqueante:
        "⚠️ Activación bajo responsabilidad del centro de mando."
      - Continúa con el paso 3 (km_inicio)
      - overrideCritico se consume: = false inmediatamente al confirmar activación
        (válido para una única activación — ver logic.md §32)

3. Solicita km_inicio (obligatorio)

   GUARDIA DE INTEGRIDAD GEOMÉTRICA (ejecutar antes de confirmar):
   - RPC 'get_ultimo_km_fin_vehiculo'({ id_vehiculo: id })
     → SELECT km_fin FROM doc8 WHERE id_vehiculo = id
               ORDER BY timestamp_cierre DESC LIMIT 1
   - Si resultado != null Y km_inicio < km_fin_anterior:
       ERROR bloqueante: "Km introducido ([km_inicio]) inferior al
       km de cierre del turno anterior ([km_fin_anterior]).
       Introduce un valor mayor o igual para continuar."
       → No avanza hasta que el usuario corrija km_inicio
   - Si km_inicio >= km_fin_anterior (o no existe Doc-8 previo):
       Validación superada → continúa

4. Muestra ID_nombre con checkin_on en terminal → asignar Pilot y Carry
5. Si confirmado:
   BLOQUEO POR SINCRONÍA DIFERIDA (ver logic.md §36):
   - Llamar RPC 'activar_vehiculo_y_abrir_doc8'({ id, kmInicio, pilotId })
   - Si RPC devuelve error con hint '409' (Doc-8 anterior en Borrador_En_Curso):
       → Modal bloqueante: "La desactivación del turno anterior aún está
          sincronizándose. Espere unos instantes e inténtelo de nuevo."
       → NO actualizar Zustand — la activación no procede
   - Si RPC éxito:
       → useVehiculoStore[id].estadoOperativo = 'en_espera'
       → useVehiculoStore[id].km_inicio = kmInicio
       → El Doc-8 fue abierto por la RPC — no llamar useDoc8.abrir() por separado
       → INSERT en vehiculo_sesiones con timestamp_activacion
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

**`intercambiarRoles`**

```
Objetivo: intercambiar los roles de personaA (pilot) y personaB (carry)
dentro del mismo vehículo, o promover un carry a pilot.

INTERCEPTOR DE DESERCIÓN (ejecutar ANTES del intercambio):

  pilotActual = useVehiculoStore[vehiculoId].pilot
  carryActual = useVehiculoStore[vehiculoId].carry  // puede ser null

  Resultado proyectado del intercambio:
    nuevoPilot = personaB
    nuevoCarry = personaA

  Condición de deserción:
    (nuevoPilot === null || nuevoPilot === undefined)
    ← personaB no existe en el vehículo como carry actual, de modo que
      personaA (único pilot) pasaría a carry sin nadie que asuma el rol
      de pilot. El vehículo quedaría sin pilot.

  SI condición de deserción es verdadera:
    → NO ejecutar el intercambio
    → Redirigir a flujo_checkout_automatico(personaA, vehiculoId):
        1. Modal: "No hay nadie que asuma el rol de pilot.
                   Para continuar, [personaA] debe hacer checkout del vehículo.
                   Introduce el km actual para cerrar el turno."
        2. Campo km_fin (obligatorio)
        3. Al confirmar:
             → useVehiculo.cerrarEstadosActivos(vehiculoId, NOW())
             → useDoc8.cerrar(vehiculoId, kmFin, NOW())
             → personaA desemparejado del vehículo (pilot = null)
             → Si personaB existe como carry:
                 → carry permanece emparejado al vehículo
                 → vehiculo.estadoOperativo = 'en_espera'
                   (vehículo listo para nuevo pilot — ver logic.md §15.3)
             → Si no hay carry: vehiculo sigue en en_espera sin personal
        4. El checkout de personaA ejecuta todo el flujo estándar del
           CASO A de useCheckin.checkout (incluyendo km_fin, Doc-8, etc.)

  SI condición de deserción es falsa (intercambio normal):
    → Ejecutar el intercambio atómico:
        1. UPDATE vehiculos: pilot = personaB, carry = personaA
        2. UPDATE personas: personaA.rol = 'carry', personaB.rol = 'pilot'
        3. useVehiculoStore[vehiculoId].pilot = personaB
        4. useVehiculoStore[vehiculoId].carry = personaA
        5. Registrar evento en Doc-8: { tipo: 'intercambio_roles',
             pilot_anterior: personaA, pilot_nuevo: personaB, timestamp: NOW() }
```

**`setCondicionTecnica`**

```
Llamado exclusivamente por el flujo de Doc-7 (averías).

PASO 1 — INMEDIATO (optimismo local, con o sin red):
  - useVehiculoStore[id].condicionTecnica = condicion
  - Badge de condicion_tecnica actualizado en la UI de este terminal

PASO 1.5 — TRANSICIÓN FORZADA (solo si condicion = 'inoperativo_critico'):

  Evaluar: estadoActual = useVehiculoStore[id].estadoOperativo
  Si estadoActual ∈ { 'ruta', 'alerta' }:

    a) Captura GPS inmediata (fallback chain — ver logic.md §5):
         coords = await useGPS.capturar(id)
         (coords puede ser null si no hay señal; se registra igualmente)

    b) En Doc-8: cierra el bloque activo con timestamp_fin = NOW()
                 abre nuevo bloque: { estado: 'estacionado', timestamp_inicio: NOW(), coords? }

    c) useVehiculoStore[id].estadoOperativo = 'estacionado'

    d) Broadcast de alta criticidad (independiente del estado de red del terminal):
         canal:   'global:alertas_criticas'
         payload: {
           tipo:              'vehiculo_forzado_estacionado',
           id_vehiculo:       id,
           estado_anterior:   estadoActual,   // 'ruta' | 'alerta'
           condicion_tecnica: 'inoperativo_critico',
           timestamp:         NOW(),
           coords:            coords | null
         }
       → Recibido por todos los terminales con rol coordinación/gerencia
         (ver logic.md §18 — fila «inoperativo_critico con estado activo»)

  Si estadoActual ∉ { 'ruta', 'alerta' }:
    No se aplica transición forzada. El badge de condicion_tecnica
    se actualiza igualmente (PASO 1). La activación posterior del
    vehículo requerirá confirmación explícita (ver nucleo_operativa_rutinaria.md §flujo_activacion).

PASO 2 — SEGÚN ESTADO DE RED:

  CASO A — Online:
    - INSERT Doc-7 en Supabase
    - UPDATE vehiculos SET condicion_tecnica = condicion
    - Si condicion = 'inoperativo_critico':
        → Realtime propaga el bloqueo a todos los terminales que muestran el vehículo
    - Sin entrada en Doc-8 (la avería genera Doc-7 propio)

  CASO B — Offline:
    - useOfflineQueue.enqueue('doc7_create', { vehiculoId: id, condicion, ...formData })
    - El cambio de condicion_tecnica en Zustand ya es visible localmente (PASO 1)
    - La transición forzada de PASO 1.5 (si aplicó) también queda en Zustand localmente
      y se encolará como 'vehiculo_estado_update' con { estado: 'estacionado', motivo: 'inoperativo_critico' }

    DIRECTIVA DE BALIZAMIENTO FÍSICO (ejecutar INMEDIATAMENTE tras encolar):
      Si formData.gravedad === 'Grave':
        → Modal rojo a pantalla completa, bloqueante — no puede cerrarse ni ignorarse:

          ┌─────────────────────────────────────────────────────────────┐
          │  ⛔ BLOQUEO NO PROPAGADO AL SERVIDOR                        │
          │                                                             │
          │  El vehículo consta como OPERATIVO para el resto de la red. │
          │  El sistema no pudo notificar el fallo crítico porque el    │
          │  terminal no tiene conexión.                                │
          │                                                             │
          │  Es OBLIGATORIO:                                            │
          │  1. Colocar un cartel físico o baliza en el volante.        │
          │  2. Recuperar la conexión inmediatamente.                   │
          │     El bloqueo global se propagará al reconectar.           │
          │                                                             │
          │  [ He colocado la baliza — Entendido ]                      │
          └─────────────────────────────────────────────────────────────┘

        El modal solo se cierra al pulsar "He colocado la baliza — Entendido".
        Una vez cerrado, el terminal queda en modo de operación degradada normal.
        Al recuperar conexión, el Service Worker replaya el Doc-7 y el bloqueo
        global se propaga automáticamente vía Realtime.

      Si formData.gravedad !== 'Grave' (Leve / Moderado):
        No se muestra el modal de balizamiento.
        El comportamiento offline es idéntico al flujo normal encolado.

    - Al reconectar:
        → useOfflineQueue replaya el Doc-7 → INSERT en Supabase
        → Replaya el cambio de estado_operativo → UPDATE en Supabase
        → Si condicion = 'inoperativo_critico':
            Realtime propaga el bloqueo global a todos los terminales
        → Auditoría del acceso offline registrada (ver logic.md §25)
```

**`setTipoServicio`**

```
1. Cierra el bloque de tipo_servicio activo con timestamp_fin en Doc-8
2. Abre nuevo bloque: { tipo_servicio, timestamp_inicio }
3. useVehiculoStore[id].tipoServicio = tipo
Nota: visible solo mientras estadoOperativo ≠ 'desactivado'
```

**`forzarCheckoutAdministrativo`** *(RBAC: coordinación, gerencia — solo desde panel de coordinación/flota)*

```
PRECONDICIONES:
  - El llamador tiene JWT con rol 'coordinación' o 'gerencia'
  - pilotId tiene estado 'pilot' activo sobre vehiculoId
  - kmFin > km_inicio del Doc-8 activo (validación en servidor)

FLUJO:
1. Modal de confirmación con reautenticación:
   "Vas a forzar el checkout de [pilotId] en [vehiculoId].
    Introduce tu contraseña de coordinador para confirmar."
   Campo: password (coordinadorId)
   [ Confirmar ] [ Cancelar ]

2. RPC `forzar_checkout_administrativo(p_vehiculo_id, p_pilot_id, p_km_fin,
                                        p_coordinador_id)`:
   a. Valida JWT del coordinador (RBAC guard en servidor)
   b. UPDATE vehiculos:
        pilot_id = NULL,
        estado_operativo = 'en_espera'
   c. UPDATE doc8_partes_trabajo:
        km_fin = p_km_fin,
        estado = 'Enviado_Cerrado',
        timestamp_fin = NOW(),
        cerrado_por_admin_id = p_coordinador_id   -- FK fichas_empleados; null = cierre normal
   d. INSERT en auditoria_rbac:
        { tipo_evento: 'checkout_forzado', id_nombre: p_coordinador_id,
          metadata: { vehiculo_id, pilot_id, km_fin, doc8_id } }
   e. Notificación a bandeja_entrada_coordinacion:
        "Checkout administrativo aplicado: [pilotId] retirado de [vehiculoId]
         por [coordinadorId]. km_fin registrado: [kmFin]."

3. useVehiculoStore[vehiculoId]:
   - pilot = null
   - estadoOperativo = 'en_espera'
4. Toast al coordinador: "Checkout administrativo completado."

NOTA: Este flujo no ejecuta flujo_checkout_automatico — es una escritura directa
de servidor que elude los controles del terminal del pilot. No se purgan borradores
locales en el terminal fantasma (esos se resuelven al reconectar).
Ver logic.md §42 para la especificación SQL completa.
```

**`quitarPersona`** — Enrutamiento de Deserción y Transición Intra-DRP

```
El comportamiento varía según si el vehículo está o no en un DRP activo,
y según el origen de la acción (checkout vs desemparejamiento manual).

CASO SIMPLE — vehículo sin DRP activo:
  → Desempareja normal: useVehiculoStore[vehiculoId].carry = null
  → Si vehículo queda sin pilot: estadoOperativo = 'en_espera'

CASO COMPLEJO — vehículo en DRP activo (drpId != null):

  La acción proviene del CHECKOUT (checkout):
    → Flujo gestionado por useCheckin.checkout CASO B paso 0
    → auto-inyecta timestamp_salida_drp antes de desemparejar
    → quitarPersona se llama después sin bifurcación adicional

  La acción proviene de DESEMPAREJAMIENTO MANUAL (icono − en UI):
    → BLOQUEO INMEDIATO: no ejecutar la acción todavía
    → Modal imperativo (no cancelable sin elegir opción):

      ┌─────────────────────────────────────────────────────────┐
      │  ¿Qué ocurre con [ID_nombre] en el DRP [nombre_drp]?   │
      │                                                         │
      │  [ A: Abandonar el dispositivo ]                        │
      │    Sale del DRP. Su participación queda registrada      │
      │    hasta este momento.                                   │
      │                                                         │
      │  [ B: Permanecer como personal a pie ]                  │
      │    Sigue operativo en el DRP sin vehículo asignado.     │
      │    Su cómputo de horas no se interrumpe.                │
      └─────────────────────────────────────────────────────────┘

    OPCIÓN A — Abandonar DRP:
      1. RPC registrar_salida_drp_individual(drpId, ID_nombre)
         (liquida en AMBAS tablas — ver logic.md §11.5)
      2. Desempareja del vehículo (normal)
      3. usePersonaStore[ID_nombre].esCarry = false

    OPCIÓN B — Permanencia Intra-DRP (Transferencia Relacional Atómica):
      1. RPC transferir_carry_a_personal_a_pie(drpId, ID_nombre, vehiculoId):
           a. SELECT timestamp_entrada_drp original desde drp_dotaciones
           b. DELETE de drp_dotaciones (sale de la dotación vehicular)
           c. INSERT en drp_personal_a_pie con timestamp_entrada_drp HEREDADO
              (el cómputo de horas no se interrumpe — conserva su entrada original)
         → Ver logic.md §46 para el SQL completo
      2. Desempareja del vehículo (el ID_nombre ya no está ligado al vehículo)
      3. usePersonaStore[ID_nombre].esCarry = false
         (queda disponible para emparejarse a otro vehículo del DRP si lo desea)
      4. El ID_nombre sigue visible en `visor_drp → Personal a pie`
         con su timestamp_entrada_drp original preservado

NOTA DE PROPAGACIÓN: ambas opciones emiten Realtime al canal drp:{drpId}
para que todos los terminales del DRP actualicen la vista de dotaciones.
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

   RESTRICCIÓN DE EXCLUSIVIDAD GEOGRÁFICA (nivel motor):
     El índice parcial `uq_vehiculo_drp_activo` (ver logic.md §44) garantiza
     que un vehículo solo puede tener una fila activa (timestamp_salida_drp IS NULL)
     en drp_dotaciones. Si el INSERT viola el índice (code '23505'):
       → throw Error('vehiculo_ya_desplegado_en_drp')
       → Toast: "El vehículo ya se encuentra desplegado en otro dispositivo activo."
       → El formulario de selección de dotación permanece abierto
       → Solo el vehículo en conflicto se elimina de la selección;
         los ID_nombre emparejados no quedan afectados

4. Si DRP estaba 'En_espera' y es la primera dotación:
   - DRP → 'En_preparacion' (trigger automático en BBDD o RPC)
   - timestamp_inicio_preparacion = NOW()
```

**`salirIndividual`** y **`exitarDRP`** — Liquidación Universal de Salida

```
LIQUIDACIÓN UNIVERSAL: la RPC de salida aplica `timestamp_salida_drp = NOW()`
a AMBAS tablas para el `ID_nombre` que sale, independientemente de cómo entró al DRP.

RPC `registrar_salida_drp_individual(p_drp_id, p_id_nombre)`:
  -- Tabla 1: drp_dotaciones (entró con vehículo o como acompañante)
  UPDATE drp_dotaciones
     SET timestamp_salida_drp = NOW()
   WHERE drp_id    = p_drp_id
     AND id_nombre = p_id_nombre
     AND timestamp_salida_drp IS NULL;   -- idempotente

  -- Tabla 2: drp_personal_a_pie (entró a pie, puede coexistir con dotación vehicular
  --          si la persona participó en ambas modalidades en distintos momentos)
  UPDATE drp_personal_a_pie
     SET timestamp_salida_drp = NOW()
   WHERE drp_id    = p_drp_id
     AND id_nombre = p_id_nombre
     AND timestamp_salida_drp IS NULL;   -- idempotente

Nota: ambos UPDATEs se ejecutan SIEMPRE — si el ID_nombre no tiene fila en una de
las tablas, el UPDATE afecta 0 rows y no lanza error. Esto garantiza que un ID_nombre
que participa en ambas modalidades (poco frecuente, pero posible en DRPs largos con
rotación de roles) quede completamente liquidado en una sola llamada.

`salirConVehiculo(drpId, vehiculoId)`:
  → Llama registrar_salida_drp_individual para CADA ID_nombre emparejado al vehículo
  → Además: timestamp_salida_drp para el ID_vehiculo en drp_dotaciones

`exitarDRP(vehiculoId, 'con_vehiculo')`:
  → Llama salirConVehiculo

`exitarDRP(vehiculoId, 'individual')`:
  → Llama salirIndividual solo para el ID_nombre del pilot (sin el vehículo)
```

**`finalizarDRP`**

```
GUARD 0 — Pacientes clínicos activos (ejecutar PRIMERO, ver logic.md §12):
  SELECT count(*) FROM filiacion_pacientes
   WHERE filiacion_id IN (
     SELECT id FROM modulo_filiacion WHERE drp_id = drpId
   )
     AND estado IN ('en_espera', 'en_consulta')
  Si count > 0:
    throw Error('drp_con_pacientes_activos')
    → UI: "No es posible finalizar el DRP. Existen [N] paciente(s) activos
           (en espera o en consulta) sin dar de alta. Completa la atención
           o libera los boxes antes de cerrar el dispositivo."
    → No hay bypass para este error — requiere alta clínica real.

GUARD 1 — Doc-10 en tránsito hacia este DRP (ejecutar primero, ver logic.md §12):
  Si EXISTS (SELECT 1 FROM doc10 WHERE drp_destino_id = drpId AND estado = 'Pendiente_Validacion'):
    throw Error('drp_con_transferencias_pendientes')
    → UI: "Imposible finalizar el dispositivo. Existen transferencias de material
           en tránsito sin recepcionar."

GUARD 2 — sync_pending en subinventarios:
  Si algún subinventario del DRP tiene sync_pending = true:
    throw Error('drp_con_sync_pendiente')

FLUJO PRINCIPAL:
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

  → Si OK:
    La cancelación ejecuta un borrado en cascada estricto en este orden:

    1. PURGA DE PACIENTES EN ESPERA (módulos filiación adheridos al DRP):
       Para cada módulo_filiacion con drp_id = drpId:
         DELETE FROM filiacion_pacientes
          WHERE filiacion_id = moduloFiliacionId
            AND estado = 'en_espera'
         (pacientes admitidos pero no atendidos — eliminados incondicionalmente)
         Nota: pacientes en estado 'en_consulta' o 'archivado' habrían generado
         asistencias en Doc-1, lo que habría bloqueado la cancelación en la precondición.
         Por tanto, al llegar aquí solo pueden existir pacientes en 'en_espera'.

    2. CIERRE Y BORRADO EN CASCADA DE MÓDULOS SECUNDARIOS:
       Para cada módulo_filiacion con drp_id = drpId:
         DELETE módulo_filiacion (cascade al registro del módulo)
       Para cada módulo_psa con drp_id = drpId:
         DELETE módulo_psa (cascade a sus registros de dotación terrestre)
       Nota: al no haberse producido actividad, no se generan timestamps de cierre —
       el borrado es destructivo, no un cierre controlado.

    3. PURGA DE SUBINVENTARIOS (RETROCESO DE SNAPSHOT):
       Para cada subinventario con drp_id = drpId:

       CASO A — estado = 'Asignado' (nunca salió de base):
         a. UPDATE subinventarios SET estado = 'Operativo', drp_id = NULL
            (reversión directa — sin pasar por En_Transito, ver logic.md §12.1)
         b. DELETE FROM snapshots_reconciliacion
            WHERE subinventario_id = $1 AND estado = 'pendiente'

       CASO B — estado = 'Operativo_Condicionado' (llegó vía transferencia):
         a. UPDATE subinventarios SET estado = 'En_Transito', drp_id = NULL
            (NO se puede ir a Operativo — este material tiene cadena de transferencia activa)
         b. UPDATE snapshots_reconciliacion
               SET estado = 'pendiente'
             WHERE subinventario_id = $1
               AND estado = 'resuelto_por_transferencia'
            (reactiva el snapshot que fue "resuelto" cuando el material llegó a este DRP —
             la transferencia queda de nuevo pendiente de reconciliación logística)

    4. DELETE DRP, dotaciones asociadas y Doc-1 sin asistencias.

    Ver logic.md §12.1 para la tabla comparativa Cancelar vs Finalizar y la
    justificación de la reversión directa a Operativo.
```

**`activarDRP`** — si hora actual < hora programada:

```
Modal: "¿Cuenta atrás o Marcar hora actual?"
  'cuenta_atras' → DRP pasa a 'En_curso', UI muestra countdown
  'ahora'        → timestamp_inicio_curso = NOW()
```

**`crearDRP`**

```
Ejecuta la creación completa del DRP en una única transacción de base de datos.

FLUJO:
1. Validaciones locales (frontend):
   - nombre_drp, fecha, hora, ubicacion: campos obligatorios
   - Los ID_vehiculo seleccionados son del tipo Combobox filtrado
     (selector_vehiculo_drp) — el filtrado ya excluyó los inoperativos/en_curso

2. Llamada RPC 'crear_drp_atomico(input)' — transacción atómica:

   a. INSERT DRP principal:
        { nombre_drp, fecha, hora, ubicacion, estado: 'En_espera', timestamp_creacion: NOW() }

   b. Para cada dotacion_vehiculo:
        INSERT en drp_dotaciones ({ drp_id, id_vehiculo, id_nombre, ubicacion })

   c. Para cada dotacion_terrestre:
        INSERT en drp_dotaciones ({ drp_id, id_nombre, ubicacion })

   d. ASIGNACIÓN ATÓMICA DE SUBINVENTARIO (si backpack_id presente):
        UPDATE subinventarios
           SET estado = 'Asignado',
               drp_id = drp_id_generado
         WHERE id     = backpack_id
           AND estado = 'Operativo';   -- ← GUARDA ATÓMICA

        GET DIAGNOSTICS v_filas = ROW_COUNT;

        IF v_filas = 0 THEN
          ROLLBACK;   -- el subinventario ya fue asignado por otro proceso
          RAISE EXCEPTION 'subinventario_ya_asignado'
            USING HINT = '409';
        END IF;

        -- Si v_filas = 1 → continuar normalmente

   e. RETURN drp_id del DRP recién creado

3. Manejo de errores en frontend:

   Si RPC devuelve error con mensaje = 'subinventario_ya_asignado' (hint '409'):
     throw Error('subinventario_ya_asignado')
     → Modal/toast de error:
       "El subinventario seleccionado acaba de ser asignado a otro DRP.
        Selecciona otro subinventario e inténtalo de nuevo."
     → El formulario de crear_drp permanece abierto con los datos introducidos.
       Solo el campo backpack_id se limpia para que el usuario seleccione uno nuevo.
     → NO se crea ningún registro (la transacción fue revertida por la RPC).

4. Si RPC éxito:
   → usedrpStore.drpActivos = [...drpActivos, nuevoDRP]
   → Toast: "DRP [nombre] creado correctamente."
   → Cierra el formulario crear_drp
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
  sync_pending:          boolean        // true → delta descontado localmente aún no confirmado por RPC
  pending_delta:         number         // cantidad descontada pendiente de reconciliar (positivo = descuento)
  pending_mutation_uuid: string | null  // UUID de la mutación en vuelo — para filtro de eco Realtime
}

interface UseInventario {
  // Consultas (TanStack Query para stock_real; Zustand para stock_real_local)
  stockPorLocation: (locationId: string) => StockItem[]
  stockItem:        (locationId: string, itemId: string) => StockItem | undefined
  descuadres:       Descuadre[]
  enTransito:       ItemTransito[]
  subinventariosEstado: Map<string, 'Operativo' | 'Operativo_Condicionado' | 'Asignado' | 'En_Transito'>

  // Guard: detecta gastos pendientes de sincronización en un subinventario
  tieneSyncPendiente(subinventarioId: string): boolean
    // Evalúa si algún StockItem del subinventario tiene sync_pending = true.
    // Llamado por useDRP antes de finalizar el DRP y antes de ceder un subinventario.
    // Ver logic.md §9.1 y §12 para el flujo completo del guard.

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

  CASO A — item_id EXISTE en la caché del store local (flujo estándar):
    - Precheck: stock_real_local >= cantidad (validación visual)
    - Si falla precheck → throw Error('stock_insuficiente_local') sin llamar RPC
    - Si OK:
      · stock_real_local -= cantidad
      · sync_pending = true
      · pending_delta = cantidad
      · UI muestra badge '⏳ sincronizando' en el item

  CASO B — item_id NO tiene entrada en la caché local (proxy negativo):
    El item puede existir en el servidor pero no haber sido cargado en el store
    (terminal recién activado, caché vaciada, item nuevo no visto aún).
    El sistema NO debe bloquear la operatividad del clínico.

    → Crear objeto proxy temporal en el store:
        {
          itemId:           item_id,
          stock_real:       0,         // valor desconocido — placeholder
          stock_real_local: 0 - cantidad,   // proxy negativo: 0 - N = -N
          stock_objetivo:   0,
          sync_pending:     true,
          pending_delta:    cantidad,
          es_proxy:         true        // flag interno — nunca mostrado al usuario
        }
    → UI muestra el item con:
        · Cantidad descontada local: -N (valor puede ser negativo)
        · Badge "⏳ sincronizando" (mismo que CASO A)
        · NO se muestra alerta de stock negativo — el valor negativo es conocido
          como artefacto del proxy y se corregirá en PASO 3
    → Nota clínica: el operador puede seguir registrando el gasto. La validación
      real de suficiencia de stock la ejecuta el servidor en PASO 2.
    → NO se realiza precheck de suficiencia en CASO B (no hay dato local fiable)

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
       (el servidor devuelve el stock_real DESPUÉS del descuento)
     · stock_real_local = stock_real  (sincronizado — corrige proxy negativo si aplica)
     · es_proxy = false (si era proxy, se elimina el flag)
     · sync_pending = false, pending_delta = 0
     · Badge '⏳ sincronizando' desaparece
     · Invalida TanStack Query cache para locationId
     · Nota proxy: si stock_real_local era negativo (-N), se reemplaza
       directamente con el valor correcto del servidor. No hay animación
       de "corrección" — el cambio es silencioso y transparente.

  B. RPC error 'stock_insuficiente' (race condition con otro terminal):
     · Si CASO A (stock conocido): REVERTIR stock_real_local += pending_delta
     · Si CASO B (proxy): ELIMINAR el objeto proxy del store
         (el gasto no pudo ejecutarse — no hay estado local que revertir)
     · sync_pending = false, pending_delta = 0
     · throw Error('stock_insuficiente') → UI muestra aviso

  C. RPC error de red (timeout / offline):
     · stock_real_local permanece decrementado (badge persiste)
       (si era proxy, el valor negativo persiste hasta reconectar)
     · sync_pending = true
     · Encola reintento via useOfflineQueue ('doc6_metadata')
     · Al reconectar: useOfflineQueue replaya → PASO 2 y 3
       El servidor ejecuta el descuento sobre el valor real, devuelve
       el nuevo stock_real, y PASO 3-A corrige el proxy automáticamente.

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
GUARDA PREVIA — estado del subinventario de destino (ver logic.md §7.1.2):
  La RPC verifica el estado del subinventario de destino ANTES de sumar stock.
  Si estado ∈ { 'En_Transito', 'Operativo_Condicionado' }:
    → RPC lanza error 422 'destino_no_apto_para_recepcion'
    → Frontend muestra modal de Redirección Forzosa — no cancelable:
        [ Redirigir al almacén central ] — suma al almacén base + Doc-10 → 'Redirigido_Por_Cierre_Destino'
        [ Mantener en tránsito ] — Doc-10 permanece en 'Pendiente_Validacion'

Si destino es apto (estado = 'Asignado'):
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

### Reconciliación Bidireccional de Store — handler Realtime

El canal Realtime para `inventario:{locationId}` puede entregar actualizaciones de
`stock_real` desde el servidor en cualquier momento (otro terminal registró un gasto,
o llegó una transferencia). El handler **no puede sobrescribir ciegamente** el campo
`stock_real_local` con el valor del servidor — eso borraría cualquier delta optimista
pendiente de sincronización local.

**Regla de reconciliación:**

```typescript
// Handler Realtime en useInventarioStore
supabase.channel(`inventario:${locationId}`)
  .on('postgres_changes', { event: 'UPDATE', table: 'stock_items' }, (payload) => {
    const { item_id, stock_real: server_value, mutation_uuid } = payload.new

    set((state) => {
      const item = state.items[locationId]?.[item_id]
      if (!item) return {}  // item no cargado en store — ignorar

      // FILTRO DE ECO: ignorar eventos originados por este mismo terminal
      // cuando hay un sync_pending activo para ese ítem.
      // Confiar exclusivamente en la respuesta HTTP del propio RPC (PASO 3-A).
      if (item.sync_pending && mutation_uuid && item.pending_mutation_uuid === mutation_uuid) {
        return {}  // eco de mi propia mutación — ignorar; el RPC ya actualizará
      }

      const pending = item.sync_pending ? item.pending_delta : 0

      return {
        items: {
          ...state.items,
          [locationId]: {
            ...state.items[locationId],
            [item_id]: {
              ...item,
              stock_real:       server_value,
              // Recalcula el valor local preservando el delta pendiente:
              stock_real_local: server_value - pending,
              // sync_pending y pending_delta no se tocan — se resuelven en PASO 3
            },
          },
        },
      }
    })
  })
  .subscribe()
```

**Filtro de eco:** cada mutación de stock local almacena su `mutation_uuid` en
`item.pending_mutation_uuid` (generado con `crypto.randomUUID()` al encolar).
La columna `mutation_uuid` debe incluirse en los eventos Realtime mediante la
configuración de la publicación de PostgreSQL:

```sql
-- Asegura que mutation_uuid viaja en el payload de Realtime
ALTER PUBLICATION supabase_realtime
  SET TABLE stock_items (item_id, stock_real, mutation_uuid, updated_at);
```

Cuando el Realtime devuelve un UPDATE con el mismo `mutation_uuid` que el
`pending_mutation_uuid` local, el evento se descarta — la respuesta HTTP del
propio RPC ya actualizó el estado en PASO 3-A con el valor autoritativo del servidor.

**Invariante:** `stock_real_local = stock_real - pending_delta` mientras `sync_pending = true`.
Cuando el RPC propio confirma (PASO 3-A), `stock_real` se actualiza con el valor del servidor
y `pending_delta` se pone a `0` — la invariante se satisface trivialmente.

**Justificación:** sin filtro de eco + reconciliación, una actualización Realtime (propia
o de otro terminal) durante un ciclo optimista sobreescribiría el delta pendiente del usuario
activo. Ver `logic.md §24.5` para el modelo formal.

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

```typescript
// Acciones relevantes del store (Zustand)
interface BandejasStoreActions {
  upsertMensaje(instancia: BandejaInstancia, mensaje: Mensaje): void
  // Mutación optimista síncrona para modo isReadOnly auto-dismiss:
  purgeMensaje(mensajeId: string): void
  // Efecto: elimina el mensaje del array Y decrementa unreadCount en el mismo tick
  // GC local de mensajes archivados:
  purgarArchivadasExpiradas(): void
  // Elimina del array en memoria los mensajes en Solucionada_Archivada cuyo
  // timestamp_resolucion es > 24 horas. Llamado en el montaje y cada hora via setInterval.
}
```

**Sliding Window — máximo 200 mensajes por instancia:**

```typescript
upsertMensaje: (instancia, mensaje) =>
  set((state) => {
    const existing = state.mensajes[instancia] ?? []
    const idx      = existing.findIndex(m => m.id === mensaje.id)
    let   updated  = idx >= 0
      ? existing.with(idx, mensaje)          // actualización in-place
      : [...existing, mensaje]               // append

    // Limitar a 200 mensajes: truncar los más antiguos por timestamp
    if (updated.length > 200) {
      updated = updated
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 200)
    }

    return { mensajes: { ...state.mensajes, [instancia]: updated } }
  })
```

**GC local — purga de archivadas expiradas (> 24 h):**

```typescript
purgarArchivadasExpiradas: () =>
  set((state) => {
    const LIMITE_MS = 24 * 60 * 60 * 1000
    const ahora     = Date.now()
    const filtradas: typeof state.mensajes = {}

    for (const [instancia, mensajes] of Object.entries(state.mensajes)) {
      filtradas[instancia] = mensajes.filter(m => {
        if (m.estado !== 'Solucionada_Archivada') return true
        const resolucion = m.timestamp_resolucion
          ? new Date(m.timestamp_resolucion).getTime()
          : 0
        return ahora - resolucion < LIMITE_MS
      })
    }
    return { mensajes: filtradas }
  })
```

El historial completo permanece en Supabase. La purga local solo afecta al array
en memoria de Zustand — reduce la presión de RAM en DRPs de larga duración.

**Comportamiento de `purgeMensaje`:**

```typescript
purgeMensaje: (mensajeId) =>
  set((state) => {
    const mensaje = state.mensajes.find(m => m.id === mensajeId)
    const eraNoLeido = mensaje && mensaje.estado === 'Emitida_Pendiente'
    return {
      mensajes:    state.mensajes.filter(m => m.id !== mensajeId),
      unreadCount: eraNoLeido ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }
  })
```

**Llamada en el cierre del modal `isReadOnly`:**

```typescript
// En flujos_transicion, handler onClose del modal:
const handleCloseReadOnly = () => {
  useBandejasStore.getState().purgeMensaje(mensaje.id)
  // La persistencia en DB se lanza en fire-and-forget:
  marcarLeida(mensaje.id).catch(() => {/* fallo silencioso — purga ya aplicada */})
  closeModal()
}
```

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
  mode:         'normal' | 'degraded'  // Gap C1 — degraded = polling fallback activo
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

**Degraded mode — polling fallback (Gap C1):**

```
DISPARO: onClose o error del WebSocket del canal Supabase Realtime.

Al detectar la desconexión:
  → mode = 'degraded'
  → isConnected = false
  → Se suspenden todos los canales activos excepto los críticos

CANALES CRÍTICOS (siguen vivos en polling — intervalo 30 s):
  - global:alertas_criticas    → SELECT * FROM doc11_avisos ORDER BY timestamp_publicacion DESC LIMIT 10
  - vehiculo:{id}              → SELECT condicion_tecnica, estado_operativo FROM vehiculos WHERE id = {id}

CANALES SUSPENDIDOS en degraded (sin polling — esperan reconexión WS):
  - coordinacion:flota
  - terminal:{device_id}:precache
  - Cualquier otro canal de bandeja o inventario

RECONEXIÓN:
  → Reintentos exponenciales del WS: 1s, 2s, 4s, 8s, 16s (máx 30s)
  → Al restaurar el WS: mode = 'normal', isConnected = true
  → Re-fetch del estado completo vía TanStack Query (puede haber eventos perdidos)
  → Polling de canales críticos se detiene — vuelven a escuchar el WS

INDICADOR EN UI:
  mode = 'degraded' → banner amarillo discreto: "Modo desconectado — actualizaciones limitadas"
  Desaparece al restaurar mode = 'normal'
```

```typescript
// Implementación interna del polling de canales críticos en degraded_mode
const POLLING_INTERVAL_MS = 30_000

useEffect(() => {
  if (mode !== 'degraded') return
  const timer = setInterval(() => {
    criticalChannels.forEach(ch => ch.poll())
  }, POLLING_INTERVAL_MS)
  return () => clearInterval(timer)
}, [mode])
```

### Stores: `useGlobalStore` (isOnline, realtimeMode)

### Nota: Solo para uso interno de otros hooks. No instanciar en componentes

---

## 9. useOfflineQueue

> Gestiona la cola de mutaciones para soporte offline-first.
> Persiste en IndexedDB. Reproduce en orden FIFO al recuperar conexión.
> Solo para operaciones aptas para cola (ver `logic.md §17`).

```typescript
interface Mutation {
  id:                UUID                   // crypto.randomUUID()
  tipo:              string                 // 'doc2_create' | 'doc1_asistencia' | etc.
  payload:           unknown
  timestamp:         ISOString
  intentos:          number
  estado:            'pendiente' | 'enviando' | 'fallido'
  errorMsg?:         string
  parentMutationId?: UUID
  // Si está definido: esta mutación depende de que la mutación padre se haya
  // procesado con éxito. Si el padre falla, esta mutación se marca como 'fallido'
  // automáticamente sin intentar el envío.
  // Ejemplo: una mutación 'doc6_metadata' que referencia el UUID de un 'doc6_create'.
}

interface UseOfflineQueue {
  // Estado
  isOnline:            boolean
  pendingCount:        number
  failedCount:         number
  hasFailed:           boolean
  hasCriticalPending:  boolean   // true si pendingCount > 0 y !isOnline en el momento del checkout

  // Acciones
  enqueue(tipo: string, payload: unknown, parentMutationId?: UUID): UUID
  // Si parentMutationId está definido, esta mutación no se enviará si el padre falla.
  procesarCola(): Promise<void>        // llamado automáticamente al reconectar
  reintentarFallidos(): Promise<void>
  descartarFallido(mutationId: UUID): void
  asumirAutoriaYReenviar(mutationId: UUID, nuevoAutor: ID_nombre): Promise<void>
  // Sobrescribe payload.ID_nombre_registrador con nuevoAutor y reencola la mutación.
  // Solo disponible en mutaciones fallidas con payload que contenga ID_nombre_registrador.
  clearJwtAfterSync(): void
  // Llamado internamente cuando pendingCount === 0 tras retención post-checkout.
  // Ejecuta: useBackgroundSyncStore.liberarJwt() + useAuthStore.clearJwt()
  // Nunca afecta la sesión activa de otro usuario.
}
```

### Comportamiento

**`enqueue`**

```
1. Genera id = crypto.randomUUID()
2. INSERT en IndexedDB ('mutation_queue' store):
   { id, tipo, payload, parentMutationId?, timestamp: NOW(), intentos: 0, estado: 'pendiente' }
3. Si isOnline → dispara procesarCola() inmediatamente
4. Retorna id para tracking (el llamador puede usarlo como parentMutationId de mutaciones hijas)
```

**`procesarCola`** (FIFO, estrictamente secuencial y dependiente)

```
1. Lee mutaciones en orden timestamp ASC de IndexedDB
2. Para cada mutación en estado 'pendiente':

   a. GUARDIA DE DEPENDENCIA (ejecutar antes de procesar):
      Si mutacion.parentMutationId != null:
        padre = IndexedDB.get(parentMutationId)
        Si padre.estado = 'fallido':
          → mutacion.estado = 'fallido'
          → mutacion.errorMsg = 'padre_fallido: ' + parentMutationId
          → SKIP — no intentar el envío
          → Propagar en cascada: buscar todas las mutaciones en la cola
            donde parentMutationId = mutacion.id → marcarlas como 'fallido' también
          → Continuar con la siguiente mutación de la cola
        Si padre.estado = 'pendiente' o 'enviando':
          → DETENER el procesamiento de la cola aquí
            (el padre aún no ha sido procesado — esperar a la siguiente iteración)

   b. Marca como 'enviando'
   c. Ejecuta la mutación contra Supabase con el JWT del ejecutor
      (crearClienteConJwt(mutacion.payload.jwt) — ver logic.md §34.5)
   d. Si éxito (HTTP 2xx) → DELETE de IndexedDB

      IDEMPOTENCIA PK — doc1_asistencia (error 23505 unique_violation):
        Si error.code === '23505' AND mutacion.tipo === 'doc1_asistencia':
          → Tratar como éxito idempotente: DELETE de IndexedDB sin reintentar
          → UPDATE doc1_asistencias SET synced = true WHERE id = mutacion.payload.asistencia_id
          → CONTINUAR — la asistencia ya estaba en Supabase; no es un error real

   e. Si fallo HTTP 4xx/5xx:

      RAMA ESPECIAL — Gasto con stock insuficiente (doc6_metadata):
        Si mutacion.tipo === 'doc6_metadata' AND error.code === 'stock_insuficiente':
          → NO incrementar intentos ni marcar como 'fallido'

          IDEMPOTENCIA (pre-check antes de rellamar RPC):
            Consultar `descuadres_inventario WHERE mutation_uuid = mutacion.id`
            Si ya existe → DELETE de IndexedDB directamente (el RPC ya se ejecutó)
                            y CONTINUAR (no rellamar la RPC)

          → Llamar RPC `forzar_gasto_con_descuadre` con el mismo payload:
              { location_id, item_id, cantidad, terminal_id, mutation_uuid: mutacion.id }
              (Ver logic.md §47 para la especificación SQL completa)
          → Si RPC tiene éxito:
              DELETE de IndexedDB (mutación resuelta como descuadre)
              El stock_real en Supabase puede quedar negativo — corrección delegada
              a logística. El Realtime handler de useInventario reconcilia el store local
              con el nuevo valor real recibido del servidor (invariant §24.5 se mantiene).
              Bandeja logística recibe alerta vía trigger automático (ver logic.md §47.3).
          → Si RPC falla:
              Tratar como fallo genérico (rama estándar a continuación)
          → CONTINUAR con la siguiente mutación (no detener la cola)

      RAMA ESTÁNDAR:
      - intentos++
      - estado = 'pendiente'  (reintenta indefinidamente — sin límite automático)
        → Solo se marca 'fallido' por: cascada de dependencia O descarte manual del usuario
      - PROPAGACIÓN DE FALLO EN CASCADA:
          Buscar en IndexedDB todas las mutaciones donde parentMutationId = mutacion.id
          → Para cada una: estado = 'fallido', errorMsg = 'padre_fallido: ' + mutacion.id
          → Recursivo: propagar a los hijos de los hijos (árbol de dependencias completo)
      - DETENER el procesamiento de la cola para evitar colisiones relacionales
        (las mutaciones posteriores que no son hijos continúan en la siguiente llamada)

3. Actualiza pendingCount y failedCount en store
```

**`asumirAutoriaYReenviar`**

```
Propósito: en terminales compartidos, una mutación puede quedar fallida con el
ID_nombre_registrador del usuario original (que ya hizo checkout). Usuario B
(actual operador) puede asumir la autoría del documento y reenviarlo bajo su
propia identidad, utilizando su propio JWT.

PRECONDICIONES (verificar antes de ejecutar):
  1. mutacion.estado = 'fallido'
  2. mutacion.payload.ID_nombre_registrador !== undefined
     (solo documentos autoriales — no cambios de estado ni eventos de sistema)
  3. nuevoAutor ∈ useAuthStore.jwtMap  (el asumidor tiene sesión activa en el terminal)

FLUJO:
  1. Lee la mutación de IndexedDB por mutationId
  2. Valida las precondiciones (lanza error si no se cumplen)
  3. Sobrescribe en IndexedDB:
       mutacion.payload.ID_nombre_registrador = nuevoAutor
       mutacion.payload.jwt = useAuthStore.getJwtFor(nuevoAutor)
         (el JWT del nuevo autor se inyecta para que procesarCola use sus credenciales)
       mutacion.estado = 'pendiente'
       mutacion.intentos = 0
       mutacion.errorMsg = undefined
  4. Si isOnline → dispara procesarCola() inmediatamente

SEGURIDAD:
  - El JWT del autor original (que pudo haber sido el JWT congelado) no se reutiliza.
  - nuevoAutor debe tener sesión activa (jwtMap) — no puede ser un ID_nombre arbitrario.
  - La asunción queda auditable: el documento en Supabase llevará el ID_nombre_registrador
    del nuevo autor y el timestamp real de inserción (no el timestamp offline original).
    El timestamp_original_offline se conserva como campo secundario si el payload lo incluye.

UI (vista de mutaciones fallidas en la cola):
  Por cada mutación fallida:
    [ Reintentar ] [ Descartar ]
    Si payload.ID_nombre_registrador existe:
      [ Asumir Autoría y Reenviar ]   ← botón adicional (color ámbar)
  Al pulsar "Asumir Autoría y Reenviar":
    Modal: "Vas a reasumir este documento como [nuevoAutor].
            El registro quedará firmado con tu identidad.
            ¿Confirmar?"
    [ Confirmar ] [ Cancelar ]
```

**Borrado optimista de borradores offline:**

Si `isOnline === false`, el descarte/borrado de un borrador **no intenta consultar
Supabase**. Limpia el store local síncronamente y encola una mutación especial:

```typescript
// En useDocumentosStore.descartarBorrador()
if (!useOfflineQueue.getState().isOnline) {
  // 1. Limpiar en memoria inmediatamente (optimista)
  useDocumentosStore.getState().eliminarBorrador(draftId)
  // 2. Encolar para que el SW lo purgue al reconectar
  useOfflineQueue.getState().enqueue('purge_drafts', {
    draftId,
    tipo_documento,
    timestamp_descarte: ahora(),
  })
  return
}
// Si online → DELETE directo a Supabase
```

El tipo `purge_drafts` se procesa en `procesarCola` con una llamada DELETE al
endpoint del draft correspondiente. No genera error si el draft ya no existe en
Supabase (idempotente).

---

**Detección de estado de red + Rehidratación al volver al foreground:**

El Background Sync de Service Worker no está garantizado en todos los sistemas
operativos (iOS Safari, algunos Android con batería). Como fallback, el hook
también dispara `procesarCola()` al detectar que la app vuelve al primer plano:

```typescript
useEffect(() => {
  const onOnline       = () => { setIsOnline(true);  procesarCola() }
  const onOffline      = () => { setIsOnline(false) }
  const onVisible      = () => {
    if (document.visibilityState === 'visible' && isOnline) {
      procesarCola()  // drenar cola al volver del fondo aunque el SW no lo hiciera
    }
  }

  window.addEventListener('online',  onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('online',  onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
  }
}, [isOnline])
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
| `doc7_create` | Informe de avería. `condicion_tecnica` ya aplicado optimistamente en Zustand. Al replay: Doc-7 persiste + bloqueo global si `inoperativo_critico`. **Si `gravedad = 'Grave'` y se encola offline: modal rojo de balizamiento físico obligatorio antes de continuar (ver §3 setCondicionTecnica CASO B — Directiva de Balizamiento Físico).** |
| `purge_drafts` | Borrado de borrador realizado offline. El SW ejecuta el DELETE al reconectar. Idempotente: si el draft ya no existe en Supabase, el error 404 se trata como éxito. |

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

**Estructura general de la base IndexedDB `u24_offline`:**

| Object Store | Clave primaria | Descripción |
|---|---|---|
| `mutation_queue` | `id` (UUID) | Cola de mutaciones pendientes (todos los tipos) |
| `document_drafts` | `id` (UUID) | Borradores de documentos en curso |
| `doc1_metadata` | `drp_id` (UUID) | Metadata del DRP para Doc-1 (un registro por DRP) |
| `doc1_asistencias` | `id` (UUID asistencia) | Asistencias individuales del Doc-1 (append-only) |

### Estructura Normalizada de Doc-1 en IndexedDB

**Problema con la serialización monolítica:**
Guardar Doc-1 como un único objeto `{ drp_id, metadata, asistencias: [...] }` implica
reescribir el array completo en IndexedDB cada vez que se añade una asistencia.
Con DRPs de alta afluencia (decenas de asistencias), esta reescritura crece linealmente
y puede causar contención en el hilo principal durante la serialización.

**Solución — dos object stores independientes:**

```
Object store: doc1_metadata
  Clave: drp_id (UUID)
  Campos: { drp_id, nombre_drp, fecha, hora, ubicacion, estado, timestamp_creacion }
  Acceso: un único registro por DRP — mutado solo en creación y cierre

Object store: doc1_asistencias
  Clave: id (UUID, crypto.randomUUID() en cliente)
  Índice secundario: drp_id (para listar todas las asistencias de un DRP)
  Campos: {
    id,               // UUID local — usado como mutation_uuid en cola
    drp_id,           // FK → doc1_metadata.drp_id
    synced,           // boolean: false hasta confirmación RPC
    timestamp_local,  // Date.now() en el cliente (no sustituye al server timestamp)
    registrador_id,   // ID_nombre del que registra
    p_filiacion,      // { nombre, edad, dni, ... }
    motivo,           // texto libre
    resolucion,       // texto libre
  }
  Acceso: append-only INSERT por cada asistencia nueva; nunca UPDATE del array
```

**Flujo de escritura — añadir asistencia:**

```
1. Usuario confirma el modal de nueva asistencia
2. crypto.randomUUID() → asistenciaId
3. INSERT en doc1_asistencias: { id: asistenciaId, drp_id, synced: false, ...campos }
   (solo este único registro — no se toca doc1_metadata)
4. useOfflineQueue.enqueue('doc1_asistencia', {
     asistencia_id: asistenciaId,
     drp_id, registrador_id, jwt, ...campos
   })
   → mutation_uuid = asistenciaId (idempotencia: si se reenvía, RPC detecta UUID duplicado)
5. Si isOnline → procesarCola() inmediatamente
6. Al éxito del RPC: UPDATE doc1_asistencias SET synced = true WHERE id = asistenciaId
```

**Lectura en UI:**

```typescript
// Obtener Doc-1 completo para un DRP (renderizado o exportación PDF)
const metadata    = await db.get('doc1_metadata', drpId)
const asistencias = await db.getAll('doc1_asistencias',
  IDBKeyRange.only(drpId),   // usando índice secundario drp_id
)
// asistencias ordena por timestamp_local ASC para presentación cronológica
```

**Ventajas:**

- Cada mutación escribe O(1) bytes independientemente del tamaño del Doc-1
- Las asistencias `synced: false` son exactamente las mutaciones pendientes —
  no requieren cruce con `mutation_queue` para saber qué falta confirmar
- La clave `asistenciaId` sirve como `mutation_uuid` para idempotencia en RPC

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
   - **Doc-9 (Entrada almacén)**: throw Error('doc9_requiere_conexion') —
     operación Online-Only. La inyección de nuevo stock primario al sistema
     requiere timestamp criptográfico del servidor para garantizar la
     integridad del inventario. Ver logic.md §33.
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

> Monitoriza la inactividad en terminales con sesión de emergencia (rol `invitado`).
> Si no hay interacción durante 20 minutos, fuerza la regresión a `estado_0`
> sin destruir la cookie de la BBDD. Ver `logic.md §26` para la justificación completa.
>
> **Implementación basada en deltas de tiempo absolutos** — no usa `setTimeout`.
> Esto garantiza la detección correcta cuando el SO pausa el navegador (tablet dormida):
> un `setTimeout` de 20 min se congela durante el sueño; `Date.now()` siempre avanza.

```typescript
interface UseIdleTimeout {
  // Estado (Zustand + persist en localStorage)
  isActivo:                 boolean    // true si el monitoreo está en marcha
  isIdle:                   boolean    // true si el timeout ya expiró
  ultimoEventoInteraccion:  number     // Date.now() del último evento DOM (ms epoch)

  // Acciones (llamadas por useTerminalAuth, no por componentes)
  iniciar(): void     // activa monitoreo al entrar en estado_1 con rol invitado
  detener(): void     // desactiva (al elevar rol o destuir cookie)
  registrarInteraccion(): void   // actualiza ultimoEventoInteraccion = Date.now()
}
```

**Nota:** `tiempoRestante` ha sido eliminado de la interfaz — no es computable sin
`setTimeout`. Los componentes que necesiten mostrar un aviso de inactividad inminente
pueden calcular `Math.max(0, IDLE_MS - (Date.now() - ultimoEventoInteraccion))` en
un `useSyncExternalStore` con actualización periódica si fuese necesario.

### Condición de activación

```
isActivo = true   sii   tipoSesion ∈ { 'galleta_pequeña', 'galleta' }
                  ∧     rolActivo === 'invitado'

useTerminalAuth llama a iniciar() al detectar esta condición.
useTerminalAuth llama a detener() cuando:
  - el rol sube (ID_nombre con rol propio hace checkin)
  - el usuario hace checkout y la cookie se autodestruye (galleta_pequeña)
```

### Comportamiento

**Listeners DOM — actualizar timestamp de interacción**

```typescript
const IDLE_MS = 20 * 60 * 1000   // 20 minutos en ms

useEffect(() => {
  if (!isActivo) return

  const eventos = ['click', 'keydown', 'touchstart', 'mousemove', 'scroll']
  const onInteraccion = () => registrarInteraccion()   // → Date.now()

  eventos.forEach(e => window.addEventListener(e, onInteraccion, { passive: true }))

  return () => {
    eventos.forEach(e => window.removeEventListener(e, onInteraccion))
  }
}, [isActivo])
```

**Listeners de visibilidad — detección de vuelta tras letargo**

```typescript
useEffect(() => {
  if (!isActivo) return

  const verificarIdleAlVolverVisible = () => {
    // Se ejecuta al pasar de hidden → visible o al recibir focus
    const delta = Date.now() - ultimoEventoInteraccion
    if (delta >= IDLE_MS) {
      // La tablet estuvo dormida más de 20 minutos — forzar estado_0 inmediatamente
      isIdle = true
      useTerminalStore.getState().forzarEstado0()
      useAuthStore.getState().clearJwt()
    }
    // Si delta < IDLE_MS: la sesión sigue válida — no hacer nada
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') verificarIdleAlVolverVisible()
  })
  window.addEventListener('focus', verificarIdleAlVolverVisible)

  return () => {
    document.removeEventListener('visibilitychange', verificarIdleAlVolverVisible)
    window.removeEventListener('focus', verificarIdleAlVolverVisible)
  }
}, [isActivo, ultimoEventoInteraccion])
```

**Por qué funciona correctamente tras el sueño del SO:**

```
Flujo cuando la tablet duerme:
  1. Terminal en estado_1 con rol invitado — ultimoEventoInteraccion = T0
  2. SO pausa el navegador → cualquier setTimeout quedaría congelado
  3. Pasados 25 minutos → SO despierta la tablet
  4. Navegador dispara visibilitychange (hidden → visible)
  5. verificarIdleAlVolverVisible(): delta = Date.now() - T0 = 25 min >= 20 min
  6. → isIdle = true → forzar estado_0 INMEDIATAMENTE (sin esperar ningún timer)

Flujo de uso continuo (sin dormir):
  Cada interacción del usuario → registrarInteraccion() → actualiza ultimoEventoInteraccion
  Al volver a estar visible: delta es pequeño → no se dispara el idle
```

**Al forzar estado_0 por idle:**

```
1. isIdle = true
2. useTerminalStore.estado → 'estado_0'
3. La cookie de BBDD NO se destruye:
   - 'galleta_pequeña' → sigue activa con su expires_at original
   - 'galleta'         → permanece como cookie permanente
4. useAuthStore → limpiado (JWT, rolActivo)
5. UI presenta la pantalla de estado_0 con campo PIN preseleccionado
6. Al reintroducir el PIN válido → useTerminalAuth.loginConPin() →
   valida cookie existente (no genera nueva) → estado_1 restaurado
```

**Persistencia en localStorage:**

```
ultimoEventoInteraccion persiste en Zustand (localStorage).
Al recargar la página con isActivo=true:
  → Se recupera ultimoEventoInteraccion de localStorage
  → Se ejecuta verificarIdleAlVolverVisible() inmediatamente en el mount
  → Si delta >= 20 min: estado_0 forzado en el mismo renderizado inicial
  → Si delta < 20 min: sesión restaurada sin acción
```

### Stores: `useTerminalStore`, `useAuthStore`

### Dependencias: `useTerminalAuth` (orquesta inicio/detención)

---

## 16. useLocationListener

> Hook activo en el terminal de vehículo que escucha eventos `ping_location`
> en el canal Realtime **`coordinacion:flota`** (canal global multiplexado).
> Filtra los eventos por `payload.id_vehiculo` — solo procesa los dirigidos a su
> propio vehículo. Responde con `pong_location` en el mismo canal.
> Implementa un throttle de 15 segundos para proteger el hardware GPS embarcado.
> Ver `logic.md §29` para la especificación completa del mecanismo.

---

## 19. compressImage — Utilidad de compresión de imágenes

> Función utilitaria pura (no hook). Exportada desde `utils/imageCompressor`.
> Reutilizable en cualquier flujo de adjuntos (Doc-7, Doc-11).
> Ver ADR-002 para la prohibición estricta de Base64.

```typescript
async function compressImage(
  file: File | Blob,
  options?: { maxPx?: number; quality?: number }
): Promise<Blob>
// Opciones por defecto: maxPx = 1200, quality = 0.70, formato = WebP
```

**Pipeline:**

```typescript
// utils/imageCompressor.ts
export async function compressImage(
  file: File | Blob,
  { maxPx = 1200, quality = 0.70 } = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width  * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = new OffscreenCanvas(w, h)
  const ctx    = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return canvas.convertToBlob({ type: 'image/webp', quality })
}
```

**Reglas arquitectónicas:**

- `createImageBitmap` + `OffscreenCanvas` — fuera del Main Thread de render, sin reflow.
- Nunca devuelve Base64 / data-URL — solo `Blob` binario plano (ADR-002).
- Llamado **antes** de que el archivo toque Zustand o IndexedDB.
- Ver `nucleo_flota_y_taller.md → Compresión de adjuntos Doc-7` para el
  pipeline completo y las reglas de almacenamiento.

---

## 20. useBandejaConflictos — Cola con Errores / Resolución Manual

> Vista de auditoría para mutaciones encoladas que no han podido sincronizarse.
> La cola reintenta indefinidamente al reconectar — el estado `'fallido'` solo
> se alcanza por cascada de dependencia o por descarte manual del usuario.
> Solo accesible a `coordinación` y `logística` desde la `black_column`.

```typescript
interface Mutation {
  id:          UUID
  tipo:        string
  payload:     unknown
  timestamp:   ISOString
  intentos:    number
  estado:      'fallido'
  errorMsg:    string
}

interface UseBandejaConflictos {
  // Estado
  deadLetters:   Mutation[]    // mutaciones fallidas de IndexedDB
  isLoading:     boolean

  // Carga las mutaciones fallidas desde IndexedDB
  cargar(): Promise<void>

  // Acciones por mutación
  reintentar(mutationId: UUID): Promise<void>
  descartar(mutationId: UUID): Promise<void>
  asumirAutoria(mutationId: UUID, nuevoAutor: ID_nombre): Promise<void>
}
```

**Criterio de "Dead Letter":** mutación con `estado = 'fallido'` e `intentos >= 3`.

**Columnas de la vista:**

| Columna | Contenido |
|---|---|
| `Tipo` | Código de operación (`doc1_asistencia`, `doc6_metadata`, etc.) |
| `Timestamp` | Fecha y hora del intento original (offline) |
| `Autor` | `payload.ID_nombre_registrador` si existe |
| `Error` | `errorMsg` del último intento fallido |
| `Intentos` | Número de reintentos realizados |
| `Acciones` | `[Reintentar]` `[Descartar]` `[Asumir Autoría]`* |

*`[Asumir Autoría]` solo aparece si `payload.ID_nombre_registrador` existe (documentos autoriales).

**RBAC:** `coordinación` y `logística` ven todas las Dead Letters del terminal.
La acción `[Asumir Autoría]` requiere que el nuevo autor tenga sesión activa en el terminal.

**Nota:** la vista se rehidrata desde IndexedDB en cada montaje — no usa Realtime
(las Dead Letters son locales al terminal, no viajan a Supabase hasta que se resuelven).

```typescript
interface UseLocationListener {
  // Estado
  isEscuchando:       boolean    // true si el canal Realtime está suscrito
  ultimoPingAt:       ISOString | null   // timestamp del último ping procesado
  throttleActivo:     boolean    // true si un nuevo ping sería ignorado ahora mismo
  segundosThrottle:   number     // segundos hasta que el throttle se levante (0 si libre)
}
```

### Condición de activación

El hook se monta cuando:

```
useTerminalStore.ID_vehiculo IS NOT NULL
∧ checkin_on === true   (al menos un ID_nombre con checkin en el vehículo)
∧ estadoOperativo ≠ 'desactivado'
```

Se desmonta (y desuscribe el canal Realtime) cuando el terminal pasa a
`estado_0` o cuando no queda ningún `ID_nombre` con `checkin_on`.

### Flujo al recibir `ping_location`

```typescript
onPingLocation(payload):
  // 1. Guardia de checkin
  if (!hayCheckinActivo()) return

  // 2. Throttle de 15 segundos
  const ahora = Date.now()
  if (ultimoPingAt && (ahora - ultimoPingAt) < 15_000) return   // ignorar

  ultimoPingAt = ahora   // persistido en useVehiculoStore

  // 3. Obtener posición GPS (una sola lectura, no watchPosition)
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords
      const timestamp_gps = new Date().toISOString()

      // 4. Publicar pong al canal (todos los coordinadores suscritos lo reciben)
      supabase.channel(`vehiculo:${ID_vehiculo}`)
        .send({ type: 'broadcast', event: 'pong_location',
                payload: { lat: latitude, lon: longitude, accuracy, timestamp_gps } })

      // 5. Registrar en historial persistente
      supabase.from('gps_historial').insert({
        id_vehiculo: ID_vehiculo,
        lat: latitude, lon: longitude, accuracy,
        timestamp_gps,
        origen: 'ping'
      })
    },
    (err) => {
      // Error del hardware GPS o permiso denegado.
      // En lugar de silenciar el error, publicar pong_error para que el coordinador
      // cancele inmediatamente su timer de 5 s y ejecute el fallback RPC sin esperar.
      supabase.channel(`vehiculo:${ID_vehiculo}`)
        .send({
          type:    'broadcast',
          event:   'pong_error',
          payload: {
            id_vehiculo: ID_vehiculo,
            codigo:      err.code,        // 1 PERMISSION_DENIED | 2 POSITION_UNAVAILABLE | 3 TIMEOUT
            mensaje:     err.message,
            timestamp:   new Date().toISOString()
          }
        })
      // No se incrementa ultimoPingAt: el throttle NO se activa en caso de error,
      // de modo que el siguiente ping de cualquier coordinador puede intentar de nuevo.
    },
    { timeout: 5000, maximumAge: 0, enableHighAccuracy: true }
  )
```

### Fallback en coordinación (lado coordinador — no en el terminal de vehículo)

El fallback se activa por dos caminos alternativos — el que ocurra primero:

**Camino A — `pong_error` recibido (inmediato):**

```typescript
// El coordinador recibe pong_error antes de que expire el timer
onPongError(payload):
  clearTimeout(fallbackTimer)          // cancela el timer de 5 s
  ejecutarFallbackRPC(payload.id_vehiculo)
```

**Camino B — timeout de 5 s agotado sin `pong_location` ni `pong_error`:**

```typescript
// El coordinador no ha recibido respuesta alguna en 5 s
fallbackTimer = setTimeout(() => ejecutarFallbackRPC(vehiculoId), 5000)
```

**`ejecutarFallbackRPC`** (compartida por ambos caminos):

```typescript
async function ejecutarFallbackRPC(vehiculoId: string) {
  const { data } = await supabase.rpc('get_ultima_ubicacion_vehiculo', {
    p_id_vehiculo: vehiculoId
  })
  // La RPC hace UNION ALL gps_historial + doc8_eventos ordenado por timestamp DESC LIMIT 1
  // Garantiza la posición más reciente independientemente de su fuente
  // Ver logic.md §29.3 para el SQL completo
  mostrarUbicacionOffline(data)   // muestra badge "Ubicación offline" en el visor
}
```

### Stores: `useVehiculoStore` (lee `ID_vehiculo`, `estadoOperativo`; escribe `ultimoPingAt`)

### Dependencias: `useRealtime` (gestiona el canal `vehiculo:${ID_vehiculo}`)

---

## 17. useBackgroundSyncStore

> Store Zustand **estrictamente aislado de la sesión activa de UI**. Su único propósito
> es conservar el JWT del usuario que ejecutó un checkout offline hasta que el
> Service Worker haya vaciado completamente la cola de mutaciones pendientes.
>
> **Regla de aislamiento:** este store nunca se inicializa, se lee ni se limpia desde
> lógica de UI de sesión activa. Solo `useCheckin.checkout()` escribe en él;
> solo el Service Worker lo lee; solo `useOfflineQueue.clearJwtAfterSync()` lo vacía.
>
> Esto permite que Usuario B inicie sesión y opere con su propio JWT en `estado_1`
> mientras el SW utiliza el token congelado de Usuario A para vaciar su cola de forma
> completamente transparente.

```typescript
interface UseBackgroundSyncStore {
  // Estado reactivo en memoria (solo para la UI del banner — NUNCA expuesto a otros componentes)
  frozenUserId:   ID_nombre | null  // ID_nombre del propietario del JWT congelado
  hasFrozenJwt:   boolean           // true si hay JWT congelado pendiente de vaciado
  // Nota: frozenJwt NO existe como campo Zustand — vive exclusivamente en IndexedDB.
  // El Main Thread no lo lee; solo el Service Worker accede a él directamente.

  // Escritura — llamado exclusivamente por useCheckin.checkout() en CASO RETENCIÓN
  congelarJwt(jwt: string, userId: ID_nombre): Promise<void>

  // Lectura — consumida exclusivamente por el Service Worker
  // (método async porque IndexedDB es asíncrono)
  getFrozenJwt(): Promise<string | null>

  // Limpieza — llamada exclusivamente por useOfflineQueue.clearJwtAfterSync()
  liberarJwt(): Promise<void>
}
```

### Motor de persistencia: IndexedDB

`localStorage` no es accesible desde el Service Worker. La única API de almacenamiento
asíncrono compartida entre el Main Thread y el SW es **IndexedDB**.

El JWT congelado se almacena en el object store `bgs_tokens` de la base IndexedDB `u24_offline`:

```
Object store: bgs_tokens
  Clave: 'frozen_jwt'          (clave fija — siempre hay como máximo una entrada)
  Campos: {
    key:        'frozen_jwt',
    jwt:        string,          // JWT completo en texto plano
    userId:     ID_nombre,       // dueño del token
    savedAt:    ISOString,       // para debug / auditoría
    expires_at: ISOString,       // TTL estricto — ver abajo
  }
```

**TTL estricto del JWT congelado:**
El campo `expires_at` del registro se calcula como el **mínimo** entre la expiración
natural del JWT y `savedAt + 48 horas`. Esto garantiza que, si la tablet permanece
apagada o sin red durante días, el JWT congelado no siga siendo válido indefinidamente.

```
expires_at = MIN(jwt.exp * 1000,   // expiración natural del token (epoch ms)
                 savedAt + 48h)     // cota absoluta de seguridad
```

### Comportamiento

```
congelarJwt(jwt, userId):  [async]
  1. frozenUserId = userId     (Zustand en memoria — solo para el banner)
  2. hasFrozenJwt = true
  3. Decodificar jwt para extraer exp (sin verificar firma — solo lectura)
  4. Calcular expires_at = MIN(exp * 1000, Date.now() + 48 * 3600 * 1000)
  5. await db.put('bgs_tokens', { key: 'frozen_jwt', jwt, userId, savedAt: NOW(),
                                  expires_at: new Date(expires_at).toISOString() })
     ← IndexedDB: accesible tanto desde Main Thread como desde SW

liberarJwt():  [async]
  1. frozenUserId = null
  2. hasFrozenJwt = false
  3. await db.delete('bgs_tokens', 'frozen_jwt')
  4. No afecta en ningún caso al JWT de sesión activa de cualquier otro usuario

getFrozenJwt():  [async — llamado exclusivamente por el SW]
  1. const record = await db.get('bgs_tokens', 'frozen_jwt')
  2. if (!record) return null
  3. if (new Date(record.expires_at) <= new Date()):
       await db.delete('bgs_tokens', 'frozen_jwt')   // purgar entrada expirada
       return null
  4. return record.jwt
```

### Acceso desde el Service Worker

```javascript
// service-worker.ts
// El SW abre la misma base IndexedDB que el Main Thread
async function getFrozenJwtFromIDB(): Promise<string | null> {
  const db = await openDB('u24_offline', DB_VERSION)
  const record = await db.get('bgs_tokens', 'frozen_jwt')
  return record?.jwt ?? null
}

// Antes de procesar la cola offline:
self.addEventListener('sync', async (event) => {
  if (event.tag === 'offline-queue-sync') {
    const jwt = await getFrozenJwtFromIDB()
    if (!jwt) return  // sin JWT congelado — nada que hacer
    await procesarColaConJwt(jwt)
  }
})
```

### Garantías de aislamiento

| Propiedad | Garantía |
|---|---|
| Inicio de sesión de Usuario B | No modifica ni lee `bgs_tokens` — opera con su propia sesión en `useAuthStore` |
| Logout de Usuario B | No elimina la entrada `frozen_jwt` de IndexedDB — el SW puede seguir vaciando la cola de Usuario A |
| Expiración de sesión de Usuario B | No afecta al JWT congelado en IndexedDB |
| TTL del JWT congelado | TTL natural del token (`shift_start + 36h`). Si expira antes de vaciarse la cola, las mutaciones fallan con 401 y se marcan `fallido` |
| Acceso desde SW | Directo a IndexedDB — sin pasar por postMessage ni por el store de UI activa |

### Stores: `useBackgroundSyncStore` (Zustand en memoria, sin persist — la persistencia real está en IndexedDB)

### Dependencias: IndexedDB `u24_offline` (object store `bgs_tokens`)

---

## 18. useAuthStore — Mapa de JWT por sesión de usuario

> En terminales compartidos, múltiples `ID_nombre` pueden estar con `checkin_on`
> simultáneamente. El cliente Supabase JS gestiona una única sesión de auth global.
>
> La solución es un **cliente Singleton con interceptor de fetch dinámico** —
> un único `supabaseClient` cuyo `fetch` custom lee el JWT del ejecutor desde
> `useAuthStore` en el momento exacto de cada petición de red.
> Esto elimina la necesidad de instanciar un nuevo `createClient` por mutación.

```typescript
interface SessionEntry {
  accessToken:  string       // JWT de acceso actual
  refreshToken: string       // token de refresco de Supabase Auth
  expiresAt:    number       // Unix epoch ms — cuando expira el accessToken
}

interface UseAuthStore {
  // Mapa de sesiones activas: { ID_nombre → SessionEntry }
  sessionMap:  Record<ID_nombre, SessionEntry>

  // Rol activo del usuario "principal" de la sesión actual del terminal
  // (usado solo para navegación y permisos de UI — no para mutaciones)
  rolActivo: string | null

  addJwt(id: ID_nombre, accessToken: string, refreshToken: string, expiresAt: number): void
  // getJwtFor es async: rota silenciosamente si el token expira en < 5 min
  getJwtFor(id: ID_nombre): Promise<string | null>
  removeJwt(id: ID_nombre): void
  clearJwt(): void
}
```

**Rotación Silenciosa — implementación de `getJwtFor`:**

```typescript
const REFRESH_MARGIN_MS = 5 * 60 * 1000   // 5 minutos en ms

async function getJwtFor(id: ID_nombre): Promise<string | null> {
  const entry = useAuthStore.getState().sessionMap[id]
  if (!entry) return null

  const ahoraMs = Date.now()
  if (entry.expiresAt - ahoraMs > REFRESH_MARGIN_MS) {
    // Token válido con margen suficiente — devolverlo sin rota
    return entry.accessToken
  }

  // Token a menos de 5 minutos de expirar → refrescar silenciosamente
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: entry.refreshToken,
  })
  if (error || !data.session) {
    // Refresco fallido — devolver el token antiguo (puede fallar en el servidor con 401)
    console.warn(`[useAuthStore] refresh fallido para ${id}:`, error?.message)
    return entry.accessToken
  }

  // Actualizar el mapa con el nuevo par de tokens
  useAuthStore.getState().addJwt(
    id,
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_at! * 1000   // Supabase devuelve epoch en segundos
  )
  return data.session.access_token
}
```

### Patrón Singleton con interceptor de fetch

```typescript
// lib/supabaseClient.ts — instancia única, exportada globalmente
// ────────────────────────────────────────────────────────────────

// Variable de contexto del ejecutor activo para la petición en curso.
// JS es single-threaded: el valor se establece justo antes de que Supabase
// invoque el fetch interceptor, y se limpia en el finally del wrapper.
let _ejecutorIdActual: string | null = null

// Custom fetch: intercepta TODAS las peticiones del cliente singleton
const customFetch: typeof fetch = async (url, options = {}) => {
  const ejecutorId = _ejecutorIdActual
  if (ejecutorId) {
    // getJwtFor es async: rota silenciosamente el token si está próximo a expirar
    const jwt = await useAuthStore.getState().getJwtFor(ejecutorId)
    if (!jwt) throw new Error(`jwt_no_disponible: ${ejecutorId}`)
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${jwt}`,
    }
  }
  return fetch(url, options)   // delega al fetch nativo del navegador
}

// Singleton: único cliente para toda la aplicación
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: customFetch },
  auth: {
    autoRefreshToken: false,  // tokens gestionados por useAuthStore
    persistSession:   false,  // no sobreescribir sesión entre pestañas
  },
})

// Wrapper para mutaciones: establece el contexto del ejecutor, ejecuta fn(),
// y limpia el contexto en el finally (incluso si fn() lanza error).
export async function conEjecutor<T>(
  ejecutorId: string,
  fn: () => Promise<T>
): Promise<T> {
  _ejecutorIdActual = ejecutorId
  try {
    return await fn()
  } finally {
    _ejecutorIdActual = null
  }
}
```

**Uso en mutaciones (TanStack Query):**

```typescript
const { mutate } = useMutation({
  mutationFn: ({ ejecutorId, data }: { ejecutorId: ID_nombre; data: unknown }) =>
    conEjecutor(ejecutorId, () =>
      supabase.from('tabla').insert(data).throwOnError()
    )
})
```

**Uso en la cola offline (useOfflineQueue.procesarCola):**

```typescript
// El ejecutorId y su snapshot de JWT se congelan en el payload al encolar.
// Al drenar, conEjecutor inyecta el JWT congelado (recuperado del payload)
// mediante useAuthStore.addJwt(ejecutorId, mutation.payload.jwt) antes de llamar.
await conEjecutor(mutation.payload.ejecutorId, () =>
  supabase.rpc(mutation.tipo, mutation.payload.data)
)
```

**Por qué es seguro en JS single-threaded:**
El motor JS garantiza que, entre `_ejecutorIdActual = ejecutorId` y la primera
`await` dentro de `fn()`, no puede ejecutarse ningún otro código. El Supabase SDK
invoca `customFetch` sincrónicamente como parte de la cadena de promesas iniciada por
`fn()`. El valor de `_ejecutorIdActual` en ese momento es siempre el del ejecutor
que llamó a `conEjecutor`. El `finally` lo limpia al resolverse o rechazarse `fn()`.

**Nota sobre mutaciones realmente concurrentes:**
Si dos `conEjecutor` se llaman en paralelo (ej. dos `Promise.all` con distintos ejecutores),
el segundo sobreescribiría `_ejecutorIdActual` antes de que el primero haya llegado al fetch.
Para ese caso excepcional — que en la práctica no ocurre porque TanStack Query serializa
las mutaciones — el interceptor delega al JWT del ejecutor activo en ese momento (que es
correcto para el segundo). La primera llamada ya habrá iniciado su fetch antes de ser
sobreescrita. En caso de necesitar garantías estrictas de concurrencia, usar el patrón
de UUID de petición (ver `logic.md §34.6`).

### Reglas de uso

| Regla | Descripción |
|---|---|
| SELECT (lectura) | `supabase.from(...)` sin `conEjecutor` — sin RLS de escritura |
| INSERT / UPDATE / DELETE | `conEjecutor(ejecutorId, () => supabase.from(...).op(...))` |
| Edge Functions | `conEjecutor(ejecutorId, () => supabase.functions.invoke(...))` |
| Cola offline | JWT congelado en payload; reconstruido con `addJwt` temporal antes de drenar |
| Rotación silenciosa | `getJwtFor()` es async; si el token expira en < 5 min rota automáticamente y devuelve el nuevo JWT antes de la petición. El caller no necesita saber que hubo rotación |
| Expiración total | Si `refreshSession` falla también, `getJwtFor()` devuelve el token antiguo; el servidor responderá 401 y la capa de error forzará re-login |

### Stores: `useAuthStore` (Zustand + persist en IndexedDB — ver §15 Persistencia Asíncrona)

### Dependencias: ninguna (store primitivo)

---

## 14. Árbol de dependencias entre hooks

```
useTerminalAuth
  └── (base para todos)

useCheckin
  ├── useTerminalAuth         (lee estado terminal)
  ├── useVehiculo             (desacopla carry al checkout)
  ├── useDRP                  (sale del DRP en checkout pilot)
  ├── useDoc8                 (cierra Doc-8 en checkout pilot)
  ├── useOfflineQueue         (detecta pendingCount > 0 en checkout offline)
  └── useBackgroundSyncStore  (congela JWT en checkout offline con pendientes)

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
  ├── IndexedDB                (persistencia de mutaciones)
  └── useBackgroundSyncStore   (liberarJwt() al vaciar cola post-retención)

useBackgroundSyncStore
  └── (sin dependencias — store primitivo; solo escrito por useCheckin,
       leído por SW, vaciado por useOfflineQueue)

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

useLocationListener
  ├── useRealtime     (suscripción al canal vehiculo:${ID_vehiculo})
  └── useVehiculoStore (lee estadoOperativo; escribe ultimoPingAt para throttle)
  Condición: ID_vehiculo asignado ∧ checkin_on ∧ estadoOperativo ≠ 'desactivado'
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
vehiculo:{id_vehiculo}        → ping/pong de coordenadas GPS (ping_location / pong_location)
global:marquesina             → texto del ticker
global:tablon                 → anuncios del tablón
global:vacaciones             → estado periodo vacaciones
```

### Sincronización Híbrida de Foco — bandejas

Las bandejas de entrada usan una arquitectura **dual**: Supabase Realtime para entrega
en tiempo real durante la sesión activa, y TanStack Query con re-fetch por eventos del
SO/red para reconciliar mensajes perdidos durante periodos de letargo de la tablet o
caídas de la conexión WebSocket.

**Configuración global del QueryClient:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,    // se dispara al recuperar el foco de la ventana
                                     // (incluye wake-up de tablet por SO)
      refetchOnReconnect:   true,    // se dispara al recuperar conexión de red
                                     // (el SW notifica al cliente cuando vuelve online)
      staleTime: 30_000,             // datos considerados frescos durante 30 s
                                     // evita re-fetches redundantes si Realtime ya actualizó
    },
  },
})
```

**Alcance del re-fetch:**

| Query | `refetchOnWindowFocus` | `refetchOnReconnect` | Justificación |
|---|---|---|---|
| `bandejas/*` (todas las instancias activas) | ✅ | ✅ | Las tablets en montaje se apagan/despiertan frecuentemente; los WebSockets no persisten durante el letargo del SO |
| `inventario/*` (stock) | ✅ | ✅ | Un turno de reposición puede haberse ejecutado mientras el terminal estaba dormido |
| `drp/*` | ✅ | ✅ | Cambios de estado DRP durante desconexión |
| `vehiculos/*` | ❌ | ✅ | Realtime es suficiente en activo; solo reconciliar en reconexión |
| Datos de turno activo (`checkin`, `doc8`) | ❌ | ❌ | Gestionados por Zustand + localStorage — el GET HTTP no es la fuente de verdad |

**Mecanismo de reconciliación al despertar:**

```
tablet despierta (visibilitychange: hidden → visible)
  │
  ├─ React Query: window.focus event detectado
  │    → queries con refetchOnWindowFocus=true se marcan stale
  │    → GET asíncrono a /api/bandejas?instancia=X&desde=last_fetched_at
  │         (parámetro de cursor — solo descarga mensajes no vistos)
  │    → cache actualizado → UI reconciliada sin interacción del usuario
  │
  ├─ Supabase Realtime: intenta reconexión WebSocket automáticamente
  │    → si la conexión WS se perdió durante el letargo:
  │         suscripción re-establecida transparentemente
  │
  └─ useOfflineQueue: detecta isOnline = true → procesarCola()
       → replica mutaciones acumuladas durante el letargo
```

**Nota de prioridad:** si Realtime ya entregó un mensaje durante la sesión activa,
el `staleTime` de 30 s previene un GET redundante inmediato. El re-fetch solo
materializa diferencias — mensajes que llegaron mientras el WebSocket estaba
desconectado o la tablet dormía.

### Pre-caché de tokens de turno siguiente — `usePrecacheShiftTokens`

Hook montado en el layout raíz del terminal. Suscribe al canal Realtime
`terminal:{device_id}:precache` y persiste los tokens del turno siguiente
en localStorage para habilitar el acceso degradado durante relevos sin red.

```typescript
// Montado una sola vez en el layout raíz (useEffect onMount)
function usePrecacheShiftTokens(deviceId: string): void {
  useEffect(() => {
    const channel = supabase
      .channel(`terminal:${deviceId}:precache`)
      .on('broadcast', { event: 'shift_tokens_ready' }, ({ payload }) => {
        // payload: Array<{ user_id: string, signed_payload: string }>
        for (const { user_id, signed_payload } of payload) {
          localStorage.setItem(
            `u24_offline_session_next:${user_id}`,
            signed_payload
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [deviceId])
}
```

**Limpieza al check-in online exitoso** (en `useTerminalAuth.login`):

```typescript
// Tras confirmar sesión online con éxito:
localStorage.removeItem(`u24_offline_session_next:${ID_nombre}`)
```

Ver `logic.md §25.6` para la especificación completa del payload y el flujo de
generación en el servidor.

### Offloading de pdfMake a Web Worker

**Restricción arquitectónica:** pdfMake **no puede ejecutarse en el Main Thread**.
La generación de PDFs (Doc-8 cierre, partes de asistencia, informes DRP) es
computacionalmente costosa y congela la UI en dispositivos de flota de gama baja.

**Arquitectura:**

```typescript
// pdf.worker.ts — Web Worker dedicado
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
pdfMake.vfs = pdfFonts.pdfMake.vfs

self.onmessage = async (event: MessageEvent<{ docDefinition: object; filename: string }>) => {
  const { docDefinition } = event.data
  pdfMake.createPdf(docDefinition).getBlob((blob) => {
    self.postMessage({ blob, filename: event.data.filename }, [blob])
  })
}
```

```typescript
// usePdfGenerator — hook de llamada al worker con fallback servidor
function usePdfGenerator() {
  const workerRef       = useRef<Worker | null>(null)
  const workerFailedRef = useRef<boolean>(false)

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('./workers/pdf.worker.ts', import.meta.url),
        { type: 'module' }
      )
      // Capturar errores de inicialización (ej. CSP bloqueando new Worker)
      workerRef.current.onerror = () => {
        workerFailedRef.current = true
        workerRef.current = null
      }
    } catch {
      // new Worker() lanzó sincrónicamente (CSP strict-dynamic, etc.)
      workerFailedRef.current = true
    }
    return () => workerRef.current?.terminate()
  }, [])

  const generarPdfEnServidor = useCallback(
    async (docDefinition: object, filename: string): Promise<{ signed_url: string }> => {
      // Fallback: enviar docDefinition al backend para generación server-side
      // Edge Function `generar_pdf_server` devuelve un enlace firmado (~5 min TTL)
      const { data, error } = await supabase.functions.invoke('generar_pdf_server', {
        body: { docDefinition, filename },
      })
      if (error) throw new Error(`pdf_server_error: ${error.message}`)
      return data as { signed_url: string }
    },
    []
  )

  const generarPdf = useCallback(
    (docDefinition: object, filename: string): Promise<Blob | { signed_url: string }> => {

      // RUTA A — Web Worker disponible (caso nominal)
      if (workerRef.current && !workerFailedRef.current) {
        return new Promise((resolve, reject) => {
          workerRef.current!.onmessage = (e) => resolve(e.data.blob as Blob)
          workerRef.current!.onerror   = async () => {
            // El worker falló en tiempo de ejecución → marcar como fallido y usar fallback
            workerFailedRef.current = true
            workerRef.current = null
            try { resolve(await generarPdfEnServidor(docDefinition, filename)) }
            catch (err) { reject(err) }
          }
          workerRef.current!.postMessage({ docDefinition, filename })
        })
      }

      // RUTA B — Worker no disponible (CSP bloqueó la inicialización)
      return generarPdfEnServidor(docDefinition, filename)
    },
    [generarPdfEnServidor]
  )

  return { generarPdf, workerDisponible: !workerFailedRef.current }
}
```

**Rutas de generación:**

| Ruta | Condición | Resultado | Uso en UI |
|---|---|---|---|
| A — Web Worker | Worker inicializado sin errores | `Blob` | `URL.createObjectURL(blob)` → `<a download>` |
| B — Edge Function `generar_pdf_server` | Worker bloqueado por CSP o fallo en runtime | `{ signed_url }` | `window.open(signed_url)` o `<a href={signed_url} download>` |

**Edge Function `generar_pdf_server`:**

- Recibe `{ docDefinition: object, filename: string }` en el body.
- Genera el PDF con pdfMake en Deno (entorno sin restricciones CSP).
- Sube el PDF al bucket de Supabase Storage (`pdfs_temporales/`).
- Devuelve `{ signed_url: string }` con TTL de 5 minutos.
- El archivo en Storage se purga automáticamente por política de retención del bucket
  (TTL de 10 minutos para evitar acumulación).

**Reglas:**

- Prohibido llamar a `pdfMake.createPdf()` directamente desde cualquier componente o hook del Main Thread.
- El worker recibe el árbol de datos JSON del documento (`docDefinition`) y devuelve un `Blob`.
- El componente receptor del `Blob` puede abrirlo con `URL.createObjectURL` o descargarlo.
- El componente receptor de `{ signed_url }` debe abrir/descargar desde la URL firmada directamente.
- El caller no necesita conocer qué ruta se usó — el comportamiento de descarga/apertura
  se adapta comprobando si el resultado es `Blob` (`instanceof Blob`) o tiene `signed_url`.

### Persistencia Asíncrona de Zustand — adaptador idb-keyval

El middleware `persist` de Zustand se configura con un **adaptador asíncrono basado
en IndexedDB** (librería `idb-keyval`). Esto saca la serialización de los stores del
hilo principal, evita el bloqueo del Main Thread en stores con payload grande
(sessionMap de tokens, cola de mutaciones) y garantiza la misma base de persistencia
que el resto del sistema offline-first.

```typescript
import { get, set, del } from 'idb-keyval'

// Adaptador idb-keyval para Zustand persist middleware
const idbStorage = {
  getItem: (name: string) => get(name),
  setItem: (name: string, value: string) => set(name, value),
  removeItem: (name: string) => del(name),
}

// Ejemplo: useAuthStore con persist asíncrono
export const useAuthStore = create(
  persist(
    (set, get) => ({ /* ...state... */ }),
    {
      name:    'u24_auth',
      storage: createJSONStorage(() => idbStorage),
    }
  )
)
```

**Política de persistencia por store:**

| Store | Motor de persistencia | Motivo |
|---|---|---|
| `useAuthStore` | IndexedDB (idb-keyval) | sessionMap con tokens — no en localStorage |
| `useTerminalStore` | IndexedDB (idb-keyval) | Estado de turno — sobrevive recargas |
| `useIdleTimeout` | IndexedDB (idb-keyval) | `ultimoEventoInteraccion` epoch |
| `useInventarioStore` (`stock_real_local`) | **Sin persist** (en memoria) | Revertible; no persistir estado huérfano |
| `useBandejasStore` | **Sin persist** | Rehidratado desde Supabase al reconectar |
| `useBackgroundSyncStore` | **Sin persist** (JWT en IndexedDB directamente) | Ver §17 |

**Nota de migración:** cualquier store que antes usara `{ storage: createJSONStorage(() => localStorage) }`
debe migrar al adaptador idb-keyval. `localStorage` queda reservado únicamente para
la clave HMAC diaria de modo degradado y para el token precargado de turno siguiente
(`u24_offline_session`, `u24_offline_session_next:{id}`).

---

### Single Source of Truth — TanStack Query + Zustand

**Responsabilidades:**

| Capa | Gestiona | Ejemplos |
|---|---|---|
| **TanStack Query** | Datos de negocio sincronizados con BBDD | Inventario (stock real), Doc-1 (asistencias leídas), listas de DRP, dotaciones |
| **Zustand** | Estado de UI y hardware | JWT, estado de turno, GPS, idle timeout, bandejas en tiempo real |

**Integración Realtime → TanStack Query:**

Los handlers de Supabase Realtime para datos de negocio **no escriben directamente
en Zustand**. En su lugar, invocan `queryClient.setQueryData()` para actualizar
la caché de TanStack Query, que notifica a todos los componentes suscritos:

```typescript
// useInventario — handler Realtime actualiza TanStack Query, no Zustand
supabase.channel(`inventario:${locationId}`)
  .on('postgres_changes', { event: 'UPDATE', table: 'stock_items' }, (payload) => {
    const { item_id, stock_real: server_value } = payload.new

    queryClient.setQueryData(
      ['stock_items', locationId],
      (prev: StockItem[] | undefined) =>
        prev?.map(item =>
          item.item_id === item_id
            ? { ...item, stock_real: server_value }
            : item
        ) ?? []
    )
    // Reconciliación del delta optimista en Zustand (si sync_pending activo):
    // useInventarioStore.reconciliarDelta(item_id, server_value)  ← solo el delta local
  })
  .subscribe()
```

**Zustand mantiene únicamente** el `stock_real_local` (delta optimista) y la bandera
`sync_pending`. La fuente de verdad del `stock_real` vive en TanStack Query.

---

### Bloqueo de Persistencia de Almacenamiento — `navigator.storage.persist()`

Llamado en el `useEffect` de montaje del layout raíz, una sola vez, para solicitar
al navegador que designe el origen como persistente y no lo expulse automáticamente
de la caché LRU de IndexedDB/localStorage bajo presión de almacenamiento del SO.

```typescript
useEffect(() => {
  if (navigator.storage?.persist) {
    navigator.storage.persist().then((granted) => {
      useTerminalStore.getState().setStoragePersisted(granted)
      if (!granted) {
        console.warn('[U24] storage.persist() denegado — almacenamiento offline vulnerable a evicción')
        // Notificar a roles de supervisión con banner crítico (ver abajo)
      }
    })
  }
}, [])
```

**Banner de alerta crítico si `granted === false`:**

Si `navigator.storage.persist()` devuelve `false`, se muestra un banner persistente
visible **solo a roles `gerencia` y `coordinación`**:

```
⚠️ ALERTA: Este terminal no garantiza persistencia de almacenamiento offline.
   El sistema operativo puede eliminar datos pendientes bajo presión de memoria.
   Este terminal NO es apto para operar sin conexión a red.
   Contacte con soporte técnico para instalar la PWA correctamente.
```

El banner no es dismissible y persiste durante toda la sesión. El personal operativo
(`tes`, `due`, `médico`) no lo ve — el aviso es para quienes toman decisiones de
despliegue de hardware.

**Notas:**

- En Chromium/Android la solicitud se concede automáticamente si el sitio está
  instalado como PWA o si el usuario ha interactuado suficientemente con él.
- Si se deniega, el sistema sigue funcionando; el riesgo es que el SO expulse
  IndexedDB bajo presión extrema de memoria, perdiendo la cola de mutaciones offline.
- El resultado (`granted`) se expone como `useTerminalStore.storagePersisted`
  para que el coordinador pueda ver el estado en `ajustes_terminal`.

---

### Mitigación de Reloj Local — `time_offset`

**Problema:** en tablets de flota el reloj del sistema puede estar desfasado minutos
o incluso horas respecto al tiempo real. Las timestamps generadas offline con
`Date.now()` pueden ser incorrectas, afectando expiración de sesiones y orden de eventos.

**Solución:** al arrancar la app y al recuperar conexión, calcular un `time_offset`
entre el reloj local y el servidor:

```typescript
// useTimeSync — cálculo único al arrancar online
async function sincronizarReloj(): Promise<void> {
  const t0 = Date.now()
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, { method: 'HEAD' })
  const t1 = Date.now()

  const serverDateStr = response.headers.get('Date')
  if (!serverDateStr) return

  const serverMs    = new Date(serverDateStr).getTime()
  const latencyMs   = (t1 - t0) / 2      // estimación de latencia de red
  const localMs     = t0 + latencyMs
  const offsetMs    = serverMs - localMs

  useTerminalStore.getState().setTimeOffset(offsetMs)
}

// Función helper para captura de timestamps corregidos
export function ahora(): number {
  return Date.now() + (useTerminalStore.getState().timeOffset ?? 0)
}
```

**Uso:**

- `ahora()` reemplaza a `Date.now()` en **toda captura de timestamp offline**
  (eventos Doc-8, timestamps de mutaciones encoladas, idle timeout `ultimoEventoInteraccion`).
- `time_offset` se persiste en `useTerminalStore` (IndexedDB) y se recalcula al
  recuperar conectividad.
- Si la app está offline desde el arranque, `time_offset = 0` hasta que haya red.
