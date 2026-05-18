# modulos_especiales

* RBAC: `gerencia`, `coordinación`.

* **modulo_psa** *(se adhiere a un DRP)*
  * Seleccionar DRP al que se adhiere — componente `selector_drp`
    (ver `componentes.md`).
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
  * Automáticos: `timestamp_apertura` (al crear), `timestamp_cierre`
    (al cerrar módulo o al finalizar el DRP vinculado).
  * Acción adicional durante el DRP: Cerrar_módulo_PSA.

* **modulo_filiacion** *(se adhiere a un DRP)*
  * **Acceso:**
    * Desde `visual_info_drp` en home_area: icono `ti-door-enter`
      visible cuando hay módulo filiación activo en el DRP.
      Entrada directa al módulo.
    * Desde `black_column → Módulos especiales → Filiación`
      *(RBAC: `coordinación`, `gerencia`)*:
      * Entrar al módulo (si ya existe en el DRP activo).
      * Crear módulo filiación (vinculado a DRP activo).
      * Eliminar módulo filiación.
  * Seleccionar DRP al que se adhiere — componente `selector_drp`
    (ver `componentes.md`).
  * Al entrar, seleccionar perfil de trabajo:

  * **perfil_admision:**
    1. Acción INSERT — nuevo registro de paciente.
    2. Cumplimentar `p_filiacion`:
       * `Nombre y apellidos`, `Edad`, `DNI/NIE/Pasaporte`,
         `Ciudad de residencia`, `Sexo`, `Teléfono`.
       * Si menor: Datos Padre/Madre/Tutor
         (`Nombre y apellidos`, `DNI/NIE/Pasaporte`).
    3. Asignar estado `en_espera`. Registra `timestamp_admision`
       e `ID_nombre_admisionista`.
    4. Asignar `orden` de atención.

  * **perfil_boxes** — seleccionar número de box (1–10):
    1. Monitor de pacientes en espera ordenados por `orden`.
    2. Acción UPDATE — registro existente.
    3. Al abrir un paciente → asignar estado `en_consulta`.
       Registra `timestamp_inicio_consulta` e `ID_nombre_box`.
       * Acceso a Doc-2 y Doc-3 desde el box.
    4. Al cerrar la atención → asignar estado `archivado`.
       Registra `timestamp_fin_consulta`.
    5. Todas las asistencias quedan registradas en el
       Doc-1 del DRP vinculado.

  * Añadir filiación a DRP | Cancelar.
  * Acción adicional durante el DRP: Cerrar_módulo_filiación.
  * Automáticos: `timestamp_apertura_modulo` (al crear),
    `timestamp_cierre_modulo` (al cerrar o finalizar DRP vinculado).
