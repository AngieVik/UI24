# logic

> Reglas de negocio y decisiones de ingeniería del sistema U24.
> Este archivo cubre el comportamiento no-evidente que no está completamente
> capturado en los archivos de módulos o en `estados.md`.
> Cualquier lógica transversal, condición de disparo o regla de prioridad
> debe registrarse aquí antes de implementarse.

---

## 1. Principios fundamentales

1. **El RBAC del frontend es cosmético.** Los ítems de `black_column` se ocultan o atenúan
   según el rol del JWT activo, pero la capa de seguridad real son las políticas RLS de Supabase.
   Un cliente manipulado que omita el RBAC visual debe ser bloqueado en la base de datos.

2. **El inventario nunca se modifica directamente desde el cliente.**
   Todo cambio de stock (Doc-6 deduction, Doc-10 transfer, confirmación de recepción)
   se ejecuta mediante RPC de Supabase o trigger PostgreSQL. Las peticiones async paralelas
   del cliente causarían race conditions sobre el mismo `stock_real`.

3. **Todo tiene timestamp automático.** Excepto los campos marcados explícitamente como
   "entrada manual" (ej. `Fecha_Recepcion` en Doc-9, `km_inicio`/`km_fin` en Doc-8).
   El timestamp del sistema siempre es UTC; la UI muestra en hora local.

4. **El DRP nunca entra ni finaliza automáticamente.** La transición a `En_curso` y
   a `Finalizado` es siempre acción manual explícita de `coordinación` o `gerencia`.
   Los cambios automáticos solo aplican a `En_preparacion` y `Archivado`.

5. **Offline-first para datos de turno; Supabase-required para inventario.**
   Los formularios de asistencia, parte de trabajo y datos de persona se pueden crear
   offline con UUID pre-generado. Las operaciones de stock requieren conexión activa.

6. **Las entradas de Doc-1 son inmutables.** Append-only con `timestamp` e `ID_nombre`.
   Ni coordinación ni gerencia pueden editarlas.

---

## 2. Timestamps — reglas generales

### 2.1 Campos siempre automáticos (sistema)

El sistema genera estos timestamps en el momento del evento. No se solicitan al usuario:

| Campo | Disparado por |
|---|---|
| `timestamp_checkin` | Check-in exitoso de ID_nombre |
| `timestamp_checkout` | Check-out de ID_nombre |
| `timestamp_creacion` | Creación de cualquier registro (DRP, módulo, doc) |
| `timestamp_apertura` / `timestamp_cierre` | Apertura y cierre de módulos PSA y filiación |
| `timestamp_inicio_preparacion` | DRP pasa a `En_preparacion` |
| `timestamp_inicio_curso` | DRP pasa a `En_curso` |
| `timestamp_finalizacion` | DRP finaliza |
| `timestamp_archivado` | DRP archivado (job +48h) |
| `timestamp_entrada_drp` | Elemento entra al DRP |
| `timestamp_salida_drp` | Elemento sale del DRP |
| `timestamp_movimiento` | Cualquier movimiento de inventario |
| `timestamp_envio` | Doc-10 generado |
| `timestamp_confirmacion` | Doc-10 confirmado en destino |
| `timestamp_incidencia` | Doc-7 guardado |
| `timestamp_cambio_estado` | Transición de estado en bandeja o documento |
| `timestamp_lectura` | Mensaje de bandeja abierto |
| `timestamp_publicacion` | Anuncio del tablón publicado |
| `timestamp_ultima_edicion` | Anuncio editado |
| `timestamp_ultima_actualizacion` | Marquesina guardada |
| `timestamp_admision` | Paciente registrado en perfil_admision (filiación) |
| `timestamp_inicio_consulta` | Box abre paciente (filiación) |
| `timestamp_fin_consulta` | Box cierra atención (filiación) |
| `created_at` | Registro en `sesiones_emergencia` |
| `consumido_at` | PIN de emergencia utilizado |

### 2.2 Campos con entrada manual del usuario

| Campo | Contexto | Motivo |
|---|---|---|
| `km_inicio` | Activación de vehículo | El odómetro físico no es legible por la app |
| `km_fin` | Desactivación / checkout pilot | Ídem |
| `km_marcador` | Repostaje combustible / AdBlue | Ídem |
| `Fecha_Recepcion` | Doc-9 Entrada almacén | El albarán físico puede llegar con fecha anterior |
| `litros` | Repostaje combustible | No hay integración con surtidor |
| `euros` | Repostaje en gasolinera externa | Ídem |

