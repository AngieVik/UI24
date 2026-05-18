# UI24

## terminal_index

* **estado_0_terminal_bloqueado**
  * Pantalla minimalista: sin black_column, sin header, sin ticker.
  * Fondo neutro, formulario `terminal_check` centrado en pantalla.
  * No requiere cookie ni permisos. Requiere conexión a internet.
  * Única acción disponible: autenticarse.
  * Al autenticarse correctamente → transición a `estado_1_terminal_desbloqueado` con rol del ID_nombre autenticado.
  * Todos los inputs de autenticación requieren validación en tiempo real:
    * Formato correcto (ej. campos no vacíos, formato de texto).
    * Validación contra Supabase al enviar (credenciales correctas, PIN válido).
  * Cualquier input no validado devolvera el mensaje `Credenciales incorrectas` sin especificar el motivo exacto para evitar pistas a posibles atacantes.

* **estado_1_terminal_desbloqueado**
  * Requiere cookie segura válida (estándar o de emergencia).
  * Layout completo: black_column + header con ticker + home_area amarilla.
  * El home_area muestra `visual_info_home` por defecto.

  * **Acceso por cookie de emergencia (rol invitado):**
    * Tanto `galleta_pequeña` (temporal) como `galleta` (permanente) llevan
      directamente a estado_1 con rol `invitado`.
    * El rol `invitado` solo tiene acceso visible al icono de Check-in
      en la black_column. El resto de núcleos están ocultos.
    * No se muestra ningún ID_nombre en checkin_on hasta que alguien
      haga check-in manualmente.
    * Una vez que un ID_nombre hace check-in, ese usuario opera con
      sus permisos propios (no los del rol invitado).

  * **visual_info_home** *(contenido del home_area en estado_1)*

    * **Panel de personal (siempre visible si hay checkin_on):**
      * Por cada ID_nombre con `checkin_on` en este terminal:
        * `ID_nombre` + estado `checkin_on`
        * `agregarCarry o pilot`: icono `+` (`ti-circle-plus`) para asignar ese ID_nombre a un vehículo activo.
        * `Telefono`

    * **Panel de vehículo (visible al activar ID_vehiculo):**
      * `Matricula` + `ID_vehiculo`
      * `Pilot`: `ID_nombre`
      * `Carry`: `ID_nombre` (lista si hay varios).
      * Iconos pequeños a la derecha de cada ID_nombre para modificar su rol:
        * intercambio de roles: icono `swap` (`ti-arrows-swap`) para cambiar entre Pilot y Carry.
          * `quitarCarry o pilot`: icono `-` (`ti-circle-plus`) para quitar personal del vehículo.
      * Estado actual del vehículo (estacionado, en espera, activado,
        ruta, desactivado, averiado).

    * **visual_info_drp** *(visible si hay un DRP activo asignado)*
      * Info: `nombre_drp`, `fecha`, `hora`, `ubicación`.
      * Desplegable `operativa_drp`: al seleccionar un doc, abre modal
        superpuesto sobre el home_area.
      * Icono `+` (`ti-circle-plus`): añadir asistencia a Doc-1.
      * Icono `puerta` (`ti-door-enter`): entrar a `modulo_filiacion`
        (solo visible si el módulo está creado).
      * Icono `ambulancia` (`ti-ambulance`):
        * Gris: vehículo desactivado en el DRP.
        * Amarillo con fondo negro: vehículo activo en el DRP.

    * **bandeja_entrada_vehiculo**
      * Visible desde que se selecciona un ID_vehiculo.
      * Icono `ti-mail`: se ilumina en amarillo si hay mensajes sin leer.
      * Al pulsar: abre modal superpuesto con los mensajes.

    * **bandeja_entrada_personal**
      * Un icono por cada ID_nombre con `checkin_on` en este terminal.
      * Icono `ti-mail` con las iniciales del ID_nombre en tamaño mínimo.
      * Se ilumina en amarillo si hay mensajes sin leer.
      * Al pulsar: abre modal superpuesto con los mensajes de ese ID_nombre.

## black_column

* Barra lateral permanente de 52px de ancho, fondo `#111111`, junto con el header.
* `Logo.svg` (`#F5C518`) en la parte superior.
* Todos los iconos son Tabler Icons (outline). Sin etiqueta visible. Tooltip al hover con el nombre del módulo.
* Indicador de ítem activo: barra vertical amarilla de 3px en el borde izquierdo del botón.

* **Comportamiento de navegación (acordeón):**
  * Al pulsar un núcleo con subgrupo, sus iconos secundarios se despliegan hacia abajo empujando los demás.
  * Al pulsar otro núcleo con subgrupo, el anterior se contrae y el nuevo se expande.
  * Al pulsar el mismo núcleo activo, se contrae.
  * Al pulsar un subicono, su contenido o doc se abre en el `home_area` (zona amarilla).
  * El icono Home siempre lleva al estado raíz limpio (contrae todo, limpia el home).

* **Botón de atrás:**
  * Ubicado en el extremo derecho del header negro.
  * Aparece únicamente cuando hay historial de navegación (submenú abierto o doc abierto en home).
  * Funciones: cerrar un doc abierto en el home y volver al estado anterior, o colapsar el submenú activo.
  * Icono: `ti-arrow-left`.

* **Iconos de navegación (orden de arriba a abajo):**

  * `Home` — `ti-home`
    * Sin subgrupo. Lleva al estado_1 home por defecto.

  * `Check-in` — `ti-login`
    * Sin subgrupo. Abre `terminal_check` directamente en el home_area.

  * `Operativa rutinaria` — `ti-ambulance`
    * Subgrupo:
      * Doc-10 Envío material — `ti-file-text`
      * Doc-6 Gasto material — `ti-package`
      * Doc-8 Parte de trabajo — `ti-clipboard-list`
      * `sep`
      * Doc-2 Informe asistencial — `ti-heart-rate-monitor`
      * Doc-11 Aviso urgente — `ti-alert-triangle`
      * Repostar combustible — `ti-gas-station`

  * `DRP` — `ti-map-pin`
    * Subgrupo:
      * Operativa DRP — `ti-activity`
      * Selector DRP — `ti-selector`
      * Resumen DRP — `ti-chart-bar` *RBAC: `gerencia`, `coordinación` (icono atenuado para otros roles)*
      * Logística DRP — `ti-package`
      * Crear DRP — `ti-circle-plus`
      * Estados DRP — `ti-toggle-left`

  * `Logística y almacén` — `ti-building-warehouse`
    * Subgrupo:
      * Inventario maestro — `ti-list-details`
      * Doc-9 Entrada almacén — `ti-truck-delivery`
      * Doc-10 Envío material — `ti-transfer`
      * Descuadres — `ti-alert-circle`

  * `Flota y taller` — `ti-car`
    * Subgrupo:
      * Incidencias — `ti-tool`
      * Doc-7 Informe avería — `ti-engine`
      * Metadata vehículo (ITV/docs) — `ti-id`

  * `Coordinación y seguridad` — `ti-shield-lock`
    * Subgrupo:
      * Token de emergencia — `ti-cookie`
      * RBAC roles — `ti-users`
      * Bandeja coordinación — `ti-inbox`

  * `Gestión y RRHH` — `ti-id-badge`
    * Subgrupo:
      * Fichas empleados — `ti-user-circle`
      * Gestión de turnos — `ti-calendar-event`
      * Tablón central — `ti-news`
      * Doc-12 Solicitud vacaciones — `ti-beach`

  * `Tablon de anuncios` — `ti-speakerphone`
    * Sin subgrupo. Lleva a un home_area alternativo con el tablón central visible por defecto.

## terminal_check

* Componente de autenticación reutilizado en dos contextos:
  * **estado_0:** ocupa pantalla completa, centrado, sin chrome.
  * **estado_1 (black_column → Check-in):** modal superpuesto sobre
    el home_area. La cookie ya está validada, no se reverifica.

* **Regla estricta:** siempre requiere conexión a internet activa.

* **check_in**
  * Campos: `ID_nombre` (usuario) + `password`.
  * Valida credenciales contra Supabase.
  * Si el terminal no tiene cookie segura → modal de error
    "Credenciales incorrectas" antes de mostrar el formulario.
  * Si las credenciales son correctas → agrega estado `checkin_on`
    a ID_nombre y registra hora de entrada.
  * Si el terminal llegó al estado_1 por cookie de emergencia
    (rol invitado), el check-in eleva los permisos al rol propio
    del ID_nombre autenticado.

  * **Truco para pins especiales:**
    * Campo usuario: introducir `PIN`.
    * Campo password: introducir los 6 dígitos del pin especial.
    * El sistema detecta el patrón y enruta a `autenticacion_pin_especial`
      en lugar del flujo estándar.

  * **autenticacion_pin_especial — Estados:**
    * `MATCH`: el PIN existe y `NOW() < expires_at`. Retorna UUID,
      inyecta cookie segura en el terminal y marca el PIN como consumido
      (`UPDATE`). Terminal pasa a estado_1 con rol `invitado`.
    * `NOT_FOUND`: el PIN no existe. Error "Credenciales incorrectas".
      *(Posible fuerza bruta o error tipográfico — auditable.)*
    * `EXPIRED`: el PIN existe pero `NOW() > expires_at`.
      Error "Credenciales incorrectas".
* **check_out**
  * Quita estado `checkin_on` al ID_nombre seleccionado.
  * La sesión de ese ID_nombre se archiva con hora de salida.
  * Si ese ID_nombre tenía estado `pilot` activo → ID_vehiculo
    pasa a estado `en_espera`.
  * Si quedan otros ID_nombre con `checkin_on` → sesión del
    terminal continúa en estado_1.
  * Si es el último ID_nombre con `checkin_on` → terminal
    regresa a `estado_0_terminal_bloqueado`.
