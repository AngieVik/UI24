/**
 * black-column-nav.ts
 *
 * Árbol de navegación del BlackColumn — Fase B.2 del roadmap de
 * reconstrucción del frontend (2026-05-22).
 *
 * Niveles: raíz → grupo → grupillo (máximo 3).
 *   - NavLeaf:     hoja terminal, selecciona contenido en home_area.
 *   - NavGroup:    grupo de primer nivel (siempre visible en raíz).
 *   - NavGrupillo: sub-grupo dentro de un grupo (segundo nivel).
 *
 * RBAC visual: cada nodo declara `rolesPermitidos`. Un rol que no esté
 * en ese array no ve el item. El RBAC real sigue siendo RLS en la BD.
 *
 * Fuente: 06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md
 *         (sección Fase B → Árbol de navegación aprobado).
 *
 * ⚠️ Deuda D-09 (ver roadmap §Deuda registrada): algunos items de
 * "Visor Mantenimiento", "Mantenimiento flota" y "Modulo_emergencias"
 * podrían ser contenido intra-Screen en lugar de hojas de navegación.
 * Se clarifica en Fase D al implementar cada Screen.
 */

import {
  Activity, AlertCircle, AlertTriangle, Ambulance, ArrowLeftRight,
  ArrowRightLeft, BadgeCheck, Bell, Boxes, BriefcaseMedical, Car,
  ChartBar, ChartNoAxesColumn, ClipboardCheck, ClipboardEdit,
  ClipboardList, Clock, Cog, Cookie, Disc, Disc3, Droplet, Droplets,
  Eye, FileBadge, FileBox, FileText, Filter, FolderOpen, Fuel, Gauge,
  HeartPulse, History, Inbox, KeyRound, Layers, ListChecks, LogOut,
  type LucideIcon, Map, MapPin, Megaphone, MessageSquareWarning,
  Newspaper, Package, PackageCheck, Palmtree, Pin, Puzzle, RadioTower,
  Settings2, ShieldCheck, Sliders, SquareCheck, Table, Tag, Tags,
  ToggleLeft, Truck, UserCircle, Users, Warehouse, Wrench,
} from 'lucide-react'

import type { Rol } from '@/lib/auth-roles'

/* ─────────────────────────────────────────────────────────────────────────
 *  Tipos
 * ───────────────────────────────────────────────────────────────────────── */

export interface NavLeaf {
  kind: 'leaf'
  id: string
  label: string
  icon: LucideIcon
  rolesPermitidos: readonly Rol[]
  /** Si abre modal en lugar de in-place (ej. bandejas, resumen DRP). */
  opensModal?: boolean
  /** Microcopy adicional para tooltips (Fase B.4). */
  hint?: string
}

export interface NavGrupillo {
  kind: 'grupillo'
  id: string
  label: string
  icon: LucideIcon
  rolesPermitidos: readonly Rol[]
  children: readonly NavLeaf[]
}

export interface NavGroup {
  kind: 'group'
  id: string
  label: string
  icon: LucideIcon
  rolesPermitidos: readonly Rol[]
  children: ReadonlyArray<NavLeaf | NavGrupillo>
}

export type NavNode = NavLeaf | NavGrupillo | NavGroup

/* ─────────────────────────────────────────────────────────────────────────
 *  Conjuntos de roles reutilizables
 * ───────────────────────────────────────────────────────────────────────── */

/** Todos los roles operativos (excluye sin_rol e inactivo). */
const TODOS: readonly Rol[] = [
  'tes', 'due', 'medico',
  'flota', 'responsable_flota',
  'coordinacion',
  'logistica', 'responsable_logistica',
  'personal_externo',
  'gerencia', 'rrhh',
  'invitado',
] as const

const PERSONAL_SANITARIO: readonly Rol[] = ['tes', 'due', 'medico'] as const

const FLOTA_ALL:     readonly Rol[] = ['flota', 'responsable_flota', 'gerencia'] as const
const FLOTA_RESP:    readonly Rol[] = ['responsable_flota', 'gerencia'] as const

const LOG_ALL:       readonly Rol[] = ['logistica', 'responsable_logistica', 'gerencia'] as const
const LOG_RESP:      readonly Rol[] = ['responsable_logistica', 'gerencia'] as const