### 2.3 Zona horaria

* Todos los timestamps se almacenan en **UTC** en Supabase.
* La UI convierte a hora local del terminal para visualización.
* Los filtros y exportaciones PDF utilizan la hora local mostrada en UI.

---

## 3. Autenticación y ciclo de vida de sesión

### 3.1 Flujo de login estándar

```
Usuario introduce ID_nombre + password
  → Supabase Auth valida credenciales
  → JWT emitido con claim `rol` del usuario
  → Cookie segura HTTPOnly guardada
  → terminal pasa a estado_1
  → useAuthStore carga { ID_nombre, rol, JWT }
  → black_column renderiza según rol
```

* Si las credenciales son incorrectas → mensaje genérico: `"Credenciales incorrectas"`.
  Sin pistas sobre qué campo falló (evita enumeración de usuarios).

### 3.2 Flujo de login por PIN de emergencia

```
Usuario introduce PIN de 6 dígitos
  → Supabase valida contra tabla sesiones_emergencia:
      * PIN existe
      * expires_at > NOW()
      * consumido_at IS NULL
  → Si válido: marca consumido_at = NOW(), asigna cookie
      * galleta_pequeña → cookie temporal (tipo = 'temporal')
      * galleta         → cookie permanente (tipo = 'permanente')
  → terminal pasa a estado_1 con rol invitado
  → black_column solo muestra icono Check-in
```

### 3.3 Múltiples ID_nombre en un terminal

* Un terminal puede tener varios ID_nombre con `checkin_on` simultáneamente.
* Cada ID_nombre opera con sus propios permisos una vez autenticado (no con rol invitado).
* `usePersonaStore` mantiene un mapa `{ [ID_nombre]: EstadoPersona }`.
* El logout individual (check-out) de un ID_nombre **no destruye** la sesión del terminal
  ni el JWT de otros ID_nombre.

### 3.4 Destrucción de cookie

| Tipo de cookie | Se destruye cuando |
|---|---|
| `estandar` | Cierre de sesión explícito por el último ID_nombre activo |
| `galleta_pequeña` | Check-out del **último** ID_nombre con `checkin_on` en ese terminal |
| `galleta` | Eliminación manual en Supabase por gerencia/coordinación |

* "Último ID_nombre activo" = no quedan ID_nombre con `checkin_on` en ese terminal.
* Si solo hay un ID_nombre y hace check-out → terminal pasa a `estado_0`.
* Si quedan ID_nombre → terminal permanece en `estado_1`.

---

## 4. Tokens de emergencia — ciclo de vida completo

### 4.1 Generación

```
Coordinación/gerencia abre "Token de emergencia" en black_column
  → Modal: reautenticación con sus propias credenciales (obligatorio)
  → Elige tipo: galleta_pequeña (temporal) | galleta (permanente)
  → Sistema genera PIN de 6 dígitos aleatorios
  → INSERT en sesiones_emergencia:
      { tipo, pin_hash, created_at, expires_at = NOW() + 10min,
        id_terminal = NULL, consumido_at = NULL }
  → PIN mostrado UNA sola vez en pantalla
  → El PIN no se puede recuperar después (solo el hash en BBDD)
```

* El PIN viaja al terminal destino por canal fuera de banda (voz, mensaje).
* La reautenticación previa evita que un terminal comprometido genere tokens.

### 4.2 Validación en terminal destino

```
Terminal en estado_0 → usuario introduce PIN
  → Supabase Edge Function valida:
      * Hash coincide con entrada en sesiones_emergencia
      * expires_at > NOW()
      * consumido_at IS NULL
  → Si válido:
      * consumido_at = NOW()
      * id_terminal = terminal que consumió
      * Cookie inyectada según tipo
  → Si inválido/expirado: mensaje genérico "PIN no válido o expirado"
```

### 4.3 Expiración y purga

* El PIN caduca a los **10 minutos** de su creación (`expires_at`).
* Una Edge Function programada en Supabase purga periódicamente las entradas con
  `expires_at < NOW()` y `consumido_at IS NULL` (PINs no consumidos y expirados).