* **Rol invitado**
  * Asignado automáticamente cuando el terminal accede a estado_1
    mediante cookie de emergencia sin check-in previo.
  * Permisos: únicamente acceso al formulario `terminal_check`
    (icono Check-in en black_column).
  * Sin acceso a ningún núcleo operativo.
  * Sin requisito de ID_nombre en checkin_on para mantener estado_1.
  * Objetivo: garantizar operatividad básica del terminal ante
    caídas de internet o fallos de base de datos durante el turno.

## nucleo_operativa_rutinaria

* RBAC: `tes`, `logistica`, `flota`, `coordinación`, `gerencia`.

* **selector_vehiculos**
  * Muestra todos los vehículos del sistema con su estado actual visible.
  * Cualquier rol autorizado puede cambiar el estado de cualquier vehículo
    desde cualquier terminal.
  * Formato: lista o desplegable con `ID_vehiculo` + `Matricula` + `estado`.
  * Si el vehículo tiene estado `Averiado`, se muestra como advertencia
    visible en el selector pero no bloquea la activación.

* **selector_estados_ID_vehiculo**
  * Estados disponibles:
    * `Activado`: operativo, con km de inicio registrados y personal emparejado.
    * `Desactivado`: fuera de servicio temporal.
    * `Averiado`: fallo reportado vía Doc-7. Solo informativo, no bloquea
      la activación. Visible como advertencia en el selector.

  * **Flujo de activación:**
    1. Al seleccionar `Activado` → modal de confirmación:
       "¿Activar vehículo `ID_vehiculo`?" — Sí | No.
    2. Si confirmado → solicita `km_inicio`.
    3. El sistema muestra los ID_nombre con `checkin_on` en ese terminal
       y solicita asignar roles manualmente:
       * `Pilot` → cualquier ID_nombre (no restringido a rol TES,
         ya que quads, VIR y vehículos de asistencia móvil pueden
         tener pilotos de otros perfiles).
       * `Carry` → resto de ID_nombre emparejados.
       * La asignación es manual — el sistema no sugiere automáticamente.
    4. La activación queda registrada con timestamp en Doc-8.

  * **Funciones operativas** (selector visible en home_area mientras
    el vehículo está activado — actualizable en cualquier momento):
    * Marcadas desde RRHH como referencia inicial:
      `Programado`, `Dispositivo`, `Traslado`, `Guardia urgencias`, `DRP`.
    * Gestionadas por el usuario en ruta:
      * `Estacionado`: vehículo estacionado fuera de base, sin actividad.
        Captura coordenadas GPS automáticamente y las sube a Supabase.
      * `En espera`: emparejado con personal, pendiente de función.
      * `Ruta`: en trayecto hacia un servicio o de vuelta a base.
        Captura coordenadas GPS al activar y al desactivar el estado.
    * Todos los cambios de función generan entrada de timestamp
      inicio/fin en Doc-8.
    * **Regla de coordenadas:** si el GPS no está disponible al
      capturar, el sistema usa la última ubicación conocida, el
      último evento con ubicación registrada, o cualquier dato
      de localización disponible más reciente.

  * **Flujo de desactivación:**
    1. Al seleccionar `Desactivado` → modal de confirmación.
    2. Si confirmado → solicita `km_fin`.
    3. Elimina los estados `Pilot` y `Carry` de todos los
       ID_nombre emparejados.
    4. ID_vehiculo pasa a `Desactivado`.
    5. Timestamp registrado para cierre de Doc-8.

* **Mantenimiento**
  * `Repostar_combustible`
    * Campos: `km_marcador`, `litros`.
    * Toggle ubicación:
      * `Gasolinera` (por defecto): solicita además `euros`.
      * `Base`: sin campo de euros.
    * Guardar | Cancelar.
    * Se registra en Doc-8 automáticamente con timestamp.

  * `Repostar_AdBlue`
    * Toggle: ¿Ha repuesto AdBlue?
      * Si activo: solicita `km_marcador`.
      * No requiere campo de litros (repostaje completo desde bidón fijo).
    * Guardar | Cancelar.
    * Se registra en Doc-8 automáticamente con timestamp.

* **Documentos** *(referencia — se generan o rellenan automáticamente
  con los eventos de la app y timestamps)*
  * Automáticos: Doc-8.
  * Operativos manuales: Doc-6, Doc-10.
  * Asistenciales: Doc-2, Doc-3, Doc-4, Doc-5.
  * Avisos: Doc-11.

## nucleo_drp

* RBAC: `tes`, `due`, `médico`, `coordinación`, `gerencia`, `logística`.

* **visor_drp**
  * Muestra en el home_area todos los DRP en estado
    `En espera`, `En preparación` o `En curso`.
  * Por cada DRP: tarjeta con `nombre_drp`, `fecha`,
    `hora`, `ubicación` y badge de estado.
  * Al seleccionar un DRP se expande mostrando todas las
    dotaciones asignadas a ese DRP de forma global
    (independientemente del terminal de origen):
    * Por dotación: vehículo + ID_nombre emparejados juntos.
    * Personal a pie: ID_nombre sin vehículo asignado.
    * Una dotación es un grupo operativo (ej. ambulancia
      con TES y DUE = dotación SVAE).

  * **Entrar al DRP:**
    * Opción A — Entrar con vehículo: une el ID_vehiculo
      activo + todos los ID_nombre emparejados en ese momento.
      Nada entra de forma individual por esta vía.
    * Opción B — Entrar a pie: une únicamente el
      ID_nombre seleccionado, sin vehículo.
    * Modal de confirmación en ambos casos mostrando
      exactamente quién va a entrar.
    * Nadie entra automáticamente al DRP bajo ninguna
      circunstancia — siempre acción manual explícita.
    * Registra timestamp de entrada por cada elemento
      que entra.

  * **Salir del DRP:**
    * Opción A — Salir con vehículo: salen el ID_vehiculo
      y todos los ID_nombre emparejados en ese momento.
    * Opción B — Salir individualmente: sale únicamente
      el ID_nombre seleccionado.
    * Modal de confirmación en ambos casos.
    * Registra timestamp de salida por cada elemento
      que sale.

* **selector_estados_drp** *(RBAC modificar: `coordinación`, `gerencia`)*
  * `En espera`: estado por defecto al crear el DRP.
  * `En preparación`: se activa automáticamente 1h antes
    de la hora del DRP (job programado en Supabase) o
    cuando la primera dotación se une, lo que ocurra primero.
  * `En curso`:
    * Activación manual por `coordinación` o `gerencia`.
    * Si se activa antes de la hora de inicio, el sistema
      pregunta: `Cuenta atrás` | `Marcar hora de inicio actual`.
    * Si a la hora de inicio programada el DRP no ha sido
      activado manualmente, el sistema envía aviso a todos
      los terminales unidos al DRP:
      "Aviso: el DRP no ha sido activado. Contactar con coordinación."
  * `Finalizado`: transición manual. Ver flujo en `resumen_drp`.
  * `Archivado`: automático 48h después de `Finalizado`.
  * Cambiar el estado del DRP no afecta a las dotaciones
    ni a los recursos asignados — es solo un indicador de
    fase operativa.

* **operativa_drp**
  * Documentos disponibles durante el DRP (accesibles desde
    home_area como modales superpuestos):
    * Doc-2, Doc-3, Doc-4, Doc-5, Doc-11.
    * Al seleccionar un documento se abre el formulario
      correspondiente para cumplimentar y guardar.
    * Cada documento se guarda individualmente con su
      propio timestamp.
    * Se pueden abrir y rellenar varios documentos en
      paralelo durante el DRP.

  * **Añadir asistencia al Doc-1:**
    * Abre modal ligero con los campos de `p_filiacion`:
      * `Nombre y apellidos`, `Edad`, `DNI/NIE/Pasaporte`,
        `Ciudad de residencia`, `Sexo`, `Teléfono`.
      * Si menor: Datos Padre/Madre/Tutor
        (`Nombre y apellidos`, `DNI/NIE/Pasaporte`).
    * Campos adicionales del modal:
      * `Motivo de la asistencia` (texto libre).
      * `Resolución` (texto libre).
    * El modal llama al repositorio `p_filiacion` como
      fuente de verdad para los campos — cualquier cambio
      en el repositorio se refleja automáticamente aquí.
    * Al guardar: entrada append-only en Doc-1 con
      timestamp e ID_nombre del registrador.
    * Las entradas ya guardadas no pueden editarse ni
      eliminarse (trazabilidad completa).

* **logistica_drp**
  * Vista del stock de los inventory_locations asignados
    al DRP activo (vehículos, backpacks, subinventario DRP).
  * Muestra por ítem: `nombre`, `categoría`,
    `stock_real`, `stock_objetivo`.

  * **bandeja_entrada_logistica_drp**
    * Recibe notificaciones de Doc-10 cuyo destino sea:
      * Subinventario DRP (`ID_DRP` asignado al DRP activo).
      * Backpack (`BKP`) asignado al DRP activo.
    * Icono `ti-mail`: se ilumina en amarillo si hay
      envíos pendientes de confirmar.
    * Al pulsar: abre modal superpuesto con el listado
      de Doc-10 pendientes de confirmación.
    * Por cada Doc-10 pendiente:
      * Detalle del envío: origen, ítems, cantidades,
        número de lote.
      * Acción `Confirmar recepción`:
        * El usuario revisa ítem a ítem la cantidad
          recibida.
        * Si todo coincide → estado `Completado`.
          El stock se suma al location de destino.
        * Si hay discrepancia → el usuario marca la
          cantidad real recibida. El sistema genera
          automáticamente un `Descuadre_Pendiente_Revision`
          dirigido a la bandeja de logística para
          resolución manual.
    * También recibe:
      * Alertas de stock mínimo superado en cualquier
        location del DRP activo.
      * Doc-6 registrados durante el DRP (solo lectura,
        para seguimiento del gasto en tiempo real).

  * Desde esta vista se puede registrar un Doc-6
    (Gasto de material) directamente. El usuario
    selecciona el origen del gasto:
    * Vehículo asignado al DRP.
    * Backpack asignado al DRP.
    * Subinventario DRP (ID_DRP asignado).

