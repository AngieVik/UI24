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
| Repostaje combustible | — | Registra en `eventos_fisicos_vehiculo` (ver §19), sin cambio de inventario de ítems |
| Reconciliación DRP | cierre subinventario | Ver §11 |

### 6.4 Coherencia automática: archivado de ítems del catálogo

Cuando un ítem del catálogo se archiva (`archivado = true`), no debe permanecer
en ninguna plantilla de stock estándar. De lo contrario, el siguiente despliegue
basado en esa plantilla fallaría al intentar asignar un ítem inexistente.

**Trigger `trg_purgar_plantillas_al_archivar`:**

```sql
-- Se dispara AFTER UPDATE ON catalogo_items
-- Condición: NEW.archivado = TRUE AND OLD.archivado = FALSE

CREATE OR REPLACE FUNCTION fn_purgar_plantillas_al_archivar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archivado = TRUE AND (OLD.archivado IS DISTINCT FROM TRUE) THEN
    DELETE FROM plantillas_stock
    WHERE item_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purgar_plantillas_al_archivar
  AFTER UPDATE ON catalogo_items
  FOR EACH ROW EXECUTE FUNCTION fn_purgar_plantillas_al_archivar();
```

**Comportamiento:**
* El ítem desaparece automáticamente de **todas** las plantillas genéricas existentes.
* Las plantillas afectadas quedan con el ítem simplemente eliminado de su lista —
  no se invalida la plantilla entera.
* Los subinventarios ya desplegados (con stock real asignado) **no se ven afectados**:
  el trigger solo actúa sobre `plantillas_stock`, no sobre `inventario`.
* Ninguna Edge Function ni código cliente necesita ejecutar esta limpieza manualmente.
  Es atómica y se garantiza en la misma transacción que el archivado del ítem.

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

* **Resolver_Manual** — llama obligatoriamente a una Función RPC que fuerza la clasificación contable del descuadre antes de cerrarlo. El operario debe elegir una de dos opciones mutuamente excluyentes:

  **Opción A — Pérdida / Rotura**

  ```
  El operario indica: "El material está perdido o inutilizable."
  RPC ejecuta en transacción atómica:
    1. stock_real no se modifica (material definitivamente fuera del sistema)
    2. INSERT auditoria_inventario:
         tipo_movimiento    = 'merma'
         cantidad_delta     = -(diferencia)           ← negativo: baja contable
         ID_origen          = descuadre.ID_origen
         motivo             = 'descuadre_resuelto_perdida'
         ID_nombre_resolutor, timestamp_resolucion
    3. descuadre → Resuelto
  ```

  **Opción B — Recuperación**

  ```
  El operario indica: "El material se ha localizado / recuperado."
  El operario selecciona el destino de la recuperación:
    → ID_origen  (vuelve al location de origen del envío)
    → ID_destino (se acredita en el location de destino)

  RPC ejecuta en transacción atómica:
    1. UPDATE stock_real += diferencia  en el location elegido
    2. INSERT auditoria_inventario:
         tipo_movimiento         = 'recuperacion_descuadre'
         cantidad_delta          = +(diferencia)       ← positivo: alta contable
         ID_destino_recuperacion = location elegido
         ID_nombre_resolutor, timestamp_resolucion
    3. descuadre → Resuelto
  ```

* **Archivar**: cierra el descuadre sin clasificación contable. Estado → `Archivado`.
  No genera entrada en `auditoria_inventario`. Para casos donde el descuadre no requiere
  acción contable (ej. error de registro ya corregido por otros medios).

> La clasificación contable es obligatoria en `Resolver_Manual` para garantizar la
> trazabilidad de mermas y recuperaciones. El RPC impide cerrar el descuadre sin
> haber elegido el destino del material.

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
* Las alertas de stock mínimo en `bandeja_entrada_logistica_drp` se renderizan con `isReadOnly=true`
  (ver `componentes.md → flujos_transicion → Modo isReadOnly`). El personal de campo recibe
  la información sin necesidad de gestionar manualmente el archivado de la notificación.
  El mensaje desaparece automáticamente al cerrar el modal — sin transición a `Solucionada_Archivada`.

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

### 9.1 Reasignación condicionada — estado Operativo_Condicionado

Cuando un subinventario se requiere urgentemente antes de que logística complete el cuadre,
el sistema no bloquea el recurso material. En cambio, ofrece una reasignación condicionada.

#### Estructura de datos: tabla `snapshots_reconciliacion`

Un escalar (`stock_inicio_condicionado`) sería insuficiente: si el nuevo DRP finaliza antes
de que logística resuelva el primer descuadre, se generaría un segundo snapshot que
sobrescribiría el primero, corrompiendo la auditoría. La solución es una tabla relacional
que apila snapshots en orden FIFO:

