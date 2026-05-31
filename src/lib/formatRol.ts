import type { Rol } from '@/lib/auth-roles'

const ROL_LABELS: Record<string, string> = {
  tes: 'TES',
  due: 'DUE',
  medico: 'Médico',
  flota: 'Flota',
  responsable_flota: 'Resp. flota',
  coordinacion: 'Coordinación',
  logistica: 'Logística',
  responsable_logistica: 'Resp. logística',
  personal_externo: 'Externo',
  gerencia: 'Gerencia',
  rrhh: 'RRHH',
  invitado: 'Invitado',
  sin_rol: 'Sin rol',
  inactivo: 'Inactivo',
}

export function formatRol(rol: Rol | string): string {
  return ROL_LABELS[rol] ?? rol
}

export function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