* **resumen_drp** *(RBAC: `gerencia`, `coordinación`)*
  * Abre modal con visión global del DRP:
    * Icono ambulancia amarillo + `nombre` + `categoría`
      por cada ID_vehiculo en el DRP.
    * Listado de ID_nombre emparejados por dotación.
    * Personal a pie listado por separado.
    * Módulos activos (PSA, filiación).
  * Icono de informe: abre vista completa con todos
    los datos del DRP.

  * **Editar recursos:**
    * Modal de edición con todos los ID_vehiculo,
      ID_nombre, ID_backpack y módulos del DRP.

  * **Finalizar DRP:**
    * Nunca finaliza automáticamente.
    * Las dotaciones que salieron individualmente vía
      `visor_drp` ya tienen su timestamp de salida registrado.
    * Si quedan dotaciones dentro al finalizar, se les
      asigna automáticamente como timestamp de salida
      la hora de finalización del DRP.
    * Si el DRP finaliza antes de la hora programada o
      queda sin dotaciones activas, se envía aviso a
      coordinación: "Aviso: el DRP ha finalizado antes
      de la hora programada."
    * El DRP pasa a estado `Finalizado`. Ya no se pueden
      registrar asistencias ni modificar recursos.
    * Permanece visible en el selector y en home_area
      para consulta con badge `Finalizado`, sin opción
      de entrar.

  * **Cancelar DRP:**
    * El DRP desaparece completamente del sistema.
    * Si el DRP tiene asistencias registradas en Doc-1,
      la opción Cancelar está bloqueada — solo se puede
      Finalizar.

  * **Archivar DRP:**
    * Fuerza sincronización inmediata con Supabase.
    * Modal pregunta si guardar copia de seguridad en PDF.
    * El PDF incluye todos los datos y asistencias
      registradas hasta ese momento.
    * El archivado total ocurre automáticamente 48h
      después de `Finalizado`.

  * Acciones: Editar recursos | Cancelar DRP
    | Finalizar | Archivar DRP.

* **crear_drp** *(RBAC: `coordinación`, `gerencia`)*
  * Campos generales:
    * `nombre_drp`, `fecha`, `hora`, `ubicación`.
  * `agregar_dotacion_vehiculo` (repetible):
    * `ID_vehiculo` — campo de texto.
    * `ID_nombre` — texto predictivo (los datos del
      ID_nombre se autocompletan desde Supabase al
      seleccionar).
    * `ubicación`:
      * Toggle `IDEM` (misma ubicación que el DRP).
      * O campo de texto libre.
    * Agregar | Cancelar.
  * `agregar_dotacion_terrestre` (repetible):
    * `ID_nombre` — texto predictivo (autocomplete
      desde Supabase).
    * `ubicación`:
      * Toggle `IDEM`.
      * O campo de texto libre.
    * Agregar | Cancelar.
  * `añadir_ID_backpack` — selector.
  * Crear DRP | Cancelar.

* **Documentos** *(referencia — autocompletan con
  formularios y timestamps)*
  * Doc-1, Doc-2, Doc-3, Doc-4, Doc-5, Doc-6, Doc-11.

---

### modulos_especiales

* RBAC: `gerencia`, `coordinación`.

* **modulo_psa** *(se adhiere a un DRP)*
  * Seleccionar DRP al que se adhiere — desplegable
    con DRPs en estado activo.
  * Seleccionar subinventario asignado:
    * El inventario del PSA es un `inventory_location`
      de tipo `Subinventario` (ej. `ID_DRP1 — Feria Jerez`)
      preparado previamente por logística antes del evento.
    * Al crear el DRP/PSA se selecciona el ID_DRP
      correspondiente del desplegable de subinventarios
      disponibles.
  * Durante el DRP/PSA:
    * El material se va descontando vía Doc-6 conforme
      se consume.
    * Si se recibe reposición, se registra vía Doc-10.
  * Al cerrar el módulo PSA o al finalizar el DRP
    (que cierra todos los módulos):
    * El subinventario `ID_DRP` pasa a estado
      `En_Transito` automáticamente.
    * Logística debe verificar y reconciliar el stock
      físico restante contra el sistema.
    * Tras la verificación, el `ID_DRP` pasa a estado
      `Operativo` y queda disponible para ser asignado
      a un nuevo DRP/PSA.
  * `agregar_dotacion_terrestre` (repetible):
    * `ID_nombre` — texto predictivo (autocomplete
      desde Supabase).
    * `ubicación`:
      * Toggle `IDEM` al DRP.
      * O campo de texto libre.
    * Agregar | Cancelar.
  * Crear PSA | Cancelar.

* **modulo_filiacion** *(se adhiere a un DRP)*
  * Seleccionar DRP al que se adhiere — desplegable
    con DRPs en estado activo.
  * Al entrar, seleccionar perfil de trabajo:

  * **perfil_admision:**
    1. Acción INSERT — nuevo registro de paciente.
    2. Cumplimentar `p_filiacion`:
       * `Nombre y apellidos`, `Edad`, `DNI/NIE/Pasaporte`,
         `Ciudad de residencia`, `Sexo`, `Teléfono`.
       * Si menor: Datos Padre/Madre/Tutor
         (`Nombre y apellidos`, `DNI/NIE/Pasaporte`).
    3. Asignar estado `en_espera`.
    4. Asignar `orden` de atención.

  * **perfil_boxes** — seleccionar número de box (1–10):
    1. Monitor de pacientes en espera ordenados por `orden`.
    2. Acción UPDATE — registro existente.
    3. Al abrir un paciente → asignar estado `en_consulta`.
       * Acceso a Doc-2 y Doc-3 desde el box.
    4. Al cerrar la atención → asignar estado `archivado`.
    5. Todas las asistencias quedan registradas en el
       Doc-1 del DRP vinculado.

  * Añadir filiación a DRP | Cancelar.

## nucleo_logistica_y_almacen

* RBAC: `gerencia`, `logistica`.

* **inventario_maestro**
  * Vista global de todo el stock del sistema.
  * `auditoria_inventario`: historial completo de movimientos
    con filtros por fecha, ítem, ubicación y usuario.
  * `ultimos_movimientos`: los N movimientos más recientes
    a través de todos los inventory_locations.

* **inventory_locations**
  * Cada location tiene su propio stock real por ítem,
    organizado en subgrupos según su plantilla de tipo.
  * Catálogo de ítems: único y compartido (245 ítems).
    Todos los locations pueden tener cualquier ítem del catálogo.

  * Tipos y vehículos registrados:

    | Tipo            | IDs                                              |
    |-----------------|--------------------------------------------------|
    | A1              | 301, 302                                         |
    | A2              | 401–408                                          |
    | B               | 201–208                                          |
    | C               | 101–118                                          |
    | Unidad_movil    | UM1, UM2                                         |
    | Logistica       | LOG1                                             |
    | VIR             | VIR1, VIR2                                       |
    | Quad            | QAD1, QAD2                                       |
    | Backpack        | BKP1–BKP8                                        |
    | Subinventario   | ID_DRP1–ID_DRP8 *(inventarios de DRP/PSA)*        |
    | Almacen         | ID_almacen *(stock central)*                     |

  * **Estados de los Subinventarios (ID_DRP):**
    * `Operativo`: disponible para ser asignado a un nuevo DRP o PSA.
    * `Asignado`: vinculado a un DRP o PSA activo. Logística puede
      ver de un vistazo qué subinventarios están libres y cuáles en uso.
    * `En_Transito`: el DRP o PSA ha finalizado. El stock físico
      pendiente de verificación por logística. No asignable hasta
      completar la reconciliación.
    * Flujo: `Operativo` → `Asignado` → `En_Transito` → `Operativo`.

  * **Plantillas de subgrupos por tipo:**

    * `A1 y A2` (comparten plantilla):
      * Cabina conducción, Cabina asistencial, Armario inm-mov,
        Ampulario, Vía aérea, Circulatorio, Curas y sutura,
        Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `B y C` (comparten plantilla):
      * Cabina conducción, Cabina asistencial, Armario inm-mov,
        Ampulario, Vía aérea, Circulatorio, Curas y sutura,
        Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `VIR` (plantilla propia):
      * Cabina conducción, Ampulario,
        Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `Unidad_movil` y `Logistica` (plantilla propia):
      * Subgrupos a definir.

    * `Quad` (plantilla propia):
      * Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `Backpack` (plantilla propia):
      * Antisépticos, Curas y sutura, Vía venosa periférica,
        Vendajes y trauma, Diagnóstico, Vía aérea.

  * Campos por ítem en cada location:
    * `ID_item`, `stock_real`, `stock_objetivo` *(umbrales de aviso
      configurables por ítem o grupo — notificación automática a
      logística cuando se supere el umbral mínimo)*.

  * **Plantillas de subgrupos por tipo:**

    * `A1 y A2` (comparten plantilla):
      * Cabina conducción, Cabina asistencial, Armario inm-mov,
        Ampulario, Vía aérea, Circulatorio, Curas y sutura,
        Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `B y C` (comparten plantilla):
      * Cabina conducción, Cabina asistencial, Armario inm-mov,
        Ampulario, Vía aérea, Circulatorio, Curas y sutura,
        Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `VIR` (plantilla propia):
      * Cabina conducción, Ampulario,
        Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `Unidad_movil` y `Logistica` (plantilla propia):
      * Subgrupos a definir.

    * `Quad` (plantilla propia):
      * Mochila Roja, Mochila Azul, Mochila Amarilla.

    * `Backpack` (plantilla propia):
      * Antisépticos, Curas y sutura, Vía venosa periférica,
        Vendajes y trauma, Diagnóstico, Vía aérea.

  * Campos por ítem en cada location:
    * `ID_item`, `stock_real`, `stock_objetivo` *(a implementar:
      umbrales de aviso configurables por ítem o grupo,
      notificación automática a logística cuando se supere)*.

