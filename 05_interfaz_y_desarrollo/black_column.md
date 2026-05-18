# black_column

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
      * Repostar AdBlue — `ti-droplet`
      * Doc-Checklist360 Revisión 360° — `ti-checkbox`
      * Vehículos — `ti-steering-wheel`
        *(Vista combinada in-place: selector de flota en la parte superior + selector de
        estado operativo / condición técnica / tipo de servicio del vehículo seleccionado.
        El selector de vehículos ya no vive en visual_info_home — este es el único punto
        de acceso al listado completo de la flota.)*

  * `DRP` — `ti-map-pin`
    * Subgrupo:
      * Operativa DRP — `ti-activity`
      * Visor DRP — `ti-selector`
      * Resumen DRP — `ti-chart-bar` *RBAC: `gerencia`, `coordinación` (icono atenuado para otros roles)*
      * Logística DRP — `ti-package`
      * Crear DRP — `ti-circle-plus`
      * Estados DRP — `ti-toggle-left`

  * `Módulos especiales` — `ti-puzzle`
    * Subgrupo *(RBAC: `logística`, `coordinación`, `gerencia`)*:
      * PSA — `ti-first-aid-kit`
      * Filiación — `ti-forms` *(RBAC crear/eliminar: `coordinación`, `gerencia`)*
        * Si hay DRP activo con módulo filiación: opción Entrar.
        * Crear módulo filiación (vinculado a DRP activo).
        * Eliminar módulo filiación.

  * `Logística y almacén` — `ti-building-warehouse`
    * Subgrupo:
      * Inventario maestro — `ti-list-details`
      * Doc-9 Entrada almacén — `ti-truck-delivery`
      * Doc-10 Envío material — `ti-transfer`
      * Inventario en tránsito — `ti-truck`
      * Descuadres — `ti-alert-circle`
      * Catálogo de ítems — `ti-tags`
        *(RBAC: `responsable_logistica`, `gerencia`. Gestión del catálogo maestro de 245 ítems:
        añadir, editar, archivar. El archivado dispara automáticamente la purga en plantillas_stock
        via trigger. Ver `logic.md §6.4`.)*
      * Bandeja logística — `ti-inbox`

  * `Flota y taller` — `ti-car`
    * Subgrupo:
      * Incidencias — `ti-tool`
      * Doc-7 Informe avería — `ti-engine`
      * Metadata vehículo (ITV/docs) — `ti-id`
      * Mantenimiento flota — `ti-tool-2`
        *(Visor de mantenimiento preventivo: aceite, frenos, neumáticos.
        RBAC lectura: `flota`, `responsable_flota`, `gerencia`.
        RBAC edición: `responsable_flota`, `gerencia`.)*
      * Historial eventos físicos — `ti-history`
        *(Visor de `eventos_fisicos_vehiculo`: repostajes de combustible y AdBlue,
        mantenimientos y otros eventos físicos registrados. Filtros por ID_vehiculo,
        tipo_evento y rango de fechas. Independiente del Doc-8.
        RBAC: `flota`, `responsable_flota`, `gerencia`. Ver `logic.md §19`.)*
      * Bandeja flota — `ti-inbox`

  * `Coordinación y seguridad` — `ti-shield-lock`
    * Subgrupo:
      * Token de emergencia — `ti-cookie`
      * RBAC roles — `ti-users`
      * Bandeja coordinación — `ti-inbox`

  * `Gestión y RRHH` — `ti-id-badge`
    * Subgrupo:
      * Fichas empleados — `ti-user-circle`
      * Gestión de turnos — `ti-calendar-event`
      * Gestión tablón — `ti-news`
        * Añadir, editar y archivar anuncios del tablón central.
      * Marquesina — `ti-antenna`
      * Doc-12 Solicitud vacaciones — `ti-beach`
      * Repositorio documentos — `ti-folder-open`
        *(Normativas, protocolos y documentación corporativa.
        Lectura: todos los roles autenticados.
        Gestión (crear/editar/archivar): `gerencia`, `rrhh`.)*
      * Gestión de bajas y ausencias — `ti-calendar-x`
        *(Registro y seguimiento de bajas médicas, ausencias justificadas
        y días de compensación. Separado de los cuadrantes de turno.
        RBAC: `rrhh`, `gerencia`.)*
      * Bandeja RRHH — `ti-inbox`

  * `Tablón central` — `ti-speakerphone`
    * Sin subgrupo. Accesible a todos los roles autenticados.
    * Vista de lectura del tablón corporativo.
    * `gerencia` y `rrhh` ven además los controles de gestión
      (Crear | Editar | Archivar).
    * Cuando Doc-12 está activado por RRHH, aparece aquí accesible
      para todos los roles.

  * `Buzón interno` (Doc-13) — `ti-message-report`
    * Sin subgrupo. Accesible a todos los roles autenticados.
    * Abre formulario Doc-13 (Propuestas y quejas) directamente en el home_area.