```sql
snapshots_reconciliacion:
  id                UUID          PK
  subinventario_id  TEXT          -- ej. 'ID_DRP3'
  drp_origen_id     UUID          -- DRP cuya reconciliación fue interrumpida
  drp_destino_id    UUID NULL     -- DRP al que se reasignó el subinventario
  stock_snapshot    JSONB         -- { [item_id]: stock_real en el momento del snapshot }
  created_at        TIMESTAMPTZ   -- orden FIFO obligatorio
  estado            TEXT          -- 'pendiente' | 'resuelto' | 'resuelto_por_transferencia'
  resolved_at       TIMESTAMPTZ NULL
  resolved_by       TEXT NULL     -- ID_nombre_resolutor
```

**Regla FIFO:** logística debe resolver los snapshots en orden `created_at ASC`.
No se puede resolver un snapshot más reciente mientras exista uno anterior en estado `pendiente`.
El sistema bloquea la acción y muestra: "Hay una reconciliación anterior pendiente del DRP [nombre]. Resuélvela primero."

#### Flujo de reasignación condicionada

```
Petición de asignación de subinventario en estado En_Transito a nuevo DRP/PSA:

  → Modal:
    "El subinventario [ID] tiene una reconciliación pendiente del DRP [nombre].
     ¿Reasignar igualmente?
     El stock registrado actualmente se tomará como stock de referencia del nuevo DRP.
     La responsabilidad del descuadre pasa a la nueva dotación."

  → SÍ:
      1. UPDATE snapshots_reconciliacion
              SET estado = 'resuelto_por_transferencia', resolved_at = NOW()
            WHERE subinventario_id = $1
              AND estado = 'pendiente'
         — Cierra automáticamente cualquier snapshot pendiente del DRP anterior.
           La nueva dotación asume ciegamente el stock_real teórico actual como
           punto de partida, sin responsabilidad contable por el DRP anterior.

      2. INSERT en snapshots_reconciliacion:
           { subinventario_id,
             drp_origen_id    = nuevo_drp_id,
             drp_destino_id   = NULL,           -- se rellena cuando el nuevo DRP finalice
             stock_snapshot   = stock_real actual por ítem,
             estado           = 'pendiente' }
         — Este snapshot es el ÚNICO que logística verá en su cola activa.
           Cuando el nuevo DRP finalice y el subinventario regrese a base,
           logística ejecutará un único cuadre contra este snapshot.
           Cualquier merma acumulada (del DRP anterior + del nuevo DRP)
           aflorará en ese momento — responsabilidad técnica de la última dotación.

      3. Subinventario → Operativo_Condicionado (transitorio)
      4. Asignación al nuevo DRP/PSA ejecutada → Asignado

  → NO:
      Subinventario permanece en En_Transito hasta que logística complete el cuadre.
```

#### Reconciliación única al retorno

```
Logística abre la cola de snapshots para un subinventario al regresar a base:
  → Solo muestra entradas con estado = 'pendiente'
  → Los snapshots con estado = 'resuelto_por_transferencia' son visibles en
     el historial de auditoría pero NUNCA aparecen en la cola activa de tareas

Por diseño, un subinventario siempre tiene como máximo UN snapshot 'pendiente':
  → Cada reasignación condicionada cierra el snapshot anterior por transferencia
     antes de abrir uno nuevo

Al resolver el snapshot activo:
  1. Logística compara el stock_real físico contra el stock_snapshot del entry
  2. Cualquier diferencia cubre la merma acumulada de TODOS los DRP que
     manejaron el subinventario desde el último cuadre completo
  3. Si hay diferencia → se aplica el flujo de §7 (Descuadre_Pendiente_Revision)
     con responsabilidad asignada a la última dotación (drp_origen_id del snapshot)
  4. snapshot → estado = 'resuelto', resolved_at, resolved_by registrados
  5. El subinventario pasa a Operativo y queda disponible para nuevas asignaciones
```

Transiciones del estado condicionado:
```
En_Transito            → Operativo_Condicionado  (reasignación aceptada, snapshot apilado)
Operativo_Condicionado → Asignado                (asignación inmediata al nuevo DRP)
Asignado (condicionado)→ Asignado                (snapshot resuelto, descuadre transferido)
En_Transito            → Operativo_Condicionado  (posible segunda vez si el nuevo DRP
                                                  también finaliza antes del cuadre —
                                                  segundo snapshot apilado en cola FIFO)
```

Ver `estados.md §7` para el mapa completo de transiciones del subinventario.

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

### 13.3 Inmutabilidad — RLS incondicional

