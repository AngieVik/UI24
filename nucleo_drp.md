# nucleo_drp

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
    * Si el DRP está en estado `En espera` y es la primera
      dotación en unirse, el sistema cambia automáticamente
      el estado a `En preparación` y registra
      `timestamp_inicio_preparacion`.

  * **Salir del DRP:**
    * Opción A — Salir con vehículo: salen el ID_vehiculo
      y todos los ID_nombre emparejados en ese momento.
    * Opción B — Salir individualmente: sale únicamente
      el ID_nombre seleccionado.
    * Modal de confirmación en ambos casos.
    * Registra timestamp de salida por cada elemento
      que sale.

  * **DRPs Finalizados (Últimas 48h):**
    * Sección segregada al final del visor, separada visualmente
      de los DRPs activos.
    * Muestra DRPs en estado `Finalizado` cuyo `timestamp_finalizacion`
      está dentro de las últimas 48 horas (antes del archivado automático).
    * Renderizado con `opacity-60` para distinguirlos de los DRPs activos.
    * **Solo lectura** — ninguna mutación de estado disponible. Todos
      los controles de acción (Entrar, Salir, Editar recursos, Finalizar)
      están deshabilitados.
    * Operaciones permitidas exclusivamente:
      * Consulta del Doc-1 completo (GET — lectura).
      * Descarga del PDF de resumen del DRP.
    * Pasadas 48h desde `timestamp_finalizacion`, el DRP pasa a `Archivado`
      automáticamente (job Supabase) y desaparece de esta sección.

* **selector_estados_drp** *(RBAC modificar: `coordinación`, `gerencia`)*
  * `En espera`: estado por defecto al crear el DRP. Registra `timestamp_creacion`.
  * `En preparación`: se activa automáticamente 1h antes
    de la hora del DRP (job programado en Supabase) o
    cuando la primera dotación se une, lo que ocurra primero.
    Registra `timestamp_inicio_preparacion`.
  * `En curso`:
    * Activación manual por `coordinación` o `gerencia`.
    * Si se activa antes de la hora de inicio, el sistema
      pregunta: `Cuenta atrás` | `Marcar hora de inicio actual`.
    * Si a la hora de inicio programada el DRP no ha sido
      activado manualmente, el sistema envía aviso a todos
      los terminales unidos al DRP:
      "Aviso: el DRP no ha sido activado. Contactar con coordinación."
    * Registra `timestamp_inicio_curso`.
  * `Finalizado`: transición manual. Ver flujo en `resumen_drp`.
    Registra `timestamp_finalizacion`.
  * `Archivado`: automático 48h después de `Finalizado`.
    Registra `timestamp_archivado`.
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
    * Bandeja mixta con dos tipos de mensajes de distinta naturaleza:
      * **Doc-10 pendiente de recepción**: flujo interactivo con confirmación
        ítem a ítem. Acciones de estado habilitadas.
        Ver `componentes.md → flujos_transicion → bandeja_entrada_logistica_drp`.
      * **Alertas de stock mínimo**: solo lectura (`isReadOnly=true`). Sin botones
        de mutación de estado. El mensaje desaparece automáticamente al cerrar el modal
        (auto-dismiss) — sin transición a `Solucionada_Archivada`.
        Objetivo: informar sin interrumpir la actividad asistencial.
        Ver `componentes.md → flujos_transicion → Modo isReadOnly`.

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
    * Permanece visible en `selector_drp` y en home_area
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
