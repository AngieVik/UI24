# rbac_y_permisos

* La seguridad real recae en políticas RLS de Supabase
  (PostgreSQL). La visibilidad de rutas y componentes
  en el DOM es solo cosmética — complementaria, no
  sustitutiva.

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| `gerencia` | Acceso total. |
| `coordinación` | Gestión operativa de DRP, tokens de emergencia, RBAC. |
| `logística` | Gestión de inventario, envíos y recepciones. |
| `responsable_logistica` | Todo lo de `logística` + gestión del catálogo de ítems (añadir/eliminar). |
| `flota` | Gestión de averías, incidencias y metadata de vehículos. |
| `responsable_flota` | Todo lo de `flota` + edición de registros de mantenimiento preventivo y umbrales de alerta. |
| `tes` | Operativa asistencial SVB. Acceso a docs clínicos y DRP. |
| `due` | Operativa asistencial SVA. Acceso a docs clínicos avanzados y DRP. |
| `médico` | Operativa clínica. Acceso a Doc-3 y DRP. |
| `rrhh` | Gestión de personal, turnos, tablón y vacaciones. |
| `mantenimiento` | Acceso de mantenimiento técnico (a definir). |
| `responsable_equipo` | Acceso de responsable de equipo (a definir). |
| `invitado` | Asignado automáticamente por cookie de emergencia. Solo acceso a Check-in. |

---

## Reglas de enrutamiento por módulo

| Módulo | Nombre | Roles autorizados |
|---|---|---|
| `mod-1` | nucleo_operativa_rutinaria | Todos los roles operativos y de gestión |
| `mod-2` | nucleo_drp | `tes`, `due`, `médico`, `coordinación`, `gerencia`, `logística`, `responsable_logistica` |
| `mod-3` | modulos_especiales | `logística`, `responsable_logistica`, `coordinación`, `gerencia` |
| `mod-4` | nucleo_logistica_almacen | `logística`, `responsable_logistica`, `gerencia` |
| `mod-5` | nucleo_flota_taller | `flota`, `responsable_flota`, `gerencia` |
| `mod-6` | nucleo_coordinacion_seguridad | `coordinación`, `gerencia` |
| `mod-7` | nucleo_gestion_rrhh | `rrhh`, `gerencia` |

---

## Matriz de permisos específicos por entidad

| Entidad / Acción | Crear (INSERT) | Leer (SELECT) | Actualizar (UPDATE) | Archivar / Eliminar |
|---|---|---|---|---|
| Doc-1 al Doc-5 (Clínicos) | `tes`, `due`, `médico` | Creador, `coordinación`, `gerencia` | Creador (en Borrador) | Creador, `coordinación`, `gerencia` |
| Doc-6 y Doc-10 (Logística) | Operativos, `logística`, `responsable_logistica` | `logística`, `responsable_logistica`, `gerencia` | `logística`, `responsable_logistica` | `logística`, `responsable_logistica`, `gerencia` |
| Doc-7 (Averías) | Operativos, `flota`, `responsable_flota` | `flota`, `responsable_flota`, `gerencia` | `flota`, `responsable_flota` | `flota`, `responsable_flota`, `gerencia` |
| Doc-8 (Parte de trabajo) | Operativos | `flota`, `responsable_flota`, `rrhh`, `gerencia` | Operativos (en turno) | `gerencia` |
| Gestión DRP (Crear/Asignar) | `coordinación`, `gerencia` | Todos (si están asignados) | `coordinación`, `gerencia` | `coordinación`, `gerencia` |
| Gestión Usuarios (RRHH) | `rrhh`, `gerencia` | Todos (su propio perfil) | `rrhh`, `gerencia` | `gerencia` |
| Catálogo de ítems | `responsable_logistica`, `gerencia` | Todos los roles logísticos | `responsable_logistica`, `gerencia` | `responsable_logistica`, `gerencia` |
| Plantillas de stock | `responsable_logistica`, `gerencia` | `logística`, `responsable_logistica`, `gerencia` | `responsable_logistica`, `gerencia` | `responsable_logistica`, `gerencia` |
| Inventory locations (CRUD) | `logística`, `responsable_logistica`, `gerencia` | `logística`, `responsable_logistica`, `gerencia` | `logística`, `responsable_logistica`, `gerencia` | `logística`, `responsable_logistica`, `gerencia` |
| Ajuste manual de stock | — | `logística`, `responsable_logistica`, `gerencia` | `logística`, `responsable_logistica`, `gerencia` | — |
| Mantenimiento preventivo vehículos | — | `flota`, `responsable_flota`, `gerencia` | `responsable_flota`, `gerencia` | — |
| Umbrales alerta mantenimiento | — | `flota`, `responsable_flota`, `gerencia` | `responsable_flota`, `gerencia` | — |
