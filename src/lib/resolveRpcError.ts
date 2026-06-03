const ERROR_MESSAGES: Record<string, string> = {
  // ── Auth ────────────────────────────────────────────────────
  ERR_AUTH_001: 'Sesión no reconocida. Vuelve a iniciar sesión.',
  ERR_AUTH_002: 'No tienes permiso para esta acción.',
  ERR_AUTH_003: 'No tienes una galleta activa para transferir.',
  ERR_AUTH_004: 'El terminal destino es el mismo que el origen.',

  // ── Step-up ──────────────────────────────────────────────────
  ERR_STEPUP_001: 'Demasiados intentos. Inténtalo en 15 minutos.',
  ERR_STEPUP_002: 'Cuenta no activa.',
  ERR_STEPUP_003: 'No tienes PIN de confirmación configurado. Contacta con RRHH.',
  ERR_STEPUP_004: 'Demasiados intentos. Bloqueado 15 minutos.',
  ERR_STEPUP_005: 'PIN incorrecto.',

  // ── Desbloqueo ───────────────────────────────────────────────
  ERR_DESBLOQUEO_001: 'Ya tienes una solicitud de desbloqueo pendiente.',
  ERR_DESBLOQUEO_002: 'No tienes permiso para gestionar desbloqueos.',
  ERR_DESBLOQUEO_003: 'La solicitud no existe o ha caducado.',

  // ── Vehículo ─────────────────────────────────────────────────
  ERR_VEHICULO_001: 'No tienes permiso para gestionar vehículos.',
  ERR_VEHICULO_002: 'Ya existe un vehículo con esa matrícula.',
  ERR_VEHICULO_003: 'Vehículo no encontrado.',
  ERR_VEHICULO_004: 'El vehículo está en un DRP activo. Retíralo primero.',
  ERR_VEHICULO_005: 'El vehículo tiene un parte de trabajo abierto.',
  ERR_VEHICULO_006: 'El vehículo no está disponible en este momento.',
  ERR_VEHICULO_007: 'La condición técnica del vehículo impide su activación.',
  ERR_VEHICULO_010: 'Estado de vehículo no reconocido.',
  // Alias corto usado en algunos RPCs de DRP
  ERR_VEH_001: 'Vehículo no encontrado.',
  ERR_VEH_003: 'El vehículo no está disponible.',

  // ── Inventario ───────────────────────────────────────────────
  ERR_INVENTARIO_001: 'No tienes permiso para ajustar stock.',
  ERR_INVENTARIO_002: 'Localización no encontrada.',
  ERR_INVENTARIO_003: 'Debes indicar el subgrupo para ajustar stock en un vehículo.',
  ERR_INVENTARIO_004: 'La cantidad debe ser mayor que cero.',
  ERR_INVENTARIO_005: 'Este ítem no existe en el vehículo.',
  ERR_INVENTARIO_006: 'Stock insuficiente.',
  // Alias corto usado en algunos RPCs de DRP
  ERR_INV_001: 'Solo logística o gerencia pueden resolver descuadres.',

  // ── Checklist 360 ────────────────────────────────────────────
  ERR_CHECKLIST_001: 'Debes indicar la criticidad de cada avería detectada.',
  ERR_CHECKLIST_002: 'Checklist no encontrado, ya cerrado o sin permisos.',

  // ── Kilómetros ───────────────────────────────────────────────
  ERR_KM_001: 'El kilómetro de cierre no puede ser menor que el de apertura.',
  ERR_KM_002: 'El kilómetro de inicio no puede ser negativo.',

  // ── DRP ──────────────────────────────────────────────────────
  ERR_DRP_001: 'Solo coordinación o gerencia pueden realizar esta acción en el DRP.',
  ERR_DRP_002: 'DRP no encontrado.',
  ERR_DRP_003: 'El DRP no puede cancelarse en su estado actual.',
  ERR_DRP_004: 'No tienes permiso para asignar mochilas al DRP.',
  ERR_DRP_005: 'Mochila no encontrada.',
  ERR_DRP_006: 'La mochila no está disponible en este momento.',
  ERR_DRP_007: 'No se pueden asignar mochilas a un DRP en este estado.',
  ERR_DRP_008: 'El DRP debe estar en estado "En espera" para iniciar la preparación.',
  ERR_DRP_009: 'El DRP debe estar en "Preparación" para activarse.',
  ERR_DRP_010: 'El DRP debe estar "En curso" para finalizarse.',
  ERR_DRP_011: 'Solo se pueden archivar DRPs finalizados o cancelados.',
  ERR_DRP_012: 'Acción de DRP no válida.',
  ERR_DRP_013: 'No se puede modificar la dotación de un DRP en este estado.',

  // ── Activación / Piloto ──────────────────────────────────────
  ERR_ACTIVACION_001: 'Activación no encontrada.',
  ERR_PILOT_001: 'Se requiere un piloto para activar el vehículo.',

  // ── Filiación ────────────────────────────────────────────────
  ERR_FILIACION_001: 'Sesión de filiación no encontrada o ya cerrada.',
  ERR_FILIACION_002: 'Paciente no encontrado.',
  ERR_FILIACION_003: 'El paciente ya ha recibido el alta.',

  // ── Informe asistencial ──────────────────────────────────────
  ERR_INFORME_001: 'Informe no encontrado, ya cerrado o sin permisos.',

  // ── Empleado / RBAC ──────────────────────────────────────────
  ERR_EMP_001: 'Empleado no encontrado o inactivo.',
  ERR_RBAC_001: 'Solo gerencia o RRHH pueden cambiar roles.',
  ERR_RBAC_002: 'Empleado no encontrado o inactivo.',

  // ── GPS ──────────────────────────────────────────────────────
  ERR_GPS_001: 'No autorizado para actualizar el GPS de este vehículo.',

  // ── Avisos ───────────────────────────────────────────────────
  ERR_AVISO_001: 'Aviso no encontrado.',

  // ── Vacaciones ───────────────────────────────────────────────
  ERR_VAC_001: 'La fecha de fin debe ser igual o posterior a la de inicio.',
  ERR_VAC_002: 'No se pueden solicitar vacaciones en fechas pasadas.',
  ERR_VAC_003: 'Ya existe una solicitud aprobada o pendiente que se solapa con esas fechas.',
  ERR_VAC_004: 'Solo RRHH o gerencia pueden resolver solicitudes de vacaciones.',
  ERR_VAC_005: 'Decisión no válida. Usa "Aprobada" o "Denegada".',
  ERR_VAC_006: 'Solicitud de vacaciones no encontrada.',
  ERR_VAC_007: 'La solicitud no está en estado pendiente.',

  // ── Configuración ────────────────────────────────────────────
  ERR_CFG_001: 'Solo gerencia puede modificar la configuración del sistema.',

  // ── RGPD ─────────────────────────────────────────────────────
  ERR_RGPD_001: 'Tipo de solicitud RGPD no válido.',
  ERR_RGPD_002: 'Ya existe una solicitud RGPD pendiente para este empleado.',
  ERR_RGPD_003: 'Solo gerencia puede procesar borrados RGPD.',
  ERR_RGPD_004: 'Solicitud RGPD no encontrada o ya procesada.',

  // ── Servicios planificados ───────────────────────────────────
  ERR_SERVICIO_001: 'No tienes permiso para gestionar la planificación de servicios.',
  ERR_SERVICIO_002: 'Servicio planificado no encontrado.',

  // ── Repositorio de documentos ────────────────────────────────
  ERR_REPO_001: 'No tienes permiso para gestionar el repositorio.',
  ERR_REPO_002: 'Documento no encontrado.',

  // ── Autorización terminal ────────────────────────────────────
  ERR_AUTORIZAR_001: 'Fingerprint no reconocido. Contacta con coordinación.',
  ERR_AUTORIZAR_002: 'Sesión no autorizada.',
  ERR_AUTORIZAR_003: 'No se pudo crear el usuario del terminal. Contacta con gerencia.',

  // ── Catálogo de ítems (A4.3) ─────────────────────────────────
  ERR_CATALOGO_001: 'Sin permiso para gestionar el catálogo. Contacta con tu responsable.',
  ERR_CATALOGO_002: 'Ítem del catálogo no encontrado.',

  // ── Subinventarios dinámicos (A4.2) ──────────────────────────
  ERR_SUBINV_001: 'Sin permiso para gestionar inventarios dinámicos.',
  ERR_SUBINV_002: 'Subinventario no encontrado.',
  ERR_SUBINV_003: 'Tipo de subinventario no válido.',

  // ── Plantillas de stock (A4.5) ────────────────────────────────
  ERR_PLANTILLA_001: 'Sin permiso para editar plantillas de stock.',
  ERR_PLANTILLA_002: 'Línea de plantilla no encontrada.',
  ERR_PLANTILLA_003: 'El stock objetivo no puede ser negativo.',

  // ── Envíos en tránsito (A4.7) ─────────────────────────────────
  ERR_ENVIO_001: 'Sin permiso para confirmar envíos.',
  ERR_ENVIO_002: 'Envío no encontrado.',
  ERR_ENVIO_003: 'El envío no puede actualizarse en su estado actual.',

  // ── Incidencias de flota (A5.2) ───────────────────────────────
  ERR_INCIDENCIA_001: 'Sin permiso para gestionar incidencias de flota.',
  ERR_INCIDENCIA_002: 'Incidencia no encontrada o ya archivada.',
  ERR_INCIDENCIA_003: 'Prioridad no válida. Usa: baja, normal, alta, critica.',
  ERR_INCIDENCIA_004: 'Vehículo no encontrado.',

  // ── Permisos por rol (A5.3) ───────────────────────────────────
  ERR_PERMISO_001: 'Sin permiso para consultar la matriz de permisos.',
  ERR_PERMISO_002: 'Solo gerencia puede modificar permisos.',
  ERR_PERMISO_003: 'No se pueden modificar los permisos de gerencia.',
  ERR_PERMISO_004: 'Permiso no encontrado en la tabla.',
}

export function resolveRpcError(error: unknown): string {
  let message: string
  if (error instanceof Error) {
    message = error.message
  } else if (error !== null && typeof error === 'object' && 'message' in error) {
    // PostgrestError de @supabase/supabase-js no extiende Error
    message = String((error as { message: unknown }).message)
  } else {
    message = String(error)
  }
  const match = message.match(/^(ERR_[A-Z_0-9]+)/)
  if (match) {
    return ERROR_MESSAGES[match[1]] ?? `Error inesperado (${match[1]}). Contacta con soporte.`
  }
  const truncated = message.length > 120 ? message.slice(0, 120) + '…' : message
  return `Error inesperado. Contacta con soporte. [${truncated}]`
}