* Los registros consumidos (`consumido_at IS NOT NULL`) se conservan para auditoría.

### 4.4 Tabla sesiones_emergencia

```sql
sesiones_emergencia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT CHECK (tipo IN ('temporal', 'permanente')),
  pin_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  id_terminal TEXT,           -- rellenado al consumirse
  consumido_at TIMESTAMPTZ    -- NULL = no consumido todavía
)
```

---

## 5. GPS — cadena de fallback

Cuando el sistema necesita capturar coordenadas de un vehículo (al activar `Estacionado`,
al iniciar/finalizar `Ruta`) y el GPS del dispositivo no está disponible o falla:

```
1. GPS del dispositivo disponible y preciso
      → usar coordenadas actuales del navegador (Geolocation API)

2. GPS no disponible / sin permiso / timeout
      → última coordenada conocida del ID_vehiculo en Supabase
         (última entrada GPS en historial del vehículo)

3. Sin historial GPS para este vehículo
      → último evento del ID_vehiculo que incluya ubicación
         (ej. última función operativa con coordenadas)

4. Sin ningún dato de ubicación para el vehículo
      → coordenadas del terminal físico (si disponibles por IP/WiFi)

5. Sin ningún dato de localización disponible
      → coordenadas almacenadas como NULL
      → campo marcado visualmente en UI: "Ubicación no disponible"
      → el registro se guarda igualmente; la ausencia de coordenadas
         no bloquea la operación
```

**Regla de coherencia:**

* El fallback se aplica **silenciosamente** en pasos 2–4 (no molesta al usuario).
* Solo en el paso 5 se muestra el aviso "Ubicación no disponible" en UI.
* Si el GPS se recupera antes de guardar, se usa el valor real.

---

## 6. Inventario — operaciones atómicas

### 6.1 Por qué RPC/triggers (nunca async client)

Si dos terminales ejecutan simultáneamente una deducción de stock sobre el mismo ítem:

```
Terminal A: Lee stock_real = 10, escribe 10 - 3 = 7
Terminal B: Lee stock_real = 10, escribe 10 - 5 = 5
Resultado en BBDD: 5   ← INCORRECTO (debería ser 2)
```

Para evitarlo, **toda operación de stock es una función PostgreSQL atómica**:

```sql
-- Ejemplo conceptual de RPC para Doc-6
CREATE FUNCTION registrar_gasto_material(
  p_location_id TEXT,
  p_item_id     TEXT,
  p_cantidad    INT,
  p_id_nombre   TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE inventario
    SET stock_real = stock_real - p_cantidad
  WHERE location_id = p_location_id
    AND item_id = p_item_id
    AND stock_real >= p_cantidad;  -- guard atómico

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stock insuficiente o location no encontrado';
  END IF;

  INSERT INTO auditoria_inventario (...) VALUES (...);
END;
$$ LANGUAGE plpgsql;
```

El cliente llama `supabase.rpc('registrar_gasto_material', {...})` y solo interpreta el resultado.
Nunca calcula el nuevo stock en el cliente.

### 6.2 Operaciones que usan RPC/trigger

| Operación | Documento | Descripción |
|---|---|---|
| Deducción de stock | Doc-6 | Descuenta cantidad del location origen |
| Transferencia (reserva) | Doc-10 emit | Mueve a `inventario_en_transito` |
| Confirmación recepción | Doc-10 confirm | Suma al location destino, cierra tránsito |
| Repostaje combustible | — | Registra entrada en Doc-8, sin cambio de inventario de ítems |
| Reconciliación DRP | cierre subinventario | Ver §11 |

### 6.3 Inventario en tránsito

Al emitir un Doc-10:

1. La cantidad queda en `inventario_en_transito` (restada del origen, no sumada aún al destino).
2. El stock del location origen se refleja **sin** esa cantidad.
3. Solo al confirmar recepción (o al detectar discrepancia) se cierra el tránsito.

---

## 7. Inventario — generación de descuadres

Un **descuadre** se genera automáticamente cuando la cantidad física recibida difiere
de la enviada en un Doc-10.

### 7.1 Flujo de generación

