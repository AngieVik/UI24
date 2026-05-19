# rbac_y_permisos

> La seguridad real recae en políticas RLS de Supabase (PostgreSQL).
> La visibilidad de componentes en el DOM es cosmética — complementaria, no sustitutiva.
> Ver `rules.md §4` para la directiva arquitectónica de RLS obligatorio.

---

## 1. Modelo de seguridad: RBAC + Claims

U24 usa un modelo **mixto RBAC + Claims** en el JWT.

### Por qué Claims y no solo Roles

Las políticas RLS **no leen el campo `role` del JWT directamente**.
Leen claims booleanos específicos inyectados en el JWT al generar la sesión:

```sql
-- Política RLS con claims (correcto)
CREATE POLICY "edit_inventory" ON inventario
  FOR UPDATE USING (
    (auth.jwt() -> 'app_claims' ->> 'can_edit_inventory')::boolean = true
  );

-- Política RLS con roles (prohibido en U24)
-- FOR UPDATE USING (auth.jwt() ->> 'role' = 'logistica');
```

**Beneficio:** si en el futuro el rol `coordinación` necesita editar inventario,
solo se añade `can_edit_inventory: true` a su perfil de claims al emitir el JWT.
Ninguna política SQL se toca.

### Dónde se generan los claims

Supabase Auth Hook (Edge Function `set_claims`) ejecutado al emitir cada JWT (login + refresh).
Lee `rol` y `activo` del empleado desde `fichas_empleados` y mapea los claims correspondientes.
Si `activo = false`, devuelve claims vacíos — acceso denegado sin revocar el JWT.

```typescript
// Pseudocódigo del hook (Deno Edge Function — auth.hook.jwt_claims)
const { rol, activo } = await supabaseAdmin
  .from('fichas_empleados')
  .select('rol, activo')
  .eq('auth_user_id', authUserId)
  .single()

if (!activo) return { app_claims: {} } // empleado desactivado — sin claims

const claims = buildClaims(rol)
// Resultado: { app_claims: { can_edit_inventory: true, can_view_inventory: true, ... } }
```

---

## 2. Catálogo de claims

| Claim | Descripción | Roles que lo reciben por defecto |
|---|---|---|
| `can_view_inventory` | Ver stock e inventario maestro | `logistica`, `responsable_logistica`, `gerencia` |
| `can_edit_inventory` | Modificar stock, cuadres, locations | `logistica`, `responsable_logistica`, `gerencia` |
| `can_manage_catalog` | Añadir / eliminar ítems del catálogo | `responsable_logistica`, `gerencia` |
| `can_manage_templates` | CRUD de plantillas de stock | `responsable_logistica`, `gerencia` |
| `can_manage_drp` | Crear / editar / finalizar DRP | `coordinacion`, `gerencia` |
| `can_view_drp` | Participar en DRP (vista y docs) | `tes`, `due`, `medico`, `coordinacion`, `logistica`, `responsable_logistica`, `gerencia` |
| `can_manage_fleet` | Averías, incidencias, metadata vehículo | `flota`, `responsable_flota`, `gerencia` |
| `can_edit_maintenance` | Registros de mantenimiento preventivo | `responsable_flota`, `gerencia` |
| `can_manage_rrhh` | Turnos, cuadrantes, tablón, vacaciones | `rrhh`, `gerencia` |
| `can_manage_rbac` | Crear usuarios, asignar roles | `coordinacion`, `gerencia` |
| `can_create_emergency_token` | Generar tokens PIN de emergencia | `coordinacion`, `gerencia` |
| `can_view_clinical_docs` | Leer Doc-2 al Doc-5 | `tes`, `due`, `medico`, `coordinacion`, `gerencia` |
| `can_create_clinical_docs` | Crear Doc-2, Doc-4, Doc-5 (SVB) | `tes`, `gerencia` |
| `can_create_clinical_docs_sva` | Crear Doc-3 (SVA/clínico) | `due`, `medico`, `gerencia` |
| `can_manage_modules` | Crear/eliminar módulos PSA y Filiación | `coordinacion`, `gerencia` |
| `can_use_modules` | Entrar y operar módulos PSA y Filiación | `logistica`, `responsable_logistica`, `coordinacion`, `gerencia` |

---

## 3. Roles del sistema

| Rol | Descripción |
|---|---|
| `gerencia` | Acceso total. Recibe todos los claims. |
| `coordinacion` | Gestión operativa de DRP, tokens, RBAC y módulos especiales. |
| `logistica` | Inventario, envíos, recepciones, DRP logístico. |
| `responsable_logistica` | Todo lo de `logistica` + gestión de catálogo y plantillas. |
| `flota` | Averías, incidencias y metadata de vehículos. |
| `responsable_flota` | Todo lo de `flota` + mantenimiento preventivo y umbrales de alerta. |
| `tes` | Operativa asistencial SVB. Docs clínicos y DRP. |
| `due` | Operativa asistencial SVA. Docs clínicos avanzados y DRP. |
| `medico` | Operativa clínica. Doc-3 y DRP. |
| `rrhh` | Gestión de personal, turnos, tablón y vacaciones. |
| `invitado` | Asignado automáticamente por cookie de emergencia. Solo Check-in. Sin claims operativos. |

### 3.1 Enum canónico de roles — fuente de verdad

El array `ROLES_VALIDOS` es la única fuente de verdad para la validación de roles en todo el sistema.
Está definido de forma idéntica en dos lugares:

```typescript
// ef_alta_empleado (§50.3 de logic.md) y rpc_cambiar_rol (§55.3 de logic.md)
const ROLES_VALIDOS = [
  'tes', 'due', 'medico',
  'flota', 'responsable_flota',
  'coordinacion',
  'logistica', 'responsable_logistica',
  'rrhh', 'gerencia',
  // 'invitado' NO está aquí: se asigna solo via cookie de emergencia, nunca por RRHH
]
```