La tabla `doc1_asistencias` está **completamente aislada** de las políticas RLS genéricas
aplicadas a los documentos clínicos (Doc-2 al Doc-5). La regla "Creador en Borrador" para
UPDATE no existe en esta tabla — Doc-1 no tiene estado Borrador.

```sql
-- Política RLS para doc1_asistencias (UPDATE)
CREATE POLICY "doc1_asistencias_no_update" ON doc1_asistencias
  FOR UPDATE USING (FALSE);   -- RETURNS FALSE INCONDICIONAL. Todos los roles denegados.

-- Política RLS para doc1_asistencias (DELETE)
CREATE POLICY "doc1_asistencias_no_delete" ON doc1_asistencias
  FOR DELETE USING (FALSE);   -- RETURNS FALSE INCONDICIONAL. Todos los roles denegados.

-- Política RLS para doc1_asistencias (INSERT)
CREATE POLICY "doc1_asistencias_insert" ON doc1_asistencias
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_claims' ->> 'can_create_clinical_docs')::boolean = true
    OR
    (auth.jwt() -> 'app_claims' ->> 'can_view_drp')::boolean = true
    -- Adicionalmente: DRP debe estar en estado 'En_curso' (validado via JOIN o RPC)
  );
```

La inmutabilidad es **criptográfica a nivel de motor SQL**, no dependiente de la capa
de aplicación ni de claims. Ni coordinación ni gerencia pueden modificar ni eliminar
entradas de asistencia — independientemente de sus claims.

Ver `rbac_y_permisos.md §5` para la anotación en la matriz de permisos.

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
| Función operativa asignada por RRHH (Programado, DRP, etc.) | registrada como estado base del bloque |

**Nota:** los repostajes de combustible y AdBlue ya **no** escriben en `doc8_eventos`.
Se registran en la tabla independiente `eventos_fisicos_vehiculo` (ver §19). La interfaz
del Doc-8 muestra estos eventos mediante un JOIN sobre esa tabla cuando hay un Doc-8
abierto, pero no los almacena como entradas propias del parte de trabajo.

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

### 15.3 Estado final del vehículo — regla estricta

**El checkout del pilot transiciona SIEMPRE el vehículo a `en_espera`.** Nunca a `desactivado`.

Justificación: un entorno asistencial continuo no puede perder la disponibilidad del vehículo
como efecto secundario del cambio de turno del personal. La ambulancia permanece operativa y
disponible para un nuevo pilot de relevo. `desactivado` es una decisión operativa explícita
(retirada del vehículo del servicio), completamente independiente del ciclo de personal.

El Doc-8 se cierra al checkout del pilot (registrando km_fin). Si un nuevo pilot activa el
vehículo posteriormente, se abre un nuevo Doc-8 independiente para ese turno.

### 15.4 Implicaciones sobre carries

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
| Registrar gastos (sin stock) | Doc-6 metadata | Stock descontado localmente por optimismo; RPC reconcilia al reconectar |
| **Informe de avería** | **Doc-7** | `condicion_tecnica` cambia optimistamente en Zustand de forma inmediata. El Doc-7 se encola en IndexedDB. Al reconectar: Doc-7 persiste en Supabase y, si `condicion_tecnica = inoperativo_critico`, el vehículo queda bloqueado globalmente vía Realtime. |

### 17.3 Mutaciones que NO soportan cola offline

| Tipo | Motivo |
|---|---|
| Cambio real de stock (Doc-6 RPC) | Requiere transacción atómica en Supabase |
| **Emisión Doc-10 (envío de material)** | Requiere guard atómico `stock_real >= p_cantidad` en el momento exacto de la transferencia. Un Doc-10 encolado offline podría ejecutarse después de que otro terminal haya consumido el stock, generando stock negativo. Conexión sincrónica obligatoria. |
| Confirmación recepción Doc-10 | Requiere transacción atómica en Supabase |
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

## 19. Eventos físicos del vehículo — tabla `eventos_fisicos_vehiculo`

Los repostajes y mantenimientos son eventos físicos del vehículo, no del turno
del pilot. Se registran en una tabla propia referenciada por `ID_vehiculo` y
**no por Doc-8**. Esto permite:

* Consultar el historial físico de un vehículo con independencia de qué
  pilots lo han conducido o si había Doc-8 abierto.
* Evitar que el cierre de un Doc-8 deje huérfanos eventos que no pertenecen
  semánticamente al turno.