```
Receptor abre Doc-10 en bandeja_entrada_logistica_drp
  → Revisa ítem a ítem la cantidad recibida
  → Si cantidades coinciden → Doc-10 pasa a Completado
      → Stock sumado al destino via RPC

  → Si hay discrepancia en algún ítem:
      → Receptor introduce la cantidad real recibida
      → Sistema calcula diferencia: enviado - recibido
      → RPC ejecuta:
          1. Suma al destino SOLO la cantidad confirmada recibida
          2. INSERT en descuadres_inventario con la diferencia
          3. Doc-10 pasa a Descuadre_Pendiente_Revision
          4. Notificación automática a bandeja_entrada_logistica
             (flujo estándar, estado Emitida_Pendiente)
      → registra timestamp_confirmacion e ID_nombre_receptor_confirmador
```

### 7.2 Campos del descuadre generado

```
descuadres_inventario:
  id                    UUID
  id_doc10_origen       UUID         (referencia al Doc-10)
  ID_item               TEXT
  categoria             TEXT
  nombre                TEXT
  especificacion        TEXT
  cantidad_enviada      INT
  cantidad_recibida     INT
  diferencia            INT          (cantidad_enviada - cantidad_recibida)
  ID_origen             TEXT
  ID_destino            TEXT
  timestamp_generado    TIMESTAMPTZ
  estado                TEXT         (Pendiente_Revision | Resuelto | Archivado)
  ID_nombre_resolutor   TEXT         NULL hasta resolución
  timestamp_resolucion  TIMESTAMPTZ  NULL hasta resolución
```

### 7.3 Resolución de descuadres

Desde `black_column → Logística → Descuadres`:

* **Resolver_Manual**: logística registra la resolución (causa + acción tomada).
  Registra `ID_nombre_resolutor` y `timestamp_resolucion`. Estado → `Resuelto`.
* **Archivar**: cierra el descuadre sin resolución formal. Estado → `Archivado`.

Los descuadres no bloquean operaciones posteriores — solo requieren gestión manual.

---

## 8. Inventario — alertas de stock mínimo

### 8.1 Condición de disparo

Cuando `stock_real` de cualquier ítem en cualquier location cae por debajo de su
`stock_objetivo` (umbral mínimo configurable), el sistema genera una alerta automática.

```
AFTER UPDATE ON inventario
  IF NEW.stock_real < NEW.stock_objetivo THEN
    INSERT INTO notificaciones_bandeja (
      destino  = 'bandeja_entrada_logistica',
      tipo     = 'alerta_stock_minimo',
      payload  = { location_id, item_id, stock_real, stock_objetivo }
    );
  END IF;
```

### 8.2 Durante un DRP

* Si la alerta afecta a un location asignado al DRP activo (vehículo, backpack, subinventario DRP):
  → Alerta también a `bandeja_entrada_logistica_drp`.
* Las alertas en `bandeja_entrada_logistica_drp` son **solo lectura** (sin acciones de estado).
  Solo informativas para el equipo logístico en el DRP.

### 8.3 Configuración de umbrales

* `stock_objetivo` es configurable por ítem y por location desde `inventario_maestro`.
* Un `stock_objetivo = 0` deshabilita la alerta para ese ítem en ese location.
* Los umbrales no se heredan automáticamente del catálogo — cada location tiene los suyos.

---

## 9. Inventario — reconciliación subinventario DRP

Al cerrar un módulo PSA o al finalizar el DRP vinculado:

```
1. El subinventario ID_DRP pasa automáticamente a estado En_Transito
     → trigger en cierre de módulo PSA o en finalización del DRP

2. Logística verifica el stock físico restante contra el sistema
     → entran al subinventario en la vista logística
     → ajustan manualmente si hay diferencias

3. Tras la verificación, logística confirma la reconciliación
     → subinventario ID_DRP pasa a Operativo
     → disponible para ser asignado a un nuevo DRP o PSA

4. Si el stock ajustado no coincide con el sistema → descuadre generado
     → mismo flujo que §7 (Descuadre_Pendiente_Revision)
```

**Restricción:** Un subinventario en estado `En_Transito` no puede asignarse a un nuevo DRP/PSA
hasta completar la reconciliación.

---

## 10. DRP — reglas de transición automática

Solo dos transiciones del DRP ocurren automáticamente (sin acción del usuario):

### 10.1 En_espera → En_preparacion

