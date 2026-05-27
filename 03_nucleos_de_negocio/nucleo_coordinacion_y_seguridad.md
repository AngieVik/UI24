# nucleo_coordinacion_y_seguridad

* RBAC: `gerencia`, `coordinación`.

* **modulo_emergencia**

  * `token_de_seguridad` — galleta pequeña (temporal)
    1. Requiere reautenticación con credenciales propias
       en modal superpuesto antes de generarlo.
    2. Crea un PIN de 6 dígitos con validez de 10 minutos.
    3. La BBDD reconoce el PIN y al introducirse en cualquier
       terminal inyecta una cookie segura que convierte ese
       terminal en oficial durante el resto del turno.
    4. El terminal accede a `estado_1` con rol `invitado`.
    5. Al hacer checkout del último ID_nombre, la cookie
       se autodestruye del terminal.
    * UI: botón redondo con texto `Pedir una galleta pequeña`.

  * `token_especial` — galleta (permanente)
    1. Requiere reautenticación con credenciales propias
       en modal superpuesto antes de generarlo.
    2. **Campo obligatorio `descripcion`:** antes de confirmar la generación,
       el coordinador debe rellenar un campo de texto descriptivo
       (ej. `"Tablet Ambulancia 7 — Matrícula 1234-ABC"`).
       El modal no permite continuar si `descripcion` está vacío.
    3. Crea un PIN de 6 dígitos con validez de 10 minutos.
    4. **Pre-registro en `galletas_terminales`:** el servidor guarda el hash del PIN
       y la `descripcion` en la tabla `galletas_terminales`, inicializando el campo
       `id_terminal` como string vacío `''` (pendiente de vinculación hardware).
    5. La BBDD reconoce el PIN y al introducirse en cualquier
       terminal inyecta una cookie segura permanente
       (hasta eliminación manual en Supabase).
    6. El terminal accede a `estado_1` con rol `invitado`.
    7. El checkout no destruye la cookie — el terminal
       queda registrado como oficial de forma indefinida.
    * UI: botón redondo con texto `Pedir una galleta`.

  * **Lógica de consumo de PIN — comportamiento diferenciado:**
    * **PIN permanente (`token_especial`):**
      Al introducir el PIN en `terminal_check`, el cliente genera silenciosamente
      un `id_terminal` (fingerprint del dispositivo) y lo adjunta al envío.
      El servidor: valida el PIN, inyecta el `id_terminal` en el registro de
      `galletas_terminales`, y registra `consumido_at = NOW()`.
      La fila `galletas_terminales` pasa de `id_terminal = ''` a tener el fingerprint real.
    * **PIN temporal (`token_de_seguridad` / `galleta_pequeña`):**
      El servidor NO toca `galletas_terminales`. Únicamente registra el
      `id_terminal` y `consumido_at = NOW()` en la tabla `sesiones_emergencia`
      para trazabilidad y auditoría. Ver `logic.md §45` para la especificación SQL.

  * Ambos tokens se registran en tabla `sesiones_emergencia`
    con `tipo`, `created_at`, `expires_at`, `id_terminal` y `consumido_at`.
    Edge Function purga automáticamente los expirados.

* **dispositivos_validados**
  * RBAC: `coordinación`, `gerencia`.
  * Acceso desde `black_column → Coordinación → Dispositivos Validados`.
  * **Propósito:** gestionar el inventario de tablets oficiales con galleta permanente
    (`token_especial`) vinculadas a vehículos operativos. Permite revocar y reemplazar
    la credencial hardware de un terminal dañado o robado sin acceso a bajo nivel a la BD.

  * **Vista de tabla — columnas:**

    | Columna | Contenido |
    |---|---|
    | `Descripción` | Nombre libre del terminal (ej. "Tablet Amb. 7 — 1234-ABC") |
    | `Matrícula` | Matrícula del vehículo asociado (editable inline) |
    | `ID Terminal` | Fingerprint del dispositivo donde se consumió el PIN |
    | `Creada` | Fecha y hora de emisión de la galleta |
    | `Creada por` | ID del coordinador que la generó |
    | `Estado` | Badge `Activa` (verde) / `Revocada` (rojo) |

  * **Acción "Revocar y Re-emitir":**
    1. Botón disponible únicamente en filas con `Estado = Activa`.
    2. Modal de confirmación con reautenticación del coordinador.
    3. Campo `Descripción` para la nueva galleta (autorellenado con la descripción
       anterior — editable antes de confirmar).
    4. Al confirmar: RPC `revocar_y_reemitir_galleta(galleta_id, coordinador_id, descripcion)`:
       * Marca la galleta existente como `revocada_at = NOW()`.
       * Genera nuevo PIN de 6 dígitos con TTL de 10 minutos.
       * El nuevo PIN se muestra **una única vez** en pantalla en un modal:
         `"PIN de emparejamiento: 123456 — Válido 10 minutos"`.
       * El coordinador comunica el PIN al operador de la nueva tablet
         por canal externo (radio, teléfono).
    5. El operador de la nueva tablet introduce el PIN en `terminal_check`
       → mismo flujo que `token_especial` estándar → nueva galleta vinculada al dispositivo.
    6. La fila en la tabla se actualiza automáticamente con `id_terminal` de la nueva tablet
       al consumirse el PIN.
    * Ver `logic.md §45` para la especificación SQL completa (RPC + tabla `galletas_terminales`).

  * **Acción "Editar Descripción / Matrícula":**
    Inline edit directo en la fila (campo descripción y matrícula). Guarda con debounce.
    No requiere reautenticación — acción de bajo riesgo.