* **descuadres_inventario**
  * Generados automáticamente cuando la cantidad física
    no coincide con el sistema (Doc-10 receptor no confirma).
  * Campos: `ID_item`, `categoria`, `nombre`,
    `especificación`, `cantidad`, `ID_origen`.
  * Visibles en bandeja de logística para resolución manual.

* **inventario_en_transito**
  * Material enviado vía Doc-10 pendiente de confirmación
    por el receptor.
  * Restado del origen, aún no sumado al destino.
  * Campos: `ID_item`, `categoria`, `nombre`,
    `especificación`, `cantidad`, `ID_origen`, `ID_destino`.

* **catalogo_items** *(referencia — 245 ítems)*
  * Campos por ítem: `ID_item`, `categoria`, `nombre`,
    `especificación`.
  * Catálogo fijo y compartido por todos los inventory_locations.
  * Categorías: Agujas, Antisépticos, Apósito, Ayudas técnicas,
    Catéter, Dispositivo supraglótico, Electromedicina,
    Equipamiento no sanitario, Equipamiento sanitario, Gasas,
    Inmovilización y movilización, Jeringas, Lencería,
    Mascarillas, Material intubación, Medicación parenteral,
    Oxigenoterapia, Set de emergencias, Sondas, Sueroterapia,
    Sutura, Tópicos, Vendas, Vía enteral/oral,
    Vía venosa periférica.

* **bandeja_entrada_logistica**
  * Recibe Doc-6 (gastos de material) y Doc-11 (avisos urgentes).
  * Punto de entrada para descuadres y alertas de stock.

* **operativa_logistica**
  * Documentos: Doc-9 (entrada de almacén), Doc-10 (envío
    de material).
  * *(Referencia — se autocompletan con formularios y timestamps.)*

## nucleo_flota_y_taller

* RBAC: `gerencia`, `flota`.
* Cualquier rol autorizado puede crear una nueva incidencia (Doc-7)
  desde su terminal. Solo `flota` y `gerencia` pueden anclar,
  editar, archivar y modificar estado.

* **incidencias_ancladas**
  * Lista de incidencias marcadas como prioritarias.
  * Cada fila muestra resumen — clic abre modal superpuesto
    con el informe completo.
  * Acciones: Desanclar | Editar | Archivar | Modificar estado.

* **ultimas_incidencias**
  * Lista de las 10 incidencias más recientes.
  * Cada fila muestra resumen — clic abre modal superpuesto.
  * Campo de búsqueda/filtro por texto.
  * Acciones: Anclar | Editar | Archivar | Modificar estado
    | Añadir nueva incidencia.

* **Flujo Doc-7 criticidad Grave/Crítica:**
  * Al guardar un Doc-7 con nivel Grave o Crítica:
    1. El vehículo afectado cambia automáticamente a estado
       `Averiado` en el selector (informativo, no bloquea
       activación).
    2. Se genera un Doc-11 automático dirigido a `flota`
       y `coordinación` con los datos del Doc-7.

* **bandeja_entrada_flota**
  * Recibe Doc-7 (averías) y Doc-11 (avisos urgentes).

* **vehiculos_metadata**
  * Selector de vehículo — muestra todos los vehículos
    del sistema.
  * Metadata introducida manualmente por `flota` o `gerencia`:
    * `ITV` — fecha de vencimiento.
    * `ITS` — fecha de vencimiento.
    * `Seguro` — fecha de vencimiento.
    * `N_telefono` / `PIN` / `PUK` del dispositivo embarcado.
  * Botón `Editar metadata` — abre campos en modo edición.

* **Documentos** *(referencia — se autocompletan con formularios
  y timestamps)*
  * Doc-7 (informe de avería).

## nucleo_coordinacion_y_seguridad

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
    2. Crea un PIN de 6 dígitos con validez de 10 minutos.
    3. La BBDD reconoce el PIN y al introducirse en cualquier
       terminal inyecta una cookie segura permanente
       (hasta eliminación manual en Supabase).
    4. El terminal accede a `estado_1` con rol `invitado`.
    5. El checkout no destruye la cookie — el terminal
       queda registrado como oficial de forma indefinida.
    * UI: botón redondo con texto `Pedir una galleta`.

  * Ambos tokens se registran en tabla `sesiones_emergencia`
    con `tipo`, `expires_at`, `id_terminal` y `consumido_at`.
    Edge Function purga automáticamente los expirados.

* **rbac**
  * Gestión completa de usuarios y permisos del sistema.
  * Acciones disponibles para `gerencia` y `coordinación`:
    * Crear nuevo usuario.
    * Asignar o cambiar rol a usuario existente.
    * Cambiar contraseña de usuario.
    * Desactivar cuenta de usuario.
  * Roles del sistema:
    * `gerencia`
    * `coordinación`
    * `logística`
    * `flota`
    * `tes`
    * `due`
    * `médico`
    * `rrhh`
    * `mantenimiento`
    * `responsable_equipo`
    * `invitado` *(asignado automáticamente por cookie
      de emergencia, sin gestión manual)*

* **bandeja_entrada_coordinacion**
  * Recibe Doc-11 dirigidos a coordinación y otros mensajes
    internos del sistema.
  * Tipos de mensajes entrantes:
    * Doc-11 con destino `coordinación` (avisos urgentes
      y alertas críticas desde cualquier terminal).
    * Mensajes internos entre roles *(a definir en detalle
      cuando se implemente el sistema de mensajería)*.
  * Acuse de recibo: registra quién y cuándo lee cada mensaje.
  * Estados: `Emitida_Pendiente` → `En_Proceso_Lectura`
    → `Solucionada_Archivada`.

## nucleo_gestion_y_rrhh

* RBAC: `gerencia`, `rrhh`.

* **tablon_central**
  * Panel de contenido corporativo visible para todos los roles.
  * Secciones:
    * `normativas`: documentos normativos de la empresa.
    * `protocolos`: protocolos de actuación actualizados.
    * `avisos_corporativos`: comunicados internos de gerencia/rrhh.
  * Acciones (`gerencia`, `rrhh`): Crear | Editar | Archivar.

* **marquesina**
  * Gestiona el texto del ticker del header negro.
  * Campo de texto libre editable.
  * Velocidad de desplazamiento ajustable. (0 a 100)
  * Acciones (`gerencia`, `rrhh`, `coordinación`):
    Guardar | Limpiar.
  * El texto guardado se refleja en tiempo real en el
    header de todos los terminales activos.

* **fichas_empleados**
  * Una ficha por ID_nombre del sistema.
  * Campos:
    * `ID_nombre`
    * `Telefono`
    * `Ciudad_residencia`
    * `categoria_profesional`
    * `fecha_contratación`
    * `Horas_contrato`
    * `Disponibilidad`
    * `Documentacion_y_certificados`
  * Acciones: Nueva ficha | Descargar | Imprimir | Editar | Archivar | Eliminar.
  * Categorías profesionales:
    * `TES`, `DUE`, `Médico`, `Gestión`,
      `Logística y Almacén`, `Flota y Vehículos`,
      `Mantenimiento`.

* **gestion_de_turnos**

  * **servicios** *(vista principal)*
    * `Nuevo_servicio`:
      * `ID_nombre`, `...` (personal asignado)
      * `ID_vehiculo`, `...` (vehículo asignado, opcional)
      * Vehículos disponibles como fichas móviles en la parte inferior se muestran dos timers debajo de cada vehiculo (Inicio y fin) para hacer mas dinamica la inyección de servicios.
        * Al seleccionar un vehículo, se asigna automáticamente al servicio y se muestra en el calendario.
        * Al deseleccionar, se elimina la asignación.
      * `Tipo de servicio`
      * `Fecha, hora de inicio y fin` (selector de fecha y hora)
      * `Duración estimada`
      * `Color del bloque`
      * `Descripción` (campo de texto libre para detalles adicionales)
      * `Ubicación` (campo de texto libre o selector de ubicación)
      * `Contacto` (campo de texto libre para teléfono)
      * Durante la edición, el sistema muestra en tiempo real cómo quedaría el bloque en el calendario con los cambios aplicados, incluso antes de guardar.
      * Botones del modal: Guardar cambios | Cancelar.
    * Visor general de servicios agendados.
      * Pintan lineas a lo largo, mas saturación = mas grosor.
      * Vista horizontal de 24h por día, 7 dias por semana, todas las semanas que contengan el mes.
      * Navegación por días, semana, mes adyacentes con flechas laterales
      * Color por bloque: seleccionable manualmente. Por defecto blanco.
      * Desde 00:00 pasa al día siguiente.
      * Botones: <| | Hoy | Semana actual | Mes actual | |>
      * Filtros: <| | Persona | Vehículo asignado | Servicio | |>
        * Muestra cuadro de entrada de texto para filtrar por el campo seleccionado, con texto predictivo.
    * Servicios disponibles:
      * `Programado`, `Dispositivo`, `Traslado`, `Guardia urgencias`, `DRP`, `Privado`, `Simulacro`, `Formación`.
    * Visor independiente, se abre al hacer click en un bloque de servicio específico.
      * Botones_visor_independiente: Editar servicio | Eliminar servicio | Duplicar | Cerrar visor.
      * Editar servicio: Abre modal con campos de`nuevo_servicio` editables.
      * `Duplicar`:
        * Al seleccionar duplicar, el sistema pregunta si se desea duplicar en el mismo día o en otro día.
        * Si se selecciona el mismo día, se muestra un selector de hora para elegir la nueva hora de inicio del servicio duplicado.
        * Si se selecciona otro día, se muestra un calendario para elegir la nueva fecha y un selector de hora para la nueva hora de inicio del servicio duplicado.
      * Nuevo Servicio | Editar servicio | Eliminar servicio.
  * **mantenimiento**
    * `cuadrantes`: gestión de cuadrantes de personal.
      * Vista de cuadrante mensual con flechas laterales con asignación de turnos.
      * Campos: `ID_nombre`, `DíaMes`, `DíaSemana`,
      * Asignación de turnos: `T` Trabaja, `L` Libre, `V` Vacaciones, `B` Baja, `C` Compensación,
      * Acciones: Asignar turno | Editar asignación | Eliminar asignación.
      * Patrón de asignación:
        * Se pueden crear patrones de asignación predefinidos (por ejemplo, 4 días de trabajo seguidos por 2 días libres) que se pueden aplicar automáticamente a un rango de fechas para agilizar la planificación.
        * Al aplicar un patrón, el sistema muestra una vista previa de cómo quedaría el cuadrante antes de confirmar los cambios.
        * Los patrones pueden ser personalizados por el usuario y guardados como A, B, C... y agregar trabajadores directamente.
        * El usuario puede crear grupos de empleados de un numero indeterminado, y posteriormente aplicar un patrón de asignación a ese grupo específico para agilizar la planificación de turnos.
        Una vez aplicados los turnos, se pueden modificar desde la vista mensual de cuadrantes para ajustes puntuales, vacaciones, bajas o cambios de turno.
        * el sistema permite prolongar el patrón de asignación aplicado a un grupo específico de empleados de forma indefinida, lo que facilita la planificación a largo plazo sin necesidad de reaplicar el patrón cada mes.
    * `vacaciones`:
      * Doc-12 visible en `bandeja_entrada_personal`
        hasta que sea enviado.
      * Estado `Oculto` por defecto — no visible para
        el personal hasta que `rrhh` o `gerencia`
        lo activen globalmente.
      * Estado `Activado`: el personal puede rellenar
        y enviar Doc-12.