Se activa lo que ocurra **primero**:

```
OPCIÓN A (job programado Supabase):
  cron_job: cada minuto, busca DRP en estado En_espera
    donde timestamp_drp - NOW() <= 60 minutos
  → DRP pasa a En_preparacion
  → timestamp_inicio_preparacion = NOW()

OPCIÓN B (primera dotación unida):
  ON INSERT en drp_dotaciones WHERE drp_id = X
    IF count(dotaciones) = 1 AND estado_DRP = 'En_espera'
    → UPDATE drp SET estado = 'En_preparacion',
                     timestamp_inicio_preparacion = NOW()
```

### 10.2 Finalizado → Archivado

```
cron_job: cada hora, busca DRP en estado Finalizado
  donde NOW() - timestamp_finalizacion >= 48 horas
  → DRP pasa a Archivado
  → timestamp_archivado = NOW()
  → Fuerza sincronización final con Supabase
```

### 10.3 Aviso de DRP no activado

```
cron_job: en cada minuto
  busca DRP en estado En_preparacion
    donde timestamp_programado_inicio <= NOW()
    y estado != 'En_curso'
  → genera notificación push a todos los terminales en el DRP:
    "Aviso: el DRP [nombre_drp] no ha sido activado. Contactar con coordinación."
  → genera notificación en bandeja_entrada_coordinacion
  → marca DRP con flag aviso_enviado = TRUE para no repetir
```

---

## 11. DRP — entrada y salida de dotaciones

### 11.1 Regla fundamental: siempre acción manual

Ningún ID_nombre, ID_vehiculo ni ID_backpack entra o sale de un DRP de forma automática.
No hay trigger de "si el vehículo está cerca entra al DRP". Todo es explícito.

### 11.2 Entrada (dos modalidades)

**Opción A — Entrar con vehículo:**

```
1. Modal de confirmación muestra exactamente quién entra:
   - ID_vehiculo + matrícula
   - Todos los ID_nombre con checkin_on emparejados EN ESE MOMENTO
2. Confirmar → INSERT en drp_dotaciones por cada elemento
3. Cada elemento registra su timestamp_entrada_drp individual
4. Si DRP estaba En_espera y es la primera dotación → ver §10.1 opción B
```

**Opción B — Entrar a pie:**

```
1. Solo el ID_nombre seleccionado entra. Sin vehículo.
2. Modal de confirmación muestra el ID_nombre.
3. Confirmar → INSERT en drp_personal_a_pie
4. Registra timestamp_entrada_drp del ID_nombre
```

### 11.3 Salida (dos modalidades)

**Opción A — Salir con vehículo:**

```
Salen ID_vehiculo + TODOS los ID_nombre emparejados en ese momento.
Registra timestamp_salida_drp individual por elemento.
```

**Opción B — Salir individualmente:**

```
Solo el ID_nombre seleccionado sale.
El vehículo permanece en el DRP.
```

### 11.4 Checkout desde terminal (flujo_checkout_automatico)

Si un pilot hace checkout mientras su vehículo está en un DRP activo:

```
flujo_checkout_automatico → paso 3: Salida de DRP
  → timestamp_salida_drp para el ID_vehiculo
  → timestamp_salida_drp para todos los ID_nombre emparejados en ese momento
  → equivale a "Salir con vehículo" desde visor_drp
```

Ver `componentes.md → flujo_checkout_automatico` para el flujo completo.

---

## 12. DRP — finalización con dotaciones activas

Al ejecutar "Finalizar DRP" desde `resumen_drp`:

```
1. Dotaciones que salieron vía visor_drp antes de finalizar:
   → Ya tienen su timestamp_salida_drp registrado. Sin cambio.

2. Dotaciones que siguen dentro al momento de finalizar:
   → Se les asigna automáticamente:
      timestamp_salida_drp = timestamp_finalizacion del DRP

3. Módulos activos (PSA, filiación) al momento de finalizar:
   → Cerrar_módulo_PSA ejecutado automáticamente
      → timestamp_cierre_modulo = timestamp_finalizacion
      → subinventario ID_DRP pasa a En_Transito (ver §9)
   → Cerrar_módulo_filiacion ejecutado automáticamente
      → timestamp_cierre_modulo = timestamp_finalizacion

4. Doc-1 pasa a estado Finalizado_Cerrado.
   → Ya no se pueden añadir asistencias.

5. Aviso automático si el DRP finaliza antes de la hora programada
   o si no tenía dotaciones activas al finalizar:
   → Notificación a bandeja_entrada_coordinacion:
     "Aviso: el DRP [nombre_drp] ha finalizado antes de la hora programada."
```

