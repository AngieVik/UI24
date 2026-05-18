# nucleo_operativa_rutinaria

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