```sql
eventos_fisicos_vehiculo:
  id              UUID          PK
  id_vehiculo     TEXT          FK → vehiculos
  tipo_evento     TEXT          -- 'repostaje_combustible' | 'repostaje_adblue'
                                --   | 'mantenimiento_preventivo' | 'incidencia_tecnica'
  km_marcador     INT NULL
  litros          NUMERIC NULL
  euros           NUMERIC NULL
  ubicacion_tipo  TEXT NULL     -- 'gasolinera' | 'base'
  notas           TEXT NULL
  doc8_id         UUID NULL     -- FK nullable → doc8 abierto en ese momento (JOIN cosmético)
  id_nombre       TEXT NULL     -- quien lo registró
  timestamp       TIMESTAMPTZ   -- automático (NOW())
```

**JOIN en Doc-8:** si hay un Doc-8 abierto cuando se registra el evento, el campo
`doc8_id` se rellena como referencia. La vista del parte de trabajo hace un `LEFT JOIN`
sobre `eventos_fisicos_vehiculo WHERE doc8_id = $1` para mostrar los eventos físicos
dentro del parte — pero son datos de la tabla externa, no entradas del Doc-8.

### 19.1 Repostaje combustible

```
Usuario abre Repostar combustible desde black_column
  → Formulario: km_marcador (obligatorio) + litros (obligatorio)
  → Toggle ubicación:
      Gasolinera: además solicita euros (obligatorio)
      Base:       solo km y litros
  → Guardar:
      → INSERT en eventos_fisicos_vehiculo tipo 'repostaje_combustible'
        { id_vehiculo, km_marcador, litros, euros?, ubicacion_tipo,
          doc8_id (si hay Doc-8 abierto), id_nombre, timestamp }
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
      → INSERT en eventos_fisicos_vehiculo tipo 'repostaje_adblue'
        { id_vehiculo, km_marcador,
          doc8_id (si hay Doc-8 abierto), id_nombre, timestamp }
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

---

## 24. Stock optimista local (Optimistic UI)

### 24.1 Motivación

Las operaciones de stock requieren un RPC en Supabase (atómico, §6).
En condiciones de red lenta o intermitente, el usuario percibe latencia
al registrar un Doc-6. El stock optimista elimina esa fricción visual
manteniendo la integridad atómica en la base de datos.

### 24.2 Modelo de doble capa

```
useInventarioStore (Zustand / localStorage):
  items[locationId][itemId]:
    stock_real_local:   number    ← valor optimista en caché
    sync_pending:       boolean   ← true mientras el RPC no confirma
    pending_delta:      number    ← cantidad descontada pendiente de confirmar
```

### 24.3 Flujo Doc-6 con stock optimista

```
Usuario registra gasto en Doc-6 (ítem X, cantidad N):

  PASO 1 — Descuento local inmediato (sin esperar red):
    useInventarioStore[location][item].stock_real_local -= N
    useInventarioStore[location][item].sync_pending = true
    useInventarioStore[location][item].pending_delta = N
    → UI muestra el nuevo valor con badge visual "⏳ sincronizando"

  PASO 2 — Llamada RPC (en paralelo):
    supabase.rpc('registrar_gasto_material', { location, item, cantidad: N })

  PASO 3a — RPC exitoso:
    stock_real_autorizado = respuesta del RPC (valor definitivo del servidor)
    useInventarioStore[location][item].stock_real_local = stock_real_autorizado
    useInventarioStore[location][item].sync_pending = false
    useInventarioStore[location][item].pending_delta = 0
    → Badge "⏳" desaparece

  PASO 3b — RPC falla (ej. stock insuficiente, error de red):
    useInventarioStore[location][item].stock_real_local += N  (revertir)
    useInventarioStore[location][item].sync_pending = false
    useInventarioStore[location][item].pending_delta = 0
    → UI muestra error: "No se pudo registrar el gasto. Inténtalo de nuevo."
    → El Doc-6 no se guarda
```

### 24.4 Reglas del stock optimista

* Solo aplica a **Doc-6** (gastos/deducciones unilaterales).
* **No aplica** a Doc-10 (transferencias multi-parte — el receptor también verá el impacto).
* Si hay múltiples Doc-6 pendientes de sync simultáneos sobre el mismo ítem,
  los `pending_delta` se acumulan en la capa local. El RPC los resuelve secuencialmente.
* El badge `sync_pending` es visible en la vista de inventario y en el formulario Doc-6.
* Tras recuperar red, `useOfflineQueue` puede disparar RPCs pendientes en cola.
  Al completarse, `stock_real_local` se reconcilia con el valor del servidor.
* **Invariante:** `stock_real_local` puede ser temporalmente incorrecto
  (optimismo). `stock_real` en Supabase siempre es la fuente de verdad.

---

## 25. Modo degradado read-only (acceso sin red)

### 25.1 Motivación

Las ambulancias operan en zonas sin cobertura. Si un terminal queda sin red,
el personal necesita acceso de consulta a información vital (inventario, doc8,
dotaciones DRP) sin poder escribir. El modo degradado lo permite sin comprometer
la integridad de datos.

### 25.2 Generación del hash de sesión (al inicio del turno)

Cuando un pilot hace check-in y activa el vehículo (turno iniciado con red disponible):

```
1. El servidor genera un payload firmado:
   {
     user_id:         ID_nombre,
     role:            string,
     claims_snapshot: { ...claims del JWT },
     shift_start:     ISOString,
     expires_at:      ISOString (shift_start + 36h),
     device_id:       fingerprint del terminal
   }

