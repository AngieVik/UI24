# terminal_check

* Componente de autenticación reutilizado en dos contextos:
  * **estado_0:** ocupa pantalla completa, centrado, sin chrome.
  * **estado_1 (black_column → Check-in):** modal superpuesto sobre
    el home_area. La cookie ya está validada, no se reverifica.

* **Regla estricta:** siempre requiere conexión a internet activa para el flujo online.

* **Acceso offline (modo degradado):**
  * Disponible cuando el terminal detecta timeout de red (> 5s).
  * Se muestra la opción: "Sin conexión — Acceso de consulta".
  * Campos requeridos: `ID_nombre` + `Contraseña` (ambos obligatorios).
    No existe bypass de contraseña en modo offline.
  * Verificación local contra `password_hash` almacenado en `u24_offline_session`
    (bcrypt.compare — hash calculado en servidor durante el check-in online previo).
  * Si la verificación es válida → `estado_1` en modo DEGRADADO (solo lectura).
    Banner visible: "⚠️ Modo sin conexión — Solo lectura".
  * Si cualquier validación falla → mensaje genérico "Credenciales incorrectas
    o sesión no disponible." Sin especificar la causa exacta.
  * Si no existe `u24_offline_session` para ese `ID_nombre` en el terminal
    (nunca hizo check-in online en este dispositivo) → el sistema comprueba si
    existe un token precargado `u24_offline_session_next:{ID_nombre}` (generado
    por el servidor 2 h antes del relevo — ver `logic.md §25.6`). Si existe y
    es válido → acceso degradado con banner "Turno pendiente de inicio".
    Si tampoco existe → acceso denegado.
  * Ver `logic.md §25.2–25.3` para el payload completo y el flujo de validación.
  * Ver `logic.md §25.6` para el mecanismo de pre-caché de turno siguiente.

* **Botón condicional — "Acceder como Invitado Operativo":**

  Visible **únicamente** cuando el terminal está en `estado_0`
  Y `useAuthStore` detecta la persistencia de una `galleta` válida
  (tipo `'galleta'` — cookie permanente, no la `galleta_pequeña` temporal).

  ```
  Condición de renderizado:
    useTerminalStore.estado === 'estado_0'
    ∧ useAuthStore.tipoSesion === 'galleta'   ← cookie permanente detectada en localStorage
    ∧ galleta.expires_at === null             ← las galletas permanentes no expiran por TTL
  ```

  **Comportamiento al pulsar:**
  1. No solicita credenciales.
  2. El terminal transiciona directamente a `estado_1` con rol `invitado`.
  3. `useAuthStore.rol = 'invitado'` — sin ID_nombre en `checkin_on`.
  4. El personal puede entonces usar Check-in (icono black_column) para
     autenticarse con sus credenciales propias y elevar permisos al rol real.

  **Justificación:**
  La `galleta` permanente certifica que ese terminal fue registrado previamente
  como oficial. Si el terminal cayó a `estado_0` por timeout de sesión, pérdida
  de conexión o cierre del último usuario, la galleta garantiza que el hardware
  es de confianza. El botón evita que el personal tenga que esperar al coordinador
  para obtener un PIN de emergencia en situaciones de urgencia operativa.

  **Seguridad:**
  * Solo restaura el estado `invitado` — no otorga permisos operativos directamente.
  * El rol `invitado` no tiene acceso a ningún núcleo más allá del formulario de check-in.
  * Para operar, siempre se requiere el check-in con credenciales reales.
  * Si la galleta ha sido eliminada manualmente en Supabase, el botón no aparece.

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