* **bandeja_entrada_rrhh**
  * Recibe Doc-12 (solicitudes de vacaciones),
    Doc-13 (buzón interno) y mensajes internos
    dirigidos a RRHH.

## rbac_y_permisos

* La seguridad real recae en políticas RLS de Supabase
  (PostgreSQL). La visibilidad de rutas y componentes
  en el DOM es solo cosmética — complementaria, no
  sustitutiva.

* **Reglas de enrutamiento por módulo:**

  | Módulo   | Nombre                          | Roles autorizados                                               |
  |----------|---------------------------------|-----------------------------------------------------------------|
  | `mod-1`  | nucleo_operativa_rutinaria      | Todos los roles operativos y de gestión                         |
  | `mod-2`  | nucleo_drp                      | `tes`, `due`, `médico`, `coordinación`, `gerencia`, `logística` |
  | `mod-3`  | modulos_especiales              | `logística`, `coordinación`, `gerencia`                         |
  | `mod-4`  | nucleo_logistica_almacen        | `logística`, `gerencia`                                         |
  | `mod-5`  | nucleo_flota_taller             | `flota`, `gerencia`                                             |
  | `mod-6`  | nucleo_coordinacion_seguridad   | `coordinación`, `gerencia`                                      |
  | `mod-7`  | nucleo_gestion_rrhh             | `rrhh`, `gerencia`                                              |

* **Matriz de permisos específicos por entidad:**

  | Entidad / Acción               | Crear (INSERT)          | Leer (SELECT)                        | Actualizar (UPDATE)           | Archivar (DELETE)                    |
  |--------------------------------|-------------------------|--------------------------------------|-------------------------------|--------------------------------------|
  | Doc-1 al Doc-5 (Clínicos)      | `tes`, `due`, `médico`  | Creador, `coordinación`, `gerencia`  | Creador (en estado Borrador)  | Creador, `coordinación`, `gerencia`  |
  | Doc-6 y Doc-10 (Logística)     | Operativos, `logística` | `logística`, `gerencia`              | `logística`                   | `logística`, `gerencia`              |
  | Doc-7 (Averías)                | Operativos, `flota`     | `flota`, `gerencia`                  | `flota`                       | `flota`, `gerencia`                  |
  | Doc-8 (Parte de trabajo)       | Operativos              | `flota`, `rrhh`, `gerencia`          | Operativos (en turno)         | `gerencia`                           |
  | Gestión DRP (Crear/Asignar)    | `coordinación`, `gerencia` | Todos (si están asignados)        | `coordinación`, `gerencia`    | `coordinación`, `gerencia`           |
  | Gestión Usuarios (RRHH)        | `rrhh`, `gerencia`      | Todos (su propio perfil)             | `rrhh`, `gerencia`            | `gerencia`                           |

## repositorio_documentos

    * Doc-1
      * Nombre: Informe D.R.P.
      * Version 1.0
      * Ruta_Componente_Frontend
      * Componentes_auto:
          - fecha, hora_inicio, nombre_drp
          - ID_vehiculo (si existe)
          - ID_nombre dotación (todos los que entraron al DRP)
      * Registro_asistencias (tabla dinámica, append-only):
          - timestamp_registro
          - ID_nombre_registrador
          - p_filiacion (Nombre y apellidos, Edad, DNI/NIE/Pasaporte, Ciudad de residencia, Sexo, Teléfono)
          - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)
          - Motivo_asistencia (texto libre)
          - Resolucion (texto libre)
      * Funcion:
          1. Al crear un DRP, se genera automáticamente un Doc-1 vinculado. Estado inicial: Planificado_Pendiente.
          2. Al activarse el DRP (estado En_Curso), el Doc-1 pasa a Activo_En_Curso. Los terminales activos en el DRP pueden añadir asistencias desde visual_info_drp.
          3. Cada asistencia añadida se registra con timestamp e ID_nombre del registrador. No se pueden editar ni eliminar entradas ya guardadas (trazabilidad completa).
          4. Si hay varios terminales en el mismo DRP, todos escriben en el mismo Doc-1.
          5. Se guarda con copia de seguridad en IndexedDB y Supabase mientras está activo.
          6. Al finalizar el DRP manualmente, el Doc-1 pasa a Finalizado_Cerrado. Solo Gerencia, Coordinación y RRHH pueden consultarlo.
          7. Exportable a PDF.
      * Estados_Transaccion:
          - Planificado_Pendiente
          - Activo_En_Curso
          - Finalizado_Cerrado