2. Firma: HMAC-SHA256 con clave rotante diaria (gestionada en Supabase Vault)

3. El payload firmado se guarda en localStorage:
   'u24_offline_session': base64(payload + signature)
```

### 25.3 Activación del modo degradado

Si al intentar autenticarse el terminal no tiene red:

```
1. El formulario terminal_check detecta timeout de red (> 5s)
2. Muestra opción: "Sin conexión — Acceso de consulta"
3. El usuario introduce su ID_nombre
4. El sistema busca 'u24_offline_session' en localStorage
5. Valida:
   - HMAC del payload con la clave diaria cached (también en localStorage)
   - expires_at > NOW()
   - device_id coincide con el terminal actual
6. Si válido:
   - Terminal pasa a estado_1 en modo DEGRADADO
   - Rol: solo lectura del snapshot de claims
   - Banner visible: "⚠️ Modo sin conexión — Solo lectura"
7. Si inválido o expirado:
   - Acceso denegado hasta recuperar red
```

### 25.4 Restricciones en modo degradado

| Operación | Disponible offline |
|---|---|
| Ver inventario (snapshot en localStorage) | ✅ |
| Ver Doc-8 activo (IndexedDB) | ✅ |
| Ver dotaciones DRP activo (localStorage) | ✅ |
| Ver bandejas (cache local) | ✅ (sin actualizaciones) |
| Registrar Doc-6 / Doc-10 | ❌ (requiere RPC) |
| Registrar asistencias Doc-1 / Doc-2 | ✅ (cola offline, §17) |
| Cambiar estado DRP | ❌ |
| Check-in / Check-out | ❌ |

### 25.5 Auditoría del acceso degradado

```
Al entrar en modo degradado:
  → INSERT en tabla offline_access_log (IndexedDB local):
    { user_id, timestamp_acceso, device_id, modo: 'degradado' }

Al recuperar red:
  → Sync automático: INSERT en tabla 'offline_access_log' en Supabase
  → El registro queda en auditoría permanente
```

---

## 26. Idle timeout para rol invitado

### 26.1 Condición de aplicación

Solo aplica cuando:
- `useTerminalStore.tipoSesion ∈ ['galleta_pequeña', 'galleta']`
- `useAuthStore.rolActivo === 'invitado'` (nadie ha hecho check-in aún)

### 26.2 Comportamiento

```
Inicio del timer: cuando el terminal entra a estado_1 con rol invitado
Duración: 20 minutos sin interacción con el DOM

Eventos que resetean el timer (cualquier interacción del usuario):
  - click, keydown, touchstart, mousemove, scroll

Al expirar el timer:
  1. useTerminalStore.estado → 'estado_0'
  2. Limpia useAuthStore (rol invitado eliminado)
  3. El estado del localStorage del terminal se preserva
  4. La cookie de emergencia en Supabase NO se destruye:
     - 'galleta_pequeña': permanece activa (puede reutilizarse con el mismo PIN)
     - 'galleta': permanece activa (cookie permanente)
  5. UI vuelve a estado_0: formulario de login centrado
  6. Si alguien introduce el PIN de emergencia de nuevo → vuelve a estado_1
```

### 26.3 Implementación (hook useIdleTimeout)

```typescript
// Solo se monta si tipoSesion es de emergencia y rol = 'invitado'
// Ver hooks.md § useIdleTimeout
```

### 26.4 Justificación

La cookie de emergencia **no se destruye** porque su propósito es hacer operativo
un terminal en situación de emergencia. Forzar al personal a regenerar el PIN
por una pantalla olvidada encendida sería un obstáculo operativo injustificado.
El timeout solo protege contra acceso no autorizado en un terminal desatendido.

---

## 27. Claims — inyección en el JWT

### 27.1 Flujo de generación de claims

```
Usuario se autentica → Supabase Auth emite JWT
  → Edge Function 'set_claims' ejecutada (Supabase Auth Hook):
      1. Lee user_id del token preliminar
      2. Consulta tabla user_profiles: { role }
      3. Mapea role → claims booleanos (ver rbac_y_permisos.md §2)
      4. Embebe claims en el JWT bajo la clave 'app_claims':
         { app_claims: { can_edit_inventory: true, can_view_drp: false, ... } }
  → JWT final contiene: { role, app_claims: { ... } }
