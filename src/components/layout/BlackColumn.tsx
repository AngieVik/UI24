import { useState } from 'react'

/* ── Nav tree ─────────────────────────────────────────────────────────── */

type NavLeaf = { id: string; icon: string; label: string }
type NavSep  = { sep: true }
type NavGroup = { id: string; icon: string; label: string; children: (NavLeaf | NavSep)[] }
type NavItem = NavLeaf | NavGroup

const NAV: NavItem[] = [
  { id: 'home',     icon: 'ti-home',                label: 'Home' },
  { id: 'checkin',  icon: 'ti-login',               label: 'Check-in' },
  {
    id: 'operativa', icon: 'ti-ambulance', label: 'Operativa rutinaria',
    children: [
      { id: 'doc10v', icon: 'ti-file-text',          label: 'Doc-10 Envío material' },
      { id: 'doc6',   icon: 'ti-package',            label: 'Doc-6 Gasto material' },
      { id: 'doc8',   icon: 'ti-clipboard-list',     label: 'Doc-8 Parte de trabajo' },
      { sep: true },
      { id: 'doc2',   icon: 'ti-heart-rate-monitor', label: 'Doc-2 Informe asistencial' },
      { id: 'doc11',  icon: 'ti-alert-triangle',     label: 'Doc-11 Aviso urgente' },
      { id: 'fuel',   icon: 'ti-gas-station',        label: 'Repostar combustible' },
      { id: 'adblue', icon: 'ti-droplet',            label: 'Repostar AdBlue' },
      { id: 'chk360', icon: 'ti-checkbox',           label: 'Doc-Checklist360' },
      { id: 'vehs',   icon: 'ti-steering-wheel',     label: 'Vehículos' },
    ],
  },
  {
    id: 'drp', icon: 'ti-map-pin', label: 'DRP',
    children: [
      { id: 'drp_op',  icon: 'ti-activity',    label: 'Operativa DRP' },
      { id: 'drp_vis', icon: 'ti-selector',    label: 'Visor DRP' },
      { id: 'drp_res', icon: 'ti-chart-bar',   label: 'Resumen DRP' },
      { id: 'drp_log', icon: 'ti-package',     label: 'Logística DRP' },
      { id: 'drp_new', icon: 'ti-circle-plus', label: 'Crear DRP' },
      { id: 'drp_est', icon: 'ti-toggle-left', label: 'Estados DRP' },
    ],
  },
  { id: 'mods',  icon: 'ti-puzzle',             label: 'Módulos especiales' },
  { id: 'log',   icon: 'ti-building-warehouse', label: 'Logística y almacén' },
  { id: 'fleet', icon: 'ti-car',                label: 'Flota y taller' },
  { id: 'sec',   icon: 'ti-shield-lock',        label: 'Coordinación y seguridad' },
  { id: 'rrhh',  icon: 'ti-id-badge',           label: 'Gestión y RRHH' },
  { id: 'tab',   icon: 'ti-speakerphone',       label: 'Tablón central' },
  { id: 'doc13', icon: 'ti-message-report',     label: 'Buzón interno' },
]

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

/* ── Componente ───────────────────────────────────────────────────────── */

interface BlackColumnProps {
  activeId: string
  onSelect: (id: string) => void
}

export function BlackColumn({ activeId, onSelect }: BlackColumnProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  function handleItemClick(item: NavItem) {
    if (isGroup(item)) {
      setOpenGroup((prev) => (prev === item.id ? null : item.id))
    } else {
      onSelect(item.id)
    }
  }

  function isActive(item: NavItem): boolean {
    if (isGroup(item)) {
      return item.children.some((c) => !('sep' in c) && c.id === activeId)
    }
    return item.id === activeId
  }

  return (
    <nav className="bc" aria-label="Navegación principal">
      <div className="bc__logo">
        <img src="/u24-logo-mark.svg" alt="U24 Servicios Sanitarios" width={26} height={26} />
      </div>

      {NAV.map((item) => {
        const active = isActive(item)
        const open = openGroup === item.id

        return (
          <div key={item.id} style={{ display: 'contents' }}>
            <button
              className={`bc__btn${active ? ' bc__btn--active' : ''}`}
              title={item.label}
              aria-label={item.label}
              aria-expanded={isGroup(item) ? open : undefined}
              aria-current={active ? 'page' : undefined}
              onClick={() => handleItemClick(item)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
            </button>

            {isGroup(item) && open &&
              item.children.map((child, i) =>
                'sep' in child ? (
                  <div key={`sep-${i}`} className="bc__sep" role="separator" />
                ) : (
                  <button
                    key={child.id}
                    className={`bc__btn bc__btn--sub${activeId === child.id ? ' bc__btn--active' : ''}`}
                    title={child.label}
                    aria-label={child.label}
                    aria-current={activeId === child.id ? 'page' : undefined}
                    onClick={() => onSelect(child.id)}
                  >
                    <i className={`ti ${child.icon}`} aria-hidden="true" />
                  </button>
                ),
              )}
          </div>
        )
      })}
    </nav>
  )
}
