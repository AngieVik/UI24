# terminal_index

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

    * **selector_vehiculos** *(siempre visible en home_area)*
      * Muestra todos los vehículos del sistema con su estado actual.
      * Accesible también desde `black_column → Operativa rutinaria
        → Selector vehículos`.
      * Al activar un vehículo el panel de vehículo aparece en el
        home_area y el selector queda en segundo plano.

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
      * Flujo base (solo lectura): ver `componentes.md → flujos_transicion`.

    * **bandeja_entrada_personal**
      * Un icono por cada ID_nombre con `checkin_on` en este terminal.
      * Icono `ti-mail` con las iniciales del ID_nombre en tamaño mínimo.
      * Flujo base (solo lectura): ver `componentes.md → flujos_transicion`.