```

### 27.2 Actualización de claims

Si el rol de un usuario cambia (RBAC panel en coordinación):
- El JWT activo no se invalida inmediatamente.
- Los nuevos claims se aplican al **siguiente JWT** emitido (refresh o nuevo login).
- Para forzar aplicación inmediata: `supabase.auth.refreshSession()` desde el cliente
  o revocar la sesión desde el panel de Supabase.

### 27.3 Claims en el frontend (cosmético)

```typescript
// En useAuthStore:
const claims = useAuthStore(s => s.claims)  // tipado desde el JWT

// En componentes:
if (claims.can_edit_inventory) {
  // mostrar botón de edición
}
```

Los claims en el frontend son solo cosméticos (para ocultar/mostrar UI).
Las políticas RLS en Supabase son la capa de seguridad real.

**Nota:** El formulario Doc-12 en `black_column → Gestión y RRHH → Doc-12` no es
para que el empleado solicite vacaciones — es la acción de activación/desactivación
del periodo por parte de RRHH/Gerencia.

---

## 28. Interceptor de estado: coherencia vehículo-DRP

### 28.1 Problema

Un vehículo puede salir físicamente del DRP (cambia de `activado` a `ruta` o `alerta`)
sin registrar su `timestamp_salida_drp`. Esto deja un registro inconsistente en PostgreSQL:
el vehículo figura como activo en el DRP mientras ya no forma parte operativa de él.

### 28.2 Condición de disparo

```
nuevoEstado ∈ { 'ruta', 'alerta' }
∧ vehiculo.timestamp_entrada_drp IS NOT NULL
∧ vehiculo.timestamp_salida_drp IS NULL
```

### 28.3 Flujo del interceptor (frontend — useVehiculo.setEstadoOperativo)

```
ANTES de ejecutar el cambio de estado:

1. Consultar useVehiculoStore[id]:
   - drpId = vehiculo.drpId
   - drpNombre = useDRPStore.getDRP(drpId).nombre_drp

2. Mostrar modal bloqueante:
   "El vehículo [ID_vehiculo] pertenece al DRP [nombre_drp].
    ¿Desea registrar su salida del dispositivo?"
   [Sí, salir del DRP] [No, cancelar]

3. SÍ → useDRP.salirConVehiculo(drpId, vehiculoId)
        Registra timestamp_salida_drp para:
          - ID_vehiculo
          - Todos los ID_nombre emparejados al vehículo en ese momento
        → Procede con el cambio de estado a 'ruta' o 'alerta'

4. NO → Aborta setEstadoOperativo. Estado permanece sin cambio.
        No se genera ninguna entrada en Doc-8.
```

### 28.4 Justificación

La integridad relacional en PostgreSQL requiere que cada `timestamp_entrada_drp`
tenga su correspondiente `timestamp_salida_drp` al abandonar el DRP. Sin este
dato, los cálculos de duración de dotación, informes de recursos del DRP y el
Doc-1 quedarían con timestamps incompletos.

El interceptor actúa en el frontend como guardia de consistencia. La política RLS
en Supabase no puede interceptar este caso (es un cambio de `estado_operativo`,
no de `drp_dotaciones`), por lo que la responsabilidad recae en el hook.

### 28.5 Casos límite

| Caso | Comportamiento |
|---|---|
| `ruta → alerta` sin haber salido del DRP | El interceptor ya se disparó en el cambio anterior a `ruta`. Si el vehículo ya tiene `timestamp_salida_drp`, no se dispara de nuevo. |
| `en_espera → ruta` sin DRP activo | No se dispara (condición no cumplida). |
| `en_espera → alerta` sin DRP activo | No se dispara. |
| Vehículo en DRP cambia a `estacionado` | No se dispara (solo aplica a `ruta` y `alerta`). |
| DRP finaliza con vehículo dentro | La finalización del DRP asigna `timestamp_salida_drp` automáticamente (ver `logic.md §12`). El interceptor no es necesario. |

---

## 29. Mecanismo de Ping de Coordenadas (Supabase Realtime)

### 29.1 Objetivo

Obtener la posición GPS actualizada de un vehículo de forma **bajo demanda** sin
recurrir a geolocalización continua ni polling periódico. Ambas alternativas
degradan la batería de los terminales y saturan el canal Realtime.

El coordinador solicita la ubicación explícitamente; el terminal del vehículo
responde una única vez usando la Geolocation API nativa.

### 29.2 Flujo

```
COORDINADOR (VisorSeguimientoOperativo)
  │
  ├─ Pulsa "Solicitar Ubicación" en la tarjeta de ID_vehiculo
  │
  └─ Publica evento en canal Realtime:
       canal:    `vehiculo:${ID_vehiculo}`
       evento:   `ping_location`
       payload:  { solicitante_id: ID_nombre_coordinador, timestamp_ping: now() }

