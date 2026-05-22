import { useState } from 'react'
import {
  Activity, AlertCircle, AlertTriangle, Ambulance,
  ArrowLeftRight, BadgeCheck, BarChart3, BriefcaseMedical, Building2,
  Calendar, CalendarDays, CalendarX, Car, ChartBar, ChevronRight,
  CircleAlert, ClipboardEdit, ClipboardList, Cog, Cookie, Disc3,
  Droplet, FileText, FolderOpen, Fuel, HeartPulse, History, Home,
  IdCard, Inbox, ListChecks, LogIn, type LucideIcon, MapPin, Megaphone,
  MessageSquareWarning, Newspaper, Package, PackageCheck, Palmtree,
  Puzzle, RadioTower, Settings2, ShieldCheck, SquareCheck,
  Tags, ToggleLeft, Truck, UserCircle, Users, Warehouse,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import logoMark from '@/assets/logo.svg'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────
 *  Árbol de navegación — fuente de verdad en mapeo_visual_ui.md §3
 *  + black_column.md §"Iconos de navegación".
 *  Mapping ti-* → lucide está en diseño_chupiwachi.md §5.
 * ───────────────────────────────────────────────────────────────────────── */

type NavLeaf  = { kind: 'leaf';  id: string; label: string; icon: LucideIcon }
type NavSep   = { kind: 'sep' }
type NavGroup = { kind: 'group'; id: string; label: string; icon: LucideIcon; children: (NavLeaf | NavSep)[] }
type NavItem  = NavLeaf | NavGroup

const NAV: NavItem[] = [
  { kind: 'leaf', id: 'home',    label: 'Home',     icon: Home },
  { kind: 'leaf', id: 'checkin', label: 'Check-in', icon: LogIn },
  {
    kind: 'group', id: 'operativa', label: 'Operativa rutinaria', icon: Ambulance,
    children: [
      { kind: 'leaf', id: 'doc10_op', label: 'Doc-10 Envío material',     icon: FileText },
      { kind: 'leaf', id: 'doc6',     label: 'Doc-6 Gasto material',      icon: Package },
      { kind: 'leaf', id: 'doc8',     label: 'Doc-8 Parte de trabajo',    icon: ClipboardList },
      { kind: 'sep' },
      { kind: 'leaf', id: 'doc2',     label: 'Doc-2 Informe asistencial', icon: HeartPulse },
      { kind: 'leaf', id: 'doc11',    label: 'Doc-11 Aviso urgente',      icon: AlertTriangle },
      { kind: 'leaf', id: 'fuel',     label: 'Repostar combustible',      icon: Fuel },
      { kind: 'leaf', id: 'adblue',   label: 'Repostar AdBlue',           icon: Droplet },
      { kind: 'leaf', id: 'chk360',   label: 'Doc-Checklist360',          icon: SquareCheck },
      { kind: 'leaf', id: 'vehs',     label: 'Vehículos',                 icon: Disc3 },
    ],
  },
  {
    kind: 'group', id: 'drp', label: 'DRP', icon: MapPin,
    children: [
      { kind: 'leaf', id: 'drp_op',  label: 'Operativa DRP', icon: Activity },
      { kind: 'leaf', id: 'drp_vis', label: 'Visor DRP',     icon: ListChecks },
      { kind: 'leaf', id: 'drp_res', label: 'Resumen DRP',   icon: ChartBar },
      { kind: 'leaf', id: 'drp_log', label: 'Logística DRP', icon: Package },
      { kind: 'leaf', id: 'drp_new', label: 'Crear DRP',     icon: BarChart3 },
      { kind: 'leaf', id: 'drp_est', label: 'Estados DRP',   icon: ToggleLeft },
    ],
  },
  {
    kind: 'group', id: 'mods', label: 'Módulos especiales', icon: Puzzle,
    children: [
      { kind: 'leaf', id: 'psa',       label: 'PSA',       icon: BriefcaseMedical },
      { kind: 'leaf', id: 'filiacion', label: 'Filiación', icon: ClipboardEdit },
    ],
  },
  {
    kind: 'group', id: 'log', label: 'Logística y almacén', icon: Warehouse,
    children: [
      { kind: 'leaf', id: 'inv_master', label: 'Inventario maestro',  icon: ListChecks },
      { kind: 'leaf', id: 'doc9',       label: 'Doc-9 Entrada almacén', icon: PackageCheck },
      { kind: 'leaf', id: 'doc10_log',  label: 'Doc-10 Envío material', icon: ArrowLeftRight },
      { kind: 'leaf', id: 'inv_transit',label: 'Inventario en tránsito', icon: Truck },
      { kind: 'leaf', id: 'descuadres', label: 'Descuadres',          icon: CircleAlert },
      { kind: 'leaf', id: 'catalogo',   label: 'Catálogo de ítems',   icon: Tags },
      { kind: 'leaf', id: 'inbox_log',  label: 'Bandeja logística',   icon: Inbox },
    ],
  },
  {
    kind: 'group', id: 'fleet', label: 'Flota y taller', icon: Car,
    children: [
      { kind: 'leaf', id: 'incidencias', label: 'Incidencias',           icon: AlertCircle },
      { kind: 'leaf', id: 'doc7',        label: 'Doc-7 Informe avería',  icon: Cog },
      { kind: 'leaf', id: 'meta_veh',    label: 'Metadata vehículo',     icon: IdCard },
      { kind: 'leaf', id: 'mant',        label: 'Mantenimiento flota',   icon: Settings2 },
      { kind: 'leaf', id: 'hist_fis',    label: 'Historial eventos',     icon: History },
      { kind: 'leaf', id: 'inbox_fleet', label: 'Bandeja flota',         icon: Inbox },
    ],
  },
  {
    kind: 'group', id: 'sec', label: 'Coordinación y seguridad', icon: ShieldCheck,
    children: [
      { kind: 'leaf', id: 'token',      label: 'Token de emergencia',     icon: Cookie },
      { kind: 'leaf', id: 'rbac',       label: 'RBAC roles',              icon: Users },
      { kind: 'leaf', id: 'inbox_coord',label: 'Bandeja coordinación',    icon: Inbox },
    ],
  },
  {
    kind: 'group', id: 'rrhh', label: 'Gestión y RRHH', icon: BadgeCheck,
    children: [
      { kind: 'leaf', id: 'fichas',     label: 'Fichas empleados',        icon: UserCircle },
      { kind: 'leaf', id: 'turnos',     label: 'Gestión de turnos',       icon: CalendarDays },
      { kind: 'leaf', id: 'tablon_edt', label: 'Gestión tablón',          icon: Newspaper },
      { kind: 'leaf', id: 'marquesina', label: 'Marquesina',              icon: RadioTower },
      { kind: 'leaf', id: 'doc12',      label: 'Doc-12 Solicitud vacaciones', icon: Palmtree },
      { kind: 'leaf', id: 'repo_docs',  label: 'Repositorio documentos',  icon: FolderOpen },
      { kind: 'leaf', id: 'bajas',      label: 'Gestión de bajas',        icon: CalendarX },
      { kind: 'leaf', id: 'inbox_rrhh', label: 'Bandeja RRHH',            icon: Inbox },
    ],
  },
  { kind: 'leaf', id: 'tablon', label: 'Tablón central',         icon: Megaphone },
  { kind: 'leaf', id: 'doc13',  label: 'Buzón interno (Doc-13)', icon: MessageSquareWarning },
]

// Por si lo necesitamos desde otros sitios (p. ej. para resolver labels).
export const NAV_TREE = NAV
// Calendar import sin usar — referenciar para evitar avisos en el árbol futuro.
void Building2; void Calendar

/* ─────────────────────────────────────────────────────────────────────────
 *  Component
 * ───────────────────────────────────────────────────────────────────────── */

interface BlackColumnProps {
  activeId: string
  onSelect: (id: string) => void
}

export function BlackColumn({ activeId, onSelect }: BlackColumnProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  function handleClick(item: NavItem) {
    if (item.kind === 'group') {
      setOpenGroupId((prev) => (prev === item.id ? null : item.id))
    } else if (item.kind === 'leaf') {
      onSelect(item.id)
    }
  }

  function isItemActive(item: NavItem): boolean {
    if (item.kind === 'group') {
      return item.children.some((c) => c.kind === 'leaf' && c.id === activeId)
    }
    return item.kind === 'leaf' && item.id === activeId
  }

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'flex h-full w-[var(--col-w)] shrink-0 flex-col items-center gap-1 overflow-y-auto bg-u24-black py-2',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      <div className="mb-2 grid size-10 place-items-center">
        <img
          src={logoMark}
          alt="U24"
          width={32}
          height={32}
          className="opacity-95"
        />
      </div>

      {NAV.map((item) => {
        const active = isItemActive(item)
        const open   = item.kind === 'group' && openGroupId === item.id
        const Icon   = item.kind === 'leaf' ? item.icon : item.icon

        return (
          <div key={item.id} className="flex w-full flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  aria-expanded={item.kind === 'group' ? open : undefined}
                  className={cn(
                    'relative grid size-11 place-items-center rounded-md text-zinc-400 transition-colors',
                    'hover:bg-u24-column-hover hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-inset',
                    active && 'bg-u24-column-active text-u24-yellow',
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={2}
                    className="size-6"
                  />
                  {/* Indicador activo — barra vertical amarilla 3 px */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm bg-u24-yellow"
                    />
                  )}
                  {/* Indicador de grupo expandido */}
                  {item.kind === 'group' && (
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        'absolute right-0.5 size-3 text-zinc-600 transition-transform',
                        open && 'rotate-90 text-u24-yellow',
                      )}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={4}>
                {item.label}
              </TooltipContent>
            </Tooltip>

            {/* Subgrupo expandido */}
            {item.kind === 'group' && open && (
              <div className="flex w-full flex-col items-center gap-0.5">
                {item.children.map((child, i) =>
                  child.kind === 'sep' ? (
                    <hr
                      key={`sep-${item.id}-${i}`}
                      role="separator"
                      className="my-1 w-7 border-zinc-800"
                    />
                  ) : (
                    <Tooltip key={child.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onSelect(child.id)}
                          aria-label={child.label}
                          aria-current={activeId === child.id ? 'page' : undefined}
                          className={cn(
                            'relative grid size-10 place-items-center rounded-md text-zinc-500 transition-colors',
                            'hover:bg-u24-column-hover hover:text-white',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-inset',
                            activeId === child.id && 'bg-u24-column-active text-u24-yellow',
                          )}
                        >
                          <child.icon
                            aria-hidden="true"
                            strokeWidth={2}
                            className="size-5"
                          />
                          {activeId === child.id && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm bg-u24-yellow"
                            />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={4}>
                        {child.label}
                      </TooltipContent>
                    </Tooltip>
                  ),
                )}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
