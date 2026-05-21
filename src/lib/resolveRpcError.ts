const ERROR_MESSAGES: Record<string, string> = {
  ERR_AUTH_001: 'Sesión no reconocida. Vuelve a iniciar sesión.',
  ERR_AUTH_002: 'No tienes permiso para esta acción.',
  ERR_AUTH_003: 'No tienes una galleta activa para transferir.',
  ERR_AUTH_004: 'El terminal destino es el mismo que el origen.',

  ERR_STEPUP_001: 'Demasiados intentos. Inténtalo en 15 minutos.',
  ERR_STEPUP_002: 'Cuenta no activa.',
  ERR_STEPUP_003: 'No tienes PIN de confirmación configurado. Contacta con RRHH.',
  ERR_STEPUP_004: 'Demasiados intentos. Bloqueado 15 minutos.',
  ERR_STEPUP_005: 'PIN incorrecto.',

  ERR_DESBLOQUEO_001: 'Ya tienes una solicitud de desbloqueo pendiente.',
  ERR_DESBLOQUEO_002: 'No tienes permiso para gestionar desbloqueos.',
  ERR_DESBLOQUEO_003: 'La solicitud no existe o ha caducado.',

  ERR_VEHICULO_001: 'No tienes permiso para gestionar vehículos.',
  ERR_VEHICULO_002: 'Ya existe un vehículo con esa matrícula.',
  ERR_VEHICULO_003: 'Vehículo no encontrado.',
  ERR_VEHICULO_004: 'El vehículo está en un DRP activo. Retíralo primero.',
  ERR_VEHICULO_005: 'El vehículo tiene un parte de trabajo abierto.',

  ERR_INVENTARIO_001: 'No tienes permiso para ajustar stock.',
  ERR_INVENTARIO_002: 'Localización no encontrada.',
  ERR_INVENTARIO_003: 'Debes indicar el subgrupo para ajustar stock en un vehículo.',
  ERR_INVENTARIO_004: 'La cantidad debe ser mayor que cero.',
  ERR_INVENTARIO_005: 'Este ítem no existe en el vehículo.',
  ERR_INVENTARIO_006: 'Stock insuficiente.',

  ERR_CHECKLIST_001: 'Debes indicar la criticidad de cada avería detectada.',

  ERR_KM_001: 'El kilómetro de cierre no puede ser menor que el de apertura.',
}

export function resolveRpcError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/^(ERR_[A-Z_0-9]+)/)
  if (match) {
    return ERROR_MESSAGES[match[1]] ?? 'Error inesperado. Contacta con soporte.'
  }
  return 'Error inesperado. Contacta con soporte.'
}