### 12.1 Cancelación vs Finalización

| Condición | Cancelar DRP | Finalizar DRP |
|---|---|---|
| Doc-1 sin asistencias | Permitido | Permitido |
| Doc-1 con asistencias | **Bloqueado** | Permitido |
| Efecto | El DRP desaparece del sistema | DRP pasa a Finalizado, visible para consulta |

---

## 13. Doc-1 — escritura multi-terminal concurrente

Varios terminales en el mismo DRP pueden añadir asistencias simultáneamente al mismo Doc-1.

### 13.1 Modelo de concurrencia

* Cada asistencia es un INSERT independiente (append-only).
* No hay UPDATE ni DELETE sobre entradas existentes.
* No hay conflicto de escritura posible (no se modifica la misma fila).
* La ordenación es por `timestamp_registro` (UTC).

### 13.2 Sincronización en tiempo real

* Doc-1 activo se suscribe via **Supabase Realtime** (canal del DRP).
* Cuando cualquier terminal hace INSERT en asistencias → todos los terminales
  suscritos reciben el evento y actualizan su vista local inmediatamente.
* Si un terminal está offline cuando ocurre el INSERT remoto → al reconectarse,
  TanStack Query invalida el cache y re-fetches el estado completo del Doc-1.

### 13.3 Inmutabilidad

```
RLS Policy en tabla doc1_asistencias:
  INSERT: permitido si user tiene rol operativo y DRP está En_curso
  UPDATE: denegado para todos los roles
  DELETE: denegado para todos los roles
```

---

## 14. Doc-8 — ciclo automático

El parte de trabajo (Doc-8) registra automáticamente todos los eventos del turno.

### 14.1 Creación y cierre

```
Creación: al activar el primer ID_vehiculo del turno
  → Doc-8 creado en estado Borrador_En_Curso
  → Bloque_Sesion abierto: { km_inicio, timestamp_checkin }

Cierre: flujo_checkout_automatico paso 4
  → km_fin registrado
  → timestamp_checkout registrado
  → Todos los bloques de estado abiertos cerrados con timestamp_fin
  → Doc-8 pasa a Enviado_Cerrado
```

### 14.2 Eventos que escriben automáticamente en Doc-8

| Evento | Entrada en Doc-8 |
|---|---|
| Cambio de función operativa (Ruta, Estacionado, etc.) | timestamp_inicio y timestamp_fin del estado |
| Entrada/salida de DRP | timestamp_entrada_drp / timestamp_salida_drp |
| Repostaje combustible | km_marcador, litros, euros (si aplica), ubicación |
| Repostaje AdBlue | km_marcador |
| Función operativa asignada por RRHH (Programado, DRP, etc.) | registrada como estado base del bloque |

### 14.3 Regla de bloque abierto

Si el checkout del pilot se hace sin cerrar manualmente la función operativa activa
(ej. vehículo en `Ruta`), el `flujo_checkout_automatico` cierra el bloque activo con
`timestamp_fin = timestamp_checkout`. No se dejan bloques abiertos en el Doc-8 cerrado.

---

## 15. Checkout automático — pilot (flujo_checkout_automatico)

Ver `componentes.md → flujo_checkout_automatico` para el flujo completo.

### 15.1 Condición de disparo

ID_nombre con estado `pilot` activo sobre un `ID_vehiculo` ejecuta `check_out`.

### 15.2 Regla de km_fin obligatorio

El modal de `km_fin` **bloquea** el checkout. No se puede continuar sin introducirlo.
Esto garantiza que Doc-8 siempre cierra con el dato del odómetro final.

### 15.3 Implicaciones sobre carries

Al ejecutar el checkout del pilot:

1. Los carries emparejados son **desemparejados automáticamente** de ese vehículo.
2. **Excepción:** si un carry desea permanecer emparejado al vehículo en `en_espera`
   (porque el pilot vuelve, o por razón operativa), puede indicarlo explícitamente
   durante el flujo de checkout del pilot.