──────────────────────────────────────────

TERMINAL DE VEHÍCULO (hook useLocationListener — activo mientras el terminal
                       tiene checkin_on y estado_operativo ≠ 'desactivado')
  │
  ├─ Recibe evento `ping_location` en canal `vehiculo:${ID_vehiculo}`
  │
  ├─ Llama navigator.geolocation.getCurrentPosition({ timeout: 5000 })
  │   (una sola petición — sin watchPosition)
  │
  ├─ Éxito → publica respuesta en el mismo canal:
  │     evento:  `pong_location`
  │     payload: { lat, lon, accuracy, timestamp_gps: now() }
  │
  ├─ Éxito → INSERT en tabla `gps_historial`:
  │     { id_vehiculo, lat, lon, accuracy, timestamp_gps, origen: 'ping' }
  │
  └─ Fallo (timeout o permiso denegado) → no publica `pong_location`
       (el coordinador activa el fallback — ver §29.3)

──────────────────────────────────────────

COORDINADOR — recibe `pong_location`
  │
  └─ Actualiza tarjeta del vehículo con lat/lon frescos (estado `success`)
```

### 29.3 Cadena de fallback (timeout)

Si el coordinador no recibe `pong_location` en **5 segundos**:

1. Aborta el listener del evento `pong_location`.
2. Invoca la función RPC `get_ultima_ubicacion_vehiculo($id_vehiculo)`:

   ```sql
   -- La función hace UNION ALL entre telemetría y eventos operativos
   -- y devuelve la posición matemáticamente más reciente, sin importar la fuente.

   CREATE OR REPLACE FUNCTION get_ultima_ubicacion_vehiculo(p_id_vehiculo TEXT)
   RETURNS TABLE(lat NUMERIC, lon NUMERIC, accuracy NUMERIC,
                 timestamp_gps TIMESTAMPTZ, origen TEXT)
   AS $$
     SELECT lat, lon, accuracy, timestamp_gps, 'telemetria' AS origen
       FROM gps_historial
      WHERE id_vehiculo = p_id_vehiculo

     UNION ALL

     SELECT coords_lat, coords_lon, NULL AS accuracy, timestamp_evento,
            'cambio_operativo' AS origen
       FROM doc8_eventos
      WHERE id_vehiculo = p_id_vehiculo
        AND coords_lat IS NOT NULL

     ORDER BY timestamp_gps DESC
     LIMIT 1;
   $$ LANGUAGE sql STABLE;
   ```

   **Justificación del UNION ALL:** `gps_historial` contiene posiciones de telemetría
   (pings explícitos). `doc8_eventos` contiene las coordenadas GPS capturadas en cada
   cambio de estado operativo (activación, ruta, alerta…). El sistema devuelve siempre
   la posición más reciente disponible, independientemente de si fue generada por un
   ping de coordinación o por un cambio operativo del pilot.

3. Muestra las coordenadas en la tarjeta con estado `fallback`:
   * Opacidad reducida (`opacity-60`).
   * Badge `Ubicación offline` en gris.
   * Timestamp de la lectura y campo `origen` visibles para que el coordinador
     evalúe la antigüedad y procedencia de la posición.

### 29.4 Throttle local en el terminal de vehículo

El terminal embarcado almacena el `timestamp` del último ping procesado.
Si recibe un nuevo evento `ping_location` antes de que transcurran **15 segundos**
desde el anterior, el evento se ignora silenciosamente — sin ejecutar
`getCurrentPosition`, sin publicar `pong_location`.

```
useLocationListener — pseudocódigo de throttle:

  lastPingProcessed: ISOString | null = null   // persistido en useVehiculoStore

  on('ping_location'):
    now = Date.now()
    if lastPingProcessed && (now - lastPingProcessed) < 15_000:
      return  // ignorar — throttle activo
    lastPingProcessed = now
    // → continuar con getCurrentPosition (ver §29.2)
