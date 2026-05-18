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
    2. Crea un PIN de 6 dígitos con validez de 10 minutos.
    3. La BBDD reconoce el PIN y al introducirse en cualquier
       terminal inyecta una cookie segura permanente
       (hasta eliminación manual en Supabase).
    4. El terminal accede a `estado_1` con rol `invitado`.
    5. El checkout no destruye la cookie — el terminal
       queda registrado como oficial de forma indefinida.
    * UI: botón redondo con texto `Pedir una galleta`.

  * Ambos tokens se registran en tabla `sesiones_emergencia`
    con `tipo`, `created_at`, `expires_at`, `id_terminal` y `consumido_at`.
    Edge Function purga automáticamente los expirados.

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
    * Mensajes internos entre roles *(a definir en detalle
      cuando se implemente el sistema de mensajería)*.
  * Flujo de estados y acciones: ver `componentes.md → flujos_transicion`.

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
    * Badge `condicion_tecnica`: `operativo` | `averiado_leve` | `inoperativo_critico`.
    * Coordenadas GPS (lat, lon) con timestamp del último ping o del historial
      (ver `logic.md §29` para el mecanismo de obtención).
  * **Acciones por tarjeta:**
    * `Solicitar Ubicación` — icono `ti-map-pin`. Dispara el mecanismo de ping de
      coordenadas descrito en `logic.md §29`. El botón se deshabilita durante la
      solicitud activa para evitar pings duplicados.
    * `Copiar Coordenadas` — icono `ti-copy` que transiciona a `ti-check` al copiar
      lat/lon al portapapeles. Sólo activo si hay coordenadas disponibles.