---

## 16. Regla carry sin pilot

Un ID_nombre puede quedar en estado `carry` sobre un vehículo que está en `en_espera`
(sin pilot asignado). Esto es **permitido** y tiene el siguiente comportamiento:

```
Condición: ID_vehiculo en estado En_espera + ID_nombre en estado carry
  → El vehículo NO puede activarse (requires pilot)
  → El carry permanece emparejado y visible en visual_info_home
  → El carry puede:
      A. Promoverse a pilot desde visual_info_home (icono swap)
         → El vehículo pasa a Activado si se introduce km_inicio
      B. Desemparejarse manualmente (icono -)
  → El vehículo con carry pero sin pilot NO está en Doc-8 activo
```

**Caso de uso habitual:** el pilot hace checkout al terminar su turno. El carry
pertenece a un turno posterior y prefiere quedar emparejado al mismo vehículo.

---

## 17. Offline — cola de mutaciones

### 17.1 Modelo general

```
Mutación iniciada en cliente
  → ¿Hay conexión? → SÍ → ejecutar directo contra Supabase
                   → NO → encolar en IndexedDB (mutation queue)

Al recuperar conexión:
  → Service Worker / background sync dispara el replay
  → Mutaciones ejecutadas en orden FIFO
  → Si alguna falla (conflicto, RLS) → marcada como failed
  → UI notifica al usuario: "N acciones pendientes de sincronización"
```

### 17.2 Mutaciones que SÍ soportan cola offline

| Tipo | Documento | Notas |
|---|---|---|
| Crear asistencia | Doc-1 | UUID pre-generado en cliente |
| Guardar informe | Doc-2, Doc-3, Doc-4, Doc-5 | UUID pre-generado en cliente |
| Guardar aviso | Doc-11 | |
| Registrar gastos (sin stock) | Doc-6 metadata | Solo el registro; el stock se aplica al reconectar via RPC |
| Envío de material (sin stock) | Doc-10 metadata | Ídem |

### 17.3 Mutaciones que NO soportan cola offline

| Tipo | Motivo |
|---|---|
| Cambio real de stock (Doc-6 RPC) | Requiere transacción atómica en Supabase |
| Confirmación recepción Doc-10 | Ídem |
| Login / check-in | Requiere validación JWT en tiempo real |
| Generación de token de emergencia | Requiere reautenticación |
| Cambio de estado DRP | Requiere sincronización inmediata multi-terminal |

### 17.4 UUIDs pre-generados en cliente

Para soportar creación offline, los IDs de nuevos registros se generan en el cliente
antes de persistir en Supabase:

```typescript
// Usar crypto.randomUUID() (Web Crypto API, disponible en todos los modernos)
const newId = crypto.randomUUID(); // UUID v4 válido

// Al sincronizar: Supabase usa este UUID como PK
// Si hay colisión (extremadamente improbable): marcado como failed en cola
```

---

## 18. Avisos automáticos del sistema

Todos los avisos se generan via trigger o Edge Function en Supabase y
se entregan a través de Supabase Realtime a los terminales afectados.

| Condición | Mensaje | Destino |
|---|---|---|
| DRP en `En_preparacion` a la hora de inicio programada | "Aviso: el DRP [nombre] no ha sido activado. Contactar con coordinación." | Todos los terminales en el DRP + `bandeja_entrada_coordinacion` |
| DRP finalizado antes de la hora programada | "Aviso: el DRP [nombre] ha finalizado antes de la hora programada." | `bandeja_entrada_coordinacion` |
| Stock_real < stock_objetivo | "Alerta de stock mínimo: [ítem] en [location]." | `bandeja_entrada_logistica` (y `bandeja_entrada_logistica_drp` si aplica) |
| Doc-10 con discrepancia | "Descuadre pendiente de revisión: Doc-10 [id]." | `bandeja_entrada_logistica` |
| PIN de emergencia no consumido próximo a expirar | (no aplica — PIN se genera y comparte por canal externo) | — |
| DRP finaliza con dotaciones activas | Timestamps automáticos aplicados | Sin aviso adicional al usuario |

---

## 19. Repostaje — integración con Doc-8

### 19.1 Repostaje combustible

