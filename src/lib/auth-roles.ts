/**
 * Roles del sistema U24 — fuente de verdad del tipo `Rol`.
 *
 * Los valores derivan del enum Postgres `public.rol_empleado` más los dos
 * fallbacks que devuelve el Custom Access Token Hook (`sin_rol`,
 * `inactivo`) cuando el usuario no tiene ficha o está dado de baja.
 *
 * Ver: supabase/migrations/20260522000002_custom_access_token_hook.sql
 */

export const ROL_VALUES = [
  // Roles operativos (mismo nombre que en el enum rol_empleado de Postgres)
  'tes',
  'due',
  'medico',
  'flota',
  'responsable_flota',
  'coordinacion',
  'logistica',
  'responsable_logistica',
  'personal_externo',
  'gerencia',
  'rrhh',
  'invitado',
  // Fallbacks que NO existen en el enum BD — los devuelve el hook
  'sin_rol',
  'inactivo',
] as const

export type Rol = (typeof ROL_VALUES)[number]

export function isRol(value: unknown): value is Rol {
  return typeof value === 'string' && (ROL_VALUES as readonly string[]).includes(value)
}

/**
 * Roles que tienen sesión funcional. Cualquier otro debe ser redirigido
 * a logout o pantalla de "Sesión deshabilitada".
 */
export const ROLES_ACTIVOS: ReadonlySet<Rol> = new Set<Rol>([
  'tes',
  'due',
  'medico',
  'flota',
  'responsable_flota',
  'coordinacion',
  'logistica',
  'responsable_logistica',
  'personal_externo',
  'gerencia',
  'rrhh',
  'invitado',
])

export function esRolActivo(rol: Rol | null | undefined): boolean {
  return rol != null && ROLES_ACTIVOS.has(rol)
}
