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

### 7.1.1 Control de Concurrencia Optimista (OCC) en la liquidación

**Problema:** si dos terminales tienen el mismo Doc-10 abierto simultáneamente
(bandeja logística recargada en un terminal desconectado mientras otro opera),
ambos hilos podrían ejecutar la RPC de liquidación casi al mismo tiempo. Sin guarda,
el segundo hilo volvería a sumar el stock e insertaría un segundo descuadre fantasma,
corrompiendo el inventario del destino.

**Solución:** la RPC de liquidación añade `WHERE estado = 'En_Transito'` como guarda
optimista antes de ejecutar cualquier mutación:

```sql
-- Guarda OCC: el UPDATE solo afecta a la fila si sigue En_Transito
UPDATE doc10
   SET estado                        = 'Completado',   -- o 'Descuadre_Pendiente_Revision'
       timestamp_confirmacion        = NOW(),
       id_nombre_receptor_confirmador = p_receptor_id
 WHERE id     = p_doc10_id
   AND estado = 'En_Transito';   -- ← GUARDA OCC

GET DIAGNOSTICS v_filas_afectadas = ROW_COUNT;

IF v_filas_afectadas = 0 THEN
  -- El documento ya fue procesado por otro hilo — no es un error
  RETURN 'already_processed';
END IF;

-- Solo si v_filas_afectadas = 1 → continuar con INSERT stock / descuadre
```

**Comportamiento frontend:**

| Resultado RPC | Acción UI |
|---|---|
| `1 fila afectada` | Flujo normal — mostrar confirmación de éxito |
| `0 filas afectadas` (`already_processed`) | Toast silencioso: "Este documento ya fue procesado por otro usuario." Sin reintentar. |

**Invariante:** la suma de stock y el INSERT en `descuadres_inventario` solo se
ejecutan dentro de la transacción si la guarda OCC devuelve 1 fila afectada.
El hilo "fantasma" sale limpiamente sin efectos secundarios.

### 7.1.2 Redirección Dinámica de Destino

**Problema:** cuando un Doc-10 llega a su destino (subinventario DRP) para ser
confirmado, ese subinventario puede haber transitado a `En_Transito` o
`Operativo_Condicionado` desde que el Doc-10 fue emitido. Sumar stock a un
subinventario en reconciliación activa contamina el snapshot e invalida el cuadre
logístico en curso.

**Validación pre-suma en la RPC de confirmación:**

```sql
-- Al inicio de la función de confirmación, antes de cualquier UPDATE de stock:
SELECT estado INTO v_estado_destino
  FROM subinventarios
 WHERE id = p_id_destino;

IF v_estado_destino IN ('En_Transito', 'Operativo_Condicionado') THEN
  RAISE EXCEPTION 'destino_no_apto_para_recepcion'
    USING HINT = '422',
          DETAIL = v_estado_destino;
END IF;
-- Si pasa el guard → continúa con el flujo normal de confirmación
```

**Flujo frontend — modal de Redirección Forzosa:**

```
La RPC devuelve error 422 'destino_no_apto_para_recepcion'
  → Modal de Redirección Forzosa (no cancelable):

    "El subinventario de destino ([ID_DRP]) está en estado [estado_destino]
     y no puede recibir material hasta completar la reconciliación.

     El material puede redirigirse al almacén central base.

     [ Redirigir al almacén central ]    [ Cancelar y mantener en tránsito ]"

  OPCIÓN A — Redirigir al almacén central:
    1. RPC 'redirigir_doc10_a_base(doc10Id, id_almacen_base)':
         · UPDATE stock_real += cantidad en almacén_central_base
         · Doc-10 → 'Redirigido_Por_Cierre_Destino'
         · INSERT auditoria_inventario:
             tipo_movimiento = 'redireccion_forzosa'
             id_doc10_origen = doc10Id
             id_destino_original = p_id_destino
             id_destino_real = id_almacen_base
             motivo = 'destino_en_' + estado_destino
             timestamp = NOW()
         · INSERT notificación a bandeja_entrada_logistica:
             tipo = 'material_redirigido_a_base'
             payload = { doc10Id, id_destino_original, id_almacen_base, cantidad }
    2. Toast: "Material redirigido al almacén central. Doc-10 cancelado."

  OPCIÓN B — Mantener en tránsito:
    · El Doc-10 permanece en 'Pendiente_Validacion'
    · El material sigue técnicamente en tránsito
    · Logística puede reintentar la confirmación cuando el destino
      vuelva a estado 'Asignado'
```

### 7.1.3 Límite de encadenamiento de `Operativo_Condicionado` (B-11)

**Problema:** cada reasignación de una mochila BKP en `Operativo_Condicionado` sin reconciliación previa crea un snapshot adicional con merma potencial acumulada. Sin límite, los encadenamientos pueden acumular descuadres imposibles de auditar retroactivamente.

**Regla:** máximo 2 encadenamientos consecutivos sin reconciliación (es decir, la mochila puede estar en `Operativo_Condicionado` a lo sumo con 2 snapshots pendientes previos).

**Guard en `rpc_asignar_mochila_a_drp`:**

```sql
-- Contar snapshots pendientes (estado != 'resuelto_por_transferencia' y != 'reconciliado')
SELECT COUNT(*) INTO v_snapshots_pendientes
  FROM subinventario_snapshots
 WHERE id_mochila = p_id_mochila
   AND estado NOT IN ('resuelto_por_transferencia', 'reconciliado');

IF v_snapshots_pendientes >= 2 THEN
  -- Bloquear asignación + notificar a gerencia
  INSERT INTO doc11_avisos (id_aviso, tipo_aviso, nivel, id_nombre_emisor, texto,
                             timestamp_publicacion, leido_por)
  VALUES (gen_random_uuid(), 'alerta_seguridad', 'critico', p_coordinador_id,
          format('Mochila %s alcanzó el límite de encadenamientos sin reconciliar (%s pendientes). '
                 'Logística debe cerrar al menos un ciclo antes de reasignar.',
                 p_id_mochila, v_snapshots_pendientes),
          NOW(), '[]'::jsonb);

  RAISE EXCEPTION 'operativo_condicionado_limite_alcanzado'
    USING HINT   = '409',
          DETAIL = format('La mochila tiene %s snapshots pendientes de reconciliación. '
                          'Máximo permitido: 2.', v_snapshots_pendientes);
END IF;
```

**Error en `error_handling.md`:** añadir `operativo_condicionado_limite_alcanzado` → `{ message: 'Esta mochila tiene demasiados ciclos sin reconciliar. Logística debe cerrar al menos uno antes de reasignar.', type: 'modal' }`.

---

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
  multi_drp             BOOLEAN      DEFAULT FALSE
    -- true → merma diluida entre varias dotaciones (no asignable a un único responsable)
    -- Se activa automáticamente por la RPC de reconciliación si existen snapshots
    -- con estado 'resuelto_por_transferencia' para ese subinventario. Ver §9.1.
```

### 7.3 Resolución de descuadres

Desde `black_column → Logística → Descuadres`:

* **Resolver_Manual** — llama obligatoriamente a una Función RPC que fuerza la clasificación contable del descuadre antes de cerrarlo. El operario debe elegir una de dos opciones mutuamente excluyentes.

  **Campo obligatorio previo (Gap R3 — Imputación contable):**

  Antes de seleccionar la opción de resolución, el formulario exige asignar la entidad responsable del descuadre a efectos contables:

  ```
  entidad_imputable_tipo: 'vehiculo' | 'drp' | 'persona' | 'sin_imputar'
  entidad_imputable_id:   matricula | id_drp (UUID) | id_nombre | null

  Ejemplos: { tipo: 'vehiculo', id: 'M-1234-AB' }
            { tipo: 'drp', id: 'uuid-drp-activo' }
            { tipo: 'persona', id: 'jlopez' }
            { tipo: 'sin_imputar', id: null }   ← solo con justificación de texto
  ```

  Estos campos se persisten en `descuadres_inventario` y en cada `INSERT` de `auditoria_inventario` generado por la resolución, garantizando traza contable completa.

  **Opción A — Pérdida / Rotura**

  ```
  El operario indica: "El material está perdido o inutilizable."
  RPC ejecuta en transacción atómica:
    1. stock_real no se modifica (material definitivamente fuera del sistema)
    2. UPDATE descuadres_inventario:
         entidad_imputable_tipo, entidad_imputable_id  ← asignados por el operario
    3. INSERT auditoria_inventario:
         tipo_movimiento       = 'merma'
         cantidad_delta        = -(diferencia)         ← negativo: baja contable
         ID_origen             = descuadre.ID_origen
         motivo                = 'descuadre_resuelto_perdida'
         entidad_imputable_tipo, entidad_imputable_id  ← propagados del descuadre
         ID_nombre_resolutor, timestamp_resolucion
    4. descuadre → Resuelto
  ```

  **Opción B — Recuperación Fraccionada**

  ```
  El operario indica: "El material se ha localizado / recuperado (total o parcialmente)."

  Campos obligatorios:
    cantidad_recuperada: INT   (1 ≤ cantidad_recuperada ≤ diferencia)
    destino_recuperacion: ID_origen | ID_destino

  El sistema calcula automáticamente:
    merma_definitiva = diferencia - cantidad_recuperada   (puede ser 0 si total)

  RPC ejecuta en transacción atómica bajo un único UUID de transacción:

    1. UPDATE stock_real += cantidad_recuperada en el location elegido

    2. UPDATE descuadres_inventario:
         entidad_imputable_tipo, entidad_imputable_id

    3. INSERT auditoria_inventario — entrada de recuperación:
         uuid_transaccion          = gen_random_uuid()   ← mismo UUID para ambas entradas
         tipo_movimiento           = 'recuperacion_descuadre'
         cantidad_delta            = +(cantidad_recuperada)
         ID_destino_recuperacion   = destino_recuperacion
         id_descuadre_origen       = descuadre.id
         entidad_imputable_tipo, entidad_imputable_id
         ID_nombre_resolutor, timestamp_resolucion

    4. SI merma_definitiva > 0:
         INSERT auditoria_inventario — entrada de merma residual:
           uuid_transaccion      = (mismo UUID que paso 3)
           tipo_movimiento       = 'merma_definitiva_residual'
           cantidad_delta        = -(merma_definitiva)
           ID_origen             = descuadre.ID_origen
           id_descuadre_origen   = descuadre.id
           motivo                = 'descuadre_parcialmente_recuperado'
           entidad_imputable_tipo, entidad_imputable_id
           ID_nombre_resolutor, timestamp_resolucion

    5. descuadre → Resuelto

  Invariante: cantidad_recuperada + merma_definitiva = diferencia (siempre)
  ```

  **Validación frontend:**
  * Selector obligatorio de entidad imputable antes de mostrar opciones A/B.
  * Campo `cantidad_recuperada` con rango `[1, diferencia]`.
  * Si `cantidad_recuperada = diferencia` → merma = 0, se muestra "Recuperación total".
  * Si `cantidad_recuperada < diferencia` → merma residual visible antes de confirmar.
  * El operario debe confirmar explícitamente antes de ejecutar el RPC.

* **Archivar**: cierra el descuadre sin clasificación contable. Estado → `Archivado`.
  No genera entrada en `auditoria_inventario`. No requiere `entidad_imputable`.
  Para casos donde el descuadre no requiere acción contable (ej. error de registro ya corregido por otros medios).

> La clasificación contable (Resolver_Manual) **y** la imputación de responsabilidad (entidad_imputable) son obligatorias. El RPC rechaza la llamada si `entidad_imputable_tipo` es null. Si se elige 'sin_imputar', se exige un campo `motivo_sin_imputar` de texto libre.

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
GUARD PREVIO — sync_pending (ejecutar ANTES de mostrar el modal de confirmación):

  useInventarioStore.tieneSyncPendiente(subinventarioId) → boolean
    Evalúa si algún StockItem del subinventario tiene sync_pending = true
    (descuento de Doc-6 local aún no confirmado por RPC)

  Si → true:
    ABORTAR la cesión / finalización del módulo.
    Error modal: "Imposible ceder recurso. Existen gastos pendientes de sincronización.
                  Recupera la conexión de red primero."
    No se procede al modal de confirmación de reasignación.

  Si → false:
    Continúa con el flujo normal de cesión.

──────────────────────────────────────────

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
  3. Si hay diferencia → RPC aplica el flujo de §7 (Descuadre_Pendiente_Revision)
     con la siguiente lógica de responsabilidad:

     RPC evalúa:
       SELECT COUNT(*) FROM snapshots_reconciliacion
        WHERE subinventario_id = $1
          AND estado = 'resuelto_por_transferencia'

       → Si COUNT > 0 (hubo transferencias entre DRPs sin reconciliar):
           descuadres_inventario.multi_drp = TRUE
           descuadres_inventario.ID_nombre_resolutor = NULL
           -- La merma es diluida e inasignable a un único individuo.
           -- Gerencia recibirá el descuadre etiquetado como 'Descuadre_multi_DRP'
           -- para investigación manual o absorción administrativa.

       → Si COUNT = 0 (subinventario de un único DRP):
           descuadres_inventario.multi_drp = FALSE
           descuadres_inventario.ID_nombre_resolutor = pilot del drp_origen_id

  4. snapshot → estado = 'resuelto', resolved_at, resolved_by registrados
  5. El subinventario pasa a Operativo y queda disponible para nuevas asignaciones
```

**Flag `Descuadre_multi_DRP`:** Cuando `multi_drp = TRUE`, el descuadre no aparece
en las vistas de responsabilidad individual. Se enruta a una vista específica de gerencia
con el badge `Multi-DRP` en naranja, indicando que requiere análisis contextual antes
de tomar medidas disciplinarias o contables.

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

### 10.2 Finalizado → Archivado (con Guarda Condicional de Retención)

```
cron_job: cada hora, busca DRP en estado Finalizado o Finalizado_Retenido
  donde NOW() - timestamp_finalizacion >= 48 horas (para Finalizado)
  o    DRP.estado = 'Finalizado_Retenido' (reevalúa en cada ciclo)

  Para cada DRP candidato — EVALUACIÓN PRE-TRANSACCIONAL:

    SELECT count(1) AS n_pendientes
      FROM descuadres
     WHERE id_drp = drp.id
       AND estado = 'Pendiente_Revision';

    SI n_pendientes > 0:
      → DRP NO se archiva
      → DRP pasa a 'Finalizado_Retenido' (si aún no lo estaba)
      → timestamp_retencion = NOW()
      → INSERT notificación en bandeja_entrada_logistica:
          tipo    = 'drp_retenido_por_descuadres'
          payload = { id_drp, nombre_drp, n_pendientes,
                      timestamp_finalizacion, motivo: 'descuadres_contables_pendientes' }
      → El DRP queda visible en visor_drp con badge 'Retenido' para
        coordinación/gerencia (solo lectura — sin mutaciones de estado disponibles)

    SI n_pendientes = 0:
      → DRP pasa a 'Archivado'
      → timestamp_archivado = NOW()
      → Fuerza sincronización final con Supabase
      → El DRP desaparece del visor activo
```

**Trigger complementario — resolución del último descuadre:**