```

**Efecto en coordinación:** como el `pong_location` se emite al canal general
`vehiculo:${ID_vehiculo}`, todos los coordinadores suscritos a ese canal reciben
la respuesta del primer ping de forma simultánea y actualizan su interfaz al mismo
tiempo. Los pings duplicados enviados en los primeros 15 segundos no sobrecargan
el hardware del vehículo y, a su vez, todos los coordinadores ya dispondrán de las
coordenadas actualizadas gracias al pong del primer ping.

**Justificación:** el hardware GPS de los terminales embarcados (especialmente
en tablets de gama media) tarda entre 2 y 8 segundos en obtener un fix preciso.
Sin throttle, pings simultáneos de múltiples coordinadores despertarían el chip GPS
en ráfaga, drenando batería e introduciendo latencia adicional en la respuesta.

### 29.5 Consideraciones de seguridad y canal

* El canal `vehiculo:${ID_vehiculo}` es privado. Las políticas RLS de Supabase
  Realtime validan que solo terminales con `checkin_on` en ese `ID_vehiculo` y
  roles `coordinación` / `gerencia` puedan suscribirse.
* El `useLocationListener` no publica `pong_location` si el terminal no tiene
  un `ID_nombre` activo con `checkin_on` — previene respuestas de terminales
  ociosos o bloqueados.
* El throttle de 15 segundos (§29.4) se aplica también en este nivel: un terminal
  sin `checkin_on` que recibe pings no los procesa ni los cuenta contra el throttle.
* La tabla `gps_historial` registra únicamente eventos de tipo `ping`
  (solicitudes explícitas). El historial pasivo de ruta (si se implementa en
  el futuro) usará `origen: 'track'` para distinguirlos.

---

## 30. Retención de JWT para sincronización offline post-checkout

### 30.1 Problema

Si un usuario ejecuta el checkout mientras está offline y existen mutaciones críticas
en la cola IndexedDB, el flujo estándar destruye el JWT inmediatamente en Zustand.
Esto provoca que el Service Worker pierda el token necesario para autenticarse contra
Supabase al recuperar la conexión, dejando las mutaciones huérfanas y sin poder enviar.

### 30.2 Condición de activación

```
usuario ejecuta checkout()
∧ useOfflineQueue.isOnline === false
∧ useOfflineQueue.pendingCount > 0
```

### 30.3 Comportamiento del mecanismo

```
CASO NORMAL (online o sin pendientes):
  → checkout completo, flujo_checkout_automatico, JWT destruido → estado_0

CASO RETENCIÓN (offline + pendientes):

  1. INTERFAZ — transición visual inmediata a estado_0:
     - UI presenta pantalla de estado_0 (el personal no puede operar)
     - Banner persistente: "Sincronizando datos... No cierre el navegador"
     - Contador visible: "N operaciones pendientes de envío"

  2. MOTOR — JWT retenido en caché técnica:
     - useAuthStore.jwtRetenido = true
     - El JWT permanece en Zustand (NO destruido)
     - useTerminalStore.estado = 'estado_0'  ← UI bloqueada
     - El resto del flujo_checkout_automatico se ejecuta con normalidad
       (Doc-8 cerrado, estados del vehículo actualizados, etc.)
     - EXCEPCIÓN: useAuthStore.clearJwt() NO se llama todavía

  3. SERVICE WORKER — vaciado de cola:
     - Al recuperar conexión, el SW lee el JWT retenido desde useAuthStore
     - Ejecuta procesarCola() con el JWT del usuario que hizo checkout
     - Cada mutación procesada con HTTP 200 se elimina de IndexedDB
     - Si alguna falla → marcada como 'fallido'; el resto continúa

  4. DESTRUCCIÓN DIFERIDA del JWT:
     - Cuando pendingCount === 0 (cola vacía):
       → useOfflineQueue llama a useAuthStore.clearJwtAfterSync()
       → JWT eliminado de Zustand y de localStorage
       → jwtRetenido = false
       → Banner actualizado: "Sincronización completada"
     - Si hay mutaciones en estado 'fallido':
       → El JWT sigue retenido
       → Banner: "N operaciones fallidas — requieren atención"
       → El supervisor / next pilot puede revisar y descartar manualmente
```

### 30.4 Seguridad del JWT retenido

* El JWT retenido **no eleva los permisos** de nadie: la UI está en `estado_0`
  (bloqueada), ningún componente puede operar ni renderizar módulos protegidos.
* El JWT solo es accesible por el Service Worker para ejecutar las mutaciones
  encoladas — operaciones que ya se habían iniciado y autorizado antes del checkout.
* El JWT tiene su TTL natural (`shift_start + 36h`). Si expira antes de que se
  complete la sincronización, las mutaciones fallarán con 401 y se marcarán como
  `fallido` para revisión manual.

### 30.5 Exposición en useOfflineQueue e useAuthStore

| Store | Campo / Método | Descripción |
|---|---|---|
| `useOfflineQueue` | `hasCriticalPending: boolean` | true si pendingCount > 0 y isOnline === false en el momento del checkout |
| `useAuthStore` | `jwtRetenido: boolean` | true mientras el JWT está retenido post-checkout |
| `useAuthStore` | `clearJwtAfterSync(): void` | Destruye el JWT y limpia el store; solo llamado por useOfflineQueue cuando pendingCount === 0 |