**Roles con seed inicial (6 usuarios demo):** `tes`, `flota`, `coordinacion`, `logistica`, `gerencia`, `rrhh`.

**Roles válidos sin seed inicial** — se asignan manualmente en producción según la estructura de cada base:

| Rol | Cuándo se usa |
|---|---|
| `due` | DUE en ambulancia SVA; comparte turno con `tes` |
| `medico` | Médico de guardia; solo Doc-3 y DRP |
| `responsable_flota` | Jefe de flota; autoriza mantenimiento preventivo |
| `responsable_logistica` | Jefe de logística; gestiona catálogo y plantillas |

### 3.2 Comportamiento de `set_claims` ante rol desconocido

El Auth Hook `set_claims` (ver §3 de `rls_y_rpcs.md`) opera de la siguiente manera:

| Situación en `fichas_empleados` | Respuesta de `set_claims` | Efecto |
|---|---|---|
| `activo = false` | `{ app_claims: {} }` | Acceso denegado — sin claims, ninguna policy RLS pasa |
| `activo = true`, rol válido | `{ app_claims: { can_X: true/false, ... } }` | Claims completos según `buildClaims(rol)` |
| `activo = true`, rol desconocido (no en ROLES_VALIDOS) | `{ app_claims: { can_X: false, ... } }` | Todos los claims a `false` — acceso denegado en la práctica |
| Fila no encontrada en fichas_empleados (huérfano en auth.users) | `{ app_claims: {} }` | Acceso denegado — el empleado no existe en el sistema |

> **Invariante:** ningún rol desconocido o inválido en `fichas_empleados.rol` otorga acceso.
> `buildClaims` itera sobre el mapa `ROLE_CLAIMS` y para cada claim devuelve
> `roles.includes(rol)` — si el rol no aparece en ningún array, todos los claims son `false`.
> Es un fallback seguro por diseño, no por excepción explícita.

---

## 4. Reglas de enrutamiento por módulo (frontend cosmético)

| Módulo | Nombre | Claim requerido |
|---|---|---|
| `mod-1` | nucleo_operativa_rutinaria | Cualquier rol operativo autenticado |
| `mod-2` | nucleo_drp | `can_view_drp` |
| `mod-3` | modulos_especiales | `can_use_modules` |
| `mod-4` | nucleo_logistica_almacen | `can_view_inventory` |
| `mod-5` | nucleo_flota_taller | `can_manage_fleet` |
| `mod-6` | nucleo_coordinacion_seguridad | `can_manage_rbac` |
| `mod-7` | nucleo_gestion_rrhh | `can_manage_rrhh` |

---

## 5. Matriz de permisos por entidad (claims que aplican)

| Entidad | INSERT | SELECT | UPDATE | DELETE/ARCHIVE |
| --- | --- | --- | --- | --- |
| **`doc1_asistencias`** (append-only) | `can_create_clinical_docs` o `can_view_drp` (DRP `En_curso`) | `can_view_clinical_docs` | **`FALSE` incondicional — todos los roles** | **`FALSE` incondicional — todos los roles** |
| Doc-2 al Doc-5 (asistenciales) | `can_create_clinical_docs` | `can_view_clinical_docs` | Creador en Borrador | `can_manage_drp` o `gerencia` |
| Doc-3 (clínico SVA) | `can_create_clinical_docs_sva` | `can_view_clinical_docs` | Creador en Borrador | `gerencia` |
| Doc-6 y Doc-10 (logística) | `can_edit_inventory` | `can_view_inventory` | `can_edit_inventory` | `can_edit_inventory` |
| Doc-7 (averías) | `can_manage_fleet` o cualquier rol operativo | `can_manage_fleet` | `can_manage_fleet` | `can_manage_fleet` |
| Doc-8 (parte de trabajo) | Roles operativos | `can_manage_fleet` o `can_manage_rrhh` | Creador en turno | `gerencia` |
| DRP (CRUD y estados) | `can_manage_drp` | `can_view_drp` | `can_manage_drp` | `can_manage_drp` |
| Gestión de usuarios | `can_manage_rbac` | Propio perfil | `can_manage_rbac` | `gerencia` |
| Catálogo de ítems | `can_manage_catalog` | `can_view_inventory` | `can_manage_catalog` | `can_manage_catalog` |
| Plantillas de stock | `can_manage_templates` | `can_view_inventory` | `can_manage_templates` | `can_manage_templates` |
| Inventory locations (CRUD) | `can_edit_inventory` | `can_view_inventory` | `can_edit_inventory` | `can_edit_inventory` |
| Ajuste manual de stock | — | `can_view_inventory` | `can_edit_inventory` | — |
| Mantenimiento preventivo | — | `can_manage_fleet` | `can_edit_maintenance` | — |
| Módulos PSA / Filiación (crear/eliminar) | `can_manage_modules` | `can_use_modules` | `can_manage_modules` | `can_manage_modules` |

> **Nota sobre `doc1_asistencias`:** Esta tabla está **aislada** de las políticas RLS genéricas
> que aplican a Doc-2 al Doc-5. La regla "Creador en Borrador" **no aplica** a Doc-1, que
> no tiene estado Borrador y se escribe de forma append-only concurrente desde múltiples terminales.
> Las políticas RLS para UPDATE y DELETE en `doc1_asistencias` devuelven `FALSE` de forma
> **estricta e incondicional** para todos los roles, garantizando la inmutabilidad a nivel de
> motor SQL. Ver `logic.md §13.3` para la política RLS explícita.