```sql
-- Cuando el último descuadre de un DRP retenido pasa a Resuelto o Archivado,
-- el trigger verifica si quedan descuadres pendientes y libera el DRP.
CREATE OR REPLACE FUNCTION trg_fn_descuadre_libera_drp_retenido()
RETURNS TRIGGER AS $$
DECLARE
  v_pendientes INT;
BEGIN
  IF NEW.estado IN ('Resuelto', 'Archivado')
     AND OLD.estado = 'Pendiente_Revision'
     AND NEW.id_drp IS NOT NULL THEN

    SELECT count(1) INTO v_pendientes
      FROM descuadres
     WHERE id_drp = NEW.id_drp
       AND estado = 'Pendiente_Revision';

    IF v_pendientes = 0 THEN
      UPDATE drp
         SET estado            = 'Archivado',
             timestamp_archivado = NOW()
       WHERE id    = NEW.id_drp
         AND estado = 'Finalizado_Retenido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descuadre_libera_drp_retenido
  AFTER UPDATE ON descuadres
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_descuadre_libera_drp_retenido();
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

### 11.5 Liquidación Universal de Salida — RPC `registrar_salida_drp_individual`

La RPC aplica `timestamp_salida_drp` **a ambas tablas** para el `ID_nombre` que sale,
independientemente de cómo entró al DRP. Un mismo ID_nombre puede tener registros en
`drp_dotaciones` (si entró con vehículo) y en `drp_personal_a_pie` (si también se
registró como personal a pie en distintos momentos del DRP). La salida debe liquidar
ambas entradas.

```sql
CREATE OR REPLACE FUNCTION registrar_salida_drp_individual(
  p_drp_id    UUID,
  p_id_nombre TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Liquidar en drp_dotaciones (entradas vehiculares)
  UPDATE drp_dotaciones
     SET timestamp_salida_drp = NOW()
   WHERE drp_id    = p_drp_id
     AND id_nombre = p_id_nombre
     AND timestamp_salida_drp IS NULL;

  -- Liquidar en drp_personal_a_pie (entradas a pie)
  UPDATE drp_personal_a_pie
     SET timestamp_salida_drp = NOW()
   WHERE drp_id    = p_drp_id
     AND id_nombre = p_id_nombre
     AND timestamp_salida_drp IS NULL;

  -- Ambos UPDATEs son idempotentes: 0 rows afectados ≠ error.
END;
$$ LANGUAGE plpgsql;
```

Ver `hooks.md §4 salirIndividual / exitarDRP` para el flujo completo en cliente.

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
GUARD 0 — Pacientes clínicos activos (ejecutar ANTES que los demás guards):
  SELECT COUNT(*) FROM filiacion_pacientes
   WHERE filiacion_id IN (
     SELECT id FROM modulo_filiacion WHERE drp_id = drpId
   )
     AND estado IN ('en_espera', 'en_consulta')
  Si COUNT > 0:
    ABORTAR la finalización.
    Error clínico: "No es posible finalizar el DRP. Existen [N] paciente(s)
                   activos (en espera o en consulta) sin dar de alta.
                   Completa la atención o libera los boxes antes de cerrar
                   el dispositivo."
    → No hay bypass ni override para este error — requiere alta clínica real.
    → Muestra el listado de pacientes con su estado actual y box asignado.

GUARD 1 — Doc-10 en tránsito hacia este DRP (ejecutar segundo):
  SELECT COUNT(*) FROM doc10
   WHERE drp_destino_id = drpId
     AND estado = 'Pendiente_Validacion'
  Si COUNT > 0:
    ABORTAR la finalización.
    Error crítico: "Imposible finalizar el dispositivo. Existen [N] transferencia(s)
                   de material en tránsito sin recepcionar. El receptor debe confirmar
                   la recepción antes de poder cerrar el DRP."
    → Muestra la lista de Doc-10 afectados con sus IDs y origen.
    → No hay bypass ni override para este error — requiere resolución operativa real.

GUARD 2 — sync_pending en subinventarios del DRP:
  Para cada subinventario asignado al DRP (estado = 'Asignado', drp_id = este DRP):
    useInventarioStore.tieneSyncPendiente(subinventarioId)
  Si alguno → true:
    ABORTAR la finalización.
    Error: "Imposible finalizar el DRP. El subinventario [ID] tiene gastos pendientes
            de sincronización. Recupera la conexión de red primero."

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
   → Ya no se pueden añadir asistencias con timestamp_registro >= timestamp_finalizacion.
   → Excepción: terminales que estaban offline durante el DRP pueden sincronizar
     asistencias tardías si su timestamp_registro es anterior al cierre
     (evaluado por la política RLS de INSERT — ver §13.3).

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
| Efecto sobre el DRP | El DRP desaparece del sistema | DRP pasa a Finalizado, visible para consulta |
| Módulos secundarios (PSA, filiación) | **DELETE en cascada estricto** — los módulos son destruidos | Cierre controlado con timestamps |
| Pacientes en `en_espera` | **DELETE incondicional** — purga total de pacientes admitidos no atendidos | No aplica (sólo si hay módulo abierto con pacientes pendientes) |
| Pacientes en `en_consulta` o `archivado` | **Imposible** — habrían generado asistencias en Doc-1 → precondición bloquea | — |
| Subinventarios asociados | Depende del estado — ver tabla §12.1b | → `En_Transito` (logística debe reconciliar stock físico) |
| Reconciliación logística | Solo si el subinventario era `Operativo_Condicionado` — ver §12.1b | Requerida — el stock físico puede diferir del sistema |

**§12.1b — Retroceso de subinventario en cancelación según estado previo:**

| Estado del subinventario al cancelar | Acción sobre estado | Acción sobre snapshots |
|---|---|---|
| `Asignado` (nunca se desplazó físicamente) | → `Operativo` directamente | DELETE snapshots con `estado='pendiente'` |
| `Operativo_Condicionado` (llegó vía transferencia de otro DRP/base) | → `En_Transito` (mantiene cadena de reconciliación) | UPDATE snapshots `resuelto_por_transferencia` → `pendiente` (reactiva) |

**Justificación de la reversión limpia en cancelación (subinventario `Asignado`):**
Al cancelar un DRP cuyo subinventario nunca salió de la base, el despliegue nunca ocurrió.
No se consumió material y no hay diferencia entre el stock real y el sistema.
Forzar el paso por `En_Transito` crearía una tarea de reconciliación logística vacía,
generando carga operativa innecesaria y potenciales descuadres fantasma.

**Justificación del retroceso a `En_Transito` (subinventario `Operativo_Condicionado`):**
Un subinventario en `Operativo_Condicionado` llegó a este DRP mediante una transferencia
de material (Doc-10) desde otro DRP o subinventario origen. Al cancelar el DRP destino,
la transferencia queda sin efecto — el material debe volver al flujo logístico activo
(`En_Transito`) para ser reconciliado por el DRP o base de origen. El snapshot marcado
como `resuelto_por_transferencia` (la reconciliación que consideraba el material "entregado")
se reactiva a `pendiente` para que logística complete el ciclo de forma explícita.

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
-- Evalúa el tiempo real del evento (timestamp_registro), no el tiempo de sincronización.
CREATE POLICY "doc1_asistencias_insert" ON doc1_asistencias
  FOR INSERT WITH CHECK (
    -- Claim requerido (condición de identidad)
    (
      (auth.jwt() -> 'app_claims' ->> 'can_create_clinical_docs')::boolean = true
      OR
      (auth.jwt() -> 'app_claims' ->> 'can_view_drp')::boolean = true
    )
    AND
    (
      -- Caso normal: DRP activo en estado 'En_curso'
      EXISTS (
        SELECT 1 FROM drp
        WHERE id = NEW.drp_id
          AND estado = 'En_curso'
      )
      OR
      -- Excepción offline: asistencia tardía cuyo timestamp_registro es
      -- anterior al cierre del DRP. El evento ocurrió antes del cierre;
      -- solo llega al servidor después por ausencia de conexión.
      EXISTS (
        SELECT 1 FROM drp
        WHERE id = NEW.drp_id
          AND estado IN ('Finalizado', 'Archivado')
          AND NEW.timestamp_registro < timestamp_finalizacion
      )
    )
  );
```

**Excepción para asistencias tardías offline:**

La inmutabilidad del Doc-1 evalúa el **tiempo real del evento** (`timestamp_registro`),
no el tiempo de sincronización con el servidor. Si un terminal registró asistencias
en local mientras estaba offline y el DRP se cerró antes de recuperar conexión, esas
asistencias se aceptan al sincronizar siempre que `timestamp_registro < timestamp_finalizacion`.

Rechazarlas destruiría información clínica real y válida. La excepción solo abre la
ventana para eventos que físicamente ocurrieron antes del cierre; nadie puede insertar
asistencias con `timestamp_registro` posterior al cierre del DRP.

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
| `condicion_tecnica → 'inoperativo_critico'` con `estado_operativo ∈ {ruta, alerta}` | "🚨 [ID_vehiculo] detenido automáticamente. Condición técnica: INOPERATIVO CRÍTICO. Estado anterior: [estado_anterior]. Coordenadas: [coords\|no disponibles]." | Canal `global:alertas_criticas` → terminales coordinación/gerencia + `bandeja_entrada_coordinacion` |

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

### 20.1 Race condition — reordenamiento simultáneo a llamada de box

Si admisión altera el orden general de la lista en el mismo instante en que un box
llama al siguiente paciente prioritario, la operación de reordenamiento puede aplicarse
sobre un índice fantasma (el paciente ya pasó a `en_consulta`) o sobrescribir el
estado de otro paciente, desincronizando la cola para el resto de boxes activos.

**Solución: RPC Atómico de Reordenamiento**

El cambio de orden **nunca** se implementa como un UPDATE directo desde el cliente.
Toda modificación del orden de la cola se realiza via RPC que:

1. Recibe el array de IDs con el orden deseado.
2. Valida internamente que todos los pacientes involucrados siguen en `en_espera`.
3. Si alguno ha pasado a `en_consulta` o `archivado` → `ROLLBACK` completo de la transacción.
4. Si todos siguen en `en_espera` → aplica los UPDATEs de `orden` de forma atómica.

```sql
CREATE OR REPLACE FUNCTION reordenar_pacientes_espera(
  p_filiacion_id UUID,
  p_orden_ids    UUID[]   -- array de patient IDs en el nuevo orden deseado
)
RETURNS VOID AS $$
DECLARE
  v_id       UUID;
  v_estado   TEXT;
  v_nuevo_orden INT := 1;
BEGIN
  -- Fase 1: validar que todos los pacientes siguen en en_espera
  FOREACH v_id IN ARRAY p_orden_ids LOOP
    SELECT estado INTO v_estado
      FROM filiacion_pacientes
     WHERE id = v_id
       AND filiacion_id = p_filiacion_id
     FOR UPDATE;  -- bloqueo de fila para prevenir race condition

    IF v_estado IS NULL THEN
      RAISE EXCEPTION 'Paciente % no encontrado en este módulo de filiación', v_id;
    END IF;

    IF v_estado != 'en_espera' THEN
      RAISE EXCEPTION
        'Paciente % ya no está en espera (estado actual: %). Reordenamiento cancelado.',
        v_id, v_estado;
    END IF;
  END LOOP;

  -- Fase 2: aplicar el nuevo orden de forma atómica (solo si todos validan)
  FOREACH v_id IN ARRAY p_orden_ids LOOP
    UPDATE filiacion_pacientes
       SET orden = v_nuevo_orden
     WHERE id = v_id
       AND filiacion_id = p_filiacion_id;
    v_nuevo_orden := v_nuevo_orden + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Nota de seguridad:** el `FOR UPDATE` en la fase de validación bloquea las filas
durante la transacción, impidiendo que un box concurrente cambie el estado de un
paciente entre la validación y el UPDATE de orden. Si el RPC falla con EXCEPTION,
el frontend debe refrescar la lista completa desde Realtime antes de permitir
un nuevo intento de reordenamiento.

### 20.2 Acción de rescate — Liberación de box bloqueado

**Problema:** si el terminal de un box pierde conexión, se bloquea o el profesional
abandona el puesto sin cerrar la atención, el paciente permanece indefinidamente en
estado `en_consulta`, invisible para el resto de los boxes y sin posibilidad de ser
reatenido. No existe mecanismo automático de timeout (no se puede asumir que una
atención larga es un fallo técnico).

**Solución:** `perfil_admision` y roles de coordinación/gerencia pueden forzar la
devolución del paciente a `en_espera` mediante la acción **LIBERAR BOX**.

```sql
CREATE OR REPLACE FUNCTION liberar_paciente_de_box(
  p_paciente_id    UUID,
  p_filiacion_id   UUID,
  p_liberador_id   TEXT    -- ID_nombre de quien ejecuta la liberación
)
RETURNS VOID AS $$
DECLARE
  v_estado   TEXT;
  v_box_id   TEXT;
BEGIN
  SELECT estado, id_nombre_box INTO v_estado, v_box_id
    FROM filiacion_pacientes
   WHERE id = p_paciente_id
     AND filiacion_id = p_filiacion_id
   FOR UPDATE;

  -- Solo puede liberarse un paciente que esté en consulta
  IF v_estado != 'en_consulta' THEN
    RAISE EXCEPTION 'El paciente no está en consulta (estado actual: %)', v_estado;
  END IF;

  -- Devolver a en_espera y desvincular del box
  UPDATE filiacion_pacientes
     SET estado                 = 'en_espera',
         id_nombre_box          = NULL,
         timestamp_inicio_consulta = NULL,
         -- Preservar el orden original para no perder su posición en la cola
         timestamp_liberacion   = NOW(),
         id_nombre_liberador    = p_liberador_id
   WHERE id = p_paciente_id
     AND filiacion_id = p_filiacion_id;

  -- Registro de auditoría en tabla de eventos de filiación
  INSERT INTO filiacion_eventos (
    filiacion_id, paciente_id, tipo_evento, id_nombre_actor, timestamp_evento,
    detalle
  ) VALUES (
    p_filiacion_id, p_paciente_id, 'liberacion_box', p_liberador_id, NOW(),
    'Box liberado: ' || v_box_id
  );
END;
$$ LANGUAGE plpgsql;
```

**Flujo UI:**

```
perfil_admision (o coordinación / gerencia)
  1. Accede a sección "Pacientes en Box" dentro del módulo filiación
     → Lista todos los pacientes con estado 'en_consulta':
       [ Nombre | ID_nombre_box | Tiempo en consulta (NOW - timestamp_inicio) ]
  2. Pulsa "LIBERAR BOX" en el paciente afectado
  3. Modal de confirmación destructiva:
       "¿Devolver [Nombre] a la lista de espera?
        Esto desvinculará al paciente del box [N]."
       [ Confirmar ] [ Cancelar ]
  4. Si confirma: RPC liberar_paciente_de_box(paciente_id, filiacion_id, liberador_id)
  5. Supabase Realtime notifica a TODOS los boxes:
     → El paciente reaparece en la lista de espera en su posición de orden original
     → El box [N] queda libre para seleccionar otro paciente
```

**RBAC:** `perfil_admision` del módulo activo (acceso directo) + `coordinación` +
`gerencia` (acceso vía `nucleo_coordinacion_y_seguridad`).

### 20.3 Transición cíclica — Revaluación de paciente

**Caso de uso:** durante la atención en box, el profesional determina que el paciente
necesita esperar un resultado (analítica, prueba de imagen, observación) antes de
continuar la consulta. En lugar de archivar la atención y perder el contexto clínico,
el box puede devolver al paciente a la lista de espera con el flag `revaluacion = true`.
Esto preserva el `timestamp_admision` original y mantiene el hilo Doc-3 abierto.

```sql
CREATE OR REPLACE FUNCTION revaluar_paciente(
  p_paciente_id   UUID,
  p_filiacion_id  UUID,
  p_box_id        TEXT    -- ID_nombre del box que ejecuta la revaluación
)
RETURNS VOID AS $$
DECLARE
  v_estado       TEXT;
  v_box_actual   TEXT;
BEGIN
  SELECT estado, id_nombre_box INTO v_estado, v_box_actual
    FROM filiacion_pacientes
   WHERE id = p_paciente_id
     AND filiacion_id = p_filiacion_id
   FOR UPDATE;

  -- Solo puede revaluar un paciente en consulta
  IF v_estado != 'en_consulta' THEN
    RAISE EXCEPTION 'El paciente no está en consulta (estado actual: %)', v_estado;
  END IF;

  -- Solo el box asignado puede ejecutar la revaluación
  IF v_box_actual != p_box_id THEN
    RAISE EXCEPTION 'El box % no tiene asignado este paciente (asignado a: %)',
      p_box_id, v_box_actual;
  END IF;

  UPDATE filiacion_pacientes
     SET estado                    = 'en_espera',
         revaluacion               = TRUE,   -- inmutable una vez establecido
         id_nombre_box             = NULL,
         timestamp_inicio_consulta = NULL
         -- timestamp_admision: NO se modifica (preservación del hilo)
         -- orden: NO se modifica (mantiene su posición en la cola)
   WHERE id = p_paciente_id
     AND filiacion_id = p_filiacion_id;

  -- Registro de auditoría
  INSERT INTO filiacion_eventos (
    filiacion_id, paciente_id, tipo_evento, id_nombre_actor, timestamp_evento,
    detalle
  ) VALUES (
    p_filiacion_id, p_paciente_id, 'revaluacion', p_box_id, NOW(),
    'Paciente devuelto a espera para revaluación desde box: ' || p_box_id
  );
END;
$$ LANGUAGE plpgsql;
```

**Invariantes:**

* `revaluacion = TRUE` es inmutable: una vez establecido no puede revertirse a `FALSE`.
* `timestamp_admision` nunca se sobreescribe. La antigüedad real del paciente en el sistema
  refleja su hora de entrada original.
* El hilo Doc-3 es continuo: cuando el box reabre al paciente ve el mismo documento,
  no uno nuevo. El profesional puede continuar el registro clínico donde lo dejó.
* `orden` se conserva: el paciente no pierde su posición en la cola al ser revaluado.
  El perfil_admision puede ajustar el orden manualmente si la prioridad clínica cambia.
* La acción `revaluar_paciente` no interactúa con `liberar_paciente_de_box`:
  son flujos distintos (box activo revalúa vs. administración rescata box bloqueado).

**RBAC:** cualquier usuario con acceso al box activo (no limitado a roles específicos).
Coordinación y gerencia pueden ejecutarlo vía el panel de "Pacientes en Box".

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

### 23.2 Comportamiento de solicitudes al cerrar el período (C-07)

Cuando RRHH/Gerencia desactiva el período de vacaciones
(`system_config → periodo_vacaciones_abierto.activo = false`),
las solicitudes existentes en `doc_solicitudes_vacaciones` siguen reglas distintas
según su estado:

| Estado actual | Regla al cerrar el período | Mecanismo |
|---|---|---|
| `'Borrador'` | **Descarte** — se eliminan con DELETE. Un borrador no enviado durante el período abierto no tiene valor ni de auditoría ni operativo. Si el empleado necesita solicitar vacaciones, deberá hacerlo cuando se abra el siguiente período. | Purga automática en el mismo acto que desactiva el período (trigger o acción explícita en la EF/RPC de desactivación) |
| `'Pendiente_Aprobacion'` | **Congelada** — el estado NO cambia. La solicitud es válida (fue enviada dentro del período) pero ya no es visible en la UI del empleado. RRHH tiene la obligación de resolverla desde su bandeja (`bandeja_entrada_rrhh`) aunque el período esté cerrado. | Manual — RRHH revisa y aprueba/deniega desde bandeja |
| `'Aprobada'` | **Sin cambio** — resolución ya ejecutada. Las excepciones de cuadrante inyectadas permanecen activas. | Ninguna |
| `'Denegada'` | **Sin cambio** — resolución ya ejecutada. | Ninguna |

**Regla sobre la purga de `'Borrador'`:**

La purga debe ejecutarse atómicamente en el mismo momento en que `periodo_vacaciones_abierto.activo` pasa a `false`. Opciones de implementación:

```sql
-- Opción A: trigger AFTER UPDATE en system_config
-- (cuando la clave 'periodo_vacaciones_abierto' cambia y activo pasa a false)

-- Opción B: sentencia explícita en la RPC / EF de desactivación del período
DELETE FROM doc_solicitudes_vacaciones
 WHERE estado = 'Borrador';
-- (No hace falta filtrar por período — los borradores son siempre del período en curso)
```

> **Importante:** Solo se purgan `'Borrador'`. Las solicitudes `'Pendiente_Aprobacion'`
> jamás se eliminan aunque el período esté cerrado — representan un compromiso del
> empleado que RRHH debe resolver explícitamente.

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

### 24.5 Reconciliación Bidireccional — handler Realtime vs delta pendiente

**Problema:** cuando un terminal tiene `sync_pending = true` para un ítem (descuento
optimista local pendiente de confirmación), puede llegar un evento Realtime de otro
terminal que actualice `stock_real` del mismo ítem. Si el handler sobrescribe
`stock_real_local` ciegamente con `server_value`, el descuento optimista local desaparece
de la vista — el usuario ve stock incorrecto hasta que su propio RPC confirme.

**Solución — invariante de reconciliación:**

```
stock_real_local = server_value - pending_delta
```

| Estado del store | Efecto del evento Realtime |
|---|---|
| `sync_pending = false`, `pending_delta = 0` | `stock_real_local = server_value` (coincide con server — reconciliación trivial) |
| `sync_pending = true`, `pending_delta = N` | `stock_real_local = server_value - N` (preserva el descuento optimista local) |

El handler Realtime **nunca toca** `sync_pending` ni `pending_delta` — esos campos
solo los modifica el ciclo PASO 3 del RPC propio (§24.3).

Ver `hooks.md §6 useInventario — Reconciliación Bidireccional` para el código del handler.

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
1. El servidor (Edge Function check-in) genera el derivado de contraseña:
   a. Genera una sal aleatoria de 16 bytes:
        salt = crypto.getRandomValues(new Uint8Array(16))   ← Deno/Node
   b. Deriva el hash usando PBKDF2-SHA-256:
        hash = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
          await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']),
          256   // bits de salida
        )
   c. Serializa ambos como base64url: password_hash_b64, salt_b64

2. El servidor genera un payload firmado:
   {
     user_id:         ID_nombre,
     role:            string,
     claims_snapshot: { ...claims del JWT },
     shift_start:     ISOString,
     expires_at:      ISOString (shift_start + 36h),
     device_id:       fingerprint del terminal,
     password_hash:   base64url(PBKDF2-SHA-256(password, salt, 100_000 iterations, 256 bits))
     password_salt:   base64url(salt de 16 bytes)
                      — ambos calculados en el servidor, nunca en cliente
                      — NUNCA se transmite la contraseña en texto plano al cliente
   }

3. Firma: HMAC-SHA256 con clave rotante diaria (gestionada en Supabase Vault)

4. El payload firmado se guarda en localStorage:
   'u24_offline_session': base64(payload + signature)
```

**Seguridad del `password_hash`:**

* PBKDF2-SHA-256 con 100.000 iteraciones — resiste ataques de fuerza bruta locales
  sin requerir la librería `bcrypt` (coste de bundle ≈ 0, sin bloqueo del Main Thread).
* La derivación se ejecuta con `crypto.subtle` nativo del navegador: delegado a C++,
  asíncrono, sin impacto en el hilo de UI.
* La sal es única por sesión de check-in — distintas sesiones del mismo usuario
  producen hashes distintos, evitando ataques de precómputo de tabla.
* El hash se calcula en el servidor durante el check-in online. El cliente solo
  recibe el hash y la sal ya derivados — nunca la contraseña en claro.
* Si el usuario cambia su contraseña online, el payload previo queda invalidado
  automáticamente porque la firma HMAC será inconsistente en el próximo ciclo de clave.
* El hash no se sincroniza entre terminales — cada terminal genera el suyo propio
  en el momento del check-in.

### 25.3 Activación del modo degradado

Si al intentar autenticarse el terminal no tiene red:

```
1. El formulario terminal_check detecta timeout de red (> 5s)
2. Muestra opción: "Sin conexión — Acceso de consulta"
3. El usuario introduce:
     - ID_nombre (usuario)
     - Contraseña (campo password — tipo="password", no se muestra en claro)
   Ambos campos son OBLIGATORIOS. No existe bypass de contraseña en modo offline.
4. El sistema busca 'u24_offline_session' en localStorage
   filtrado por user_id = ID_nombre introducido
5. Valida:
   a. HMAC del payload con la clave diaria cached (también en localStorage)
   b. expires_at > NOW()
   c. device_id coincide con el terminal actual
   d. Verificación PBKDF2 local de contraseña (operación asíncrona):
        const keyMaterial = await crypto.subtle.importKey(
          'raw', encoder.encode(contraseña_introducida), 'PBKDF2', false, ['deriveBits']
        )
        const derivedBits = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256',
            salt: base64urlDecode(payload.password_salt),
            iterations: 100_000 },
          keyMaterial,
          256
        )
        const candidateHash = base64urlEncode(derivedBits)
        candidateHash === payload.password_hash  ← comparación en tiempo constante (timingSafeEqual)
      ← crypto.subtle es nativo, sin bundle extra, sin bloqueo del Main Thread
6. Si todo válido:
   - Terminal pasa a estado_1 en modo DEGRADADO
   - Rol: solo lectura del snapshot de claims
   - Banner visible: "⚠️ Modo sin conexión — Solo lectura"
7. Si cualquier validación falla (HMAC, expiración, device_id o contraseña):
   - Mensaje genérico: "Credenciales incorrectas o sesión no disponible."
     (No se especifica qué validación falló — prevención de enumeración)
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

### 25.6 Pre-caché de tokens HMAC para relevo de turno

**Motivación:** Si la red cae exactamente durante el relevo entre turnos, la nueva
dotación no puede hacer check-in online y no tiene `u24_offline_session` previa en
ese terminal (nunca se autenticaron online en ese dispositivo). Sin este mecanismo,
el acceso degradado sería imposible para ellos.

**Generación y envío proactivo:**

```
2 horas antes del fin del turno actual (cron o trigger de cuadrante):
  Edge Function `precache_shift_tokens`:
    1. Consulta la dotación asignada al turno siguiente para ese vehículo/terminal.
    2. Para cada persona de la nueva dotación:
       a. Genera payload idéntico al §25.2:
          {
            user_id:         ID_nombre,
            role:            rol del turno siguiente,
            claims_snapshot: { ...claims vigentes del usuario },
            shift_start:     ISOString (inicio del turno SIGUIENTE),
            expires_at:      shift_start + 36h,
            device_id:       fingerprint del terminal destino,
            password_hash:   PBKDF2-SHA-256 hash ya almacenado en servidor para ese usuario
            password_salt:   sal correspondiente al hash almacenado
          }
       b. Firma el payload con HMAC-SHA256:
          — Clave del día siguiente si el turno cruza medianoche.
          — Clave del día actual en caso contrario.
    3. Envía los payloads firmados al terminal vía Supabase Realtime
       canal: `terminal:{device_id}:precache`
       evento: `shift_tokens_ready`
       body: [{ user_id, signed_payload }]
```

**Recepción en el terminal (hooks.md §15 — `usePrecacheShiftTokens`):**

```
Canal Realtime `terminal:{device_id}:precache`:
  Al recibir evento `shift_tokens_ready`:
    Para cada elemento { user_id, signed_payload }:
      localStorage.setItem(
        `u24_offline_session_next:${user_id}`,
        signed_payload
      )
  → El terminal puede autenticar a la nueva dotación en modo degradado
    incluso antes de que su turno haya comenzado oficialmente.
```

**Activación del token precargado (modificación del paso 4 de §25.3):**

```
PASO 4 (ampliado):
  Busca `u24_offline_session` en localStorage para user_id introducido.
  Si no existe:
    FALLBACK → busca `u24_offline_session_next:{user_id}`
  Validación idéntica en ambos casos:
    HMAC + expires_at + device_id + bcrypt.compare
  Si válido con token precargado:
    Banner: "⚠️ Modo sin conexión — Turno pendiente de inicio — Solo lectura"
    (distingue visualmente de la sesión activa degradada)
```

**Limpieza del token precargado:**

```
Al completar check-in online con éxito:
  → localStorage.removeItem(`u24_offline_session_next:{user_id}`)
  → El precaché queda sustituido por el payload de turno activo (§25.2)
```

**Seguridad:**

* El payload precargado ofrece exactamente las mismas garantías que el estándar:
  HMAC firmado por servidor, `device_id` vinculado al terminal de destino,
  bcrypt de coste 12 para la contraseña.
* `shift_start` apunta al inicio del turno SIGUIENTE. Si existe ya una sesión activa
  (`u24_offline_session`) para ese `user_id`, tiene prioridad absoluta; el precaché
  solo se consulta en ausencia de sesión de turno activo.
* El servidor no transmite contraseñas en claro en ningún momento. El `password_hash`
  se recupera del almacén interno del servidor, no del cliente.

---

## 26. Idle timeout para rol invitado

### 26.1 Condición de aplicación

Solo aplica cuando:

* `useTerminalStore.tipoSesion ∈ ['galleta_pequeña', 'galleta']`
* `useAuthStore.rolActivo === 'invitado'` (nadie ha hecho check-in aún)

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

* El JWT activo no se invalida inmediatamente.
* Los nuevos claims se aplican al **siguiente JWT** emitido (refresh o nuevo login).
* Para forzar aplicación inmediata: `supabase.auth.refreshSession()` desde el cliente
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

**Canal único multiplexado:** todos los eventos de GPS (ping y pong de todos los
vehículos) fluyen por un único canal Realtime global `coordinacion:flota`.
Esto evita abrir N canales paralelos (uno por vehículo) en el cliente coordinador,
que en una flota mediana-grande agotaría los límites de conexiones simultáneas de Supabase.

```
COORDINADOR (VisorSeguimientoOperativo)
  │
  ├─ Al montar el componente: suscripción única a canal `coordinacion:flota`
  │   └─ Escucha: `pong_location`, `pong_error`
  │       El handler extrae id_vehiculo del payload y actualiza
  │       solo la tarjeta correspondiente via reducer local (ver abajo).
  │
  ├─ Pulsa "Solicitar Ubicación" en la tarjeta de ID_vehiculo
  │
  └─ Publica evento en canal `coordinacion:flota`:
       evento:   `ping_location`
       payload:  {
         id_vehiculo:     ID del vehículo objetivo,
         solicitante_id:  ID_nombre_coordinador,
         timestamp_ping:  now()
       }

──────────────────────────────────────────

TERMINAL DE VEHÍCULO (hook useLocationListener — activo mientras el terminal
                       tiene checkin_on y estado_operativo ≠ 'desactivado')
  │
  ├─ Recibe evento `ping_location` en canal `coordinacion:flota`
  ├─ Filtra: si payload.id_vehiculo ≠ este terminal → ignorar silenciosamente
  │
  ├─ THROTTLE — SIEMPRE incondicional (ver §29.4):
  │     Actualizar lastPingProcessed = ahora() ANTES de intentar el hardware GPS.
  │     Esto fuerza el enfriamiento de 15 s incluso si la lectura falla.
  │
  ├─ Llama navigator.geolocation.getCurrentPosition({ timeout: 5000 })
  │   (una sola petición — sin watchPosition)
  │
  ├─ Éxito → publica respuesta en el mismo canal `coordinacion:flota`:
  │     evento:  `pong_location`
  │     payload: { id_vehiculo, lat, lon, accuracy, timestamp_gps: now() }
  │
  ├─ Éxito → INSERT en tabla `gps_historial`:
  │     { id_vehiculo, lat, lon, accuracy, timestamp_gps, origen: 'ping' }
  │
  └─ Fallo (timeout, hardware no disponible, permiso denegado):
       No publica `pong_location`.
       En su lugar publica inmediatamente en `coordinacion:flota`:
         evento:  `pong_error`
         payload: { id_vehiculo, codigo: err.code, mensaje: err.message, timestamp: now() }
       (err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT)
       lastPingProcessed YA fue actualizado antes de la llamada GPS — el throttle
       de 15 s está activo independientemente del resultado.
       El coordinador cancela su timer de 5 s al recibir pong_error y activa
       inmediatamente el fallback RPC — ver §29.3.

──────────────────────────────────────────

COORDINADOR — recibe `pong_location` o `pong_error` en `coordinacion:flota`
  │
  └─ Extrae id_vehiculo del payload
  └─ Despacha acción al store local (reducer) del VisorSeguimientoOperativo:
       dispatch({ type: 'GPS_PONG', id_vehiculo, lat, lon, accuracy, timestamp_gps })
       → Solo la tarjeta de ese id_vehiculo se re-renderiza (React.memo + selector granular)
  └─ Cancela el timer de fallback para ese id_vehiculo y actualiza su tarjeta
       con lat/lon frescos (estado `success`)
```

### 29.3 Cadena de fallback (pong_error o timeout)

El fallback se activa por cualquiera de dos condiciones — la que ocurra primero:

* **`pong_error` recibido (inmediato):** el terminal publicó el error GPS antes de
  que expire el timer. El coordinador cancela el timer y ejecuta el fallback sin esperar.
* **Timer de 5 s agotado sin respuesta:** ni `pong_location` ni `pong_error` llegaron
  (posible pérdida de conexión Realtime del terminal).

En ambos casos el coordinador:

1. Cancela el listener de `pong_location` y el timer de 5 s (si aún activo).
2. Invoca la función RPC `get_ultima_ubicacion_vehiculo($id_vehiculo)`:

   ```sql
   -- La función consulta las dos tablas secuencialmente con índice dedicado
   -- y compara los timestamps en PL/pgSQL para evitar el sort implícito del UNION ALL.
   -- Ver §29.6 para el índice B-Tree y la política de particionado de gps_historial.

   CREATE OR REPLACE FUNCTION get_ultima_ubicacion_vehiculo(p_id_vehiculo TEXT)
   RETURNS TABLE(lat NUMERIC, lon NUMERIC, accuracy NUMERIC,
                 timestamp_gps TIMESTAMPTZ, origen TEXT)
   AS $$
   DECLARE
     v_lat_tel  NUMERIC;
     v_lon_tel  NUMERIC;
     v_acc_tel  NUMERIC;
     v_ts_tel   TIMESTAMPTZ;
     v_lat_op   NUMERIC;
     v_lon_op   NUMERIC;
     v_ts_op    TIMESTAMPTZ;
   BEGIN
     -- 1. Telemetría: posición más reciente de gps_historial
     --    Usa índice B-Tree (id_vehiculo, timestamp_gps DESC) — ver §29.6
     SELECT g.lat, g.lon, g.accuracy, g.timestamp_gps
       INTO v_lat_tel, v_lon_tel, v_acc_tel, v_ts_tel
       FROM gps_historial g
      WHERE g.id_vehiculo = p_id_vehiculo
      ORDER BY g.timestamp_gps DESC
      LIMIT 1;

     -- 2. Evento operativo: última coordenada registrada en cambios de estado
     SELECT d.coords_lat, d.coords_lon, d.timestamp_evento
       INTO v_lat_op, v_lon_op, v_ts_op
       FROM doc8_eventos d
      WHERE d.id_vehiculo = p_id_vehiculo
        AND d.coords_lat  IS NOT NULL
      ORDER BY d.timestamp_evento DESC
      LIMIT 1;

     -- 3. Devolver la fuente con mayor timestamp; sin datos → tabla vacía
     IF v_ts_tel IS NULL AND v_ts_op IS NULL THEN
       RETURN;
     ELSIF v_ts_op IS NULL
        OR (v_ts_tel IS NOT NULL AND v_ts_tel >= v_ts_op) THEN
       RETURN QUERY SELECT v_lat_tel, v_lon_tel, v_acc_tel,
                           v_ts_tel, 'telemetria'::TEXT;
     ELSE
       RETURN QUERY SELECT v_lat_op, v_lon_op, NULL::NUMERIC,
                           v_ts_op, 'cambio_operativo'::TEXT;
     END IF;
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

   **Motivo del cambio a lógica secuencial:** el `UNION ALL` anterior forzaba a
   PostgreSQL a materializar ambos conjuntos de filas, generar un sort compuesto y
   aplicar `LIMIT 1` sobre el resultado combinado — imposibilitando el uso del índice
   en cada tabla por separado. Con la variante PL/pgSQL, cada `SELECT … LIMIT 1`
   puede aprovechar su propio índice B-Tree de forma independiente, y la comparación
   de timestamps ocurre en memoria sobre dos escalares, no sobre un heap ordenado.
   `gps_historial` contiene posiciones de telemetría (pings explícitos).
   `doc8_eventos` contiene coordenadas GPS capturadas en cada cambio de estado
   operativo (activación, ruta, alerta…). El sistema sigue devolviendo siempre la
   posición más reciente independientemente de la fuente.

3. Muestra las coordenadas en la tarjeta con estado `fallback`:
   * Opacidad reducida (`opacity-60`).
   * Badge `Ubicación offline` en gris.
   * Timestamp de la lectura y campo `origen` visibles para que el coordinador
     evalúe la antigüedad y procedencia de la posición.

### 29.4 Throttle local en el terminal de vehículo

El terminal embarcado almacena el `timestamp` del último ping procesado para su
propio `id_vehiculo`. Si recibe un nuevo evento `ping_location` dirigido a él
antes de que transcurran **15 segundos** desde el anterior, el evento se ignora
silenciosamente — sin ejecutar `getCurrentPosition`, sin publicar `pong_location`.

```
useLocationListener — pseudocódigo de throttle:

  lastPingProcessed: ISOString | null = null   // persistido en useVehiculoStore

  on('ping_location') en canal 'coordinacion:flota':
    if payload.id_vehiculo ≠ miVehiculoId:
      return  // no es para este terminal — ignorar

    now = Date.now()
    if lastPingProcessed && (now - lastPingProcessed) < 15_000:
      return  // throttle activo — ignorar este ping

    lastPingProcessed = now  // ← SIEMPRE actualizar ANTES de llamar al hardware GPS
    // Esto garantiza que el enfriamiento aplica incluso si getCurrentPosition falla.
    // Un pong_error no "regala" un segundo ping inmediato al coordinador.
    // → continuar con getCurrentPosition (ver §29.2)
```

**Efecto en coordinación:** como `pong_location` se emite al canal global
`coordinacion:flota`, todos los coordinadores suscritos reciben la respuesta
simultáneamente y cada uno actualiza solo la tarjeta del vehículo correspondiente
(selector granular por `id_vehiculo`). Los pings duplicados dentro de la ventana
de 15 s no sobrecargan el hardware del vehículo y todos los coordinadores disponen
ya de las coordenadas actualizadas gracias al pong del primer ping.

**Justificación:** el hardware GPS de los terminales embarcados (especialmente
en tablets de gama media) tarda entre 2 y 8 segundos en obtener un fix preciso.
Sin throttle, pings simultáneos de múltiples coordinadores despertarían el chip GPS
en ráfaga, drenando batería e introduciendo latencia adicional en la respuesta.

### 29.5 Descarte Geométrico por Delta Temporal

**Problema:** el fallback devuelve la posición más reciente disponible sin importar su
antigüedad. Si la coordenada proviene de un `cambio_operativo` (doc8_eventos) — que el
pilot generó al entrar en `ruta` o `alerta` — y el vehículo lleva más de 10 minutos en
movimiento sin telemetría, mostrar esa posición en el mapa genera sesgo de confirmación
visual: el coordinador asume que el vehículo sigue en el último punto registrado cuando
en realidad puede estar decenas de kilómetros lejos.

**Regla de descarte:**

```
Después de recibir el resultado de get_ultima_ubicacion_vehiculo():

  SI resultado.origen = 'cambio_operativo'
  ∧  vehiculo.estadoOperativo ∈ { 'ruta', 'alerta' }
  ∧  (NOW() - resultado.timestamp_gps) > 10 minutos:

    → DESCARTAR las coordenadas del resultado
    → NO renderizar chincheta en el mapa para este vehículo
    → Estado del componente → 'posicion_desconocida'
    → Mostrar texto: "Posición desconocida (Vehículo en movimiento sin telemetría reciente)"
    → El botón "Solicitar Ubicación" sigue activo — el coordinador puede pedir
      un ping explícito para obtener posición fresca

  SI el resultado pasa cualquier otra combinación (telemetría reciente,
  estado no-movimiento, antigüedad < 10 min, etc.):
    → Comportamiento estándar de fallback (estado 'fallback',
      coordenadas con opacity-60 y badge 'Ubicación offline')
```

**Justificación:** una posición de `cambio_operativo` es la localización donde el pilot
pulsó el cambio de estado, no la posición actual. En `ruta` o `alerta` el vehículo puede
estar circulando a 80 km/h. A los 10 minutos (≥13 km de desplazamiento potencial)
esa coordenada ya no tiene valor de localización operativa y puede inducir decisiones
incorrectas en el coordinador. El sistema es más seguro mostrando la incertidumbre
explícitamente que ofreciendo falsa precisión.

**Umbral de 10 minutos:** elegido como el ciclo de refresco operativo máximo asumible
en una operación de emergencia activa. No es configurable en tiempo de ejecución.

### 29.6 Consideraciones de seguridad y canal

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
* El descarte geométrico (§29.5) opera exclusivamente en el cliente coordinador
  sobre el resultado del fallback RPC — no modifica ni depura la tabla
  `gps_historial` ni `doc8_eventos`.

### 29.6 Índice B-Tree y Particionado de `gps_historial`

#### 29.6.1 Índice de cobertura para el fallback RPC

```sql
-- Cubre la consulta SELECT … WHERE id_vehiculo = ? ORDER BY timestamp_gps DESC LIMIT 1
-- sin heap fetch: lat, lon, accuracy incluidos en el índice.
CREATE INDEX idx_gps_historial_vehiculo_ts
  ON gps_historial (id_vehiculo, timestamp_gps DESC)
  INCLUDE (lat, lon, accuracy);
```

El planner selecciona este índice para `LIMIT 1` directamente (Index Scan Forward),
evitando un Seq Scan sobre una tabla que puede acumular millones de filas con el tiempo.

#### 29.6.2 Política de particionado por rango de fecha

```sql
-- Tabla maestra particionada por mes (RANGE sobre timestamp_gps)
CREATE TABLE gps_historial (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  id_vehiculo  TEXT          NOT NULL,
  lat          NUMERIC       NOT NULL,
  lon          NUMERIC       NOT NULL,
  accuracy     NUMERIC,
  timestamp_gps TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (timestamp_gps);

-- Partición activa — mes en curso (renovada por job mensual)
CREATE TABLE gps_historial_2026_05
  PARTITION OF gps_historial
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Índice de cobertura replicado en cada partición automáticamente
-- (PostgreSQL 11+ propaga índices declarados en la tabla maestra)
```

#### 29.6.3 Purga automática

Job programado en Supabase (Edge Function `purgar_gps_historial`, ejecución
mensual el día 1):

```
1. Identificar la partición del mes anterior:
   gps_historial_YYYY_MM donde YYYY_MM = mes_actual - 1
2. DETACH PARTITION gps_historial_YYYY_MM
3. DROP TABLE gps_historial_YYYY_MM
   (elimina físicamente sin afectar la tabla maestra ni las particiones activas)
4. Crear la partición del mes siguiente si no existe
```

| Parámetro | Valor |
|---|---|
| Retención | 1 mes de historial activo + mes en curso |
| Impacto en RPC | Ninguno — la consulta LIMIT 1 siempre apunta a la partición reciente |
| Volumen estimado | ~500 pings/vehículo/mes × N vehículos; una partición mensual acota el crecimiento |

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

  2. MOTOR — JWT congelado en IndexedDB:
     - useBackgroundSyncStore.congelarJwt(jwt, ID_nombre)  [await]
       ↳ JWT escrito en IndexedDB object store 'bgs_tokens' clave 'frozen_jwt'
          (IndexedDB es la única API accesible tanto desde Main Thread como desde SW)
       ↳ useAuthStore NO retiene el JWT: puede recibir un nuevo usuario libremente
     - useTerminalStore.estado = 'estado_0'  ← UI bloqueada para el usuario que hizo checkout
     - El resto del flujo_checkout_automatico se ejecuta con normalidad
       (Doc-8 cerrado, estados del vehículo actualizados, etc.)
     - EXCEPCIÓN: useAuthStore.clearJwt() NO se llama todavía para ese usuario

  3. SERVICE WORKER — vaciado de cola:
     - Al recuperar conexión, el SW abre directamente IndexedDB 'u24_offline' y lee
       bgs_tokens['frozen_jwt'].jwt — sin postMessage, sin pasar por la sesión de UI activa
     - Ejecuta procesarCola() con el JWT congelado del usuario que hizo checkout
     - Cada mutación procesada con HTTP 200 se elimina de IndexedDB
     - Si alguna falla → marcada como 'fallido'; el resto continúa
     - **Mientras el SW trabaja, Usuario B puede operar con su propio JWT en estado_1
       sin interferencia alguna — los stores son completamente independientes**

  4. DESTRUCCIÓN DIFERIDA del JWT:
     - Cuando pendingCount === 0 (cola vacía):
       → useOfflineQueue.clearJwtAfterSync()
         → useBackgroundSyncStore.liberarJwt()  [await]
             ← DELETE bgs_tokens['frozen_jwt'] de IndexedDB
         → useAuthStore.clearJwt()              ← destruye la sesión del usuario A si sigue en estado_0
       → Banner actualizado: "Sincronización completada"
     - Si hay mutaciones en estado 'fallido':
       → El JWT sigue congelado en IndexedDB (bgs_tokens)
       → Banner: "N operaciones fallidas — requieren atención"
       → El supervisor / next pilot puede revisar y descartar manualmente
```

### 30.4 Seguridad e aislamiento de sesión

* El JWT congelado **no eleva los permisos** de nadie: la UI del usuario que hizo
  checkout está en `estado_0` (bloqueada), ningún componente puede operar ni
  renderizar módulos protegidos.
* El JWT solo es accesible por el Service Worker, que lo lee directamente de IndexedDB
  (`bgs_tokens['frozen_jwt']`) sin pasar por ningún store de UI ni por postMessage.
  No está expuesto a componentes UI ni al store de sesión activa.
* **Aislamiento de hilos de sesión:** mientras el SW vacía la cola de Usuario A,
  Usuario B puede iniciar sesión, recibir su propio JWT en `useAuthStore` y operar
  con plena normalidad en `estado_1`. Los dos tokens coexisten en stores completamente
  independientes — `useAuthStore` (sesión viva) y `useBackgroundSyncStore` (cola offline).
* El JWT congelado tiene su TTL natural (`shift_start + 36h`). Si expira antes de que
  se complete la sincronización, las mutaciones fallarán con 401 y se marcarán como
  `fallido` para revisión manual.

### 30.5 Exposición en stores

| Store | Campo / Método | Descripción |
|---|---|---|
| `useOfflineQueue` | `hasCriticalPending: boolean` | true si pendingCount > 0 y !isOnline en el momento del checkout |
| `useBackgroundSyncStore` | `frozenJwt` | JWT congelado; almacenado en IndexedDB `bgs_tokens['frozen_jwt']` — no en Zustand; solo el SW lo lee directamente |
| `useBackgroundSyncStore` | `hasFrozenJwt: boolean` | true mientras hay JWT congelado pendiente de vaciado |
| `useBackgroundSyncStore` | `congelarJwt(jwt, userId)` | Escrito exclusivamente por `useCheckin.checkout()` en CASO RETENCIÓN |
| `useBackgroundSyncStore` | `liberarJwt()` | Llamado por `useOfflineQueue.clearJwtAfterSync()` al vaciar la cola |
| `useOfflineQueue` | `clearJwtAfterSync(): void` | Orquesta: `liberarJwt()` + `useAuthStore.clearJwt()`. Solo cuando pendingCount === 0 |

---

## 31. Guardia de Integridad Geométrica — consistencia del odómetro

### 31.1 Problema

Si un pilot introduce un `km_inicio` inferior al `km_fin` registrado en el último
Doc-8 cerrado de ese vehículo, el historial de kilometraje retrocede. Esto genera
datos inconsistentes en consumos de combustible, mantenimientos preventivos y auditorías
de flota. El error puede ocurrir por fatiga o por confundir el odómetro entre vehículos.

### 31.2 Restricción

La validación se aplica en dos niveles:

**Nivel frontend (UX inmediata):**

```
Al solicitar km_inicio en el flujo de activación (hook useVehiculo.activar, paso 3):

  RPC 'get_ultimo_km_fin_vehiculo'({ id_vehiculo })
    → SELECT km_fin, timestamp_cierre, id_piloto
        FROM doc8
       WHERE id_vehiculo = $1
         AND estado = 'Enviado_Cerrado'
       ORDER BY timestamp_cierre DESC
       LIMIT 1

  Si km_inicio_propuesto < km_fin_ultimo:
    ERROR bloqueante en UI:
      "El kilómetro introducido ([km_inicio]) es inferior al registrado
       al cierre del turno anterior ([km_fin_ultimo] el [fecha_cierre]).
       Introduce un valor ≥ [km_fin_ultimo] para continuar."
    → El campo km_inicio queda en foco con el valor previo como placeholder
    → La activación NO puede continuar hasta corregir el valor
```

**Nivel base de datos (defensa en profundidad):**

```sql
-- CHECK CONSTRAINT en tabla doc8 (o trigger BEFORE INSERT)
-- Se compara contra el km_fin del Doc-8 anterior del mismo vehículo.
-- Si no existe Doc-8 anterior, la restricción no aplica.

CREATE OR REPLACE FUNCTION validar_km_inicio_vehiculo()
RETURNS TRIGGER AS $$
DECLARE
  km_fin_anterior INT;
BEGIN
  SELECT km_fin INTO km_fin_anterior
    FROM doc8
   WHERE id_vehiculo = NEW.id_vehiculo
     AND estado = 'Enviado_Cerrado'
   ORDER BY timestamp_cierre DESC
   LIMIT 1;

  IF km_fin_anterior IS NOT NULL AND NEW.km_inicio < km_fin_anterior THEN
    RAISE EXCEPTION 'km_inicio (%) inferior al km_fin anterior (%) para vehículo %',
      NEW.km_inicio, km_fin_anterior, NEW.id_vehiculo;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_km_inicio
  BEFORE INSERT ON doc8
  FOR EACH ROW EXECUTE FUNCTION validar_km_inicio_vehiculo();
```

### 31.3 Casos límite

| Caso | Comportamiento |
|---|---|
| Primer Doc-8 del vehículo (sin historial) | Sin restricción — cualquier `km_inicio` válido |
| Cambio de pilot con mismo `km_fin` | `km_inicio = km_fin` es válido (`>=`) |
| Odómetro reseteado por taller (excepción operativa) | El supervisor debe introducir justificación en campo `notas_km` y el bloqueo puede ser levantado por `coordinación` o `gerencia` (fuera de scope de esta versión — se registra como excepción manual en Doc-8) |

---

## 32. Flujo de Autorización Excepcional — Desbloqueo de vehículo inoperativo

### 32.1 Contexto

Cuando `condicion_tecnica = 'inoperativo_critico'`, el flujo estándar de activación
está bloqueado (ver `nucleo_operativa_rutinaria.md §flujo_activacion` y
`hooks.md §3 useVehiculo.activar`). Este bloqueo es la regla; el desbloqueo
excepcional es la excepción — requiere intervención explícita del centro de mando.

### 32.2 Flujo completo

```
TERMINAL DE VEHÍCULO (pilot)

  1. Intenta activar vehículo con condicion_tecnica = 'inoperativo_critico'
  2. UI muestra bloqueo + botón "Solicitar Desbloqueo Excepcional"
  3. Al pulsar el botón:
       POST Edge Function 'solicitar_desbloqueo_excepcional':
         { id_vehiculo, id_piloto_solicitante, motivo_urgencia: string, timestamp }
       → INSERT en tabla solicitudes_desbloqueo:
           { id_vehiculo, id_solicitante, estado: 'pendiente', timestamp_solicitud }
       → Notificación push en canal global:alertas_criticas + bandeja_entrada_coordinacion
  4. UI del terminal entra en espera activa:
       Suscripción a canal vehiculo:{id_vehiculo} evento 'desbloqueo_concedido'
       Banner: "Solicitud enviada — aguardando autorización de coordinación"

──────────────────────────────────────────

TERMINAL DE COORDINACIÓN (coordinador / gerencia)

  5. Recibe notificación en bandeja_entrada_coordinacion:
       Tipo: 'solicitud_desbloqueo_excepcional'
       Contenido: "[ID_vehiculo] — Solicitud de activación de emergencia por [ID_piloto].
                   Condición técnica: INOPERATIVO CRÍTICO."
       Acciones disponibles en la notificación:
         [ Autorizar ] [ Denegar ]

  6a. Si AUTORIZAR:
        POST Edge Function 'conceder_desbloqueo':
          { id_vehiculo, id_coordinador_autorizante, timestamp_autorizacion }
        → UPDATE solicitudes_desbloqueo SET estado = 'autorizado'
        → UPDATE vehiculos SET override_critico = true,
                               id_autorizante = id_coordinador,
                               timestamp_autorizacion = now()
        → Broadcast Realtime canal vehiculo:{id_vehiculo}:
            evento: 'desbloqueo_concedido'
            payload: { id_vehiculo, autorizante: ID_coordinador }
        → Registro de auditoría: Doc-11 automático con responsabilidad del autorizante

  6b. Si DENEGAR:
        → UPDATE solicitudes_desbloqueo SET estado = 'denegado'
        → Broadcast canal vehiculo:{id_vehiculo}:
            evento: 'desbloqueo_denegado'
        → Banner en terminal de vehículo: "Desbloqueo denegado por coordinación"

──────────────────────────────────────────

TERMINAL DE VEHÍCULO — al recibir 'desbloqueo_concedido'

  7. vehiculoStore[id_vehiculo].overrideCritico = true
  8. UI muestra advertencia: "⚠️ Activación bajo responsabilidad del centro de mando."
  9. Pilot puede confirmar la activación (introduce km_inicio, asigna roles, etc.)
 10. Al confirmar la activación:
       → override_critico = false  (consumido — válido para UNA sola activación)
       → UPDATE vehiculos SET override_critico = false
       → La siguiente activación requerirá nueva autorización
```

### 32.3 Tabla `solicitudes_desbloqueo`

```sql
solicitudes_desbloqueo:
  id                    UUID          PK
  id_vehiculo           TEXT          FK → vehiculos
  id_solicitante        TEXT          FK → personas (pilot)
  id_autorizante        TEXT NULL     FK → personas (coordinador)
  motivo_urgencia       TEXT NULL
  estado                TEXT          -- 'pendiente' | 'autorizado' | 'denegado'
  timestamp_solicitud   TIMESTAMPTZ
  timestamp_resolucion  TIMESTAMPTZ NULL
```

### 32.4 Campo `override_critico` en tabla `vehiculos`

```sql
ALTER TABLE vehiculos
  ADD COLUMN override_critico        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN id_autorizante_override TEXT NULL,        -- quien autorizó
  ADD COLUMN timestamp_override      TIMESTAMPTZ NULL; -- cuándo se autorizó
```

El campo `override_critico` es siempre `FALSE` al arrancar, se pone `TRUE`
por la Edge Function `conceder_desbloqueo`, y vuelve a `FALSE` inmediatamente
cuando el pilot confirma la activación.

### 32.5 Auditoría automática

Al concederse el desbloqueo y ejecutarse la activación, se genera automáticamente
un Doc-11 (Aviso urgente) con:

* Tipo: `activacion_bajo_override`
* `ID_vehiculo`, `ID_piloto_solicitante`, `ID_coordinador_autorizante`
* `timestamp_solicitud`, `timestamp_autorizacion`, `timestamp_activacion`
* Destino: `bandeja_entrada_coordinacion` + `bandeja_entrada_flota`

---

## 33. Operaciones Online-Only — restricción de origen

Ciertas operaciones no pueden encolarse offline porque requieren un timestamp
criptográfico del servidor para garantizar la integridad del inventario primario
o la atomicidad de transacciones críticas.

### 33.1 Listado de operaciones Online-Only

| Operación | Documento | Motivo |
|---|---|---|
| Entrada de stock al almacén | Doc-9 | Genera inventario primario; un timestamp local falso podría crear stock fantasma al vaciar colas asíncronas en cascada |
| Envío entre locations con guard atómico | Doc-10 | `stock_real >= p_cantidad` debe evaluarse sincronizadamente — ver §17.3 |
| Confirmación de recepción (Doc-10) | Doc-10 | Cierra un movimiento bilateral — requiere estado consistente en ambas partes |
| Resolución de descuadre | Doc-10 | Afecta al stock real y al historial de auditoría del inventario maestro |

### 33.2 Comportamiento en frontend

```
Al intentar enviar una operación Online-Only mientras isOnline = false:
  → throw Error('<tipo>_requiere_conexion')
  → UI muestra modal: "Esta operación requiere conexión activa.
                       Recupera la red e inténtalo de nuevo."
  → El borrador permanece en IndexedDB (no se pierde)
  → NO se encola en useOfflineQueue
```

### 33.3 Justificación técnica — Doc-9

Si Doc-9 se encolara offline, el vaciado de cola podría insertar múltiples entradas
de stock en un orden distinto al temporal real, o duplicar stock si el usuario
repite la operación creyendo que no se procesó. El timestamp del servidor actúa como
prueba de recepción irrefutable y permite detectar duplicados por idempotencia UUID.

---

## 34. Inyección Manual de JWT en terminal compartido

### 34.1 Problema

En un terminal compartido, varios `ID_nombre` pueden tener `checkin_on` simultáneamente.
El cliente Supabase JS gestiona una única sesión de auth global: si Usuario A y Usuario B
están ambos logueados, el cliente singleton siempre usa la sesión del último en autenticarse.
Cualquier mutación ejecutada por Usuario A a través del cliente global quedaría firmada
con el JWT de Usuario B — un fallo de identidad en el trail de auditoría y en las
políticas RLS de escritura.

### 34.2 Solución — cliente Singleton con interceptor de fetch dinámico

En lugar de instanciar un cliente nuevo por mutación, U24 usa un **único cliente
Supabase** cuyo custom `fetch` lee el JWT del ejecutor desde `useAuthStore` en el
momento exacto de cada petición de red. Esto elimina la proliferación de clientes y
concentra la lógica de autenticación en un único punto.

Ver `hooks.md §18` para el código completo del singleton, el wrapper `conEjecutor`
y la interfaz de `useAuthStore`.

### 34.3 Política de uso por tipo de operación

| Tipo de operación | Patrón | Motivo |
|---|---|---|
| SELECT (lectura) | `supabase.from(...)` sin wrapper | Sin RLS de escritura; cualquier sesión del terminal sirve |
| INSERT / UPDATE / DELETE | `conEjecutor(ejecutorId, () => supabase.from(...).op(...))` | El interceptor inyecta el JWT correcto en el header `Authorization` |
| Realtime (suscripciones) | `supabase.channel(...)` sin wrapper | Solo lectura; el interceptor no participa |
| Edge Functions | `conEjecutor(ejecutorId, () => supabase.functions.invoke(...))` | El interceptor añade el header al invoke |
| Cola offline | JWT congelado en payload; `addJwt` temporal antes de drenar | El interceptor lo lee igual — ver §34.5 |

### 34.4 Auditoría e imputación

El `ejecutorId` inyectado en cada petición asegura que:

* La política RLS de INSERT/UPDATE evalúa el `auth.uid()` correcto del JWT.
* Los campos automáticos `id_nombre_ejecutor` se rellenan via `auth.jwt()` en el servidor.
* El log de auditoría imputa la acción al usuario real.

### 34.5 Flujo offline — JWT congelado por mutación

```
Al encolar una mutación en useOfflineQueue:
  mutation.payload.ejecutorId = ejecutorId
  mutation.payload.jwt = useAuthStore.getState().getJwtFor(ejecutorId)
  // snapshot del token en el momento de la acción

Al drenar la cola (SW o reconexión):
  // Restaurar temporalmente el JWT congelado en el store para que el interceptor lo lea:
  useAuthStore.getState().addJwt(mutation.payload.ejecutorId, mutation.payload.jwt)
  await conEjecutor(mutation.payload.ejecutorId, () =>
    supabase.rpc(mutation.tipo, mutation.payload.data)
  )
  useAuthStore.getState().removeJwt(mutation.payload.ejecutorId)
  // Si el JWT ha expirado (> shift_start + 36h) → getJwtFor devuelve null
  // → interceptor lanza 'jwt_no_disponible' → mutation → estado 'fallido'
```

### 34.6 Concurrencia estricta — UUID de petición

Para el caso excepcional de mutaciones verdaderamente paralelas (no serializado por TanStack Query),
el interceptor puede extenderse con un `Map<requestId, ejecutorId>` donde el `requestId` viaja
como un header interno (`x-u24-request-id`) que el interceptor lee y elimina antes de enviar la
petición a Supabase. Este patrón resuelve cualquier condición de carrera entre dos `conEjecutor`
concurrentes pero está fuera del scope de la implementación actual (no hay caso de uso confirmado).

---

## 35. Escalado automático — Trigger Checklist360 → Doc-7

### 35.1 Problema

Cuando un TES o técnico de flota completa la revisión 360° de un vehículo y registra
incidencias, esa información debe escalar automáticamente al módulo de flota sin
requerir acción manual adicional del operario. De lo contrario, la incidencia queda
registrada solo en el checklist y no llega a la bandeja de flota.

### 35.2 Trigger

```sql
CREATE OR REPLACE FUNCTION trg_fn_checklist_a_doc7()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actúa si el checklist se guarda con incidencias detectadas
  IF NEW.estado = 'Completado_Con_Incidencias'
     AND NEW.incidencias_detectadas IS NOT NULL
     AND NEW.incidencias_detectadas != ''
  THEN
    INSERT INTO doc7 (
      id,
      id_vehiculo,
      descripcion_averia,
      gravedad,
      origen,
      estado_doc7,
      checklist_id,
      id_nombre_reportador,
      timestamp_generacion
    ) VALUES (
      gen_random_uuid(),
      NEW.id_vehiculo,
      NEW.incidencias_detectadas,
      'Leve',                            -- categoría por defecto; escalable a 'Moderada'
                                         -- si el campo gravedad_estimada del checklist lo indica
      'checklist360_automatico',
      'Emitida_Pendiente',               -- entra directamente a la bandeja de flota sin revisión previa
      NEW.id,
      NEW.id_nombre,                     -- quien firmó el checklist
      NOW()
    );

    -- Actualizar condicion_tecnica en la misma transacción
    -- Solo si el estado actual no es ya más grave (nunca degradar hacia Leve)
    UPDATE vehiculos
       SET condicion_tecnica = 'averiado_leve'
     WHERE id = NEW.id_vehiculo
       AND condicion_tecnica NOT IN ('averiado_grave', 'inoperativo_critico');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checklist_genera_doc7
  AFTER INSERT ON doc_checklist360
  FOR EACH ROW EXECUTE FUNCTION trg_fn_checklist_a_doc7();
```

### 35.3 Comportamiento resultante

| Evento | Consecuencia automática |
|---|---|
| Checklist guardado con estado `Completado` | Sin acción de flota |
| Checklist guardado con estado `Completado_Con_Incidencias` | Doc-7 auto-generado con gravedad `Leve` → inyectado en `bandeja_entrada_flota` + `condicion_tecnica = 'averiado_leve'` actualizado en `vehiculos` (si no hay estado técnico más grave ya activo) |
| Doc-7 en bandeja de flota | Técnico de flota lo recibe, lo revisa y puede escalarlo a `inoperativo_critico` si lo considera necesario (flujo normal de Doc-7) |

### 35.4 Trazabilidad

El campo `checklist_id` en `doc7` enlaza el informe de avería con la revisión 360°
que lo originó. Los técnicos de flota pueden consultar el checklist original desde
el Doc-7 para contexto adicional sobre qué secciones del vehículo presentaron la
incidencia.

### 35.5 Campo `gravedad_estimada` en el checklist (opcional)

Si el formulario `doc_checklist360` incluye un campo `gravedad_estimada`
(`Leve` | `Moderada`), el trigger puede usarlo:

```sql
      'gravedad', COALESCE(NEW.gravedad_estimada, 'Leve'),
```

De lo contrario, el default `'Leve'` es siempre seguro — nunca fuerza un
`inoperativo_critico` automático sin revisión humana de flota.

---

## 36. Bloqueo por Sincronía Diferida — Doc-8 en Borrador_En_Curso

### 36.1 Problema

Si un terminal ejecuta el checkout offline (con `jwtRetenido` o con Doc-8 aún
en `Borrador_En_Curso` pendiente de sincronización), y un nuevo pilot intenta
activar el mismo vehículo antes de que el Doc-8 anterior se haya enviado y cerrado
en Supabase, se abrirían dos Doc-8 solapados para el mismo vehículo:
el "fantasma" aún en tránsito y el nuevo. Esto corrompe el historial de turnos
y puede generar conflictos de FK al cerrar ambos con el mismo `id_vehiculo`.

### 36.2 Restricción en la función RPC de activación

La función RPC encargada de activar el vehículo y abrir el Doc-8 debe someter
la petición a una comprobación previa **antes** de ejecutar ningún INSERT:

```sql
CREATE OR REPLACE FUNCTION activar_vehiculo_y_abrir_doc8(
  p_id_vehiculo TEXT,
  p_km_inicio   INT,
  p_pilot_id    TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Guardia: Doc-8 anterior aún en Borrador_En_Curso para este vehículo
  IF EXISTS (
    SELECT 1 FROM doc8
     WHERE id_vehiculo = p_id_vehiculo
       AND estado = 'Borrador_En_Curso'
  ) THEN
    -- Devolver 409 Conflict via RAISE con código HTTP embebido en el mensaje
    RAISE EXCEPTION 'doc8_anterior_en_curso'
      USING HINT = '409',
            DETAIL = 'La desactivación del turno anterior aún está sincronizándose.
                      Espere unos instantes.';
  END IF;

  -- Si la guardia pasa, continúa con la activación normal
  UPDATE vehiculos SET estado_operativo = 'en_espera' WHERE id = p_id_vehiculo;
  INSERT INTO doc8 (id_vehiculo, km_inicio, pilot_id, estado, timestamp_apertura)
    VALUES (p_id_vehiculo, p_km_inicio, p_pilot_id, 'Borrador_En_Curso', NOW());
END;
$$ LANGUAGE plpgsql;
```

### 36.3 Manejo en el frontend (`useVehiculo.activar`)

```
Al ejecutar activar() — tras confirmar km_inicio (paso 3) y roles (paso 4):

  LLAMAR RPC 'activar_vehiculo_y_abrir_doc8':
    Si error.hint === '409':
      → UI muestra modal de error bloqueante:
        "La desactivación del turno anterior aún está sincronizándose.
         Espere unos instantes e inténtelo de nuevo."
      → No se ejecuta ningún UPDATE local en Zustand
      → El modal se cierra; el usuario debe reintentar manualmente

  Si éxito (HTTP 200):
    → useVehiculoStore[id].estadoOperativo = 'en_espera'
    → useVehiculoStore[id].km_inicio = kmInicio
    → El Doc-8 ya fue abierto por la RPC en el servidor
```

### 36.4 Condición de resolución automática

El bloqueo se levanta en cuanto el Service Worker envía el Doc-8 pendiente
(vaciado de cola offline) y la RPC o trigger en Supabase actualiza su estado
a `Enviado_Cerrado`. El nuevo pilot puede reintentar la activación inmediatamente
después. No hay mecanismo de timeout manual — el sistema es auto-resolvente.

---

## 37. Inyección de Excepciones de Patrón — Doc-12 Aprobada

### 37.1 Problema

Los cuadrantes de personal se construyen aplicando patrones de asignación periódicos
(A, B, C…) sobre rangos de fechas. Si RRHH aprueba una solicitud de vacaciones (Doc-12)
después de que el patrón ya fue aplicado, los días de vacaciones aprobados entran en
conflicto con los turnos de trabajo ya calculados. La solución no es recomputar el patrón
(eso podría sobrescribir ajustes manuales realizados en otros días), sino inyectar una
excepción de máxima prioridad que se superponga al patrón base para el rango exacto
de días aprobados.

### 37.2 Semántica de Excepción Absoluta

Una entrada con `es_excepcion_absoluta = TRUE` en la tabla de cuadrantes:

* **Tiene prioridad absoluta** sobre cualquier turno del mismo `(ID_nombre, fecha)`
  generado por un patrón de asignación.
* **No puede ser sobrescrita** por una reaplicación de patrón. El motor de aplicación
  de patrones debe verificar, para cada día del rango, si existe una excepción absoluta
  y saltarla incondicionalmente.
* **Solo puede eliminarse** con acción explícita de `rrhh` o `gerencia`.
* Si el Doc-12 es revertido a `Denegada` (acción manual de RRHH), las excepciones
  absolutas inyectadas deben eliminarse (rollback manual o trigger AFTER UPDATE).

### 37.3 Trigger de inyección

```sql
CREATE OR REPLACE FUNCTION trg_fn_doc12_aprobada_a_cuadrante()
RETURNS TRIGGER AS $$
DECLARE
  v_fecha  DATE;
BEGIN
  -- Solo actuar cuando la transición es hacia 'Aprobada'
  IF NEW.estado = 'Aprobada' AND OLD.estado != 'Aprobada' THEN

    -- Iterar sobre cada día del rango de vacaciones aprobado
    v_fecha := NEW.fecha_inicio;
    WHILE v_fecha <= NEW.fecha_fin LOOP

      -- Upsert: si ya existe una entrada para ese (ID_nombre, fecha), sobreescribir
      -- si y solo si NO es ya una excepción absoluta de otro tipo (por ejemplo, Baja).
      -- Si es excepción absoluta de otro tipo, NO sobrescribir.
      INSERT INTO cuadrante_turnos (
        id_nombre,
        fecha,
        tipo_turno,           -- 'V' = Vacaciones
        es_excepcion_absoluta,
        doc12_id,             -- FK al Doc-12 que originó la excepción
        timestamp_inyeccion
      )
      VALUES (
        NEW.id_nombre,
        v_fecha,
        'V',
        TRUE,
        NEW.id,
        NOW()
      )
      ON CONFLICT (id_nombre, fecha)
        DO UPDATE
          SET tipo_turno           = 'V',
              es_excepcion_absoluta = TRUE,
              doc12_id             = NEW.id,
              timestamp_inyeccion  = NOW()
          -- Condición: solo sobreescribir si la entrada existente NO es
          -- excepción absoluta de tipo distinto (p.ej. Baja médica)
          WHERE cuadrante_turnos.es_excepcion_absoluta = FALSE
             OR cuadrante_turnos.tipo_turno = 'V';

      v_fecha := v_fecha + INTERVAL '1 day';
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doc12_aprobada_a_cuadrante
  AFTER UPDATE ON doc_solicitudes_vacaciones
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_doc12_aprobada_a_cuadrante();
```

### 37.4 Protección del motor de patrones

El motor que aplica patrones de asignación debe incluir la siguiente guarda antes
de insertar cada día:

```
PARA cada (ID_nombre, fecha) en el rango a aplicar:
  SI EXISTS cuadrante_turnos WHERE id_nombre = X AND fecha = Y
             AND es_excepcion_absoluta = TRUE
    → SKIP este día — no sobrescribir
  SINO
    → INSERT / UPDATE normalmente
```

Esta guarda garantiza que reaplicar un patrón (por ejemplo, al extender el contrato)
nunca elimine los días de vacaciones ya aprobados.

### 37.5 Rollback al denegar

Si RRHH revierte una aprobación (Doc-12 pasa de `Aprobada` a `Denegada`), el trigger
homólogo elimina las excepciones absolutas inyectadas por ese `doc12_id`:

```sql
-- En el mismo trigger, rama ELSIF:
ELSIF NEW.estado = 'Denegada' AND OLD.estado = 'Aprobada' THEN
  DELETE FROM cuadrante_turnos
   WHERE doc12_id = NEW.id
     AND es_excepcion_absoluta = TRUE
     AND tipo_turno = 'V';
```

**Nota:** la denegación posterior a la aprobación es una acción excepcional que
requiere intervención manual de RRHH; el sistema no previene la denegación tardía,
pero revierte los datos automáticamente.

---

## 38. Vía de Aborto Contable — Doc-9 Rechazado_Devuelto

### 38.1 Caso de uso

Logística recibe un albarán físico que no puede registrarse tal como está:
material dañado en el transporte, proveedor erróneo, discrepancia irreconciliable
entre albarán y orden de compra, o partida de material no autorizada.
En lugar de dejar el Doc-9 abierto indefinidamente en `Pendiente_Recepcion`,
el operario ejecuta la **vía de aborto contable**: cierra el documento logísticamente
sin alterar el `stock_real`.

### 38.2 Semántica del estado `Rechazado_Devuelto`

* **Terminal e irreversible**: no existe transición de salida desde `Rechazado_Devuelto`.
* **NO-OP contable**: ninguna fila de `inventario_items` se toca. El `stock_real`
  del almacén de destino permanece inalterado.
* **Cierre logístico**: el Doc-9 desaparece de la bandeja activa y queda archivado.
  Consulta disponible en el historial de documentos del `inventory_location` de destino.
* **Trazabilidad completa**: el documento registra `motivo_rechazo`, `ID_nombre_rechazador`
  y `timestamp_rechazo`. Permanece accesible para auditoría.

### 38.3 Flujo UI

```
Logística abre Doc-9 en Pendiente_Recepcion
  → Botón "Rechazar y Devolver" (acción destructiva — color rojo)
  → Modal de confirmación:
      Campo: motivo_rechazo (texto libre, obligatorio — mínimo 10 caracteres)
      [ Confirmar rechazo ] [ Cancelar ]
  → Si confirma:
      UPDATE doc9
         SET estado              = 'Rechazado_Devuelto',
             motivo_rechazo      = p_motivo,
             id_nombre_rechazador = p_id_nombre,
             timestamp_rechazo   = NOW()
       WHERE id = p_doc9_id
         AND estado = 'Pendiente_Recepcion';   -- guarda OCC: ya fue procesado si 0 filas
      -- NO se toca inventario_items ni stock_real
      → El Doc-9 desaparece de la bandeja activa
      → Toast: "Documento rechazado y archivado. Stock no modificado."
```

### 38.4 RBAC

`logística`, `coordinación`, `gerencia`. No disponible para `tes`, `due`, `médico`.

### 38.5 Relación con descuadres

`Rechazado_Devuelto` no genera entrada en `descuadres_inventario`. No hay deuda
de stock que reconciliar — el material nunca entró contablemente al sistema.
Si el proveedor reenvía el material correcto, se crea un nuevo Doc-9 desde cero.

---

## 39. Asignación Atómica de Subinventario en Creación de DRP

### 39.1 Problema de condición de carrera

Cuando dos coordinadores crean un DRP casi simultáneamente y ambos seleccionan el
mismo subinventario (backpack), el subinventario podría quedar asignado a dos DRPs
si la asignación no es atómica. El segundo coordinator no vería el conflicto porque
el combobox de subinventarios se cargó antes de que el primero confirmara.

### 39.2 Guarda atómica en la RPC de creación

La función `crear_drp_atomico` incluye una guarda OCC sobre el estado del subinventario.
El UPDATE condicional `WHERE estado = 'Operativo'` actúa como candado optimista:
solo el primer hilo en ejecutar el UPDATE mueve la fila. El segundo encuentra
`ROW_COUNT = 0` y la transacción entera hace `ROLLBACK`.

```sql
-- Fragmento de la función crear_drp_atomico
-- (solo la parte de asignación de subinventario)

IF p_backpack_id IS NOT NULL THEN
  UPDATE subinventarios
     SET estado = 'Asignado',
         drp_id = v_drp_id    -- ID del DRP recién creado dentro de la misma TX
   WHERE id     = p_backpack_id
     AND estado = 'Operativo';  -- ← GUARDA ATÓMICA (OCC implícito)

  GET DIAGNOSTICS v_filas = ROW_COUNT;

  IF v_filas = 0 THEN
    -- El subinventario fue asignado por otro proceso entre la carga del combobox
    -- y la confirmación del usuario. Abortar la creación completa del DRP.
    RAISE EXCEPTION 'subinventario_ya_asignado'
      USING HINT = '409', DETAIL = p_backpack_id::TEXT;
  END IF;
END IF;
```

### 39.3 Comportamiento frontend

Ver `hooks.md §4 useDRP.crearDRP` para el manejo completo del error `409`.

**Resultado del conflicto:**

* El DRP no se crea (rollback total).
* El formulario permanece abierto con los datos del coordinador.
* Solo el campo `backpack_id` se limpia para nueva selección.
* El selector `selector_vehiculo_drp` y las dotaciones se conservan.

### 39.4 Estados válidos para asignación

Solo subinventarios con `estado = 'Operativo'` pueden asignarse a un DRP.
Un subinventario en `En_Transito`, `Asignado` u otro estado no puede usarse.
El combobox de selección de subinventario (en `crear_drp`) debe filtrar
previamente por `estado = 'Operativo'` para minimizar conflictos, aunque
la guarda en DB sigue siendo necesaria como defensa definitiva.

---

## 40. Trigger de Evaluación Máxima — Cierre de Doc-7

### 40.1 Problema

Cuando un técnico de flota marca un Doc-7 como `Reparada_Operativa`, el sistema no
puede restablecer `condicion_tecnica = 'operativo'` incondicionalmente. Si el vehículo
tiene otros Doc-7 activos (ej. una incidencia leve reportada horas antes del fallo grave
que acaba de repararse), restablecer `operativo` enmascaría los fallos secundarios,
haciéndolos invisibles para los coordinadores y para el pilot.

### 40.2 Función de evaluación MAX

```sql
CREATE OR REPLACE FUNCTION evaluar_condicion_tecnica_vehiculo(p_vehiculo_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_max_gravedad TEXT;
BEGIN
  -- Selecciona la gravedad máxima entre todos los Doc-7 NO cerrados del vehículo
  SELECT gravedad INTO v_max_gravedad
    FROM doc7
   WHERE id_vehiculo = p_vehiculo_id
     AND estado NOT IN ('Reparada_Operativa', 'Archivado')
   ORDER BY
     CASE gravedad
       WHEN 'Grave'    THEN 1
       WHEN 'Moderado' THEN 2
       WHEN 'Leve'     THEN 3
       ELSE                 4
     END
   LIMIT 1;

  -- Mapeo de gravedad a condicion_tecnica
  RETURN CASE v_max_gravedad
    WHEN 'Grave'    THEN 'inoperativo_critico'
    WHEN 'Moderado' THEN 'averiado_leve'
    WHEN 'Leve'     THEN 'averiado_leve'
    ELSE                 'operativo'   -- NULL → no quedan Doc-7 activos
  END;
END;
$$ LANGUAGE plpgsql;
```

### 40.3 Trigger de disparo

```sql
CREATE OR REPLACE FUNCTION trg_fn_doc7_cierre_evaluar_condicion()
RETURNS TRIGGER AS $$
DECLARE
  v_nueva_condicion TEXT;
BEGIN
  -- Solo actuar cuando el Doc-7 pasa a Reparada_Operativa
  IF NEW.estado = 'Reparada_Operativa' AND OLD.estado != 'Reparada_Operativa' THEN

    v_nueva_condicion := evaluar_condicion_tecnica_vehiculo(NEW.id_vehiculo);

    UPDATE vehiculos
       SET condicion_tecnica = v_nueva_condicion
     WHERE id = NEW.id_vehiculo;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doc7_cierre_evaluar_condicion
  AFTER UPDATE ON doc7
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_doc7_cierre_evaluar_condicion();
```

### 40.4 Tabla de resultados

| Doc-7 activos tras el cierre | `condicion_tecnica` resultante |
|---|---|
| Ninguno | `operativo` |
| Solo con gravedad `Leve` | `averiado_leve` |
| Solo con gravedad `Moderado` | `averiado_leve` |
| Mezcla `Leve` + `Moderado` | `averiado_leve` |
| Al menos uno con gravedad `Grave` | `inoperativo_critico` |

### 40.5 Propagación a terminales

El UPDATE en `vehiculos.condicion_tecnica` se propaga automáticamente vía
Supabase Realtime a todos los terminales que muestran ese vehículo.
El badge de `condicion_tecnica` se actualiza en tiempo real sin requerir acción del coordinador.

---

## 41. Cerrojo Atómico de Conducción — Promoción de Carry a Pilot

### 41.1 Problema de concurrencia

Cuando un vehículo está en `en_espera` con múltiples carries, dos terminales distintos
podrían intentar simultáneamente promover a sus respectivos carries como pilot del mismo
vehículo. Sin un guard atómico, ambas escrituras tendrían éxito y el vehículo quedaría
con dos pilots activos — estado incoherente y con consecuencias críticas para el Doc-8.

### 41.2 RPC atómica

```sql
CREATE OR REPLACE FUNCTION promover_carry_a_pilot_atomico(
  p_vehiculo_id  TEXT,
  p_id_nombre    TEXT,
  p_km_inicio    INT
)
RETURNS JSONB AS $$
DECLARE
  v_rows_affected INT;
BEGIN
  UPDATE vehiculos
     SET pilot_id = p_id_nombre
   WHERE id         = p_vehiculo_id
     AND pilot_id IS NULL;    -- guard de concurrencia: solo procede si no hay pilot activo

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'vehiculo_ya_tiene_pilot'
      USING HINT = '409',
            DETAIL = 'El vehículo ya tiene un pilot asignado — otro terminal fue más rápido.';
  END IF;

  -- Abrir Doc-8 solo si el UPDATE tuvo éxito
  INSERT INTO doc8 (id_vehiculo, pilot_id, km_inicio, estado, timestamp_inicio)
  VALUES (p_vehiculo_id, p_id_nombre, p_km_inicio, 'Activo', NOW());

  RETURN jsonb_build_object('status', 'ok', 'pilot_id', p_id_nombre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 41.3 Comportamiento del cliente ante el error 409

```
Si RPC lanza 'vehiculo_ya_tiene_pilot':
  → throw Error('vehiculo_ya_tiene_pilot')
  → Toast (no bloqueante): "Este vehículo ya tiene un pilot asignado.
                            Recarga y comprueba el estado."
  → El store local NO se actualiza — se preserva el estado real del servidor.
  → TanStack Query invalida `vehiculos/${vehiculoId}` para forzar re-fetch.
```

Ver `hooks.md §2 promoverCarryAPilot` para el flujo completo en cliente.

---

## 42. Fuerza Bruta Administrativa — Checkout Forzado por Coordinador

### 42.1 Propósito

Permite a un coordinador o gerente retirar de forma autoritativa a un pilot fantasma
(con `pilot_id` activo en base de datos pero terminal inaccesible o sin respuesta) sin
necesidad de que ese pilot ejecute el flujo de checkout estándar desde su dispositivo.

### 42.2 RPC `forzar_checkout_administrativo`

```sql
CREATE OR REPLACE FUNCTION forzar_checkout_administrativo(
  p_vehiculo_id      TEXT,
  p_pilot_id         TEXT,
  p_km_fin           INT DEFAULT NULL,   -- NULL aceptado en offboarding (ver §42.3)
  p_coordinador_id   TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_doc8_id UUID;
BEGIN
  -- 1. Verificar que el pilot sigue activo en ese vehículo (guard de concurrencia)
  IF NOT EXISTS (
    SELECT 1 FROM vehiculos
     WHERE id = p_vehiculo_id AND pilot_id = p_pilot_id
  ) THEN
    RAISE EXCEPTION 'pilot_no_activo_en_vehiculo'
      USING HINT = '409',
            DETAIL = 'El pilot ya no está asignado a este vehículo.';
  END IF;

  -- 2. Localizar el Doc-8 abierto
  SELECT id INTO v_doc8_id
    FROM doc8
   WHERE id_vehiculo = p_vehiculo_id
     AND pilot_id    = p_pilot_id
     AND estado      = 'Activo'
   LIMIT 1;

  -- 3. Cerrar el Doc-8 administrativamente
  IF v_doc8_id IS NOT NULL THEN
    UPDATE doc8_partes_trabajo
       SET km_fin              = p_km_fin,
           estado              = 'Enviado_Cerrado',
           timestamp_fin       = NOW(),
           cerrado_por_admin_id = p_coordinador_id   -- FK fichas_empleados; null = cierre normal
     WHERE id = v_doc8_id;
  END IF;

  -- 4. Retirar el pilot del vehículo
  UPDATE vehiculos
     SET pilot_id        = NULL,
         estado_operativo = 'en_espera'
   WHERE id = p_vehiculo_id;

  -- 5. Auditoría en auditoria_rbac
  INSERT INTO auditoria_rbac
    (tipo_evento, id_nombre, metadata, created_at)
  VALUES
    ('checkout_forzado', p_coordinador_id,
     jsonb_build_object(
       'vehiculo_id', p_vehiculo_id,
       'pilot_id',    p_pilot_id,
       'km_fin',      p_km_fin,
       'doc8_id',     v_doc8_id
     ),
     NOW());

  -- 6. Notificación a bandeja_entrada_coordinacion via trigger/Edge Function
  PERFORM pg_notify(
    'checkout_administrativo',
    json_build_object(
      'vehiculo_id',    p_vehiculo_id,
      'pilot_id',       p_pilot_id,
      'km_fin',         p_km_fin,
      'coordinador_id', p_coordinador_id
    )::text
  );

  RETURN jsonb_build_object('status', 'ok', 'doc8_cerrado', v_doc8_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 42.3 Estado de Doc-8 resultante

El Doc-8 cierra con `estado = 'Enviado_Cerrado'` (valor unificado del enum).
La distinción del cierre administrativo se hace a través del campo `cerrado_por_admin_id`
(UUID, FK `fichas_empleados`): si es `NULL`, fue un cierre normal por el pilot;
si contiene un UUID, fue un cierre forzado y ese UUID identifica al coordinador responsable.
El evento `checkout_forzado` en `auditoria_rbac` registra la trazabilidad completa.

**Decisión: `km_fin = NULL` en offboarding (C-04)**

Cuando el cierre forzado se produce durante el offboarding de un empleado
(`ef_baja_empleado §51`), el km final no está disponible operativamente.
La tabla `doc8_partes_trabajo` permite `km_fin NULL` **únicamente cuando
`cerrado_por_admin_id IS NOT NULL`** — esa combinación identifica inequívocamente
un cierre administrativo sin odómetro. Los informes de gestión deben excluir
estas filas del cálculo de km recorridos o tratar el valor como `0`.

> **Migración requerida:** si `km_fin` era `NOT NULL` en la migración inicial,
> debe añadirse la columna como nullable:
> ```sql
> ALTER TABLE doc8_partes_trabajo ALTER COLUMN km_fin DROP NOT NULL;
> ```

### 42.4 RBAC

La función lleva `SECURITY DEFINER`. La RLS de llamada debe verificar que el
`auth.uid()` del invocador pertenece a un rol `coordinación` o `gerencia` antes
de permitir la ejecución. Cualquier otro rol recibe `permission_denied`.

Ver `hooks.md §3 forzarCheckoutAdministrativo` para el flujo completo en cliente.
Ver `nucleo_coordinacion_y_seguridad.md` para el acceso desde panel de coordinación.

---

## 43. Mecanismo de Enmienda Anidada — Corrección de Registros Clínicos

### 43.1 Problema

Los registros clínicos (Doc-2, Doc-3, Doc-4, Doc-5, asistencias Doc-1) son inmutables
por diseño (trazabilidad médico-legal). No se puede hacer UPDATE sobre el contenido ni
DELETE sobre registros ya enviados. Sin embargo, los errores de registro son inevitables
en condiciones de emergencia — el sistema necesita un mecanismo de corrección que
preserve el audit trail sin violar la inmutabilidad.

### 43.2 Columna `ID_reemplazado_por`

Se añade a todas las tablas de registros clínicos:

```sql
-- Aplicar a: doc1_asistencias, doc2, doc3, doc4, doc5
ALTER TABLE doc1_asistencias
  ADD COLUMN id_reemplazado_por UUID NULL
    REFERENCES doc1_asistencias(id) ON DELETE SET NULL;

-- Mismo patrón para doc2, doc3, doc4, doc5
ALTER TABLE doc2 ADD COLUMN id_reemplazado_por UUID NULL REFERENCES doc2(id) ON DELETE SET NULL;
ALTER TABLE doc3 ADD COLUMN id_reemplazado_por UUID NULL REFERENCES doc3(id) ON DELETE SET NULL;
ALTER TABLE doc4 ADD COLUMN id_reemplazado_por UUID NULL REFERENCES doc4(id) ON DELETE SET NULL;
ALTER TABLE doc5 ADD COLUMN id_reemplazado_por UUID NULL REFERENCES doc5(id) ON DELETE SET NULL;
```

Semántica: `id_reemplazado_por IS NOT NULL` indica que este registro ha sido sustituido
por el que referencia. El registro original **permanece en la BBDD** — nunca se elimina.

### 43.3 Flujo de corrección

```
Para corregir un registro clínico (ej. doc2 con id = 'abc'):

1. El usuario selecciona "Enmendar" sobre el registro erróneo.
2. El formulario se abre prepopulado con los datos del original.
3. El usuario corrige los campos y guarda.
4. El sistema ejecuta DOS operaciones atómicas:

   a. INSERT del nuevo registro correcto:
      { ...datos_corregidos, timestamp_registro: NOW(), ID_nombre_registrador: usuarioActivo }
      → Genera nuevo UUID = 'def'

   b. UPDATE del registro original (SOLO el campo `id_reemplazado_por`):
      UPDATE doc2
         SET id_reemplazado_por = 'def'
       WHERE id = 'abc'
```

### 43.4 RLS — restricción de UPDATE al único campo permitido

```sql
-- Política RLS para UPDATE en registros clínicos (solo permite actualizar id_reemplazado_por)
CREATE POLICY "doc2_update_solo_reemplazado_por" ON doc2
  FOR UPDATE
  USING (
    auth.uid() = id_nombre_registrador   -- solo el autor original puede enmendar su propio registro
    OR current_setting('request.jwt.claims', true)::jsonb->>'rol' IN ('coordinación', 'gerencia')
  )
  WITH CHECK (
    -- Solo el campo id_reemplazado_por puede cambiar; todo lo demás debe ser idéntico
    -- La comprobación real la hace la Edge Function / RPC — esta política es la última línea de defensa
    id_reemplazado_por IS NOT NULL   -- el UPDATE solo es válido si rellena este campo
  );
```

La validación de que el UPDATE realmente solo toca `id_reemplazado_por` (y no el contenido
clínico) se implementa en la RPC `enmendar_registro_clinico`, que reconstruye la fila
comparando OLD y NEW antes del UPDATE.

### 43.5 Comportamiento de la UI

```
En la vista de registros del documento (Doc-1, Doc-2, etc.):
  - Registros con id_reemplazado_por IS NOT NULL:
    → Se filtran del listado activo (ocultos por defecto)
    → Accesibles mediante toggle "Mostrar historial de enmiendas" (solo lectura)
    → Badge visual: "🔄 ENMENDADO — ver versión actual"
  - Registros con id_reemplazado_por IS NULL:
    → Se muestran con normalidad (son los vigentes)
```

**Trazabilidad forense:** ambos registros (original y corrección) están en BBDD.
El original muestra quién lo creó, cuándo, y qué UUID lo reemplaza. La corrección
muestra quién la realizó, cuándo, y los datos correctos. Cualquier auditoría médica
puede reconstruir el historial completo.

---

## 44. Restricción de Exclusividad Geográfica — Vehículo en DRP único

### 44.1 Problema

Sin una restricción a nivel de motor, dos coordinadores podrían añadir
simultáneamente el mismo vehículo a dos DRPs distintos. El guard optimista
del frontend no es suficiente ante condiciones de carrera en red.

### 44.2 Índice único parcial

```sql
-- Un vehículo solo puede estar desplegado (timestamp_salida_drp IS NULL)
-- en una única entrada de drp_dotaciones al mismo tiempo.
CREATE UNIQUE INDEX uq_vehiculo_drp_activo
  ON drp_dotaciones (id_vehiculo)
  WHERE timestamp_salida_drp IS NULL;
```

El índice es **parcial**: solo cubre las filas activas (`timestamp_salida_drp IS NULL`).
Las filas con `timestamp_salida_drp` ya relleno (vehículo que salió del DRP)
no participan en la restricción — un vehículo que salió de un DRP puede entrar a otro.

### 44.3 Manejo del error en cliente

Cuando el INSERT en `drp_dotaciones` viola el índice, Supabase devuelve
`PostgresError code = '23505'` (unique_violation).

```typescript
// En useDRP.entrarConVehiculo:
try {
  await supabase.from('drp_dotaciones').insert(...)
} catch (err) {
  if (err.code === '23505') {
    throw new Error('vehiculo_ya_desplegado_en_drp')
    // UI: "El vehículo ya se encuentra desplegado en otro dispositivo activo."
    //     Toast no bloqueante — el formulario permanece abierto.
  }
  throw err  // otros errores: propagar
}
```

**Mensaje de usuario exacto:** *"El vehículo ya se encuentra desplegado en otro
dispositivo activo."*

### 44.4 Pre-check optimista en UI (§11.2 modificado)

Antes de enviar el INSERT, el selector `selector_vehiculo_drp` ya filtra vehículos
con `drp_activo = true` mediante la RPC `get_vehiculos_disponibles_para_drp()`.
El índice actúa como **última línea de defensa** ante condiciones de carrera
que el pre-check no puede evitar (dos sesiones simultáneas pasando el filtro
al mismo tiempo).

---

## 45. Dispositivos Validados — Revocación y Traspaso de Hardware

### 45.1 Modelo de datos ampliado — tabla `galletas_terminales`

Para dar soporte al panel de dispositivos validados, la información de las galletas
permanentes (`token_especial`) se mantiene en una tabla dedicada que extiende
`sesiones_emergencia` con metadatos del terminal físico:

```sql
galletas_terminales:
  id              UUID          PK  DEFAULT gen_random_uuid()
  pin_hash        TEXT          NOT NULL   -- hash del PIN (para auditoría — no el PIN en claro)
  id_terminal     TEXT          NOT NULL DEFAULT ''
                                           -- fingerprint del terminal; vacío hasta consumo del PIN
  matricula       TEXT          NULL       -- matrícula del vehículo asociado (opcional, editable)
  descripcion     TEXT          NOT NULL   -- OBLIGATORIO: ej. "Tablet Ambulancia 7 — 1234-ABC"
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  creada_por      TEXT          NOT NULL   -- ID del coordinador/gerente que la generó
  revocada_at     TIMESTAMPTZ   NULL       -- relleno al revocar
  revocada_por    TEXT          NULL
  activa          BOOLEAN       NOT NULL DEFAULT FALSE
                                           -- false hasta que el PIN sea consumido por un terminal
```

**Flujo de pre-registro (generación del `token_especial`):**

1. El coordinador rellena el campo `descripcion` (obligatorio — validado en UI y servidor).
2. El servidor genera el PIN, hace hash, e inserta en `galletas_terminales` con
   `id_terminal = ''` y `activa = false` — la fila existe pero el terminal aún no está vinculado.
3. El PIN se muestra una vez en pantalla al coordinador.

**Flujo de binding (consumo del PIN en el terminal):**

1. El terminal genera su `id_terminal` (fingerprint — ver `terminal_check.md`).
2. Envía el PIN + `id_terminal` a la Edge Function `consumir_pin`.
3. La Edge Function evalúa el tipo de PIN:
   * **Permanente (`token_especial`):**

     ```sql
     UPDATE galletas_terminales
        SET id_terminal  = p_id_terminal,
            activa       = TRUE,
            consumido_at = NOW()
      WHERE pin_hash = hash(p_pin)
        AND activa   = FALSE
        AND id_terminal = '';   -- solo fila pre-registrada sin terminal
     ```

     Inyecta cookie segura permanente. La fila en `galletas_terminales` queda activa.
   * **Temporal (`token_de_seguridad`):**
     No toca `galletas_terminales`. Registra `id_terminal` y `consumido_at` en
     `sesiones_emergencia` únicamente (trazabilidad de auditoría).

### 45.2 RPC `revocar_y_reemitir_galleta`

```sql
CREATE OR REPLACE FUNCTION revocar_y_reemitir_galleta(
  p_galleta_id    UUID,    -- ID de la galleta a revocar
  p_coordinador_id TEXT,   -- quien ejecuta la acción
  p_descripcion   TEXT     -- descripción para la nueva galleta (tablet de sustitución)
)
RETURNS JSONB AS $$
DECLARE
  v_nuevo_pin  TEXT;
  v_nuevo_id   UUID;
BEGIN
  -- 1. Marcar la galleta existente como revocada
  UPDATE galletas_terminales
     SET activa       = FALSE,
         revocada_at  = NOW(),
         revocada_por = p_coordinador_id
   WHERE id     = p_galleta_id
     AND activa = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'galleta_no_encontrada_o_ya_revocada' USING HINT = '404';
  END IF;

  -- 2. Generar nuevo PIN de 6 dígitos aleatorios
  v_nuevo_pin := lpad(floor(random() * 1000000)::TEXT, 6, '0');

  -- 3. INSERT en sesiones_emergencia (TTL de 10 min — idéntico al flujo estándar)
  INSERT INTO sesiones_emergencia (tipo, pin, created_at, expires_at, creada_por)
  VALUES ('galleta', v_nuevo_pin, NOW(), NOW() + INTERVAL '10 minutes', p_coordinador_id)
  RETURNING id INTO v_nuevo_id;

  -- 4. Pre-crear registro en galletas_terminales (se actualizará cuando se consuma el PIN)
  INSERT INTO galletas_terminales (id, pin_hash, id_terminal, descripcion, created_at, creada_por, activa)
  VALUES (
    gen_random_uuid(),
    crypt(v_nuevo_pin, gen_salt('bf', 10)),  -- hash bcrypt del PIN para auditoría
    '',           -- id_terminal se rellena al consumir el PIN
    p_descripcion,
    NOW(),
    p_coordinador_id,
    FALSE         -- inactiva hasta que el nuevo terminal consuma el PIN
  );

  -- 5. Auditoría
  INSERT INTO auditoria_acciones_admin (accion, detalles, id_coordinador, timestamp)
  VALUES ('revocar_galleta', json_build_object('galleta_revocada', p_galleta_id)::text,
          p_coordinador_id, NOW());

  RETURN jsonb_build_object(
    'status',      'ok',
    'nuevo_pin',   v_nuevo_pin,   -- devuelto solo al coordinador en pantalla — no persistido en claro
    'expires_at',  (NOW() + INTERVAL '10 minutes')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Seguridad:** el PIN nuevo se genera y devuelve en claro **una única vez** en la
respuesta del RPC. El coordinador lo communica por canal externo (radio, teléfono)
al operador de la nueva tablet. No se almacena en claro en ninguna tabla.

Ver `nucleo_coordinacion_y_seguridad.md → dispositivos_validados` para el panel UI.

---

## 46. Enrutamiento de Deserción — Desemparejamiento de Carry en DRP Activo

### 46.1 Problema

Cuando un carry desea desemparejarse de un vehículo desplegado en un DRP, hay dos
intenciones operativas radicalmente distintas que el sistema no puede inferir sin
preguntar al usuario:

1. **Abandono del DRP** — el carry termina su turno o se retira del dispositivo.
2. **Permanencia intra-DRP** — el carry seguirá operativo dentro del mismo DRP,
   pero ligado a otro vehículo o a pie. Su cómputo de horas en el DRP no debe
   interrumpirse.

### 46.2 Transferencia atómica `drp_dotaciones → drp_personal_a_pie`

Para la Opción B (permanencia intra-DRP), el carry se mueve de la dotación
vehicular a la tabla de personal a pie preservando su `timestamp_entrada_drp` original.

```sql
CREATE OR REPLACE FUNCTION transferir_carry_a_personal_a_pie(
  p_drp_id      UUID,
  p_id_nombre   TEXT,
  p_vehiculo_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_ts_entrada TIMESTAMPTZ;
BEGIN
  -- 1. Capturar timestamp_entrada_drp original (no se puede perder)
  SELECT timestamp_entrada_drp INTO v_ts_entrada
    FROM drp_dotaciones
   WHERE drp_id      = p_drp_id
     AND id_nombre   = p_id_nombre
     AND id_vehiculo = p_vehiculo_id
     AND timestamp_salida_drp IS NULL;

  IF v_ts_entrada IS NULL THEN
    RAISE EXCEPTION 'dotacion_no_encontrada'
      USING HINT = '404',
            DETAIL = 'No existe dotación activa para ese carry en ese vehículo/DRP.';
  END IF;

  -- 2. Eliminar de drp_dotaciones (sale de la dotación vehicular)
  DELETE FROM drp_dotaciones
   WHERE drp_id      = p_drp_id
     AND id_nombre   = p_id_nombre
     AND id_vehiculo = p_vehiculo_id
     AND timestamp_salida_drp IS NULL;

  -- 3. Insertar en drp_personal_a_pie conservando timestamp_entrada_drp original
  INSERT INTO drp_personal_a_pie (drp_id, id_nombre, timestamp_entrada_drp)
  VALUES (p_drp_id, p_id_nombre, v_ts_entrada)
  ON CONFLICT (drp_id, id_nombre) DO NOTHING;
  -- ON CONFLICT: si ya existe una fila a pie activa (caso raro), no duplicar.
END;
$$ LANGUAGE plpgsql;
```

### 46.3 Flujo completo — ver `hooks.md §3 useVehiculo.quitarPersona`

---

## 47. Gasto Offline con Stock Insuficiente — RPC `forzar_gasto_con_descuadre`

### 47.1 Problema

Cuando un Doc-6 (gasto de material) se encola offline y se replica al reconectar,
la RPC estándar `registrar_doc6_metadata` puede rechazarlo con `stock_insuficiente`
si el `stock_real` en Supabase ya cayó por debajo de la cantidad solicitada —
por ejemplo, porque otro terminal registró consumo del mismo ítem mientras el primero
estaba sin cobertura.

Abortar el gasto en ese punto sería incorrecto: el consumo físico ya ocurrió.
El sistema debe registrar el gasto, permitir que el stock caiga a negativo de forma
temporal, y delegar la regularización a logística.

### 47.2 RPC `forzar_gasto_con_descuadre`

```sql
CREATE OR REPLACE FUNCTION forzar_gasto_con_descuadre(
  p_location_id   UUID,
  p_item_id       UUID,
  p_cantidad      INTEGER,
  p_terminal_id   TEXT,
  p_mutation_uuid UUID
)
RETURNS VOID AS $$
DECLARE
  v_stock_nuevo INTEGER;
BEGIN
  -- 1. Descuento incondicional — el stock_real puede quedar negativo
  UPDATE inventario_items
     SET stock_real = stock_real - p_cantidad
   WHERE location_id = p_location_id
     AND id          = p_item_id
  RETURNING stock_real INTO v_stock_nuevo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_no_encontrado'
      USING HINT = '404',
            DETAIL = 'location_id=' || p_location_id || ' item_id=' || p_item_id;
  END IF;

  -- 2. Registrar descuadre — delega regularización a logística
  --    entidad_imputable_tipo: NOT NULL DEFAULT 'sin_imputar' — logística imputará al resolver
  INSERT INTO descuadres_inventario (
    location_id,
    item_id,
    cantidad_descuadre,
    motivo,
    terminal_id,
    mutation_uuid,
    stock_resultante,
    entidad_imputable_tipo,  -- enum entidad_imputable, NOT NULL
    created_at
  ) VALUES (
    p_location_id,
    p_item_id,
    p_cantidad,
    'gasto_offline_stock_insuficiente',
    p_terminal_id,
    p_mutation_uuid,
    v_stock_nuevo,
    'sin_imputar',           -- valor inicial; logística actualiza al resolver
    NOW()
  )
  ON CONFLICT (mutation_uuid) DO NOTHING;

  -- 3. Notificar a bandeja_entrada_logistica
  --    El INSERT en descuadres_inventario dispara trigger
  --    trg_descuadre_notificar_bandeja (ver §7) que genera la entrada
  --    en bandeja con estado 'Emitida_Pendiente'.
  --    No se requiere INSERT explícito aquí.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 47.3 Notas de diseño

| Aspecto | Decisión |
|---|---|
| Stock negativo | Permitido temporalmente — representa deuda física; logística reconcilia |
| `mutation_uuid` | Idempotencia: re-envío del mismo UUID no genera doble descuadre (ver §47.4) |
| Notificación logística | Vía trigger `trg_descuadre_notificar_bandeja` existente (§7) — consistente con flujos de Doc-10 |
| Responsabilidad de regularización | Imputada al `terminal_id` del gasto — logística sabe qué terminal generó el conflicto |
| Estado del Doc-6 en Supabase | La RPC no bloquea la inserción del Doc-6; la metadata del gasto se considera registrada |

### 47.4 Idempotencia

Para evitar doble descuento si la conexión cae justo tras el éxito del RPC pero
antes del DELETE de IndexedDB:

```sql
-- Añadir restricción única en descuadres_inventario
ALTER TABLE descuadres_inventario
  ADD CONSTRAINT uq_descuadre_mutation_uuid UNIQUE (mutation_uuid);

-- La RPC usa INSERT ... ON CONFLICT DO NOTHING cuando ya existe el UUID
INSERT INTO descuadres_inventario ( ... )
VALUES ( ... )
ON CONFLICT (mutation_uuid) DO NOTHING;
-- Si ya existe: la operación es no-op, el UPDATE de stock YA se aplicó
-- (se asume que el UPDATE previo fue exitoso dado que el INSERT también lo fue)
```

> **Advertencia**: la idempotencia del `UPDATE inventario_items` no puede
> garantizarse igual de trivialmente. El handler de cola debe comprobar
> `descuadres_inventario WHERE mutation_uuid = p_mutation_uuid` antes de
> llamar la RPC — si ya existe, saltar directamente a DELETE de IndexedDB
> sin rellamar la RPC.
>
> Esta comprobación se añade al bloque RAMA ESPECIAL de
> `hooks.md §9 useOfflineQueue.procesarCola`.

### 47.5 Referencia cruzada

Ver `hooks.md §9 useOfflineQueue.procesarCola — RAMA ESPECIAL` para el flujo
del cliente que invoca esta RPC.

---

## 48. Cancelación Forzada de DRP — RPC `cancelar_drp` (Gap R2)

### 48.1 Propósito

Permite a coordinación o gerencia cancelar un DRP en estado `En_curso` directamente,
sin pasar por `Finalizado`. El DRP pasa al estado terminal `Cancelado`.
Nunca se elimina del sistema — el audit trail se preserva íntegramente para cualquier
DRP que haya alcanzado `En_curso`.

### 48.2 RPC `cancelar_drp`

```sql
CREATE OR REPLACE FUNCTION cancelar_drp(
  p_drp_id          UUID,
  p_coordinador_id  TEXT
)
RETURNS VOID AS $$
DECLARE
  v_estado_actual TEXT;
  v_mochila_row   RECORD;
BEGIN
  -- 1. Guard (FOR UPDATE): bloquear la fila del DRP — previene race conditions
  --    si dos coordinadores pulsan "Cancelar" simultáneamente (C-03)
  SELECT estado INTO v_estado_actual
    FROM drps WHERE id = p_drp_id FOR UPDATE;

  -- Distinguir doble cancelación (idempotente) de estado genuinamente inválido (C-03)
  IF v_estado_actual = 'Cancelado' THEN
    RAISE EXCEPTION 'drp_ya_cancelado'
      USING HINT   = '409',
            DETAIL = 'El DRP ya estaba en estado Cancelado — no se realiza ninguna acción.';
  END IF;

  IF v_estado_actual IS DISTINCT FROM 'En_curso' THEN
    RAISE EXCEPTION 'drp_estado_invalido'
      USING HINT   = '409',
            DETAIL = format(
              'El DRP está en estado "%s". Solo pueden cancelarse DRPs en estado En_curso.',
              v_estado_actual
            );
  END IF;

  -- 2. Marcar el DRP como Cancelado
  UPDATE drps
     SET estado                = 'Cancelado',
         timestamp_cancelacion = NOW(),
         cancelado_por_id      = (SELECT id_persona FROM fichas_empleados
                                   WHERE id_nombre = p_coordinador_id)
   WHERE id = p_drp_id;

  -- 3. Desvincular dotaciones activas (vehículos salen del DRP; sus Doc-8 siguen abiertos)
  UPDATE dotaciones_drp
     SET timestamp_salida = NOW()
   WHERE id_drp = p_drp_id
     AND timestamp_salida IS NULL;

  -- 4. Desvincular personal a pie activo
  UPDATE drp_personal_a_pie
     SET timestamp_salida = NOW()
   WHERE id_drp = p_drp_id
     AND timestamp_salida IS NULL;

  -- 5. Cierre forzado de sesiones PSA del DRP
  UPDATE psa_sesiones
     SET timestamp_cierre = NOW()
   WHERE id_drp = p_drp_id
     AND timestamp_cierre IS NULL;

  -- 6. Cerrar pacientes PSA activos con estado 'cancelado_por_drp' (C-01)
  --    No se toca a pacientes ya en estado terminal (alta, exitus, cancelado_por_drp)
  UPDATE psa_pacientes
     SET estado = 'cancelado_por_drp'
   WHERE id_sesion IN (
     SELECT id_sesion FROM psa_sesiones WHERE id_drp = p_drp_id
   )
     AND estado NOT IN ('alta', 'exitus', 'cancelado_por_drp');

  -- 7. Cierre forzado de sesiones de filiación del DRP
  UPDATE filiacion_sesiones
     SET timestamp_cierre = NOW()
   WHERE id_drp = p_drp_id
     AND timestamp_cierre IS NULL;

  -- 8. Cerrar pacientes de filiación activos con estado 'cancelado_por_drp' (C-01)
  --    Si estaban en consulta, cerrar también timestamp_fin_consulta
  UPDATE filiacion_pacientes
     SET estado               = 'cancelado_por_drp',
         timestamp_fin_consulta = CASE
           WHEN estado = 'en_consulta' AND timestamp_fin_consulta IS NULL
           THEN NOW()
           ELSE timestamp_fin_consulta
         END
   WHERE id_sesion IN (
     SELECT id_sesion FROM filiacion_sesiones WHERE id_drp = p_drp_id
   )
     AND estado NOT IN ('alta', 'exitus', 'cancelado_por_drp');

  -- 9. Generar descuadre por stock residual en mochilas BKP del DRP (C-02)
  --    entidad_imputable_tipo = 'drp'; entidad_imputable_id = p_drp_id::text
  --    Se registra ANTES de revertir el estado de las mochilas (stock_real aún vigente)
  FOR v_mochila_row IN
    SELECT mb.id_mochila, mb.codigo, si.item_id, si.location_id, si.stock_real
      FROM mochilas_backpack mb
      JOIN subinventarios si ON si.location_id = mb.id_mochila::text
     WHERE mb.id_drp_activo = p_drp_id
       AND si.stock_real > 0
  LOOP
    INSERT INTO descuadres_inventario (
      location_id,
      item_id,
      stock_sistema,
      stock_real,
      diferencia,
      motivo,
      entidad_imputable_tipo,
      entidad_imputable_id,
      mutation_uuid,
      created_at
    ) VALUES (
      v_mochila_row.location_id,
      v_mochila_row.item_id,
      0,                                  -- stock_sistema esperado: 0 (debió consumirse o retornarse)
      v_mochila_row.stock_real,           -- stock_real residual encontrado al cancelar
      v_mochila_row.stock_real,           -- diferencia = todo el residual
      format(
        'Cancelación DRP %s — stock residual sin reconciliar en mochila %s',
        p_drp_id, v_mochila_row.codigo
      ),
      'drp'::entidad_imputable,
      p_drp_id::text,
      gen_random_uuid(),                  -- mutation_uuid único por fila de descuadre
      NOW()
    )
    ON CONFLICT (mutation_uuid) DO NOTHING;
  END LOOP;

  -- 10. Revertir mochilas BKP → disponible (después de registrar los descuadres)
  UPDATE mochilas_backpack
     SET estado        = 'disponible',
         id_drp_activo = NULL
   WHERE id_drp_activo = p_drp_id;

  -- 11. Doc-11 automático — aviso de cancelación a coordinación, gerencia y dotaciones (B-03)
  --     Tipo 'drp_cancelado' (añadido al enum tipo_aviso — ver er_y_seeds.md §3).
  --     Nivel 'critico': interrumpe la UI con banner rojo en todos los terminales suscritos.
  INSERT INTO doc11_avisos (
    id_aviso,
    tipo_aviso,
    nivel,
    id_nombre_emisor,
    texto,
    timestamp_publicacion,
    leido_por
  ) VALUES (
    gen_random_uuid(),
    'drp_cancelado',
    'critico',
    p_coordinador_id,
    format(
      'DRP %s cancelado por %s. Todas las dotaciones han sido desvinculadas. '
      'Las sesiones PSA y Filiación vinculadas han sido cerradas.',
      p_drp_id, p_coordinador_id
    ),
    NOW(),
    '[]'::jsonb
  );

  -- Doc-1: sin acción (append-only — inmutable en su estado actual)
  -- Doc-8: sin acción (pilots continúan sus turnos fuera del DRP; checkout normal al terminar)

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 48.3 Comportamiento en cascada

| Entidad | Acción al cancelar |
|---|---|
| `drps` | `estado = 'Cancelado'`, `timestamp_cancelacion`, `cancelado_por_id` |
| `dotaciones_drp` activas | `timestamp_salida = NOW()` — vehículo desvinculado del DRP |
| `drp_personal_a_pie` activos | `timestamp_salida = NOW()` |
| `psa_sesiones` abiertas del DRP | `timestamp_cierre = NOW()` (cierre forzado de sesión) |
| `psa_pacientes` activos del DRP | `estado = 'cancelado_por_drp'` — solo pacientes no terminales (C-01) |
| `filiacion_sesiones` abiertas del DRP | `timestamp_cierre = NOW()` (cierre forzado de sesión) |
| `filiacion_pacientes` activos del DRP | `estado = 'cancelado_por_drp'`; si `en_consulta`, también `timestamp_fin_consulta = NOW()` (C-01) |
| `descuadres_inventario` | INSERT por cada ítem con `stock_real > 0` en mochilas BKP del DRP; `entidad_imputable_tipo = 'drp'` (C-02) |
| `mochilas_backpack` asignadas al DRP | `estado = 'disponible'`, `id_drp_activo = NULL` — **después** de generar descuadres |
| `doc11_avisos` | INSERT con `tipo_aviso = 'drp_cancelado'`, `nivel = 'critico'` (B-03) |
| **Doc-8** de los pilots activos | **Sin cambio** — pilots siguen su turno; checkout normal al terminar |
| **Doc-1** del DRP | **Sin cambio** — append-only; queda congelado en estado `Activo_En_Curso` |
| **Hard delete de `drps`** | **Prohibido** — DRPs que alcanzaron `En_curso` no se eliminan nunca |

### 48.4 RBAC

`SECURITY DEFINER`. La RLS de llamada verifica que el `auth.uid()` del invocador
pertenece a un rol `coordinacion` o `gerencia`. Cualquier otro rol recibe `permission_denied`.

### 48.5 Flujo UI

```
coordinacion / gerencia desde nucleo_coordinacion_y_seguridad:
  1. Pulsa "Cancelar DRP" en la ficha del DRP activo
  2. Modal de confirmación destructiva (no reversible):
       "Esta acción:
        • Desvinculará todos los vehículos y personal del DRP.
        • Cerrará automáticamente las sesiones PSA y Filiación vinculadas.
        • Los pacientes activos en PSA y Filiación quedarán en estado 'cancelado_por_drp'.
        • Las mochilas BKP con stock residual generarán descuadres de inventario.
        • Los partes de trabajo (Doc-8) seguirán abiertos — los pilots
          finalizarán sus turnos de forma normal.
        • El DRP quedará en estado Cancelado (no se puede reactivar)."
       [ Confirmar cancelación ] [ Volver ]
  3. Si confirma → RPC cancelar_drp(drpId, coordinadorId)
  4. Realtime notifica a todos los terminales del DRP via doc11_aviso
  5. useDRPStore → estado = 'Cancelado'
```

---

## 49. Ajuste Manual de Stock — RPC `rpc_ajuste_manual_stock`

### 49.1 Propósito

Permite a logística y gerencia corregir el stock de cualquier location (base o subinventario)
cuando el valor real físico difiere del registrado en el sistema por causas no cubiertas
por Doc-6 (gasto), Doc-9 (entrada) o Doc-10 (transferencia). El ajuste requiere justificación
obligatoria de texto libre y genera una entrada inmutable en `auditoria_inventario`.

### 49.2 Firma

```typescript
// En hooks.md, useInventario expone la acción:
ajustarStock(
  locationId:    string,
  itemId:        string,
  cantidadNueva: number,   // valor absoluto correcto — NO un delta
  motivo:        string    // obligatorio: mín. 10 chars en general; mín. 30 chars si cantidadNueva === 0
): Promise<{ stockAnterior: number; stockNuevo: number }>
```

### 49.3 RPC PostgreSQL

```sql
CREATE OR REPLACE FUNCTION rpc_ajuste_manual_stock(
  p_location_id   TEXT,
  p_item_id       INT,
  p_cantidad_nueva INT,
  p_motivo        TEXT,
  p_operador_id   TEXT
)
RETURNS TABLE (stock_anterior INT, stock_nuevo INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock_actual  INT;
  v_delta         INT;
  v_tabla         TEXT;
BEGIN
  -- 1. Guard: cantidad_nueva no puede ser negativa
  IF p_cantidad_nueva < 0 THEN
    RAISE EXCEPTION 'ajuste_stock_negativo'
      USING HINT = '422',
            DETAIL = 'El stock resultante no puede ser negativo.';
  END IF;

  -- 2. Guard: motivo obligatorio — umbral reforzado a 30 chars si cantidad_nueva = 0 (C-08)
  IF p_cantidad_nueva = 0 AND length(trim(p_motivo)) < 30 THEN
    RAISE EXCEPTION 'motivo_ajuste_insuficiente_rotura'
      USING HINT   = '422',
            DETAIL = 'Ajustar a 0 unidades (rotura de stock) requiere un motivo '
                     'de al menos 30 caracteres.';
  ELSIF p_cantidad_nueva > 0 AND length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'motivo_ajuste_insuficiente'
      USING HINT   = '422',
            DETAIL = 'El motivo del ajuste debe tener al menos 10 caracteres.';
  END IF;

  -- 3. Leer stock actual y determinar tabla según tipo de location
  IF p_location_id LIKE 'ID_DRP%' OR p_location_id LIKE 'BKP%' THEN
    -- Subinventario de vehículo / mochila
    SELECT stock_real INTO v_stock_actual
      FROM inventario_vehiculo
     WHERE matricula = p_location_id AND id_item = p_item_id;
    v_tabla := 'inventario_vehiculo';
  ELSE
    -- Inventario de base (almacén central u otros locations)
    SELECT stock_real INTO v_stock_actual
      FROM inventario_base
     WHERE location_id = p_location_id AND id_item = p_item_id;
    v_tabla := 'inventario_base';
  END IF;

  IF v_stock_actual IS NULL THEN
    RAISE EXCEPTION 'item_no_encontrado_en_location'
      USING HINT = '404',
            DETAIL = 'El ítem no existe en la location especificada.';
  END IF;

  v_delta := p_cantidad_nueva - v_stock_actual;

  -- 4. Actualizar stock (no hacer nada si delta = 0)
  IF v_delta != 0 THEN
    IF v_tabla = 'inventario_vehiculo' THEN
      UPDATE inventario_vehiculo
         SET stock_real = p_cantidad_nueva, ultima_actualizacion = NOW()
       WHERE matricula = p_location_id AND id_item = p_item_id;
    ELSE
      UPDATE inventario_base
         SET stock_real = p_cantidad_nueva
       WHERE location_id = p_location_id AND id_item = p_item_id;
    END IF;
  END IF;

  -- 5. Registrar en auditoria_inventario (siempre, incluso si delta = 0 — queda traza del intento)
  INSERT INTO auditoria_inventario (
    tipo_movimiento, id_item, cantidad_delta,
    location_origen, location_destino,
    id_nombre_operador, rpc_ejecutada, motivo, created_at
  ) VALUES (
    'ajuste', p_item_id, v_delta,
    p_location_id, p_location_id,
    p_operador_id, 'rpc_ajuste_manual_stock', p_motivo, NOW()
  );

  -- 6. Si el stock resultante es 0: emitir aviso de rotura a bandeja de logística (C-08)
  IF p_cantidad_nueva = 0 THEN
    INSERT INTO doc11_avisos (
      id,
      tipo_aviso,
      destinatario_rol,
      contenido,
      id_nombre_emisor,
      leido,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'rotura_stock',
      'logistica',
      jsonb_build_object(
        'location_id',  p_location_id,
        'item_id',      p_item_id,
        'operador_id',  p_operador_id,
        'motivo',       p_motivo
      ),
      'system',    -- emisor automático — no hay un humano directo
      false,
      NOW()
    );
  END IF;

  RETURN QUERY SELECT v_stock_actual, p_cantidad_nueva;
END;
$$;
```

### 49.4 Reglas de acceso

| Aspecto | Decisión |
|---|---|
| RBAC | `can_edit_inventory` — logistica, responsable_logistica, gerencia |
| Stock resultante < 0 | Bloqueado — RAISE EXCEPTION |
| Motivo (cantidad_nueva > 0) | Obligatorio, mínimo 10 caracteres |
| Motivo (cantidad_nueva = 0) | Obligatorio, **mínimo 30 caracteres** — rotura de stock es un evento crítico (C-08) |
| Aviso de rotura (cantidad_nueva = 0) | INSERT en `doc11_avisos` con `tipo_aviso = 'rotura_stock'` y `destinatario_rol = 'logistica'` — Realtime lo entrega a la bandeja de logística (C-08) |
| Scope | Cualquier location: base + subinventario vehículo/mochila |
| Auditoria | Siempre — incluso si delta = 0 |
| Offline | No apto para cola — ajuste manual requiere confirmación atómica del valor actual |

### 49.5 Flujo UI

```
logistica / gerencia desde nucleo_logistica_almacen → Inventario maestro → [ítem]:
  1. Pulsa "Ajustar stock" junto a un ítem de cualquier location
  2. Modal:
       Stock actual: [N] unidades
       Stock correcto: [input numérico — mínimo 0]
       Delta calculado: [+N / -N] (actualiza en tiempo real)
       Motivo: [textarea]
         — mín. 10 chars si stock correcto > 0
         — mín. 30 chars si stock correcto = 0 (banner de advertencia: "⚠️ Declarar rotura de stock requiere una justificación detallada")
       [ Aplicar ajuste ] [ Cancelar ]
  3. RPC rpc_ajuste_manual_stock(locationId, itemId, cantidadNueva, motivo, operadorId)
  4. Toast: "Stock ajustado de [anterior] a [nuevo] unidades. Motivo registrado."
  5. Realtime actualiza la vista del inventario para todos los terminales
```

---

## 50. Onboarding de Empleado — Edge Function `ef_alta_empleado` (Gap F3)

### 50.1 Propósito

Cuando RRHH da de alta a un nuevo empleado, se necesita crear simultáneamente la
cuenta de autenticación en Supabase Auth y la fila correspondiente en `fichas_empleados`.
Como Supabase Admin API solo es accesible desde el servidor, esta operación se
implementa como Edge Function con SECURITY DEFINER equivalente.

No se emite galleta de terminal automáticamente en el alta: las galletas están
vinculadas a hardware físico y requieren validación presencial (flujo PIN). El empleado
recibe sus credenciales temporales y las usa en su primer login, que cacheará la sesión
offline y permitirá vincular posteriormente un terminal.

Los emails son ficticios (`id_nombre@u24.internal`) — dominio interno no enrutable
externamente. Supabase Auth los acepta como email válido.

### 50.2 Firma

**Auth:** JWT con `can_manage_rrhh` (roles: rrhh, gerencia).
**Body:** `{ id_nombre, nombre_real, dni, rol, horas_contrato, contrasena_temporal }`

### 50.3 Implementación

```typescript
// supabase/functions/ef-alta-empleado/index.ts

Deno.serve(async (req) => {
  const jwtClaims = await verifyJWT(req)
  if (!jwtClaims.can_manage_rrhh) return errorResponse(403, 'insufficient_privilege')

  const {
    id_nombre, nombre_real, dni, rol,
    horas_contrato, contrasena_temporal
  } = await req.json()

  // Validaciones básicas
  if (!id_nombre || !nombre_real || !rol || !contrasena_temporal) {
    return errorResponse(422, 'campos_requeridos_incompletos')
  }
  const ROLES_VALIDOS = ['tes','due','medico','flota','coordinacion','logistica',
                          'responsable_logistica','responsable_flota','rrhh','gerencia']
  if (!ROLES_VALIDOS.includes(rol)) {
    return errorResponse(422, 'rol_invalido')
  }

  const email = `${id_nombre}@u24.internal`

  // 1. Crear cuenta en auth.users (email_confirm = true — sin envío de email)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: contrasena_temporal,
    email_confirm: true,   // omite el flujo de verificación por email
  })
  if (authError) {
    // Código 23505 = email ya existe → id_nombre duplicado
    if (authError.message?.includes('already registered')) {
      return errorResponse(409, 'id_nombre_duplicado')
    }
    throw authError
  }

  // 2. Insertar ficha de empleado — si falla, eliminar el auth.users creado en el paso
  //    anterior para evitar huérfanos (rollback explícito: no existe transacción distribuida
  //    entre Admin API y Supabase DB, así que lo hacemos manualmente en el catch).
  const { error: fichaError } = await supabaseAdmin
    .from('fichas_empleados')
    .insert({
      auth_user_id: authUser.user.id,
      id_nombre,
      nombre_real,
      dni,
      rol,
      horas_contrato: horas_contrato ?? null,
      activo: true,
      fecha_alta: new Date().toISOString(),
      fecha_baja: null,
    })
  if (fichaError) {
    // Rollback: eliminar el usuario de auth.users para no dejar huérfano
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    throw fichaError
  }

  // 3. Auditar
  const callerIdNombre = await getCallerIdNombre(jwtClaims)
  await supabaseAdmin.from('auditoria_rbac').insert({
    tipo_evento: 'alta_empleado',
    id_nombre,
    id_terminal: null,
    metadata: jsonb({ rol, ejecutado_por: callerIdNombre }),
    created_at: new Date().toISOString(),
  })

  return new Response(
    JSON.stringify({ auth_user_id: authUser.user.id, id_nombre }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 50.4 Reglas de diseño

| Aspecto | Decisión |
|---|---|
| Email | `id_nombre@u24.internal` — ficticio, no se envía nada externo |
| `email_confirm: true` | Omite verificación — el flujo de activación es presencial |
| Galleta de terminal | NO se emite en el alta — vinculación posterior via flujo PIN |
| Contraseña temporal | La impone RRHH; el empleado puede cambiarla en primer login (si la UI lo permite) |
| `contrasena_temporal` | Mínimo de seguridad delegado al formulario de UI (≥ 8 chars) |
| Atomicidad | Si `fichas_empleados` falla tras crear el `auth.users`, la EF llama a `deleteUser` inmediatamente antes de lanzar el error. El reintento posterior arranca desde un estado limpio. |
| Idempotencia | Si el rollback falla (error de red), `ef_cron_cleanup_orphans` (§54) detecta y elimina el huérfano al día siguiente. |

---

## 51. Offboarding de Empleado — Edge Function `ef_baja_empleado` (Gap F3)

### 51.1 Propósito

Dar de baja a un empleado debe ser fulminante por seguridad y consistencia operativa.
Una RPC pura no es suficiente porque la revocación del JWT requiere la Admin API de
Supabase (solo disponible en servidor). Se implementa como Edge Function que ejecuta
las tres acciones de forma secuencial en la misma invocación.

Los registros históricos (Doc-1 checkins, Doc-8 partes, asistencias…) permanecen
intactos: las FKs apuntan a `id_nombre` y `fichas_empleados.activo = false` no rompe
ninguna referencia existente.

### 51.2 Firma

**Auth:** JWT con `can_manage_rrhh` (roles: rrhh, gerencia).
**Body:** `{ id_nombre }`

### 51.3 Implementación

```typescript
// supabase/functions/ef-baja-empleado/index.ts

Deno.serve(async (req) => {
  const jwtClaims = await verifyJWT(req)
  if (!jwtClaims.can_manage_rrhh) return errorResponse(403, 'insufficient_privilege')

  const { id_nombre } = await req.json()
  if (!id_nombre) return errorResponse(422, 'id_nombre_requerido')

  // 0. Obtener auth_user_id del empleado
  const { data: ficha, error: fichaFetchError } = await supabaseAdmin
    .from('fichas_empleados')
    .select('auth_user_id, activo')
    .eq('id_nombre', id_nombre)
    .single()

  if (fichaFetchError || !ficha) return errorResponse(404, 'empleado_no_encontrado')
  if (!ficha.activo) return errorResponse(409, 'empleado_ya_inactivo')

  // Obtener caller ahora (necesario para 0.5 y auditoría)
  const callerIdNombre = await getCallerIdNombre(jwtClaims)

  // 0.5. GUARD DOC-8 — Forzar checkout si el empleado tiene un parte de trabajo activo (C-04)
  //      km_fin = null: permitido cuando cerrado_por_admin_id IS NOT NULL (ver §42.3)
  const { data: openDoc8 } = await supabaseAdmin
    .from('doc8_partes_trabajo')
    .select('id, id_vehiculo')
    .eq('pilot_id', id_nombre)
    .eq('estado', 'Activo')
    .maybeSingle()

  if (openDoc8) {
    const { error: checkoutError } = await supabaseAdmin.rpc(
      'forzar_checkout_administrativo',
      {
        p_vehiculo_id:    openDoc8.id_vehiculo,
        p_pilot_id:       id_nombre,
        p_km_fin:         null,   // offboarding: km_fin no disponible; NULL aceptado
        p_coordinador_id: callerIdNombre,
      }
    )
    if (checkoutError) return errorResponse(500, 'error_forzando_checkout_doc8')
  }

  // 1. SEGURIDAD — marcar inactivo + invalidar JWT
  const { error: fichaUpdateError } = await supabaseAdmin
    .from('fichas_empleados')
    .update({ activo: false, fecha_baja: new Date().toISOString() })
    .eq('id_nombre', id_nombre)
  if (fichaUpdateError) throw fichaUpdateError

  // signOut 'global' revoca todos los refresh tokens activos del empleado
  await supabaseAdmin.auth.admin.signOut(ficha.auth_user_id, 'global')

  // 2. SEGURIDAD — revocar todas las galletas de terminal del empleado (C-11)
  // Primero: capturar los id_terminal con galletas activas ANTES de revocar
  // (necesario para detectar terminales que quedarán huérfanos)
  const { data: galletasActivas } = await supabaseAdmin
    .from('galletas_terminales')
    .select('id_terminal')
    .eq('id_nombre', id_nombre)
    .is('revocado_at', null)

  await supabaseAdmin
    .from('galletas_terminales')
    .update({ revocado_at: new Date().toISOString() })
    .eq('id_nombre', id_nombre)
    .is('revocado_at', null)

  // 2.5. GUARD TERMINAL HUÉRFANO — emitir aviso crítico si algún terminal quedó sin galleta (C-11)
  //      Ignorar registros con revocado_at IS NOT NULL — solo cuentan las galletas activas.
  if (galletasActivas && galletasActivas.length > 0) {
    const terminalesUnicos = [...new Set(galletasActivas.map(g => g.id_terminal))]

    for (const idTerminal of terminalesUnicos) {
      const { count } = await supabaseAdmin
        .from('galletas_terminales')
        .select('id_galleta', { count: 'exact', head: true })
        .eq('id_terminal', idTerminal)
        .is('revocado_at', null)

      if (count === 0) {
        // El terminal no tiene ningún usuario asignado — inaccessible hasta intervención manual
        await supabaseAdmin.from('doc11_avisos').insert({
          id:               crypto.randomUUID(),
          tipo_aviso:       'terminal_sin_galleta',
          destinatario_rol: 'coordinacion',
          contenido: {
            id_terminal:    idTerminal,
            causa:          'baja_empleado',
            id_nombre_baja: id_nombre,
            mensaje:        'El terminal quedó sin galleta activa tras la baja del empleado. '
                          + 'Requiere reasignación (rpc_revocar_y_reemitir_galleta) o intervención física. '
                          + 'Ver runbooks.md RB-05.',
          },
          id_nombre_emisor: 'system',
          leido:            false,
          created_at:       new Date().toISOString(),
        })
      }
    }
  }

  // 3. OPERATIVA — eliminar asignaciones de cuadrante futuras
  //    Solo fechas estrictamente futuras; los turnos pasados/presentes quedan
  //    como registro histórico (no se pueden reabrir).
  const hoy = new Date().toISOString().split('T')[0]   // YYYY-MM-DD
  await supabaseAdmin
    .from('cuadrante_turnos')
    .delete()
    .eq('id_nombre', id_nombre)
    .gt('fecha', hoy)

  // 4. Auditar (callerIdNombre ya calculado en el paso previo a 0.5)
  await supabaseAdmin.from('auditoria_rbac').insert({
    tipo_evento: 'baja_empleado',
    id_nombre,
    id_terminal: null,
    metadata: jsonb({ ejecutado_por: callerIdNombre, auth_user_id: ficha.auth_user_id }),
    created_at: new Date().toISOString(),
  })

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
})
```

### 51.4 Efectos en cascada

| Acción | Efecto | Reversible |
|---|---|---|
| **Guard Doc-8** (paso 0.5) | Si existe un parte activo, `forzar_checkout_administrativo` cierra el Doc-8 con `km_fin = NULL` y `cerrado_por_admin_id` del gestor que ejecuta la baja. Se ejecuta **antes** de revocar el JWT. | No — queda registro en auditoria_rbac con `checkout_forzado` |
| `fichas_empleados.activo = false` | El `set_claims` devuelve `app_claims: {}` en el próximo JWT — acceso denegado a todo | Solo por RRHH/gerencia (UPDATE manual) |
| `signOut global` | JWT actuales invalidados inmediatamente; el access token en memoria expira según TTL | No — requiere nuevo login |
| `galletas_terminales revocado_at` | Terminales físicos quedan sin acceso permanente — piden PIN o credenciales | Solo reemitiendo nueva galleta |
| **Aviso terminal huérfano** (paso 2.5) | Si algún terminal queda con 0 galletas activas tras la revocación, se inserta un aviso crítico `terminal_sin_galleta` en `doc11_avisos` dirigido a coordinación. Ver `runbooks.md RB-05`. (C-11) | Resolución: coordinación reasigna galleta o intervención física |
| `cuadrante_turnos DELETE fecha > hoy` | Turnos futuros eliminados — el coordinador debe reasignar si aplica | No (requiere reasignación manual) |
| Datos históricos | Intactos — Doc-1, Doc-8, doc2/3, auditoria_rbac, auditoria_inventario | Inmutables por diseño |

### 51.5 Guard contra re-baja

Si `fichas_empleados.activo` ya es `false`, la Edge Function devuelve `409 empleado_ya_inactivo`
sin ejecutar ninguna acción. Garantiza idempotencia en reintentos.

---

## 52. Purga RGPD — Edge Cron `ef_cron_rgpd` (Gap F7)

### 52.1 Propósito y marco normativo

El sistema maneja tres categorías de PII con plazos de retención distintos:

| Categoría | Tablas afectadas | Base legal | Retención | Acción |
|---|---|---|---|---|
| **PII clínica** (datos de pacientes) | `doc2_informes_svb`, `doc3_informes_sva`, `doc4_consentimientos`, `doc5_rechazos_alta` | Ley 41/2002 (historia clínica) | 5 años desde la asistencia | Purga de claves PII del JSONB — preserva datos estadísticos |
| **PII laboral** (empleados) | `fichas_empleados` | RGPD + normativa laboral española | 4 años desde `fecha_baja` | Seudoanonimización de campos identificativos |
| **Logs de seguridad** | `auditoria_rbac` | RGPD + ENS | 1 año desde el evento | DELETE físico de filas caducadas |

### 52.2 Estrategia de purga de PII clínica

Se usa el **operador de sustracción de array de claves JSONB** nativo de PostgreSQL.
Esta estrategia preserva intactos los datos estadísticos y operativos del documento
(tiempos de respuesta, constantes vitales, patología, nivel de triaje…) y elimina solo
las claves directamente identificativas del paciente.

```sql
-- Claves PII a eliminar de datos_paciente / datos_firma
-- El conjunto exacto puede variar si el esquema del JSONB evoluciona; actualizar aquí.
DO $$
DECLARE
  CLAVES_PII_CLINICA CONSTANT text[] := ARRAY[
    'nombre', 'apellidos', 'dni', 'cip', 'sip',
    'direccion', 'telefono', 'email', 'fecha_nacimiento_exacta'
  ];
BEGIN
  -- doc2: informes SVB
  UPDATE doc2_informes_svb
     SET datos_paciente = datos_paciente - CLAVES_PII_CLINICA
   WHERE timestamp_asistencia < NOW() - INTERVAL '5 years'
     AND datos_paciente ?| CLAVES_PII_CLINICA;  -- solo actualizar si hay PII presente

  -- doc3: informes SVA
  UPDATE doc3_informes_sva
     SET datos_paciente = datos_paciente - CLAVES_PII_CLINICA
   WHERE timestamp_asistencia < NOW() - INTERVAL '5 years'
     AND datos_paciente ?| CLAVES_PII_CLINICA;

  -- doc4: consentimientos — el campo firma (Blob URL) se nulifica
  UPDATE doc4_consentimientos
     SET datos_firma = NULL
   WHERE timestamp_firma < NOW() - INTERVAL '5 years'
     AND datos_firma IS NOT NULL;

  -- doc5: rechazos de alta — idem
  UPDATE doc5_rechazos_alta
     SET datos_firma = NULL
   WHERE timestamp_rechazo < NOW() - INTERVAL '5 years'
     AND datos_firma IS NOT NULL;
END;
$$;
```

> **Invariante:** la purga clínica NUNCA borra la fila completa. Los campos operativos
> (`id_activacion`, `id_nombre_redactor`, `timestamp_asistencia`, `estado`) permanecen
> intactos para trazabilidad de carga de trabajo y auditoría operativa.

### 52.3 Seudoanonimización de empleados

```sql
-- Solo empleados inactivos con más de 4 años desde fecha_baja y que aún no están
-- seudoanonimizados (nombre_real != 'EMPLEADO_ANONIMIZADO' como señal de marca).
UPDATE fichas_empleados
   SET nombre_real    = 'EMPLEADO_ANONIMIZADO',
       dni            = NULL
 WHERE activo         = false
   AND fecha_baja     < NOW() - INTERVAL '4 years'
   AND nombre_real   != 'EMPLEADO_ANONIMIZADO';  -- idempotente
```

> **`id_nombre` NO se anonimiza.** Es el alias operativo referenciado como FK en
> decenas de tablas inmutables (auditoria_rbac, doc8_partes_trabajo, cuadrante_turnos…).
> Borrarlo o cambiarlo rompería la integridad referencial. El `id_nombre` es un
> seudónimo operativo (no el nombre real) y por sí solo no es PII identificativa.
>
> **`auth_user_id`:** la cuenta de `auth.users` ya fue eliminada por Supabase Auth
> durante el offboarding (`ef_baja_empleado §51`). El campo UUID queda huérfano
> (FK nullable) y puede nullificarse aquí también si se desea limpiar.

### 52.4 Purga de logs de seguridad

```sql
-- Eliminar eventos de auditoria_rbac con más de 1 año de antigüedad.
-- RLS UPDATE/DELETE = FALSE en producción, por lo que este bloque solo puede
-- ejecutarse con service role (ef_cron_rgpd tiene service role vía supabaseAdmin).
DELETE FROM auditoria_rbac
 WHERE created_at < NOW() - INTERVAL '1 year';
```

> **Nota:** si en el futuro se implementa un mecanismo de "legal hold" (retención
> extendida por incidente abierto), añadir aquí un `AND id_evento NOT IN (SELECT ...)`.
> En la implementación actual no existe ese mecanismo; la purga es incondicional
> tras 1 año.

### 52.5 Implementación Edge Cron

```typescript
// supabase/functions/ef-cron-rgpd/index.ts
// Frecuencia: diaria (cron: '0 3 * * *' — 3am UTC, baja carga)

Deno.serve(async () => {
  const now = new Date()

  // BLOQUE 1 — Purga PII clínica (doc2, doc3, doc4, doc5)
  const cutoff5y = new Date(now)
  cutoff5y.setFullYear(cutoff5y.getFullYear() - 5)

  const CLAVES_PII = ['nombre','apellidos','dni','cip','sip',
                      'direccion','telefono','email','fecha_nacimiento_exacta']
  const piiFilter = CLAVES_PII.map(k => `"${k}"`).join(',')

  const tablasClincias = [
    { table: 'doc2_informes_svb',  tsCol: 'timestamp_asistencia', piiCol: 'datos_paciente' },
    { table: 'doc3_informes_sva',  tsCol: 'timestamp_asistencia', piiCol: 'datos_paciente' },
  ]
  for (const { table, tsCol, piiCol } of tablasClincias) {
    await supabaseAdmin.rpc('_rgpd_purge_jsonb_keys', {
      p_tabla: table, p_ts_col: tsCol, p_pii_col: piiCol,
      p_cutoff: cutoff5y.toISOString(), p_claves: CLAVES_PII
    })
  }
  // doc4/doc5: nullificar datos_firma (Blob URL — no aplica el operador JSONB)
  for (const table of ['doc4_consentimientos', 'doc5_rechazos_alta']) {
    const tsCol = table === 'doc4_consentimientos' ? 'timestamp_firma' : 'timestamp_rechazo'
    await supabaseAdmin.from(table)
      .update({ datos_firma: null })
      .lt(tsCol, cutoff5y.toISOString())
      .not('datos_firma', 'is', null)
  }

  // BLOQUE 2 — Seudoanonimización empleados inactivos (>4 años desde fecha_baja)
  const cutoff4y = new Date(now)
  cutoff4y.setFullYear(cutoff4y.getFullYear() - 4)
  await supabaseAdmin.from('fichas_empleados')
    .update({ nombre_real: 'EMPLEADO_ANONIMIZADO', dni: null })
    .eq('activo', false)
    .lt('fecha_baja', cutoff4y.toISOString())
    .neq('nombre_real', 'EMPLEADO_ANONIMIZADO')  // idempotente

  // BLOQUE 3 — Purga logs auditoria_rbac (>1 año)
  const cutoff1y = new Date(now)
  cutoff1y.setFullYear(cutoff1y.getFullYear() - 1)
  await supabaseAdmin.from('auditoria_rbac')
    .delete()
    .lt('created_at', cutoff1y.toISOString())

  console.log('ef_cron_rgpd completado:', now.toISOString())
  return new Response('ok')
})
```

> `_rgpd_purge_jsonb_keys` es una función SQL auxiliar (SECURITY DEFINER) que ejecuta
> el UPDATE con el operador `-` de JSONB. Se implementa en SQL para aprovechar los
> índices nativos de Postgres; la lógica equivalente en JavaScript sería más lenta
> y sin índices.

### 52.6 Reglas de diseño

| Aspecto | Decisión |
|---|---|
| Frecuencia | Diaria, 03:00 UTC (baja carga nocturna) |
| Service role | Obligatorio — las políticas RLS de `auditoria_rbac` y docs son inmutables en RLS normal |
| Idempotencia | Los tres bloques son idempotentes — reintentos seguros |
| Logs del cron | Solo `console.log` — no se audita en `auditoria_rbac` (evitar loop) |
| Extensión futura | Añadir "legal hold" antes del bloque 3 si se necesita retención extendida por incidente |

---

## 53. Alta de Vehículo Nuevo — RPC `rpc_alta_vehiculo` (Gap F4)

### 53.1 Propósito

Registrar un nuevo vehículo en el sistema implica cuatro efectos simultáneos:
crear el registro del vehículo, crear su location (subinventario propio), inicializar
el inventario según la plantilla asignada con `stock_real = 0`, y notificar a logística
para que realice la primera dotación física. Inicializar con `stock_real = stock_objetivo`
falsificaría el inventario y rompería la trazabilidad contable.

### 53.2 Firma

```typescript
// useFlotaStore expone:
altaVehiculo(params: {
  matricula:   string
  tipo:        'A1' | 'A2' | 'B' | 'C' | 'VIR' | 'Quad' | 'BKP'
  plantillaId: string
}): Promise<{ matricula: string; locationId: string; itemsInicializados: number }>
```

### 53.3 Wizard de alta (UI)

```
responsable_flota / gerencia — desde black_column → Flota y taller → Nuevo vehículo:

Paso 1 — Datos del vehículo
  Matrícula: [input text, formato libre]
  Tipo:      [selector: A1 / A2 / B / C / VIR / Quad / BKP]

Paso 2 — Plantilla de inventario
  Plantilla: [selector de plantillas existentes — muestra nombre + perfil]
  Vista previa: lista de ítems y stock_objetivo por subgrupo

Paso 3 — Confirmación
  Resumen: matrícula, tipo, plantilla, N ítems a inicializar (stock_real = 0)
  Aviso: "⚠ El inventario se inicia vacío. Logística debe realizar la primera dotación."
  [ Registrar vehículo ] [ Cancelar ]
```

### 53.4 RPC PostgreSQL

```sql
CREATE OR REPLACE FUNCTION rpc_alta_vehiculo(
  p_matricula    TEXT,
  p_tipo         TEXT,
  p_plantilla_id TEXT,
  p_registrado_por TEXT
)
RETURNS TABLE (matricula TEXT, location_id TEXT, items_inicializados INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tipo_valido CONSTANT text[] := ARRAY['A1','A2','B','C','VIR','Quad','BKP'];
  v_count INT := 0;
BEGIN
  -- 1. Guard: tipo válido
  IF NOT (p_tipo = ANY(v_tipo_valido)) THEN
    RAISE EXCEPTION 'tipo_vehiculo_invalido'
      USING HINT = '422', DETAIL = 'Tipo de vehículo no reconocido.';
  END IF;

  -- 2. Guard: matrícula no duplicada
  IF EXISTS (SELECT 1 FROM vehiculos WHERE matricula = p_matricula) THEN
    RAISE EXCEPTION 'matricula_duplicada'
      USING HINT = '409', DETAIL = 'Ya existe un vehículo con esa matrícula.';
  END IF;

  -- 3. Guard: plantilla existe
  IF NOT EXISTS (SELECT 1 FROM plantillas_stock WHERE plantilla_id = p_plantilla_id) THEN
    RAISE EXCEPTION 'plantilla_no_encontrada'
      USING HINT = '404', DETAIL = 'La plantilla de inventario no existe.';
  END IF;

  -- 4. Insertar vehículo
  INSERT INTO vehiculos (matricula, tipo, condicion_tecnica, estado_operativo, plantilla_id)
  VALUES (p_matricula, p_tipo, 'operativo', 'inactivo', p_plantilla_id);

  -- 5. Crear location del vehículo (subinventario propio)
  INSERT INTO locations (location_id, nombre, tipo)
  VALUES (p_matricula, p_matricula, 'vehiculo');

  -- 6. Inicializar inventario desde plantilla — stock_real = 0
  INSERT INTO inventario_vehiculo (matricula, id_item, subgrupo, stock_real, ultima_actualizacion)
  SELECT p_matricula, id_item, subgrupo, 0, NOW()
    FROM plantilla_lineas
   WHERE plantilla_id = p_plantilla_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 7. Notificar a logística: primera dotación pendiente
  INSERT INTO doc11_avisos (
    tipo_aviso, nivel, id_nombre_emisor, texto, timestamp_publicacion, leido_por
  ) VALUES (
    'aviso_coordinacion', 'aviso', p_registrado_por,
    'Nuevo vehículo registrado: ' || p_matricula || ' (' || p_tipo || '). '
    || 'Pendiente primera dotación de material desde almacén.',
    NOW(), '[]'::jsonb
  );

  RETURN QUERY SELECT p_matricula, p_matricula, v_count;
END;
$$;

-- Conceder ejecución solo a roles con can_manage_fleet
GRANT EXECUTE ON FUNCTION rpc_alta_vehiculo TO authenticated;
-- La validación del claim se hace dentro del cuerpo (claim('can_manage_fleet'))
```

### 53.5 Reglas de diseño

| Aspecto | Decisión |
|---|---|
| RBAC | `can_manage_fleet` — responsable_flota, gerencia |
| `stock_real` inicial | Siempre 0 — nunca igualar a `stock_objetivo` automáticamente |
| `location_id` del vehículo | `= matricula` — uso la matrícula como location_id para evitar una tabla de mapeo adicional |
| Notificación logística | `doc11_avisos` tipo 'aviso_coordinacion' nivel 'aviso' — no crítico, no interrumpe operaciones |
| Condición técnica inicial | `'operativo'` — asume que el vehículo llega en condiciones; responsable_flota puede cambiarla |
| Estado operativo inicial | `'inactivo'` — no puede activarse hasta tener al menos una galleta de terminal asignada |
| Offline | No apto — alta de vehículo requiere confirmación atómica en DB |

---

## 54. Limpieza de Huérfanos — Edge Cron `ef_cron_cleanup_orphans` (B-03)

### 54.1 Propósito

Detecta y elimina entradas en `auth.users` que no tienen fila correspondiente en
`fichas_empleados`. Estos huérfanos pueden originarse si `ef_alta_empleado` falla
después de crear el usuario en Auth pero antes de completar el INSERT en
`fichas_empleados`. El rollback explícito de §50.3 cubre la mayoría de casos, pero
un fallo de red o un kill del proceso puede producir un huérfano que no se limpia en
el mismo request. Este cron actúa como red de seguridad diaria.

### 54.2 Frecuencia

Diaria, **04:00 UTC** — una hora después de `ef_cron_rgpd` para no competir por
recursos con la purga RGPD.

### 54.3 Implementación

```typescript
// supabase/functions/ef-cron-cleanup-orphans/index.ts

Deno.serve(async (_req) => {
  let page = 1
  let deletedCount = 0

  while (true) {
    // 1. Listar usuarios de auth.users paginando de 1000 en 1000
    const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (listError) throw listError
    if (!authList.users.length) break

    // 2. Filtrar solo usuarios del dominio interno (excluir cuentas de servicio externas)
    const internos = authList.users.filter(u => u.email?.endsWith('@u24.internal'))
    if (!internos.length) {
      if (authList.users.length < 1000) break
      page++
      continue
    }

    // 3. Consultar cuáles tienen fila en fichas_empleados
    const authIds = internos.map(u => u.id)
    const { data: fichas } = await supabaseAdmin
      .from('fichas_empleados')
      .select('auth_user_id')
      .in('auth_user_id', authIds)

    const fichaIds = new Set(fichas?.map(f => f.auth_user_id) ?? [])

    // 4. Eliminar los que no tienen ficha
    const orphans = internos.filter(u => !fichaIds.has(u.id))
    for (const orphan of orphans) {
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(orphan.id)
      if (!delError) {
        deletedCount++
        console.log(`Huérfano eliminado: ${orphan.email} (${orphan.id})`)
      } else {
        console.error(`Error eliminando huérfano ${orphan.id}:`, delError.message)
      }
    }

    if (authList.users.length < 1000) break
    page++
  }

  console.log(`ef_cron_cleanup_orphans completado: ${deletedCount} huérfanos eliminados`)
  return new Response(
    JSON.stringify({ deleted: deletedCount }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 54.4 Invariantes de diseño

| Aspecto | Decisión |
|---|---|
| Filtro de email | Solo actúa sobre usuarios con email `*@u24.internal` — protege cuentas externas o de servicio |
| Paginación | 1000 usuarios por lote — escala linealmente con el tamaño de la plantilla |
| Idempotente | Si no hay huérfanos, no realiza ninguna operación destructiva |
| Sin auditoria_rbac | Los huérfanos no tienen `id_nombre` en `fichas_empleados` — no se puede auditar en la tabla estándar. El log de consola de la EF es el registro. |
| Complementario | El rollback en §50.3 minimiza la tasa de aparición; este cron es la red de seguridad |

---

## 55. Cambio de Rol — RPC `rpc_cambiar_rol` (B-05)

### 55.1 Propósito

Permite a RRHH o gerencia cambiar el rol de un empleado activo. El cambio tiene
efecto inmediato en `fichas_empleados`. Sin embargo, el JWT activo del empleado
mantiene sus claims anteriores hasta que expire o haga refresh (TTL típico: 1 hora).
Si se necesita efecto inmediato, RRHH debe forzar el logout del empleado via
`ef_revocar_sesion_usuario` (§7 de rls_y_rpcs.md).

### 55.2 Firma

```sql
rpc_cambiar_rol(p_id_nombre TEXT, p_nuevo_rol TEXT) RETURNS VOID
```

**Auth:** JWT con `can_manage_rrhh` — roles `rrhh`, `gerencia`.

### 55.3 Implementación

```sql
-- supabase/migrations/0001_init.sql (añadir junto al resto de RPCs)

CREATE OR REPLACE FUNCTION rpc_cambiar_rol(
  p_id_nombre TEXT,
  p_nuevo_rol TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rol_actual          TEXT;
  v_caller_id_nombre    TEXT;
BEGIN
  -- 1. Validar claim
  IF NOT claim('can_manage_rrhh') THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  -- 2. Validar enum de roles operativos (invitado no es asignable manualmente)
  IF p_nuevo_rol NOT IN (
    'tes', 'due', 'medico',
    'flota', 'responsable_flota',
    'coordinacion',
    'logistica', 'responsable_logistica',
    'rrhh', 'gerencia'
  ) THEN
    RAISE EXCEPTION 'rol_invalido: %', p_nuevo_rol USING ERRCODE = '22023';
  END IF;

  -- 3. Verificar que el empleado existe y está activo
  SELECT rol INTO v_rol_actual
  FROM fichas_empleados
  WHERE id_nombre = p_id_nombre AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'empleado_no_encontrado_o_inactivo' USING ERRCODE = 'P0002';
  END IF;

  -- 4. No-op si el rol ya es el destino
  IF v_rol_actual = p_nuevo_rol THEN
    RETURN;
  END IF;

  -- 5. Obtener id_nombre del llamador para auditoría
  SELECT id_nombre INTO v_caller_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid();

  -- 6. Cambiar el rol
  UPDATE fichas_empleados
  SET rol = p_nuevo_rol
  WHERE id_nombre = p_id_nombre;

  -- 7. Auditar
  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata, created_at)
  VALUES (
    'cambio_rol',
    p_id_nombre,
    NULL,
    jsonb_build_object(
      'rol_anterior',  v_rol_actual,
      'rol_nuevo',     p_nuevo_rol,
      'ejecutado_por', v_caller_id_nombre
    ),
    NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_cambiar_rol TO authenticated;
```

### 55.4 Reglas de diseño

| Aspecto | Decisión |
|---|---|
| RBAC | `can_manage_rrhh` — solo rrhh y gerencia |
| Enum de roles | Los 10 roles operativos (excluye `invitado` — se asigna solo via cookie de emergencia) |
| No-op | Si `rol_actual == p_nuevo_rol`, la RPC retorna sin modificar ni auditar |
| JWT inmediato | El cambio NO invalida el JWT activo del empleado. Para efecto inmediato, combinar con `ef_revocar_sesion_usuario` |
| Auditoría | `auditoria_rbac` evento `cambio_rol` con `rol_anterior`, `rol_nuevo` y `ejecutado_por` |
| Error empleado inexistente | `ERRCODE P0002` → HTTP 400 desde Supabase |
| Error rol inválido | `ERRCODE 22023` → HTTP 400 |

---

## 56. Borrado RGPD bajo demanda — `rpc_solicitar_borrado_rgpd` + `rpc_procesar_borrado_rgpd` (B-10, B-11)

### 56.1 Propósito y marco legal

El cron `ef_cron_rgpd` (§52) gestiona la purga automática por plazos de retención.
Este módulo cubre el **derecho al olvido individual** (RGPD Art. 17): una persona
interesada solicita la eliminación de sus datos antes de que expire el plazo automático.

El proceso es deliberadamente manual en dos fases para garantizar trazabilidad:
1. **Solicitud** (`rpc_solicitar_borrado_rgpd`): registra la solicitud y queda en estado `'pendiente'`.
2. **Ejecución** (`rpc_procesar_borrado_rgpd`): un segundo responsable revisa y ejecuta la purga.

**Regla de oro:** ningún borrado RGPD elimina filas completas de doc2/doc3. Solo elimina
claves PII del JSONB `datos_paciente` con el operador `-`. Los datos estadísticos y
operativos del documento se conservan íntegramente.

### 56.2 `rpc_solicitar_borrado_rgpd`

**Auth:** `can_manage_rbac` — roles `coordinacion`, `gerencia`.
**Llamada via:** `supabase.rpc('rpc_solicitar_borrado_rgpd', { ... })`

```sql
CREATE OR REPLACE FUNCTION rpc_solicitar_borrado_rgpd(
  p_tipo_solicitud  TEXT,   -- 'borrado_clinico' | 'borrado_empleado'
  p_identificador   TEXT,   -- id_doc (UUID) para clínico; id_nombre para empleado
  p_motivo          TEXT    -- justificación legal — obligatorio
) RETURNS UUID              -- id de la solicitud creada
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_solicitud_id    UUID := gen_random_uuid();
  v_caller_id_nombre TEXT;
BEGIN
  -- 1. Validar claim
  IF NOT claim('can_manage_rbac') THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  -- 2. Validar tipo de solicitud
  IF p_tipo_solicitud NOT IN ('borrado_clinico', 'borrado_empleado') THEN
    RAISE EXCEPTION 'tipo_solicitud_invalido: %', p_tipo_solicitud USING ERRCODE = '22023';
  END IF;

  -- 3. Validar que el motivo no esté vacío
  IF length(trim(p_motivo)) < 10 THEN
    RAISE EXCEPTION 'motivo_demasiado_corto' USING ERRCODE = '22023';
  END IF;

  -- 4. Obtener id_nombre del solicitante
  SELECT id_nombre INTO v_caller_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid();

  -- 5. Registrar solicitud
  INSERT INTO solicitudes_rgpd (
    id, tipo_solicitud, identificador, estado,
    motivo, solicitado_por, timestamp_solicitud
  ) VALUES (
    v_solicitud_id, p_tipo_solicitud, p_identificador, 'pendiente',
    p_motivo, v_caller_id_nombre, NOW()
  );

  RETURN v_solicitud_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_solicitar_borrado_rgpd TO authenticated;
```

### 56.3 `rpc_procesar_borrado_rgpd`

**Auth:** `can_manage_rbac` — roles `coordinacion`, `gerencia`.
**Llamada via:** `supabase.rpc('rpc_procesar_borrado_rgpd', { ... })`

```sql
CREATE OR REPLACE FUNCTION rpc_procesar_borrado_rgpd(
  p_solicitud_id    UUID,
  p_notas           TEXT DEFAULT NULL   -- observaciones del procesador (opcional)
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_solicitud       solicitudes_rgpd%ROWTYPE;
  v_caller_id_nombre TEXT;
  -- Claves PII exactas — sincronizar con ef_cron_rgpd §52.2 si el esquema JSONB evoluciona
  CLAVES_PII CONSTANT text[] := ARRAY[
    'nombre', 'apellidos', 'dni', 'cip', 'sip',
    'direccion', 'telefono', 'email', 'fecha_nacimiento_exacta'
  ];
BEGIN
  -- 1. Validar claim
  IF NOT claim('can_manage_rbac') THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  -- 2. Obtener y validar la solicitud
  SELECT * INTO v_solicitud
  FROM solicitudes_rgpd
  WHERE id = p_solicitud_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'solicitud_no_encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_solicitud.estado != 'pendiente' THEN
    RAISE EXCEPTION 'solicitud_ya_procesada: estado=%', v_solicitud.estado
      USING ERRCODE = '55000';  -- idempotencia: no procesar dos veces
  END IF;

  -- 3. Obtener id_nombre del ejecutor
  SELECT id_nombre INTO v_caller_id_nombre
  FROM fichas_empleados
  WHERE auth_user_id = auth.uid();

  -- 4. Ejecutar la purga según el tipo
  IF v_solicitud.tipo_solicitud = 'borrado_clinico' THEN
    -- ─────────────────────────────────────────────────────────────────────────
    -- BORRADO CLÍNICO: UPDATE JSONB — NUNCA DELETE de la fila
    -- El campo datos_paciente pierde solo las claves PII; el resto se conserva.
    -- Se aplica al doc identificado por p_identificador en todas las tablas
    -- clínicas relevantes (solo una tendrá el id, las demás actualizan 0 filas).
    -- ─────────────────────────────────────────────────────────────────────────

    -- doc2: informes SVB
    UPDATE doc2_informes_svb
       SET datos_paciente = datos_paciente - CLAVES_PII
     WHERE id_doc = v_solicitud.identificador::uuid
       AND datos_paciente ?| CLAVES_PII;  -- no-op si ya fue purgado

    -- doc3: informes SVA
    UPDATE doc3_informes_sva
       SET datos_paciente = datos_paciente - CLAVES_PII
     WHERE id_doc = v_solicitud.identificador::uuid
       AND datos_paciente ?| CLAVES_PII;

    -- doc4: consentimientos — nullificar Blob de firma (no es JSONB con claves)
    UPDATE doc4_consentimientos
       SET datos_firma = NULL
     WHERE id_doc = v_solicitud.identificador::uuid
       AND datos_firma IS NOT NULL;

    -- doc5: rechazos de alta — idem
    UPDATE doc5_rechazos_alta
       SET datos_firma = NULL
     WHERE id_doc = v_solicitud.identificador::uuid
       AND datos_firma IS NOT NULL;

  ELSIF v_solicitud.tipo_solicitud = 'borrado_empleado' THEN
    -- ─────────────────────────────────────────────────────────────────────────
    -- BORRADO EMPLEADO: seudoanonimización — NUNCA DELETE de la fila
    -- id_nombre se conserva intacto (FK en tablas inmutables).
    -- DNI: se reemplaza por su SHA-256 hex para mantener unicidad y auditoría
    --      sin exponer el valor real. Requiere extensión pgcrypto.
    -- ─────────────────────────────────────────────────────────────────────────
    UPDATE fichas_empleados
       SET nombre_real = 'ANONIMIZADO',
           dni         = encode(digest(dni::bytea, 'sha256'), 'hex')
     WHERE id_nombre = v_solicitud.identificador
       AND nombre_real != 'ANONIMIZADO';  -- idempotente — no re-hashear un hash

    IF NOT FOUND THEN
      RAISE EXCEPTION 'empleado_no_encontrado: %', v_solicitud.identificador
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 5. Marcar solicitud como procesada
  UPDATE solicitudes_rgpd
     SET estado              = 'procesada',
         timestamp_procesado = NOW(),
         procesado_por       = v_caller_id_nombre,
         notas_procesamiento = p_notas
   WHERE id = p_solicitud_id;

END;
$$;

GRANT EXECUTE ON FUNCTION rpc_procesar_borrado_rgpd TO authenticated;
```

### 56.4 Reglas de diseño

| Aspecto | Decisión |
|---|---|
| Dos fases | Solicitar ≠ Ejecutar — el doble paso permite revisión y evita borrados accidentales. El mismo usuario puede hacer ambas acciones si tiene el claim. |
| Flujo de aprobación | La UI debe mostrar solicitudes pendientes a los responsables. El procesador decide ejecutar o denegar (UPDATE `estado = 'denegada'` desde UI directamente). |
| Borrado clínico | Solo JSONB subtraction operator `- CLAVES_PII` en `datos_paciente`. Las 4 tablas se intentan; solo la que contiene el `id_doc` actualiza filas. |
| doc4/doc5 | No tienen `datos_paciente` JSONB sino `datos_firma` (Blob URL). Se nullifica en el borrado clínico del mismo documento. |
| Borrado empleado | `nombre_real = 'ANONIMIZADO'` (marcador distinto del cron `'EMPLEADO_ANONIMIZADO'`). DNI → SHA-256 hex via `pgcrypto`. `id_nombre` intacto — es FK en tablas inmutables. |
| Idempotencia | Guard `nombre_real != 'ANONIMIZADO'` evita re-hashear un hash. Guard `datos_paciente ?| CLAVES_PII` evita re-actualizar documentos ya purgados. |
| pgcrypto | La función `digest()` requiere `CREATE EXTENSION IF NOT EXISTS pgcrypto` en la migración. Supabase Pro lo incluye por defecto. |
| RBAC | `can_manage_rbac` — coordinacion y gerencia. RRHH no tiene este claim; si se requiere, añadir `OR claim('can_manage_rrhh')` en ambas RPCs. |
| Trazabilidad | `solicitudes_rgpd` es inmutable (RLS DELETE = FALSE). Queda registro de quién solicitó, quién procesó, cuándo y con qué notas. |

---

## 57. Baja de Vehículo — RPC `rpc_baja_vehiculo` (C-05)

### 57.1 Propósito

Dar de baja un vehículo de la flota de forma controlada, bloqueando la operación si
el vehículo está actualmente desplegado en un DRP activo. El vehículo queda en
`condicion_tecnica = 'dado_de_baja'` y ya no aparece en ningún flujo operativo.
El registro histórico (dotaciones_drp, Doc-8 pasados, auditoria_inventario) permanece intacto.

### 57.2 RPC `rpc_baja_vehiculo`

```sql
CREATE OR REPLACE FUNCTION rpc_baja_vehiculo(
  p_matricula  TEXT,
  p_motivo     TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_condicion TEXT;
  v_pilot_id  TEXT;
BEGIN
  -- 1. Verificar permisos (responsable_flota, gerencia)
  IF NOT (claim('can_manage_fleet') OR claim('can_manage_rbac')) THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING HINT = '403',
            DETAIL = 'Solo responsable_flota o gerencia pueden dar de baja vehículos.';
  END IF;

  -- 2. Bloquear la fila del vehículo (FOR UPDATE previene race conditions)
  SELECT condicion_tecnica, pilot_id
    INTO v_condicion, v_pilot_id
    FROM vehiculos
   WHERE matricula = p_matricula
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vehiculo_no_encontrado'
      USING HINT   = '404',
            DETAIL = format('No existe vehículo con matrícula "%s".', p_matricula);
  END IF;

  -- 3. Idempotencia: ya dado de baja
  IF v_condicion = 'dado_de_baja' THEN
    RAISE EXCEPTION 'vehiculo_ya_de_baja'
      USING HINT   = '409',
            DETAIL = 'El vehículo ya está dado de baja.';
  END IF;

  -- 4. Guard DRP activo (C-05): bloquear si está desplegado en un DRP en curso
  IF EXISTS (
    SELECT 1 FROM dotaciones_drp
     WHERE matricula        = p_matricula
       AND timestamp_salida IS NULL
  ) THEN
    RAISE EXCEPTION 'vehiculo_en_drp_activo'
      USING HINT   = '409',
            DETAIL = 'El vehículo está desplegado en un DRP activo. '
                     'Finalizar o cancelar el DRP antes de dar de baja el vehículo.';
  END IF;

  -- 5. Guard pilot activo: no dar de baja con parte de trabajo abierto
  IF v_pilot_id IS NOT NULL THEN
    RAISE EXCEPTION 'vehiculo_con_pilot_activo'
      USING HINT   = '409',
            DETAIL = 'El vehículo tiene un parte de trabajo activo. '
                     'Forzar el checkout (forzar_checkout_administrativo) antes de dar de baja.';
  END IF;

  -- 6. Dar de baja
  UPDATE vehiculos
     SET condicion_tecnica = 'dado_de_baja',
         estado_operativo  = 'inactivo'
   WHERE matricula = p_matricula;

  -- 7. Auditoría
  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata, created_at)
  VALUES (
    'baja_vehiculo',
    (SELECT id_nombre FROM fichas_empleados WHERE auth_user_id = auth.uid()),
    jsonb_build_object('matricula', p_matricula, 'motivo', p_motivo),
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_baja_vehiculo TO authenticated;
```

### 57.3 Guards resumen

| Condición | Error | HTTP hint |
|---|---|---|
| Sin claim `can_manage_fleet` ni `can_manage_rbac` | `insufficient_privilege` | 403 |
| Matrícula no existe en `vehiculos` | `vehiculo_no_encontrado` | 404 |
| `condicion_tecnica = 'dado_de_baja'` | `vehiculo_ya_de_baja` | 409 |
| Existe fila en `dotaciones_drp` con `timestamp_salida IS NULL` | `vehiculo_en_drp_activo` | 409 |
| `pilot_id IS NOT NULL` en `vehiculos` | `vehiculo_con_pilot_activo` | 409 |

### 57.4 Flujo de desbloqueo de guards

```
vehiculo_en_drp_activo   → Coordinación cancela o finaliza el DRP primero
vehiculo_con_pilot_activo → Coordinación ejecuta forzar_checkout_administrativo primero
```

El orden correcto para una baja de vehículo en operación es:
1. Cancelar o finalizar el DRP (si aplica)
2. Forzar checkout del pilot (si aplica)
3. Ejecutar `rpc_baja_vehiculo`

### 57.5 RBAC

`SECURITY DEFINER`. `can_manage_fleet` (roles: `responsable_flota`, `gerencia`) o
`can_manage_rbac` (gerencia). Ver `rls_y_rpcs.md §25`.

---

## 58. Resolución de Solicitudes de Desbloqueo — `rpc_aprobar_desbloqueo` + `rpc_rechazar_desbloqueo` (C-06)

### 58.1 Propósito

Cierra el flujo de `solicitudes_desbloqueo` (F-04): cuando un empleado solicita
desbloquear un terminal bloqueado via `rpc_solicitar_desbloqueo` (§12 en rls_y_rpcs.md),
la solicitud queda en `estado = 'pendiente'`. Sin estas RPCs, la solicitud podía expirar
pero nunca aprobarse ni rechazarse de forma controlada.

Ambas RPCs son `SECURITY DEFINER` y validan explícitamente el claim del invocador
como primera instrucción del cuerpo (coordinacion o gerencia).

### 58.2 Tabla objetivo — columnas relevantes de `solicitudes_desbloqueo`

```
id_solicitud          UUID         PK
id_terminal           TEXT         FK  — SHA-256 fingerprint del terminal
id_nombre_solicitante TEXT         FK → fichas_empleados
motivo                TEXT
estado                TEXT         'pendiente' | 'aprobada' | 'rechazada' | 'expirada'
id_nombre_revisor     TEXT NULL    FK → fichas_empleados — NULL hasta resolución
created_at            TIMESTAMPTZ
expires_at            TIMESTAMPTZ  — TTL de la solicitud (24 h); el cron marca 'expirada'
```

### 58.3 RPC `rpc_aprobar_desbloqueo`

```sql
CREATE OR REPLACE FUNCTION rpc_aprobar_desbloqueo(
  p_solicitud_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_estado_actual       TEXT;
  v_id_terminal         TEXT;
  v_revisor_id_nombre   TEXT;
BEGIN
  -- 1. Guard de claim — primera instrucción (C-06)
  IF NOT claim('can_manage_rbac') THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING HINT   = '403',
            DETAIL = 'Solo coordinacion o gerencia pueden aprobar solicitudes de desbloqueo.';
  END IF;

  -- 2. Bloquear y leer la solicitud (FOR UPDATE — previene doble aprobación concurrente)
  SELECT estado, id_terminal
    INTO v_estado_actual, v_id_terminal
    FROM solicitudes_desbloqueo
   WHERE id_solicitud = p_solicitud_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'solicitud_no_encontrada'
      USING HINT = '404';
  END IF;

  -- 3. Guard de estado — solo 'pendiente' puede aprobarse
  IF v_estado_actual != 'pendiente' THEN
    RAISE EXCEPTION 'solicitud_no_pendiente'
      USING HINT   = '409',
            DETAIL = format(
              'La solicitud está en estado "%s" — solo las pendientes pueden aprobarse.',
              v_estado_actual
            );
  END IF;

  -- 4. Identificar al revisor
  SELECT id_nombre INTO v_revisor_id_nombre
    FROM fichas_empleados WHERE auth_user_id = auth.uid();

  -- 5. Marcar como aprobada
  UPDATE solicitudes_desbloqueo
     SET estado            = 'aprobada',
         id_nombre_revisor = v_revisor_id_nombre
   WHERE id_solicitud = p_solicitud_id;

  -- 6. Notificar al terminal via pg_notify (Supabase Realtime lo entrega al canal del terminal)
  PERFORM pg_notify(
    'desbloqueo_terminal',
    json_build_object(
      'tipo',         'desbloqueo_aprobado',
      'id_terminal',  v_id_terminal,
      'revisor',      v_revisor_id_nombre,
      'solicitud_id', p_solicitud_id
    )::text
  );

  -- 7. Auditoría
  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata, created_at)
  VALUES (
    'desbloqueo_aprobado',
    v_revisor_id_nombre,
    jsonb_build_object(
      'solicitud_id', p_solicitud_id,
      'id_terminal',  v_id_terminal
    ),
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_aprobar_desbloqueo TO authenticated;
```

### 58.4 RPC `rpc_rechazar_desbloqueo`

```sql
CREATE OR REPLACE FUNCTION rpc_rechazar_desbloqueo(
  p_solicitud_id    UUID,
  p_motivo_rechazo  TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_estado_actual     TEXT;
  v_id_terminal       TEXT;
  v_revisor_id_nombre TEXT;
BEGIN
  -- 1. Guard de claim — primera instrucción (C-06)
  IF NOT claim('can_manage_rbac') THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING HINT   = '403',
            DETAIL = 'Solo coordinacion o gerencia pueden rechazar solicitudes de desbloqueo.';
  END IF;

  -- 2. Bloquear y leer la solicitud
  SELECT estado, id_terminal
    INTO v_estado_actual, v_id_terminal
    FROM solicitudes_desbloqueo
   WHERE id_solicitud = p_solicitud_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'solicitud_no_encontrada'
      USING HINT = '404';
  END IF;

  -- 3. Guard de estado — solo 'pendiente' puede rechazarse
  IF v_estado_actual != 'pendiente' THEN
    RAISE EXCEPTION 'solicitud_no_pendiente'
      USING HINT   = '409',
            DETAIL = format(
              'La solicitud está en estado "%s" — solo las pendientes pueden rechazarse.',
              v_estado_actual
            );
  END IF;

  -- 4. Identificar al revisor
  SELECT id_nombre INTO v_revisor_id_nombre
    FROM fichas_empleados WHERE auth_user_id = auth.uid();

  -- 5. Marcar como rechazada
  UPDATE solicitudes_desbloqueo
     SET estado            = 'rechazada',
         id_nombre_revisor = v_revisor_id_nombre
   WHERE id_solicitud = p_solicitud_id;

  -- 6. Notificar al terminal (para mostrar banner "Desbloqueo denegado")
  PERFORM pg_notify(
    'desbloqueo_terminal',
    json_build_object(
      'tipo',            'desbloqueo_rechazado',
      'id_terminal',     v_id_terminal,
      'motivo_rechazo',  p_motivo_rechazo,
      'solicitud_id',    p_solicitud_id
    )::text
  );

  -- 7. Auditoría
  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata, created_at)
  VALUES (
    'desbloqueo_rechazado',
    v_revisor_id_nombre,
    jsonb_build_object(
      'solicitud_id',   p_solicitud_id,
      'id_terminal',    v_id_terminal,
      'motivo_rechazo', p_motivo_rechazo
    ),
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_rechazar_desbloqueo TO authenticated;
```

### 58.5 Reglas de diseño

| Aspecto | Decisión |
|---|---|
| Claim de primera línea | `claim('can_manage_rbac')` cubre `coordinacion` y `gerencia` — exactamente el scope del revisor |
| FOR UPDATE en paso 2 | Previene que dos revisores aprueben/rechacen simultáneamente la misma solicitud |
| Estados finales | `'aprobada'` y `'rechazada'` son terminales — el guard del paso 3 bloquea reintentos |
| `'expirada'` | No es aprobable ni rechazable — el cron de purge ya la cerró; el guard del paso 3 la bloquea |
| pg_notify canal | `'desbloqueo_terminal'` — el frontend filtra por `id_terminal` en el payload |
| RLS UPDATE = USING(FALSE) | La UPDATE directa de `solicitudes_desbloqueo` queda bloqueada a usuarios JWT; el único path son estas RPCs SECURITY DEFINER |
| Auditoría | `desbloqueo_aprobado` / `desbloqueo_rechazado` en `auditoria_rbac` — añadir al enum de `tipo_evento` |

Ver `rls_y_rpcs.md §26` para el resumen de RBAC y la policy actualizada.

---

## 59. Cambio de Contraseña por el Empleado — `useCambiarPassword` + `ef_renovar_offline_session` (C-10)

### 59.1 Propósito y contexto

Cualquier empleado autenticado puede cambiar su propia contraseña online sabiendo
la contraseña actual (no es lo mismo que recuperación — ver ADR-004 para el caso
de contraseña olvidada). La operación involucra dos sistemas que deben mantenerse
sincronizados:

1. **Supabase Auth** — almacena el hash de la contraseña para autenticación online.
2. **`u24_offline_session`** (localStorage) — almacena un hash PBKDF2 de la contraseña
   calculado en el servidor durante el check-in, necesario para la verificación offline
   en modo degradado (§25.2). **Si este hash no se actualiza tras el cambio de contraseña,
   el próximo login offline fallará.**

> ⚠️ **El gotcha crítico (C-10):** `supabase.auth.updateUser({ password })` actualiza
> la contraseña en Supabase Auth pero **no toca `u24_offline_session`**. El cliente
> debe obtener una nueva sesión offline firmada (con el hash de la nueva contraseña)
> y reemplazar el valor en localStorage de forma atómica en la misma transacción de UI.
> Si este paso se omite, el terminal quedará inaccesible en modo offline hasta el
> próximo check-in online.

### 59.2 Hook de cliente `useCambiarPassword`

```typescript
// hooks/useCambiarPassword.ts

interface CambiarPasswordResult {
  success: boolean
  error?: 'contrasena_actual_incorrecta' | 'contrasena_nueva_invalida' | 'offline_session_error' | 'error_desconocido'
}

async function cambiarPassword(
  contrasenaActual: string,
  contrasenaNueva:  string
): Promise<CambiarPasswordResult> {

  // Validación de cliente (no sustituye al guard del servidor)
  if (contrasenaNueva.length < 8) {
    return { success: false, error: 'contrasena_nueva_invalida' }
  }
  if (contrasenaNueva === contrasenaActual) {
    return { success: false, error: 'contrasena_nueva_invalida' }
  }

  // PASO 1 — Verificar contraseña actual via Supabase Auth
  // (supabase.auth.updateUser no valida la contraseña actual — esta es la forma canónica)
  const idNombre = useAuthStore.getState().idNombre       // ej. 'tes_demo'
  const email    = `${idNombre}@u24.internal`
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: contrasenaActual,
  })
  if (signInError) return { success: false, error: 'contrasena_actual_incorrecta' }

  // PASO 2 — Actualizar contraseña en Supabase Auth
  const { error: updateError } = await supabase.auth.updateUser({
    password: contrasenaNueva,
  })
  if (updateError) return { success: false, error: 'error_desconocido' }

  // PASO 3 — Refrescar u24_offline_session con el hash de la nueva contraseña
  // ⚠️ CRÍTICO: si este paso falla, el login offline dejará de funcionar.
  const deviceId = useTerminalStore.getState().idTerminal  // fingerprint SHA-256 del terminal
  const { data: offlinePayload, error: efError } = await supabase.functions.invoke(
    'ef-renovar-offline-session',
    { body: { nuevaContrasena: contrasenaNueva, deviceId } }
  )
  if (efError || !offlinePayload?.signed_payload) {
    // El cambio de Supabase Auth fue exitoso; el offline session no pudo actualizarse.
    // El usuario puede seguir logando online. Se le avisa del impacto offline.
    return { success: true, error: 'offline_session_error' }
  }

  // PASO 4 — Reemplazar u24_offline_session en localStorage (atómico desde perspectiva de UI)
  localStorage.setItem('u24_offline_session', offlinePayload.signed_payload)

  return { success: true }
}
```

**UX en caso de `offline_session_error`:**
```
Toast de advertencia (no error):
"Contraseña actualizada correctamente.
 ⚠️ No se pudo actualizar la sesión offline. El acceso en modo sin conexión
 puede no estar disponible hasta el próximo inicio de turno."
```

### 59.3 Edge Function `ef_renovar_offline_session`

Genera un nuevo payload de sesión offline firmado con el hash de la nueva contraseña.
La estructura y firma del payload son idénticas al generado durante el check-in (§25.2).

```typescript
// supabase/functions/ef-renovar-offline-session/index.ts

Deno.serve(async (req) => {
  // 1. Autenticación — JWT requerido (el usuario debe estar online y autenticado)
  const jwtClaims = await verifyJWT(req)
  if (!jwtClaims) return errorResponse(401, 'jwt_requerido')

  const { nuevaContrasena, deviceId } = await req.json()
  if (!nuevaContrasena || !deviceId) return errorResponse(422, 'parametros_requeridos')
  if (nuevaContrasena.length < 8) return errorResponse(422, 'contrasena_invalida')

  // 2. Generar salt y PBKDF2 hash de la nueva contraseña (en el servidor — nunca en cliente)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(nuevaContrasena), 'PBKDF2', false, ['deriveBits']
  )
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    keyMaterial,
    256
  )
  const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hashBits)))
  const passwordSalt = btoa(String.fromCharCode(...salt))

  // 3. Construir payload (shift timing: desde ahora + 36h)
  const shiftStart = new Date().toISOString()
  const expiresAt  = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()

  const payload = {
    user_id:         jwtClaims.id_nombre,
    role:            jwtClaims.rol,
    claims_snapshot: jwtClaims.app_claims,
    shift_start:     shiftStart,
    expires_at:      expiresAt,
    device_id:       deviceId,
    password_hash:   passwordHash,
    password_salt:   passwordSalt,
  }

  // 4. Firmar con clave HMAC del Vault (misma lógica que el check-in)
  const hmacKey  = await getVaultHmacKey()   // helper — lee la clave diaria de Supabase Vault
  const payloadB64 = btoa(JSON.stringify(payload))
  const signature  = await computeHMAC(hmacKey, payloadB64)
  const signedPayload = `${payloadB64}.${signature}`

  return new Response(JSON.stringify({ signed_payload: signedPayload }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
})
```

### 59.4 Impacto en otros terminales

Si el empleado usa múltiples terminales (inusual en U24, pero posible):
- `u24_offline_session` solo se actualiza en el terminal donde ejecuta el cambio.
- Los demás terminales mantienen el hash de la contraseña anterior → login offline fallará.
- **Solución operativa:** el empleado debe hacer un check-in online en cada terminal
  para regenerar el `u24_offline_session` con el nuevo hash. Los check-ins online
  siempre funcionan (Supabase Auth tiene el nuevo hash actualizado en el paso 2).

### 59.5 UI — Formulario de cambio de contraseña

```
Ubicación: black_column → Ajustes → Seguridad → Cambiar contraseña

Campos:
  Contraseña actual: [password]
  Nueva contraseña:  [password]  — mín. 8 chars
  Confirmar nueva:   [password]  — debe coincidir

Botón: [ Guardar contraseña ]

Estados posibles:
  ✅ Éxito completo → Toast: "Contraseña actualizada."
  ⚠️ Éxito parcial (offline_session_error) → Toast de advertencia (§59.2)
  ❌ Contraseña actual incorrecta → Error inline en el campo
  ❌ Nueva contraseña inválida → Error inline (demasiado corta o igual a la actual)
```

### 59.6 Relación con ef_reset_password (RRHH)

`ef_reset_password` (rls_y_rpcs.md §8) es para cuando RRHH resetea la contraseña de
otro empleado. No actualiza `u24_offline_session` del empleado afectado — tras el reset,
el empleado debe hacer el primer login online para regenerar su sesión offline.
Ver ADR-004 para la política completa de recuperación de contraseña.

---

## 60. Autoridad de Timestamps — Servidor vs. Cliente (C-14)

### 60.1 Principio

En un sistema offline-first, las RPCs reciben payloads que fueron generados en el
cliente horas o días antes de su sincronización. Es crítico distinguir qué timestamps
genera el servidor y cuáles deben respetarse del payload del cliente:

- **Servidor genera:** timestamps de trazabilidad técnica — registran cuándo llegó
  el dato a la base de datos, no cuándo ocurrió el evento.
- **Cliente aporta:** timestamps transaccionales — registran cuándo ocurrió el evento
  real en el campo (apertura de box, cierre de sesión clínica, etc.).

Usar `NOW()` para campos transaccionales en RPCs borra la evidencia de cuándo ocurrió
el evento real y es un **bug silencioso** en sistemas offline-first.

### 60.2 Tabla de autoridad por campo

| Campo | Autoridad | Valor en la RPC | Motivo |
|---|---|---|---|
| `created_at` | Servidor | `NOW()` | Momento en que el registro llega a la DB |
| `timestamp_sincronizacion` | Servidor | `NOW()` | Momento en que la cola offline se drena |
| `updated_at` | Servidor | `NOW()` | Momento de la última modificación en DB |
| `timestamp_checkin` | Servidor | `NOW()` | El checkin ocurre en la petición RPC, no offline |
| `timestamp_checkout` | Servidor | `NOW()` | El checkout ocurre en la petición RPC, no offline |
| `timestamp_inicio_preparacion` | Servidor | `NOW()` en transición DRP | Transición atómica en el servidor |
| `timestamp_inicio_curso` | Servidor | `NOW()` en transición DRP | Transición atómica en el servidor |
| `timestamp_fin_drp` | Servidor | `NOW()` en cierre DRP | Cierre atómico en el servidor |
| `timestamp_apertura` | **Cliente** | `p_timestamp_apertura` (payload IndexedDB) | El box se abrió offline — momento real del campo |
| `timestamp_cierre` | **Cliente** | `p_timestamp_cierre` (payload IndexedDB) | El box se cerró offline — momento real del campo |
| `timestamp_evento` | **Cliente** | `p_timestamp_evento` (payload IndexedDB) | Evento registrado offline — momento real del campo |
| `timestamp_apertura` (Doc-8) | **Cliente** | `p_timestamp_apertura` | La guardia empezó offline |
| `timestamp_fin_consulta` | Servidor / CASE | `NOW()` si `en_consulta`, NULL si no | Ver §20 filiación |

### 60.3 Regla de implementación en RPCs

```sql
-- ✅ CORRECTO: servidor aporta trazabilidad, cliente aporta el momento real
INSERT INTO psa_sesiones (
  id,
  timestamp_apertura,           -- del cliente (evento real offline)
  timestamp_cierre,             -- del cliente (evento real offline)
  timestamp_sincronizacion,     -- del servidor (cuándo llegó a la DB)
  created_at                    -- del servidor (cuándo llegó a la DB)
) VALUES (
  gen_random_uuid(),
  p_timestamp_apertura,         -- parámetro de entrada desde payload IndexedDB
  p_timestamp_cierre,           -- parámetro de entrada desde payload IndexedDB
  NOW(),                        -- servidor
  NOW()                         -- servidor
);

-- ❌ INCORRECTO: borra la evidencia de cuándo ocurrió el evento real
INSERT INTO psa_sesiones (
  timestamp_apertura,
  timestamp_sincronizacion
) VALUES (
  NOW(),     -- ERROR: registra cuándo sincronizó, no cuándo abrió el box
  NOW()
);
```

### 60.4 Validación de rango de timestamps en el cliente

Antes de encolar una mutación offline, el cliente valida que los timestamps del payload
sean razonables para detectar errores de reloj del dispositivo:

```typescript
// Validación ejecutada en useOfflineQueue.enqueue() — usa nowCorrected() de clockSync.ts (B-12)
// La tolerancia se redujo a ±5 min para detectar drift de reloj antes de encolar.
// Ver payloads_y_contratos.md §D.1 para el mecanismo de corrección de clock offset.
const MAX_DRIFT_MS = 5 * 60 * 1000  // ±5 min en ambas direcciones (B-12, reducido de 72h/5min)

function validarTimestampTransaccional(ts: string, campo: string): void {
  const epochMs  = new Date(ts).getTime()
  const nowCorrMs = Date.now() - getClockOffset()  // nowCorrected() del clockSync.ts
  if (isNaN(epochMs))
    throw new Error(`timestamp_invalido: ${campo}`)
  if (epochMs < nowCorrMs - MAX_DRIFT_MS)
    throw new Error(`timestamp_demasiado_antiguo: ${campo} (${ts})`)
  if (epochMs > nowCorrMs + MAX_DRIFT_MS)
    throw new Error(`timestamp_en_el_futuro: ${campo} (${ts})`)
}
```

Mutaciones con timestamp inválido se marcan como `'fallido'` inmediatamente sin
encolarse — no se reintentan, se notifica al usuario para revisión manual.

### 60.5 Huso horario y almacenamiento

Todos los timestamps se almacenan en UTC (`TIMESTAMPTZ`). La conversión a
`Europe/Madrid` para visualización en la UI es responsabilidad del cliente
(`Intl.DateTimeFormat` con `timeZone: 'Europe/Madrid'`). Las RPCs no devuelven
strings localizados — siempre devuelven `TIMESTAMPTZ` en UTC. Ver ADR-005 para
la configuración de timezone en el servidor PostgreSQL.

---

## 61. Edge Cron `ef_cron_transito_ttl` — alerta de tránsitos vencidos (B-04)

**Frecuencia:** Diaria, 05:00 UTC.
**Service role:** obligatorio — `inventario_en_transito` y `doc11_avisos` requieren privilegio elevado.
**Ubicación:** `supabase/functions/ef-cron-transito-ttl/index.ts`

### 61.1 Propósito

Un `inventario_en_transito` permanece en estado `'en_transito'` cuando el receptor no confirma ni rechaza la recepción. Después de 48 h sin confirmación el material puede estar perdido, extraviado o en un vehículo fuera de servicio. El cron detecta estos casos y genera Doc-11 de alerta.

### 61.2 Lógica

```typescript
// 1. Obtener tránsitos vencidos (> 48h sin confirmar)
const { data: vencidos } = await supabaseAdmin
  .from('inventario_en_transito')
  .select('id_transito, id_transferencia, id_item, cantidad, location_origen, location_destino, timestamp_envio')
  .eq('estado', 'en_transito')
  .lt('timestamp_envio', new Date(Date.now() - 48 * 3600 * 1000).toISOString())

for (const t of vencidos ?? []) {
  // 2. Verificar que no hay ya un Doc-11 de tipo transito_vencido para este tránsito
  //    (evitar spam si el cron se dispara múltiples días consecutivos para el mismo item)
  const { data: yaNotificado } = await supabaseAdmin
    .from('doc11_avisos')
    .select('id_aviso')
    .eq('tipo_aviso', 'transito_vencido')
    .ilike('texto', `%${t.id_transito}%`)
    .maybeSingle()

  if (yaNotificado) continue

  // 3. Generar Doc-11 a logística origen y destino
  await supabaseAdmin
    .from('doc11_avisos')
    .insert({
      id_aviso:             crypto.randomUUID(),
      tipo_aviso:           'transito_vencido',
      nivel:                'aviso',
      id_nombre_emisor:     'system',
      texto:                `Tránsito vencido (>48h): ${t.cantidad} uds. ítem ${t.id_item} `
                          + `de ${t.location_origen} → ${t.location_destino}. `
                          + `Enviado: ${t.timestamp_envio}. ID: ${t.id_transito}.`,
      timestamp_publicacion: new Date().toISOString(),
      leido_por:            []
    })
}
```

**Acción requerida:** logística debe confirmar, rechazar o redirigir manualmente via UI de Doc-10. El cron solo alerta — no cancela ni cierra tránsitos automáticamente.

---

## 62. Edge Cron `ef_cron_revoke_stale_terminals` — revocación de galletas sin uso > 90 días (B-05)

**Frecuencia:** Semanal, domingos 02:00 UTC.
**Service role:** obligatorio — `galletas_terminales` tiene RLS UPDATE `USING (FALSE)` para JWT normales.
**Ubicación:** `supabase/functions/ef-cron-revoke-stale-terminals/index.ts`

### 62.1 Propósito

Las galletas permanentes de terminales no usados en > 90 días representan vectores de acceso fantasma (terminales físicos desinstalados, obsoletos o robados). La revocación automática reduce la superficie de ataque sin intervención manual.

### 62.2 Lógica

```typescript
const INACTIVO_MS = 90 * 24 * 3600 * 1000   // 90 días en ms
const umbral = new Date(Date.now() - INACTIVO_MS).toISOString()

// 1. Obtener galletas permanentes sin uso reciente
const { data: stale } = await supabaseAdmin
  .from('galletas_terminales')
  .select('id_galleta, id_terminal, id_nombre, ultima_activacion_at, created_at')
  .eq('tipo', 'permanente')
  .is('revocado_at', null)
  .or(`ultima_activacion_at.lt.${umbral},and(ultima_activacion_at.is.null,created_at.lt.${umbral})`)

for (const g of stale ?? []) {
  // 2. Revocar: marcar revocado_at con timestamp actual
  await supabaseAdmin
    .from('galletas_terminales')
    .update({ revocado_at: new Date().toISOString() })
    .eq('id_galleta', g.id_galleta)

  // 3. Auditar
  await supabaseAdmin
    .from('auditoria_rbac')
    .insert({
      id_evento:   crypto.randomUUID(),
      tipo_evento: 'galleta_revocada',
      id_nombre:   g.id_nombre,
      id_terminal: g.id_terminal,
      metadata: {
        motivo:              'inactividad_90_dias',
        ultima_activacion:   g.ultima_activacion_at ?? g.created_at,
        revocado_por_cron:   true
      },
      created_at: new Date().toISOString()
    })
}
```

**Trigger de `ultima_activacion_at`:** en `ef_consumir_pin` (login via galleta), actualizar `ultima_activacion_at = NOW()` en la galleta correspondiente tras login exitoso. También en `set_claims` (login normal): actualizar si `id_terminal` coincide con una galleta activa.

**Notificación a coordinación:** si se revocan > 3 galletas en una ejecución, generar Doc-11 a coordinación con la lista de terminales revocados para revisión manual.
