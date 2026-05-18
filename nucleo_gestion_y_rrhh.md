# nucleo_gestion_y_rrhh

* RBAC: `gerencia`, `rrhh`.

* **tablon_central**
  * Panel de contenido corporativo visible para todos los roles.
  * Acceso de gestión desde black_column: `Gestión tablón` (subgrupo RRHH).
  * Acceso de lectura desde black_column: `Tablón central` (icono standalone).
  * Secciones:
    * `normativas`: documentos normativos de la empresa.
    * `protocolos`: protocolos de actuación actualizados.
    * `avisos_corporativos`: comunicados internos de gerencia/rrhh.
  * Acciones de gestión (`gerencia`, `rrhh`): Crear | Editar | Archivar.
  * Automáticos por entrada: `timestamp_publicacion`, `timestamp_ultima_edicion`,
    `ID_nombre_autor`.

* **marquesina**
  * Gestiona el texto del ticker del header negro.
  * Campo de texto libre editable.
  * Velocidad de desplazamiento ajustable. (0 a 100)
  * Acciones (`gerencia`, `rrhh`, `coordinación`):
    Guardar | Limpiar.
  * El texto guardado se refleja en tiempo real en el
    header de todos los terminales activos.
  * Automáticos al guardar: `timestamp_ultima_actualizacion`, `ID_nombre_editor`.

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
      * Automáticos: `timestamp_creacion`, `timestamp_ultima_modificacion`, `ID_nombre_creador`.
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
      * Estado `Oculto` por defecto — Doc-12 no visible
        para el personal hasta que `rrhh` o `gerencia`
        lo activen desde esta sección.
      * Estado `Activado`: el personal accede a Doc-12
        desde el `Tablón central` (icono standalone en
        black_column, accesible a todos los roles autenticados).
      * Acciones (`rrhh`, `gerencia`): Activar periodo | Desactivar.

* **bandeja_entrada_rrhh**
  * Recibe Doc-12 (solicitudes de vacaciones),
    Doc-13 (buzón interno) y mensajes internos
    dirigidos a RRHH.
  * Flujo de estados y acciones: ver `componentes.md → flujos_transicion`
    (variante `bandeja_entrada_rrhh`).