---
    - Doc-2
     - Nombre: Informe Asistencial Básico y Triaje
     - Version 2.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre dotación actuante
       - ID_vehiculo

      - Filiacion_paciente (p_filiacion):
       - Nombre y apellidos, Edad, DNI/NIE/Pasaporte
       - Ciudad de residencia, Sexo, Teléfono
       - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

      - Cinematica_Trauma_Naturaleza_Enfermedad:
       - Tipo: [Trauma, Enfermedad médica, Intoxicación, Obstétrico, Psiquiátrico, Otro]
       - Descripcion_mecanismo (texto breve)

      - Evaluacion_Primaria_XABCDE:
       - X — Control hemorragia exanguinante:
        - [Sin hemorragia exanguinante, Hemorragia controlada, Hemorragia no controlada]
        - Notas (texto libre)
       - A — Vía aérea:
        - [Permeable, Obstruida parcial, Obstruida total, Manejada con dispositivo]
        - Notas (texto libre)
       - B — Ventilación:
        - [Adecuada, Inadecuada, Apnea]
        - FR (rpm): valor numérico
        - Patron: [Normal, Taquipnea, Bradipnea]
        - SpO2 (%): valor numérico
        - Notas (texto libre)
       - C — Circulación:
        - FC (lpm): valor numérico
        - TA (mmHg): sistólica / diastólica
        - Tiempo_relleno_capilar: [< 2s (Normal), 2–4s (Retardado), > 4s (Ausente)]
        - Piel: [Normal, Pálida, Sudorosa, Cianótica, Marmórea]
        - Notas (texto libre)
       - D — Déficit neurológico:
        - Glasgow_Coma_Scale:
         - Ocular: [1, 2, 3, 4]
         - Verbal: [1, 2, 3, 4, 5]
         - Motora: [1, 2, 3, 4, 5, 6]
         - Total: cálculo automático (editable)
        - Pupilas:
         - Simetria: [Isocóricas, Anisocóricas]
         - Tamaño: [Normales, Mióticas, Midriáticas]
         - Reactividad_Izquierda: [Reactiva, Arreactiva, Perezosa]
         - Reactividad_Derecha: [Reactiva, Arreactiva, Perezosa]
        - Notas (texto libre)
       - E — Exposición y control térmico:
        - [Sin hallazgos relevantes, Lesiones visibles, Hipotermia, Hipertermia]
        - Temperatura_corporal (ºC): valor numérico
        - Notas (texto libre)

      - Anamnesis_SAMPLE:
       - Signos_y_sintomas (texto libre)
       - Alergias (texto libre)
       - Medicacion_habitual (texto libre)
       - Patologias_previas (texto libre)
       - Ultima_ingesta (texto libre)
       - Eventos_previos (texto libre)

      - Constantes_vitales (toma principal — pueden añadirse tomas adicionales con +):
       - Hora_toma
       - TA (mmHg): sistólica / diastólica
       - FC (lpm)
       - FR (rpm): valor numérico + patrón [Normal, Taquipnea, Bradipnea]
       - SpO2 (%)
       - Temperatura (ºC)
       - Glucosa (mg/dl)
       - Escala_Dolor_EVA (0–10): slider numérico

      - Categorizacion_Triaje:
       - [Rojo — Emergencia, Naranja — Muy urgente, Amarillo — Urgente, Verde — Menos urgente, Azul/Negro — No urgente / Éxitus]

      - Medidas_aplicadas (multiselect con checkboxes, competencias TES):
       - Control de hemorragias (X / C):
        - [ ] Compresión directa
        - [ ] Vendaje compresivo
        - [ ] Torniquete (Extremidad)
        - [ ] Torniquete (Unión / Empaquetamiento hemostático)
        - [ ] Faja pélvica / Pelvic binder
       - Manejo vía aérea (A):
        - [ ] Apertura manual (Frente-mentón / Tracción mandibular)
        - [ ] Aspiración de secreciones
        - [ ] Cánula orofaríngea (Guedel)
        - [ ] Cánula nasofaríngea
       - Ventilación y oxigenoterapia (B):
        - [ ] Oxigenoterapia: Gafas nasales
        - [ ] Oxigenoterapia: Mascarilla con reservorio
        - [ ] Ventilación con balón resucitador (BVM)
        - [ ] Sello torácico (Parche oclusivo valvulado)
       - Soporte circulatorio y reanimación (C):
        - [ ] RCP Básica (Compresiones torácicas)
        - [ ] DEA (Desfibrilación Externa Automatizada) aplicada
        - [ ] Posición antishock (Trendelenburg modificado)
       - Traumatología e inmovilización (E):
        - [ ] Restricción movimientos espinales (Collarín cervical)
        - [ ] Inmovilización de cabeza (Dama de Elche)
        - [ ] Extricación (Ferno-KED / Boa)
        - [ ] Tablero espinal / Camilla tipo cuchara
        - [ ] Colchón de vacío
        - [ ] Férula de vacío / Férula rígida
        - [ ] Férula de tracción
       - Otras medidas:
        - [ ] Posición Lateral de Seguridad (PLS)
        - [ ] Control térmico (Manta aluminizada / calor activo)
        - [ ] Lavado ocular / Irrigación de heridas
        - [ ] Acompañamiento / Apoyo psicológico
       - Otras_medidas_notas (texto libre)

      - Resolucion:
       - Tipo: [Alta in situ, Rechaza asistencia / Alta voluntaria, Traslado a Centro Útil, Transferencia a SVA, Éxitus]
       - Nota: si se selecciona "Rechaza asistencia / Alta voluntaria", se muestra aviso informativo:
         "Recuerda abrir el Doc-4 si el paciente firma el alta voluntaria."
       - Notas_resolucion (texto libre)

     - Añadir | Cancelar
     - Funcion:
      1. Registrar la asistencia prehospitalaria de dotaciones SVB (TES).
      2. Evaluar, estabilizar y categorizar la gravedad clínica mediante protocolo XABCDE + SAMPLE + triaje.
      3. No administra ni registra fármacos — esa función corresponde al Doc-3.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-3
     - Nombre: Informe Clínico
     - Version 2.0
     - RBAC_Crear: médico, due (lectura: todos los roles operativos en v1.0)
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre facultativo actuante
       - ID_vehiculo

      - Filiacion_Paciente:
       - Nombre y apellidos
       - DNI / NIE / Pasaporte
       - Fecha de nacimiento

      - Evaluacion_Clinica:

       - Alergias_Medicamentosas:
        - Desplegable multiselect:
         - Sin alergias conocidas (NAMC)
         - Betalactámicos
         - AINEs
         - Quimioterápicos
         - Antiepilépticos
         - Sulfamidas
         - Quinolonas
         - Macrólidos
         - Medios de contraste
         - Biológicos y Mabs
         - Bloqueantes neuromusculares
         - Anestésicos (generales/locales)
         - Hipouricemiantes (Alopurinol)
         - IECAs
         - Opioides
         - Otras (especificar — texto libre)

       - Antecedentes_Personales (texto libre)

       - Anamnesis (tomas — primera obligatoria, añadir más con +):
        - Hora_toma
        - TA (mmHg)
        - FC (lpm)
        - FR (rpm)
        - SpO2 (%)
        - Temperatura (ºC)
        - Glucosa (mg/dl)

       - Exploracion_Fisica (texto libre)

      - Resolucion_y_Plan:

       - Bloque_Via_Aerea_Ventilacion:
        - Tipo_manejo: [Espontánea, Cánula orofaríngea, Dispositivo supraglótico, Intubación endotraqueal]
        - Parametros_respirador: Vt, FR, PEEP, FiO2
        - Capnografia_EtCO2

       - Bloque_Hemodinamico_Monitorizacion:
        - Ritmo_ECG_inicial
        - Ritmo_ECG_final
        - Vias_venosas_canalizadas: [Periférica, Intraósea, Central]
        - Terapias_electricas_aplicadas (Julios)

       - Bloque_Farmacologico (bucle dinámico — añadir líneas):
        - Farmaco_administrado (texto / vademécum)
        - Dosis_y_unidades: valor + unidad [mg, mcg, UI, ml]
        - Via_administracion: [IV, IM, SC, VO, SL, INH]
        - Hora_exacta_administracion

       - Juicio_Clinico_Diagnostico_Presuntivo (texto libre)

       - Plan_Actuacion:
        - [1 — Alta in situ con recomendaciones,
           2 — Derivación a Atención Primaria,
           3 — Derivación a Urgencias (medios propios),
           4 — Traslado a Urgencias en ambulancia]

       - Hospital_o_Centro_Destino (texto libre, visible si plan 3 o 4)

     - Añadir | Cancelar
     - Funcion:
      1. Documento clínico de uso principal para médico y DUE en unidades SVA/VIR.
      2. Documento independiente del Doc-2. No hereda datos. Cubre la valoración y actuación facultativa completa.
      3. Registra fármacos, monitorización avanzada e intervenciones críticas.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-4
     - Nombre: Alta Voluntaria / Negativa de Asistencia y Traslado
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre dotación actuante
       - ID_vehiculo

      - Filiacion_paciente (p_filiacion):
       - Nombre y apellidos, Edad, DNI/NIE/Pasaporte
       - Ciudad de residencia, Sexo, Teléfono
       - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

      - Evaluacion_Capacidad:
       - [ ] Alerta y orientado (tiempo, espacio y persona)
       - [ ] Ausencia de signos de intoxicación o alteración mental

      - Clausulas_Legales:
       - p_alta_voluntaria_informativa
       - p_alta_voluntaria_exencion

      - Firmas_y_Consentimiento:
       - Firma_Paciente_o_Tutor_Legal
       - Firma_Sanitario_Responsable
       - Firma_Testigo (opcional)

     - Añadir | Cancelar
     - Funcion:
      1. Documentar la negativa explícita y consciente del paciente a recibir atención médica o ser evacuado.
      2. Blindar legalmente a los intervinientes y a la empresa ante futuras reclamaciones por omisión de socorro o agravamiento del cuadro clínico.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-5
     - Nombre: Descargo de Responsabilidad (Asunción Facultativa en Escena)
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre jefe de dotación
       - ID_vehiculo

      - Filiacion_paciente (p_filiacion):
       - Nombre y apellidos, Edad, DNI/NIE/Pasaporte
       - Ciudad de residencia, Sexo, Teléfono
       - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

      - Filiacion_Facultativo_Externo:
       - Nombre y apellidos
       - DNI / NIE / Pasaporte
       - Número de colegiado (obligatorio)
       - Colegio provincial

      - Clausulas_Legales:
       - p_transferencia_hospitalaria (adaptado a asunción en escena)
       - Texto_Asuncion_Responsabilidad: "El facultativo abajo firmante, identificándose legalmente y acreditando su titulación mediante el número de colegiación reseñado, interviene de forma voluntaria en la escena y asume expresa e irrevocablemente la total responsabilidad médica, civil y penal sobre el triaje, diagnóstico, tratamiento y asistencia del paciente arriba referenciado."
       - Texto_Transferencia_y_Exencion: "El facultativo comprende y acepta que, al asumir el mando y la dirección clínica de esta intervención, releva de sus funciones y exime de toda responsabilidad legal y subsidiaria a la dotación de la ambulancia y a la entidad gestora. Asimismo, asume la obligación de garantizar la continuidad asistencial, comprometiéndose a gestionar por sus propios medios la derivación o traslado a un centro hospitalario si la evolución clínica del paciente lo hiciera necesario."

      - Firmas_y_Consentimiento:
       - Firma_Facultativo_Externo_Asume_Mando
       - Firma_Jefe_Dotacion

     - Añadir | Cancelar
     - Funcion:
      1. Transferir legalmente la responsabilidad del paciente a un médico ajeno al operativo que decide intervenir y hacerse cargo in situ.
      2. Garantizar que la dotación no incurre en un delito de abandono de paciente al dejarlo en manos de un tercero no perteneciente a la empresa.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-6
     - Nombre: Gasto de material
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes
      - Modulo_Origen (Vehículo, PSA o Mochila/Backpack)
      - Selector_Item (Vinculado a ID_Items de Inventory_Locations)
      - Cantidad_Utilizada
      - Lote_y_Caducidad (Si aplica por trazabilidad)
      - Observaciones
     - Añadir | Cancelar
     - Funcion:
      1. Ambulancia: Resta automáticamente al stock y genera aviso en "avisos flota" si se alcanza el umbral mínimo.
      2. PSA: Resta automáticamente en el stock global.
      3. Lógica de DB: La resta se ejecuta de forma atómica en el servidor (PostgreSQL) para evitar errores de inventario por concurrencia.
     - Estados_Transaccion
      - Borrador
      - Registrado_y_Descontado