const COORD_ALL:     readonly Rol[] = ['coordinacion', 'gerencia'] as const
const RRHH_ALL:      readonly Rol[] = ['rrhh', 'gerencia'] as const
const GERENCIA_ONLY: readonly Rol[] = ['gerencia'] as const

/** Roles con acceso a la operativa rutinaria del turno (Doc-6, Doc-8, repostaje…). */
const OPERATIVOS_TURNO: readonly Rol[] = [
  ...PERSONAL_SANITARIO,
  'flota', 'responsable_flota',
  'coordinacion',
  'gerencia',
] as const

/** Roles con acceso a documentos clínicos (Doc-2, Doc-11). */
const ASISTENCIALES: readonly Rol[] = [
  ...PERSONAL_SANITARIO,
  'coordinacion',
  'gerencia',
] as const

/* ─────────────────────────────────────────────────────────────────────────
 *  Hojas fijas (Home, Check-in) — viven fuera del árbol estructural
 *  para que el BlackColumn las renderice siempre arriba.
 * ───────────────────────────────────────────────────────────────────────── */

import { Home, LogIn } from 'lucide-react'

export const NAV_FIXED_LEAVES: readonly NavLeaf[] = [
  {
    kind: 'leaf',
    id: 'home',
    label: 'Home',
    icon: Home,
    rolesPermitidos: TODOS,
    hint: 'Vista raíz del terminal',
  },
  {
    kind: 'leaf',
    id: 'checkin',
    label: 'Check-in',
    icon: LogIn,
    rolesPermitidos: TODOS,
    hint: 'Iniciar o cerrar turno',
  },
] as const

/* ─────────────────────────────────────────────────────────────────────────
 *  Árbol principal — orden = orden vertical en el BlackColumn
 * ───────────────────────────────────────────────────────────────────────── */

