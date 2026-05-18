# terminal_check

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
    a ID_nombre y registra `timestamp_checkin`.
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
  * La sesión de ese ID_nombre se archiva con `timestamp_checkout`.
  * **Si ese ID_nombre tenía estado `pilot` activo:**
    * Flujo automático de cierre (mismo que desactivación manual):
      1. Modal: solicita `km_fin` antes de proceder.
      2. Se registran `km_fin` y `timestamp_fin` en Doc-8,
         cerrando todos los estados activos del vehículo.
      3. Si el vehículo estaba en un DRP, se registra
         `timestamp_salida_drp` automáticamente.
      4. Doc-8 pasa a estado `Enviado_Cerrado`.
      5. Estado `pilot` eliminado del ID_nombre.
      6. ID_vehiculo pasa a `en_espera` — puede quedar con
         carries emparejados en espera de nuevo pilot.
  * **Si ese ID_nombre tenía estado `carry` activo:**
    * Se desempareja del vehículo sin solicitar km.
    * El vehículo permanece en su estado actual.
    * Si el vehículo queda sin pilot → pasa a `en_espera`.
  * **Regla carry sin pilot:**
    * Un carry puede quedar emparejado a un vehículo en
      `en_espera` sin pilot. El sistema lo permite.
    * Desde `visual_info_home`: promover carry a pilot
      o esperar la asignación de un nuevo pilot.
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