```
Usuario abre Repostar combustible desde black_column
  → Formulario: km_marcador (obligatorio) + litros (obligatorio)
  → Toggle ubicación:
      Gasolinera: además solicita euros (obligatorio)
      Base:       solo km y litros
  → Guardar:
      → INSERT en doc8_eventos tipo 'repostaje_combustible'
        { km_marcador, litros, euros?, ubicacion_tipo, timestamp }
      → No afecta inventario de ítems del catálogo
        (el combustible no está en catalogo_items)
```

### 19.2 Repostaje AdBlue

```
Usuario abre Repostar AdBlue
  → Toggle: ¿Ha repuesto AdBlue?
      SÍ: solicita km_marcador (obligatorio)
      NO: no hace nada (usuario cancela)
  → Guardar:
      → INSERT en doc8_eventos tipo 'repostaje_adblue'
        { km_marcador, timestamp }
      → El repostaje es considerado siempre completo (no se registran litros)
```

---

## 20. Módulo filiación — reglas de concurrencia de box

Dentro de `modulo_filiacion`, varios boxes pueden atender pacientes simultáneamente.

```
perfil_boxes selecciona box número N (1–10)
  → Cada box opera independientemente
  → Lista de pacientes en espera es compartida (Supabase Realtime)
  → Al abrir un paciente desde un box:
      → estado del paciente pasa a en_consulta
      → ID_nombre_box registrado
      → El paciente DESAPARECE de la lista de espera en TODOS los boxes
        (via Realtime) — evita que dos boxes abran el mismo paciente

  → Si dos boxes intentan abrir el mismo paciente simultáneamente:
      → El primero que ejecuta el UPDATE a en_consulta gana
      → El segundo recibe un error de la RLS/trigger: "paciente ya en consulta"
      → UI muestra: "Este paciente ya está siendo atendido en otro box"
```

**Regla de asignación de orden:**
El `orden` de atención (campo numérico en admisión) puede modificarse manualmente
por el perfil_admision mientras el paciente está en `en_espera`. Una vez que pasa
a `en_consulta`, el orden es inmutable.

---

## 21. Selector de perfil en módulo filiación

Al entrar al módulo filiación, el sistema presenta selección de perfil:

```
¿Qué perfil vas a usar?
  [ perfil_admision ]    → acceso al formulario de admisión
  [ perfil_boxes ]       → selector de número de box (1–10)
                           → acceso al monitor de espera de ese box
```

* Un mismo ID_nombre puede cambiar de perfil cerrando el módulo y volviendo a entrar.
* No hay bloqueo de perfil — el mismo ID_nombre puede abrir ambos perfiles en terminales distintos.

---

## 22. Descuadre de activación — DRP sin hora de inicio pasada

Si al activar manualmente el DRP (`En_preparacion → En_curso`) la hora actual
es **anterior** a la hora de inicio programada:

```
Sistema pregunta (modal de confirmación):
  "La hora de inicio programada es [hora]. ¿Qué deseas hacer?"

  [ Cuenta atrás ]                → DRP pasa a En_curso
                                     UI muestra contador regresivo hasta hora programada
                                     No afecta a dotaciones ni recursos

  [ Marcar hora de inicio actual ] → timestamp_inicio_curso = NOW()
                                     La hora programada queda como referencia histórica
                                     DRP operativo desde ya
```

---

## 23. Periodo de vacaciones — activación y visibilidad de Doc-12

```
Estado inicial: periodo vacaciones Oculto
  → Doc-12 no visible en ninguna parte de la UI

RRHH/Gerencia activa desde:
  black_column → Gestión y RRHH → Gestión de turnos → vacaciones → Activar periodo

  → Estado cambia a Activado
  → Doc-12 aparece en Tablón central (icono standalone, accesible a TODOS los roles)
  → useGlobalStore.periodoVacacionesActivo = true (Supabase Realtime → todos los terminales)

Al desactivar:
  → Doc-12 desaparece del Tablón central
  → Las solicitudes ya enviadas (Doc-12 en BBDD) no se eliminan
  → RRHH las gestiona desde bandeja_entrada_rrhh
```

**Nota:** El formulario Doc-12 en `black_column → Gestión y RRHH → Doc-12` no es
para que el empleado solicite vacaciones — es la acción de activación/desactivación
del periodo por parte de RRHH/Gerencia.