* **rbac**
  * Gestión completa de usuarios y permisos del sistema.
  * Acciones disponibles para `gerencia` y `coordinación`:
    * Crear nuevo usuario.
    * Asignar o cambiar rol a usuario existente.
    * Cambiar contraseña de usuario.
    * Desactivar cuenta de usuario.
  * Roles del sistema (ver `rbac_y_permisos.md` para la definición completa):
    * `gerencia`
    * `coordinación`
    * `logística`
    * `responsable_logistica`
    * `flota`
    * `responsable_flota`
    * `tes`
    * `due`
    * `médico`
    * `rrhh`
    * `invitado` *(asignado automáticamente por cookie de emergencia, sin gestión manual)*

* **bandeja_entrada_coordinacion**
  * Recibe Doc-11 dirigidos a coordinación y otros mensajes
    internos del sistema.
  * Tipos de mensajes entrantes:
    * Doc-11 con destino `coordinación` (avisos urgentes
      y alertas críticas desde cualquier terminal).
    * **`solicitud_desbloqueo_excepcional`** — notificación de alta prioridad
      generada cuando un pilot intenta activar un vehículo con
      `condicion_tecnica = critico`.
      Contenido: ID_vehiculo, ID_piloto_solicitante, motivo_urgencia, timestamp.
      Acciones disponibles directamente en la bandeja:
      * **Autorizar** → Edge Function `conceder_desbloqueo`: inyecta
        `override_critico = true` en la metadata del vehículo y emite
        evento Realtime `desbloqueo_concedido` al terminal del pilot.
        Genera Doc-11 automático de auditoría (activación bajo override).
      * **Denegar** → emite evento `desbloqueo_denegado` al terminal.
      La notificación expira en 10 minutos si no recibe respuesta
      (el pilot deberá re-solicitarla si sigue siendo necesario).
      Ver `logic.md §32` para el flujo completo.
    * Avisos automáticos del sistema (ver `logic.md §18`): detención forzada de
      vehículo por `critico`, DRP no activado a la hora programada, etc.
    * Mensajes internos entre roles *(a definir en detalle
      cuando se implemente el sistema de mensajería)*.
  * Flujo de estados y acciones: ver `componentes.md → flujos_transicion`.

* **forzar_checkout_administrativo**
  * RBAC: `coordinación`, `gerencia`.
  * Accesible desde `visor_seguimiento_operativo` (tarjeta de vehículo)
    y desde el panel de flota (`nucleo_flota_y_taller → Flota y taller`).
  * **Propósito:** expulsar un pilot fantasma — persona con estado `pilot` activo
    en base de datos cuyo terminal no responde (fallo de dispositivo, pérdida de
    cobertura prolongada, abandono del turno sin checkout).
  * **UI:** botón `Forzar checkout` visible en la tarjeta del vehículo cuando
    `vehiculo.pilot_id != null` y el coordinador tiene los permisos necesarios.
  * **Flujo:**
    1. Modal de confirmación con reautenticación del coordinador (campo password).
    2. Campo `km_fin` (obligatorio) — el coordinador introduce el kilómetro
       estimado o real que conoce por comunicación externa.
    3. Al confirmar: RPC `forzar_checkout_administrativo` cierra el Doc-8 con
       `estado = 'Enviado_Cerrado_Administrativo'` y retira el `pilot_id` del vehículo.
    4. El vehículo queda en `en_espera` disponible para nueva asignación.
    5. Notificación automática en `bandeja_entrada_coordinacion` con el registro
       de la acción (quién, qué vehículo, km_fin, timestamp).
  * **Estado resultante del Doc-8:** `Enviado_Cerrado_Administrativo` — distinguible
    del cierre normal para auditoría. El campo `cerrado_por_coordinador_id` registra
    quién ejecutó la acción.
  * Ver `hooks.md §3 forzarCheckoutAdministrativo` y `logic.md §42` para la
    especificación técnica completa.

* **visor_seguimiento_operativo**
  * RBAC: `coordinación`, `gerencia`.
  * Panel principal de monitorización en tiempo real del estado de la flota activa.
    Visible desde los puestos de coordinación y gerencia. No disponible en terminales
    de vehículo.
  * **Filtros rápidos:** `Solo en ruta` | `Solo DRP activos` | `Averiados` | `Todos`.
  * **Estructura visual:** cuadrícula/lista densa con una tarjeta por cada `ID_vehiculo`
    activo (no en estado `desactivado`). Cada tarjeta expone:
    * `ID_vehiculo` y `matricula`.
    * `ID_nombre` del pilot y carry activos (o "Sin pilot" / "Sin carry" si no aplica).
    * Badge `estado_operativo`: `en_espera` | `activado` | `ruta` | `estacionado` | `alerta`.
    * Badge `condicion_tecnica`: `operativo` | `averiado_leve` | `critico`.
    * Coordenadas GPS (lat, lon) con timestamp del último ping o del historial
      (ver `logic.md §29` para el mecanismo de obtención).
  * **Acciones por tarjeta:**
    * `Solicitar Ubicación` — icono `ti-map-pin`. Dispara el mecanismo de ping de
      coordenadas descrito en `logic.md §29`. El botón se deshabilita durante la
      solicitud activa para evitar pings duplicados.
    * `Copiar Coordenadas` — icono `ti-copy` que transiciona a `ti-check` al copiar
      lat/lon al portapapeles. Sólo activo si hay coordenadas disponibles.