export const NAV_TREE: readonly NavNode[] = [
  // ── 1. Operativa rutinaria ─────────────────────────────────────────────
  {
    kind: 'group',
    id: 'operativa',
    label: 'Operativa rutinaria',
    icon: Ambulance,
    rolesPermitidos: OPERATIVOS_TURNO,
    children: [
      {
        kind: 'grupillo',
        id: 'op_docs_turno',
        label: 'Documentos del turno',
        icon: ClipboardList,
        rolesPermitidos: OPERATIVOS_TURNO,
        children: [
          { kind: 'leaf', id: 'doc10_op',  label: 'Doc-10 Envío material',   icon: FileText,       rolesPermitidos: OPERATIVOS_TURNO },
          { kind: 'leaf', id: 'doc6',      label: 'Doc-6 Gasto material',    icon: Package,        rolesPermitidos: OPERATIVOS_TURNO },
          { kind: 'leaf', id: 'doc8',      label: 'Doc-8 Parte de trabajo',  icon: ClipboardList,  rolesPermitidos: OPERATIVOS_TURNO },
          { kind: 'leaf', id: 'chk360',    label: 'Doc-Checklist360',        icon: SquareCheck,    rolesPermitidos: OPERATIVOS_TURNO },
        ],
      },
      {
        kind: 'grupillo',
        id: 'op_docs_clinicos',
        label: 'Documentos clínicos',
        icon: HeartPulse,
        rolesPermitidos: ASISTENCIALES,
        children: [
          { kind: 'leaf', id: 'doc2',  label: 'Doc-2 Informe asistencial', icon: HeartPulse,     rolesPermitidos: ASISTENCIALES },
          { kind: 'leaf', id: 'doc11', label: 'Doc-11 Aviso urgente',      icon: AlertTriangle,  rolesPermitidos: ASISTENCIALES },
        ],
      },
      {
        kind: 'grupillo',
        id: 'op_mantenimiento',
        label: 'Mantenimiento',
        icon: Wrench,
        rolesPermitidos: OPERATIVOS_TURNO,
        children: [
          { kind: 'leaf', id: 'fuel',    label: 'Repostar combustible', icon: Fuel,    rolesPermitidos: OPERATIVOS_TURNO },
          { kind: 'leaf', id: 'adblue',  label: 'Repostar AdBlue',      icon: Droplet, rolesPermitidos: OPERATIVOS_TURNO },
          { kind: 'leaf', id: 'doc7_op', label: 'Doc-7 Informe avería', icon: Cog,     rolesPermitidos: OPERATIVOS_TURNO },
        ],
      },
      { kind: 'leaf', id: 'vehiculos_op', label: 'Vehículos', icon: Disc3, rolesPermitidos: TODOS },
    ],
  },

  // ── 2. DRP ─────────────────────────────────────────────────────────────
  // Visible para roles operativos + logística (acceso a Logística DRP).
  // RRHH e invitado quedan excluidos del black column de DRP.
  {
    kind: 'group',
    id: 'drp',
    label: 'DRP',
    icon: MapPin,
    rolesPermitidos: [...OPERATIVOS_TURNO, 'logistica', 'responsable_logistica'],
    children: [
      { kind: 'leaf', id: 'drp_op',  label: 'Operativa DRP', icon: Activity,    rolesPermitidos: TODOS },
      { kind: 'leaf', id: 'drp_vis', label: 'Visor DRP',     icon: ListChecks,  rolesPermitidos: TODOS },
      { kind: 'leaf', id: 'drp_res', label: 'Resumen DRP',   icon: ChartBar,    rolesPermitidos: COORD_ALL, opensModal: true },
      { kind: 'leaf', id: 'drp_log', label: 'Logística DRP', icon: Package,     rolesPermitidos: [...LOG_ALL, ...COORD_ALL] },
      { kind: 'leaf', id: 'drp_new', label: 'Crear DRP',     icon: ChartNoAxesColumn, rolesPermitidos: COORD_ALL },
      { kind: 'leaf', id: 'drp_est', label: 'Estados DRP',   icon: ToggleLeft,  rolesPermitidos: COORD_ALL },
    ],
  },

  // ── 3. Módulos especiales ──────────────────────────────────────────────
  {
    kind: 'group',
    id: 'modulos',
    label: 'Módulos especiales',
    icon: Puzzle,
    rolesPermitidos: [...LOG_ALL, ...COORD_ALL],
    children: [
      { kind: 'leaf', id: 'mod_psa',       label: 'PSA',       icon: BriefcaseMedical, rolesPermitidos: [...LOG_ALL, ...COORD_ALL] },
      { kind: 'leaf', id: 'mod_filiacion', label: 'Filiación', icon: ClipboardEdit,    rolesPermitidos: [...LOG_ALL, ...COORD_ALL] },
    ],
  },

  // ── 4. Logística y almacén ─────────────────────────────────────────────
  {
    kind: 'group',
    id: 'logistica',
    label: 'Logística y almacén',
    icon: Warehouse,
    rolesPermitidos: LOG_ALL,
    children: [
      {
        kind: 'grupillo',
        id: 'log_inventario',
        label: 'Inventario maestro',
        icon: Boxes,
        rolesPermitidos: LOG_ALL,
        children: [
          { kind: 'leaf', id: 'log_inv_auditoria',  label: 'Auditoría de inventario',     icon: ClipboardCheck, rolesPermitidos: LOG_RESP },
          { kind: 'leaf', id: 'log_inv_locations',  label: 'Inventarios (locations)',     icon: Warehouse,      rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'log_inv_dinamicos',  label: 'Inventarios dinámicos',       icon: Boxes,          rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'log_catalogo_alt',   label: 'Catálogo de ítems',           icon: Tags,           rolesPermitidos: LOG_RESP },
          { kind: 'leaf', id: 'log_descuadres',     label: 'Descuadres y ajuste manual',  icon: AlertCircle,    rolesPermitidos: LOG_RESP },
        ],
      },
      {
        kind: 'grupillo',
        id: 'log_stock',
        label: 'Stock',
        icon: Layers,
        rolesPermitidos: LOG_ALL,
        children: [
          { kind: 'leaf', id: 'log_stock_actual',    label: 'Stock actual',        icon: Layers,  rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'log_stock_historial', label: 'Historial de stock',  icon: Clock,   rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'log_stock_plantillas',label: 'Plantillas de stock', icon: FileBox, rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'log_stock_gestion',   label: 'Gestión de plantillas', icon: Settings2, rolesPermitidos: LOG_RESP },
          { kind: 'leaf', id: 'log_stock_alertas',   label: 'Alertas de stock',    icon: Bell,    rolesPermitidos: LOG_ALL },
        ],
      },
      {
        kind: 'grupillo',
        id: 'log_movimientos',
        label: 'Movimientos',
        icon: ArrowRightLeft,
        rolesPermitidos: LOG_ALL,
        children: [
          { kind: 'leaf', id: 'log_mov_ultimos',  label: 'Últimos movimientos',    icon: Activity,      rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'log_mov_transito', label: 'Inventario en tránsito', icon: Truck,         rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'doc9',             label: 'Doc-9 Entrada almacén',  icon: PackageCheck,  rolesPermitidos: LOG_ALL },
          { kind: 'leaf', id: 'doc10_log',        label: 'Doc-10 Envío material',  icon: ArrowLeftRight,rolesPermitidos: LOG_ALL },
        ],
      },
      { kind: 'leaf', id: 'log_catalogo',     label: 'Catálogo de ítems',  icon: Tags,  rolesPermitidos: LOG_RESP },
      { kind: 'leaf', id: 'log_bandeja',      label: 'Bandeja logística',  icon: Inbox, rolesPermitidos: LOG_ALL, opensModal: true },
    ],
  },

  // ── 5. Flota y taller ──────────────────────────────────────────────────
  {
    kind: 'group',
    id: 'flota',
    label: 'Flota y taller',
    icon: Car,
    rolesPermitidos: FLOTA_ALL,
    children: [
      {
        kind: 'grupillo',
        id: 'flota_incidencias',
        label: 'Incidencias',
        icon: AlertCircle,
        rolesPermitidos: FLOTA_ALL,
        children: [
          { kind: 'leaf', id: 'flota_inc_abiertas', label: 'Incidencias abiertas', icon: AlertCircle, rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'flota_inc_ancladas', label: 'Incidencias ancladas', icon: Pin,         rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'flota_inc_ultimas',  label: 'Últimas incidencias',  icon: Clock,       rolesPermitidos: FLOTA_ALL },
        ],
      },
      {
        // ✋ Deuda D-09: estos items podrían ser intra-Screen.
        kind: 'grupillo',
        id: 'flota_visor_mant',
        label: 'Visor mantenimiento',
        icon: Gauge,
        rolesPermitidos: FLOTA_ALL,
        children: [
          { kind: 'leaf', id: 'fvm_tabla',     label: 'Tabla principal',           icon: Table,    rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fvm_badges',    label: 'Badges de estado',          icon: Tag,      rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fvm_filtros',   label: 'Filtros y orden',           icon: Filter,   rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fvm_detalle',   label: 'Vista de detalle',          icon: Eye,      rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fvm_umbrales',  label: 'Configuración de umbrales', icon: Sliders,  rolesPermitidos: FLOTA_RESP },
          { kind: 'leaf', id: 'fvm_doc7',      label: 'Doc-7 Informe avería',      icon: Cog,      rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fvm_incidencias',label: 'Incidencias',              icon: AlertCircle, rolesPermitidos: FLOTA_ALL },
        ],
      },
      {
        // ✋ Deuda D-09.
        kind: 'grupillo',
        id: 'flota_mant',
        label: 'Mantenimiento flota',
        icon: Settings2,
        rolesPermitidos: FLOTA_ALL,
        children: [
          { kind: 'leaf', id: 'flota_mant_aceite', label: 'Aceite',      icon: Droplets, rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'flota_mant_frenos', label: 'Frenos',      icon: Disc,     rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'flota_mant_neum',   label: 'Neumáticos',  icon: Disc3,    rolesPermitidos: FLOTA_ALL },
        ],
      },
      {
        kind: 'grupillo',
        id: 'flota_metadata',
        label: 'Vehículos metadata',
        icon: FileBadge,
        rolesPermitidos: FLOTA_ALL,
        children: [
          { kind: 'leaf', id: 'fmeta_docs',    label: 'Documentación y dispositivo', icon: FileBadge, rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fmeta_km',      label: 'Kilometraje general',         icon: Gauge,     rolesPermitidos: FLOTA_ALL },
          { kind: 'leaf', id: 'fmeta_eventos', label: 'Historial eventos físicos',   icon: History,   rolesPermitidos: FLOTA_ALL },
        ],
      },
      { kind: 'leaf', id: 'flota_bandeja', label: 'Bandeja flota', icon: Inbox, rolesPermitidos: FLOTA_ALL, opensModal: true },
    ],
  },

  // ── 6. Coordinación y seguridad ────────────────────────────────────────
  {
    kind: 'group',
    id: 'coord',
    label: 'Coordinación y seguridad',
    icon: ShieldCheck,
    rolesPermitidos: COORD_ALL,
    children: [
      {
        // ✋ Deuda D-09.
        kind: 'grupillo',
        id: 'coord_emergencias',
        label: 'Módulo emergencias',
        icon: Cookie,
        rolesPermitidos: COORD_ALL,
        children: [
          { kind: 'leaf', id: 'emerg_galleta_pq', label: 'Galleta pequeña', icon: Cookie, rolesPermitidos: COORD_ALL },
          { kind: 'leaf', id: 'emerg_galleta',    label: 'Galleta',         icon: Cookie, rolesPermitidos: COORD_ALL },
        ],
      },
      { kind: 'leaf', id: 'coord_dispositivos', label: 'Dispositivos validados',       icon: ShieldCheck, rolesPermitidos: COORD_ALL },
      { kind: 'leaf', id: 'coord_visor',        label: 'Visor seguimiento operativo',  icon: Map,         rolesPermitidos: COORD_ALL },
      { kind: 'leaf', id: 'coord_rbac',         label: 'RBAC',                         icon: Users,       rolesPermitidos: GERENCIA_ONLY },
      { kind: 'leaf', id: 'coord_force_chk',    label: 'Forzar checkout',              icon: LogOut,      rolesPermitidos: COORD_ALL },
      { kind: 'leaf', id: 'coord_password',     label: 'Cambio de password',           icon: KeyRound,    rolesPermitidos: COORD_ALL },
      { kind: 'leaf', id: 'coord_bandeja',      label: 'Bandeja coordinación',         icon: Inbox,       rolesPermitidos: COORD_ALL, opensModal: true },
    ],
  },

  // ── 7. Gestión y RRHH ──────────────────────────────────────────────────
  {
    kind: 'group',
    id: 'rrhh',
    label: 'Gestión y RRHH',
    icon: BadgeCheck,
    rolesPermitidos: RRHH_ALL,
    children: [
      {
        kind: 'grupillo',
        id: 'rrhh_personal',
        label: 'Personal',
        icon: UserCircle,
        rolesPermitidos: RRHH_ALL,
        children: [
          { kind: 'leaf', id: 'rrhh_fichas', label: 'Fichas empleados',  icon: UserCircle, rolesPermitidos: RRHH_ALL },
          { kind: 'leaf', id: 'rrhh_bajas',  label: 'Gestión de bajas',  icon: BadgeCheck, rolesPermitidos: RRHH_ALL },
        ],
      },
      {
        kind: 'grupillo',
        id: 'rrhh_planificacion',
        label: 'Planificación laboral',
        icon: Settings2,
        rolesPermitidos: RRHH_ALL,
        children: [
          { kind: 'leaf', id: 'rrhh_servicios',     label: 'Servicios',          icon: Settings2,  rolesPermitidos: RRHH_ALL },
          { kind: 'leaf', id: 'rrhh_mantenimiento', label: 'Mantenimiento',      icon: Wrench,     rolesPermitidos: RRHH_ALL },
          { kind: 'leaf', id: 'doc12',              label: 'Doc-12 Vacaciones',  icon: Palmtree,   rolesPermitidos: RRHH_ALL },
        ],
      },
      {
        kind: 'grupillo',
        id: 'rrhh_comunicacion',
        label: 'Comunicación',
        icon: Megaphone,
        rolesPermitidos: RRHH_ALL,
        children: [
          { kind: 'leaf', id: 'rrhh_tablon',     label: 'Gestión tablón', icon: Newspaper,  rolesPermitidos: RRHH_ALL },
          { kind: 'leaf', id: 'rrhh_marquesina', label: 'Marquesina',     icon: RadioTower, rolesPermitidos: RRHH_ALL },
        ],
      },
      { kind: 'leaf', id: 'rrhh_repositorio', label: 'Repositorio documentos', icon: FolderOpen, rolesPermitidos: TODOS },
      { kind: 'leaf', id: 'rrhh_bandeja',     label: 'Bandeja RRHH',           icon: Inbox,      rolesPermitidos: RRHH_ALL, opensModal: true },
    ],
  },

  // ── 8. Tablón central (hoja raíz) ──────────────────────────────────────
  { kind: 'leaf', id: 'tablon', label: 'Tablón central', icon: Megaphone, rolesPermitidos: TODOS },

  // ── 9. Buzón interno Doc-13 (hoja raíz) ────────────────────────────────
  { kind: 'leaf', id: 'doc13', label: 'Buzón interno (Doc-13)', icon: MessageSquareWarning, rolesPermitidos: TODOS },
] as const

/* ─────────────────────────────────────────────────────────────────────────
 *  Helpers — recorrer / filtrar / encontrar
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Devuelve true si el rol tiene permiso para ver el nodo.
 * `sin_rol` e `inactivo` nunca ven nada.
 */
export function rolPuedeVer(node: NavNode | NavLeaf, rol: Rol | null | undefined): boolean {
  if (rol == null || rol === 'sin_rol' || rol === 'inactivo') return false
  return node.rolesPermitidos.includes(rol)
}

/**
 * Devuelve un árbol nuevo que solo incluye nodos visibles para `rol`.
 * Grupos vacíos tras filtrado se eliminan también.
 */
export function filterByRol(
  tree: readonly NavNode[],
  rol: Rol | null | undefined,
): NavNode[] {
  return tree
    .filter((node) => rolPuedeVer(node, rol))
    .map((node): NavNode | null => {
      if (node.kind === 'leaf') return node
      if (node.kind === 'grupillo') {
        const childrenVisible = node.children.filter((c) => rolPuedeVer(c, rol))
        return childrenVisible.length > 0 ? { ...node, children: childrenVisible } : null
      }
      // group
      const childrenVisible = node.children
        .map((c): (NavLeaf | NavGrupillo) | null => {
          if (c.kind === 'leaf') return rolPuedeVer(c, rol) ? c : null
          if (!rolPuedeVer(c, rol)) return null
          const gChildren = c.children.filter((leaf) => rolPuedeVer(leaf, rol))
          return gChildren.length > 0 ? { ...c, children: gChildren } : null
        })
        .filter((c): c is NavLeaf | NavGrupillo => c !== null)
      return childrenVisible.length > 0 ? { ...node, children: childrenVisible } : null
    })
    .filter((n): n is NavNode => n !== null)
}

/**
 * Encuentra un nodo por id en cualquier nivel del árbol (incluyendo
 * hojas fijas Home/Check-in).
 */
export function findNode(
  id: string,
  tree: readonly NavNode[] = NAV_TREE,
  fixed: readonly NavLeaf[] = NAV_FIXED_LEAVES,
): NavNode | null {
  for (const leaf of fixed) {
    if (leaf.id === id) return leaf
  }
  for (const node of tree) {
    if (node.id === id) return node
    if (node.kind === 'group') {
      for (const child of node.children) {
        if (child.id === id) return child
        if (child.kind === 'grupillo') {
          for (const leaf of child.children) {
            if (leaf.id === id) return leaf
          }
        }
      }
    }
  }
  return null
}

/**
 * Devuelve la lista de ids desde la raíz hasta el nodo (inclusive).
 * Para un grupillo: [groupId, grupilloId].
 * Para una hoja: [groupId?, grupilloId?, leafId].
 * Para hoja fija (Home, Check-in): [leafId].
 */
export function getPathTo(
  id: string,
  tree: readonly NavNode[] = NAV_TREE,
  fixed: readonly NavLeaf[] = NAV_FIXED_LEAVES,
): string[] | null {
  for (const leaf of fixed) {
    if (leaf.id === id) return [leaf.id]
  }
  for (const node of tree) {
    if (node.id === id) return [node.id]
    if (node.kind === 'group') {
      for (const child of node.children) {
        if (child.id === id) return [node.id, child.id]
        if (child.kind === 'grupillo') {
          for (const leaf of child.children) {
            if (leaf.id === id) return [node.id, child.id, leaf.id]
          }
        }
      }
    }
  }
  return null
}

/**
 * Devuelve los hijos directos del nodo identificado por `parentId`.
 * Si `parentId` es null o no se encuentra → devuelve el primer nivel.
 */
export function getChildrenOf(
  parentId: string | null,
  tree: readonly NavNode[] = NAV_TREE,
): readonly NavNode[] {
  if (parentId == null) return tree
  const node = findNode(parentId, tree)
  if (node == null) return tree
  if (node.kind === 'leaf') return []
  return node.children as readonly NavNode[]
}