---
    - Doc-7
     - Nombre: Informe de averías
     - Version 1.1
     - Ruta_Componente_Frontend
     - Componentes:
      - ID_vehiculo_afectado
      - Nivel_Criticidad:
       - Leve (Permite operativa normal)
       - Moderada (Requiere revisión en < 48h)
       - Grave (Alerta inmediata a coordinación y gerencia)
      - Sistema_Afectado:
       - Motor / Mecánica
       - Célula Sanitaria
       - Electromedicina embarcada
       - Señalización Acústico/Luminosa
       - Chapa y Pintura
      - Descripcion_Detallada (texto libre)
      - Adjuntos (fotografías del daño o panel de mandos)
     - Añadir | Cancelar
     - Funcion:
      1. Reportar fallos en vehículos o equipamiento.
      2. Al guardar, el vehículo afectado pasa automáticamente a estado Averiado (informativo — no bloquea activación). Se notifica a flota y vehículos.
      3. Si el nivel es Grave, se genera además una alerta inmediata dirigida a coordinación y gerencia.
     - Estados_Transaccion:
      - Reportada_Pendiente
      - En_Proceso_Taller
      - Reparada_Operativa
---
    - Doc-8
     - Nombre: Parte de trabajo
     - Version 2.0
     - Ruta_Componente_Frontend: ninguna — no se abre como formulario. Se genera y rellena automáticamente mientras el usuario interactúa con la app.
     - Generacion: uno por check-in de dotación (vehículo + personal emparejado). Si varios ID_nombre comparten vehículo en el mismo turno, comparten el mismo Doc-8.

     - Bloques_auto (todos generados por eventos del sistema):

      - Bloque_Sesion:
       - ID_nombre(s) de la dotación
       - ID_vehiculo
       - Timestamp check-in (inicio turno)
       - Timestamp check-out (cierre turno)

      - Bloque_Estados_Vehiculo (registro cronológico automático):
       - Cada cambio de estado del vehículo genera una entrada:
        - Estado: [Activado, Desactivado, Averiado, Estacionado, En_espera, Ruta]
        - Funcion_operativa: [Programado, Dispositivo, Traslado, Guardia_urgencias, DRP, Privado, Simulacro, Formación]
        - Timestamp_inicio
        - Timestamp_fin (al cambiar al siguiente estado)
        - Km_inicio (al activar)
        - Km_fin (al desactivar)

      - Bloque_Repostaje (generado desde nucleo_operativa_rutinaria → Repostar):
       - Tipo: [Gasolinera, Base]
       - Km_marcador
       - Litros
       - Euros (solo si Gasolinera)
       - Timestamp

      - Bloque_AdBlue (generado desde nucleo_operativa_rutinaria → AdBlue):
       - Km_marcador
       - Timestamp

     - Funcion:
      1. Registrar automáticamente la actividad cronológica del turno para control de RRHH y facturación.
      2. Auditar uso de flota, combustible y kilometraje sin intervención manual del usuario.
      3. El documento permanece abierto (Abierto_En_Turno) hasta el check-out de la dotación.
     - Estados_Transaccion:
      - Abierto_En_Turno
      - Enviado_Cerrado
---
    - Doc-9
     - Nombre: Entrada de Almacen
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes
      - Datos_Proveedor
       - Nombre_Proveedor_o_Laboratorio
       - Numero_Albaran_o_Factura
       - Fecha_Recepcion
      - Items_Recepcionados (Bucle dinámico)
       - Selector_Item_Catalogo
       - Cantidad_Recibida
       - Numero_Lote
       - Fecha_Caducidad
     - Añadir | Cancelar
     - Funcion:
      1. Registrar el ingreso oficial de material sanitario y farmacológico desde proveedores externos al Almacén Maestro.
      2. Actualizar positivamente el inventario general habilitando la trazabilidad por lote y caducidad.
     - Estados_Transaccion
      - Pendiente_Recepcion
      - Completado
      - Descuadre_Pendiente_Revision
---
    - Doc-10
     - Nombre: Envío de material (Control de Tránsito)
     - Version 2.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Origen_Transferencia:
       - Selector de inventory_location de origen.
       - Cualquier ubicación disponible en el sistema
         (vehículo, backpack, subinventario DRP, almacén).
       - Restricción RBAC:
         * Envíos cuyo origen sea `ID_almacen` solo pueden
           ser iniciados por rol `logística` o `gerencia`.
         * El resto de orígenes son accesibles por cualquier
           rol operativo autorizado.

      - Destino_Transferencia:
       - Selector de inventory_location de destino.
       - Cualquier ubicación disponible en el sistema
         (vehículo, backpack, subinventario DRP, almacén).
       - El origen y el destino no pueden ser el mismo.

      - Items_Enviados (bucle dinámico — añadir líneas):
       - Selector_Item (vinculado al catálogo del origen)
       - Cantidad_Enviada
       - Numero_Lote (requerido para material crítico)

     - Añadir | Cancelar

     - Flujo_Confirmacion_Receptor:
      1. Al guardar el Doc-10, el material pasa a estado
         `En_Transito`: restado del origen, no sumado
         al destino.
      2. El destino recibe una notificación en su bandeja
         de entrada con el detalle del envío pendiente.
      3. El receptor accede al Doc-10 desde su bandeja
         y ejecuta la acción explícita `Confirmar recepción`:
         * Revisa ítem a ítem la cantidad recibida.
         * Si todo coincide → estado `Completado`.
           El stock se suma al destino.
         * Si hay discrepancia en algún ítem → el receptor
           marca la cantidad real recibida y el sistema
           genera automáticamente un `Descuadre_Pendiente_Revision`
           dirigido a logística para resolución manual.
      4. Mientras el Doc-10 esté en `En_Transito` o
         `Pendiente_Validacion`, el material no computa
         ni en origen ni en destino — queda aislado
         contablemente.

     - Funcion:
      1. Mover stock entre cualquier par de inventory_locations
         del sistema.
      2. Garantizar trazabilidad completa del material en tránsito
         mediante confirmación explícita del receptor.
      3. Envíos desde `ID_almacen` requieren rol `logística`
         o `gerencia`. El resto de movimientos entre locations
         están disponibles para roles operativos autorizados.
      4. Cualquier discrepancia entre lo enviado y lo recibido
         genera un descuadre auditable en la bandeja de logística.

     - Estados_Transaccion:
      - En_Transito
      - Pendiente_Validacion
      - Completado
      - Descuadre_Pendiente_Revision
---
    * Doc-11
      * Nombre: Aviso Urgente
      * Version 1.1
      * Ruta_Componente_Frontend
      * Componentes:
          - Origen_Alerta: ID_Vehiculo o ID_DRP (autocomplete)
          - Departamento_Receptor: [Logística, Gestión de Flota, Coordinación]
          - Nivel_Prioridad:
        * Alta (Requiere atención en el turno actual)
        * Crítica (Rotura de stock vital o inmovilización de unidad — peso tipográfico 900 en UI)
          - Evento_Situacional (texto libre — descripción del evento o situación)
          - Solicitud_o_Aviso (texto libre — detalle de la solicitud)
          - Emisor: ID_nombre (autocomplete con el ID_nombre autenticado)
          - Acuse_de_Recibo: registro automático de quién y cuándo lee el aviso
      * Añadir | Cancelar
      * Funcion:
          1. Canalizar solicitudes operativas importantes que no pueden esperar al cierre del Doc-8.
          2. Los avisos de nivel Crítico generan alertas visuales inmediatas en las bandejas de entrada correspondientes.
      * Estados_Transaccion:
          - Emitida_Pendiente
          - En_Proceso_Lectura
          - Solucionada_Archivada
---
    - Doc-12
     - Nombre: Solicitud de vacaciones
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes
      - Datos_Solicitante (ID_nombre, Categoria_Profesional)
      - Periodo_Anual_Aplicable
      - Seleccion_Preferencias_Quincenales
       - Opcion_1 (Prioridad Alta)
       - Opcion_2 (Prioridad Media)
       - Opcion_3 (Prioridad Baja)
      - Observaciones_Empleado
      - Resolucion_RRHH (Campo exclusivo para Respuesta y Motivo)
     - Añadir | Cancelar
     - Funcion:
      1. Estructurar la peticion de periodos vacacionales.
      2. El componente esta inactivo/oculto en el DOM del usuario hasta que el rol `RRHH` habilita el periodo de solicitudes a nivel global en el sistema.
     - Estados_Transaccion
      - Borrador
      - Pendiente_Aprobacion
      - Aprobada
      - Denegada
---
    - Doc-13
     - Nombre: Propuestas y quejas (Buzón interno)
     - Version 1.1
     - Ruta_Componente_Frontend
     - Componentes:
      - Tipologia_Comunicacion:
       - Queja / Incidencia laboral
       - Propuesta de mejora operativa
       - Otro
      - Emisor: ID_nombre / Opción de envío anónimo
       - Si anónimo: el sistema disocia cualquier metadato identificativo del terminal o usuario emisor.
      - Asunto (texto libre)
      - Descripcion_Detallada (texto libre)
      - Adjuntos_Evidencias (opcional)
     - Añadir | Cancelar
     - Funcion:
      1. Establecer un canal oficial y auditable para la comunicación entre la plantilla y gerencia.
      2. Al guardar, el mensaje se envía a través del sistema interno de mensajería al rol gerencia.
         No se genera email externo.
     - Estados_Transaccion:
      - Enviada
      - Leida_Archivada
---
    * Doc-Checklist360
      * Nombre: Revisión 360º del vehículo
      * Version 1.0 (STANDBY — ubicación en módulo pendiente de definir)
      * Ruta_Componente_Frontend: pendiente
      * Componentes:

          - Datos_auto:
           - ID_vehiculo
           - ID_nombre revisores
           - Timestamp inicio revisión

          - Frente:
           - [ ] Integridad del parabrisas y escobillas limpiaparabrisas
           - [ ] Funcionamiento de ópticas principales frontales (cruce, carretera, intermitentes)
           - [ ] Parrilla delantera y luces de emergencia frontales (estroboscópicas/LED)

          - Lateral_Derecho:
           - [ ] Presión teórica y estado de la banda de rodadura (eje delantero y trasero derechos)
           - [ ] Integridad de la chapa y elementos reflectantes
           - [ ] Apertura, cierre y bloqueo de la puerta lateral de acceso a célula sanitaria
           - [ ] Despliegue del peldaño lateral (si dispone de mecanismo retráctil automático)

          - Trasera:
           - [ ] Funcionamiento de ópticas traseras (freno, marcha atrás, antiniebla, intermitencia)
           - [ ] Luces de emergencia posteriores y focos de iluminación de escena perimetral (búsqueda)
           - [ ] Apertura total a 180º/270º de las puertas traseras y bloqueo de bisagras
           - [ ] Rueda de repuesto

          - Lateral_Izquierdo:
           - [ ] Presión y estado de neumáticos (eje delantero y trasero izquierdos)
           - [ ] Inspección de bajos del vehículo: ausencia de fugas de fluidos (aceite, refrigerante, líquido de frenos)
           - [ ] Conexión de toma de corriente externa (Power-line) desconectada

          - Cabina_y_Sistemas:
           - [ ] Comprobación del cuadro de mandos (ausencia de testigos de avería)
           - [ ] Verificación de niveles: aceite, limpiaparabrisas, combustible
           - [ ] Prueba del panel de control: puente de luces y sirena (tonos wail, yelp, phaser)
           - [ ] Megafonía exterior operativa
           - [ ] Chalecos reflectantes presentes
           - [ ] Sistemas de climatización e iluminación: célula conducción y célula sanitaria

          - Incidencias_Detectadas (texto libre — opcional):
           - Campo abierto para registrar cualquier anomalía no cubierta por los ítems anteriores

      * Guardar | Cancelar
      * Funcion:
          1. Verificar el estado operativo y de seguridad del vehículo antes de iniciar el turno o servicio.
          2. Registrar incidencias detectadas para su trazabilidad en flota.
          3. Tipo de vehículo aplicable: pendiente de definir (la plantilla actual es genérica).
      * Estados_Transaccion:
          - Completado
          - Completado_Con_Incidencias

### repositorio_parrafos_comunes

    - p_filiacion
        - Campos a rellenar: `Nombre y apellidos`, `Edad`, `DNI/NIE/Pasaporte`, `Ciudad de residencia`, `Sexo`, `Telefono`.
     - [x] si es menor, Datos de Padre/Madre/Tutor: `Nombre y apellidos`, `DNI/NIE/Pasaporte`.

    - p_rgpd_basico
     - Etiqueta: "Protección de Datos (Cláusula General)"
     - Texto: "De conformidad con la normativa vigente en Protección de Datos de Carácter Personal, se informa que los datos de salud e identidad recabados durante esta asistencia serán incorporados a un fichero automatizado responsabilidad de la entidad prestadora del servicio, con la finalidad exclusiva de gestión clínica, administrativa y cumplimiento de obligaciones legales. El paciente puede ejercer sus derechos de acceso, rectificación, supresión y oposición dirigiéndose a la dirección postal o electrónica de la entidad."

    - p_consentimiento_exploracion
     - Etiqueta: "Consentimiento para Exploración/Triaje"
     - Texto: "El paciente o su tutor legal otorga, de forma libre y voluntaria, su consentimiento expreso para que el personal sanitario actuante realice las maniobras de valoración, exploración física, toma de constantes vitales y aplicación de medidas de soporte vital básico o avanzado necesarias para el diagnóstico sindrómico inicial y estabilización."

    - p_exencion_pertenencias
     - Etiqueta: "Exención de Responsabilidad sobre Pertenencias"
     - Texto: "La dotación sanitaria se hace cargo exclusivamente de la asistencia clínica del paciente. Salvo inventario expreso y firmado por ambas partes, la empresa, dirección médica y personal interviniente quedan eximidos de cualquier responsabilidad legal, civil o patrimonial por la pérdida, extravío o deterioro de joyas, dinero, dispositivos electrónicos, prótesis, gafas u otros objetos de valor no imprescindibles para el traslado sanitario que el paciente porte consigo durante la intervención."

    - p_responsabilidad_menores
     - Etiqueta: "Asistencia a Menores e Incapacitados"
     - Texto: "En el caso de pacientes menores de edad o legalmente incapacitados, la firma adjunta corresponde a la persona que acredita, bajo su responsabilidad civil y penal, ostentar la patria potestad, tutela legal o guarda de hecho en el momento de la asistencia, autorizando las intervenciones reseñadas y asumiendo las obligaciones derivadas de las mismas."

    - p_veracidad_parte_trabajo
     - Etiqueta: "Declaración de Veracidad del Parte"
     - Texto: "El responsable de la dotación certifica mediante su firma que los horarios, kilometrajes, servicios e incidencias reflejados en el presente documento son exactos y veraces, correspondiendo fielmente a la actividad desarrollada durante su turno operativo."

    - p_responsabilidad_check_vehiculo
     - Etiqueta: "Responsabilidad de Revisión de Flota"
     - Texto: "La dotación entrante declara haber realizado la revisión visual y el checklist operativo del vehículo asignado al inicio de su turno. Cualquier anomalía, daño estructural o falta de equipamiento no reportada en este acto se presumirá ocurrida durante el presente turno, asumiendo la dotación actual la responsabilidad derivada."

    - p_conformidad_recepcion_logistica
     - Etiqueta: "Conformidad de Recepción de Material"
     - Texto: "El firmante valida que el material físico recepcionado coincide exactamente en cantidad, referencia y estado óptimo de embalaje con lo detallado en el albarán o documento de tránsito. Cualquier discrepancia o deterioro ha sido debidamente registrado en el apartado de incidencias previo a la consolidación del inventario."

    - p_condiciones_vacaciones
     - Etiqueta: "Condiciones de Concesion Vacacional"
     - Texto: "La presente solicitud de periodos vacacionales queda sujeta a las necesidades operativas del servicio, cuadrantes de dimensionamiento y a los plazos estipulados en el Convenio Colectivo de aplicacion. El envío de este formulario no constituye una aprobacion definitiva hasta la recepcion de la confirmacion expresa por parte del departamento de Recursos Humanos."

    - p_buzon_confidencialidad
     - Etiqueta: "Garantia de Confidencialidad y Uso del Buzon"
     - Texto: "Este canal ha sido diseñado para promover la mejora continua y el reporte de incidencias en un entorno seguro. La entidad garantiza la estricta confidencialidad de la información remitida y, en caso de seleccionar la opcion anonima, el sistema disociará cualquier metadato que permita identificar al terminal o usuario emisor, cumpliendo con la normativa de proteccion del informante."

    - p_uso_adecuado_alertas
     - Etiqueta: "Responsabilidad de Emision de Alerta Critica"
     - Texto: "El uso de la calificacion 'Critica' en los avisos urgentes debe limitarse estrictamente a situaciones que comprometan la seguridad del paciente, la integridad de la dotacion o la viabilidad operativa inmediata del recurso (inmovilizacion fisica o rotura de stock vital). El abuso de esta prioridad para cuestiones no urgentes será auditado por el centro de coordinacion."

    - p_rgpd_basico
     - Etiqueta: "Protección de Datos (Cláusula General)"
     - Texto: "De conformidad con la normativa vigente en Protección de Datos de Carácter Personal, se informa que los datos recabados durante esta asistencia serán incorporados a un fichero automatizado responsabilidad de la entidad prestadora del servicio, con la finalidad exclusiva de gestión clínica, coordinación sanitaria y cumplimiento de obligaciones legales."

    - p_consentimiento_exploracion
     - Etiqueta: "Consentimiento para Exploración y Triaje"
     - Texto: "El paciente o su tutor legal otorga su consentimiento expreso para que el personal sanitario actuante realice las maniobras de valoración, toma de constantes vitales y aplicación de medidas de soporte vital básico necesarias para su estabilización."

    - p_consentimiento_sva
     - Etiqueta: "Consentimiento para Soporte Vital Avanzado"
     - Texto: "Se informa al paciente o responsable legal de la necesidad clínica de aplicar técnicas invasivas, administración de fármacos por vía parenteral o terapias eléctricas pertinentes para el mantenimiento de las constantes vitales, asumiendo los riesgos inherentes a dichas intervenciones de urgencia."

    - p_exencion_pertenencias
     - Etiqueta: "Exención de Responsabilidad sobre Pertenencias"
     - Texto: "La dotación sanitaria se hace cargo exclusivamente de la asistencia clínica. La empresa y su personal quedan eximidos de responsabilidad por la pérdida, extravío o deterioro de objetos de valor, dinero o dispositivos electrónicos que el paciente porte consigo durante la intervención o traslado."

    - p_alta_voluntaria_informativa
     - Etiqueta: "Información de Riesgos por Negativa de Traslado"
     - Texto: "El paciente o su representante legal, en pleno uso de sus facultades mentales y capacidad legal, declara haber sido informado de forma clara, precisa y comprensible sobre su estado clínico actual y los riesgos, complicaciones severas e irreversibles (incluyendo el riesgo de muerte o invalidez permanente) que pueden derivarse de la negativa a recibir el tratamiento o traslado hospitalario propuesto."

    - p_alta_voluntaria_exencion
     - Etiqueta: "Exención de Responsabilidad por Negativa"
     - Texto: "El firmante rechaza libre y voluntariamente la asistencia médica o traslado. Con su firma, asume íntegramente las consecuencias de esta decisión y exime de cualquier responsabilidad civil, penal o administrativa a la dotación sanitaria interviniente, a la dirección médica y a la entidad proveedora del servicio."

    - p_transferencia_hospitalaria
     - Etiqueta: "Transferencia de Guardia/Hospitalaria"
     - Texto: "El facultativo o enfermero receptor asume la transferencia del paciente, junto con la información clínica detallada en el presente informe, haciéndose cargo de la continuidad asistencial y legal a partir de este momento."
