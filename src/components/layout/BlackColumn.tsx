import { type LucideIcon, ArrowLeft, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBlackColumn } from '@/contexts/BlackColumnContext'
import { findNode, type NavLeaf, type NavNode } from '@/components/layout/black-column-nav'
import { cn } from '@/lib/utils'

/**
 * BlackColumn — Fase B.4 v2 (refinado 2026-05-23).
 *
 * Drill-down con anchura fluida (60 ↔ 220 px).
 *
 * Layout:
 *   ┌──────────┐
 *   │ Check-in │ ← fijo arriba
 *   │ ─────    │
 *   │ Padre ★  │ ← encabezado del padre activo (amarillo, click → atrás)
 *   │ ─────    │
 *   │ hijo 1   │ ← drill content (siblings del nivel actual)
 *   │ hijo 2   │
 *   │ ...      │
 *   │ ─spacer──│ (mt-auto)
 *   │ Toggle ↕ │ ← penúltimo
 *   │ Atrás ←  │ ← último (contextual)
 *   └──────────┘
 *
 * No tiene logo — el logo de la marca vive en el Header.
 * Pulsar el logo del Header lleva a Home.
 *
 * Pulsar el "padre activo" en el encabezado = goBack (mismo efecto que el
 * botón Atrás del fondo). Visualmente está resaltado con el color de
 * marca para indicar "estás dentro de este grupo".
 */
export function BlackColumn() {
  const s = useBlackColumn()

  // Todos los nodos ancestros en el path actual (para el breadcrumb).
  const ancestorNodes = s.currentPath
    .map((id) => findNode(id))
    .filter((n): n is NonNullable<typeof n> => n !== null && n !== undefined && n.kind !== 'leaf')

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'flex h-full shrink-0 flex-col overflow-hidden bg-u24-black',
        'transition-[width] duration-200 ease-out',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        s.expanded ? 'w-[var(--col-w-expanded)]' : 'w-[var(--col-w)]',
      )}
    >
      {/* ── Botones fijos arriba: solo Check-in ───────────────────── */}
      <div className="flex shrink-0 flex-col gap-1 px-1 pt-2">
        {s.fixedLeaves.map((leaf) => (
          <NavRow
            key={leaf.id}
            icon={leaf.icon}
            label={leaf.label}
            hint={leaf.hint}
            expanded={s.expanded}
            active={s.selectedLeafId === leaf.id}
            onClick={() => {
              if (leaf.id === 'checkin') s.goCheckin()
              else                       s.selectLeaf(leaf.id)
            }}
          />
        ))}
      </div>

      {/* ── Separador entre fijos y drill content ─────────────────── */}
      <div
        role="separator"
        aria-hidden="true"
        className="mx-3 my-2 h-px shrink-0 bg-zinc-800"
      />

      {/* ── Breadcrumb completo de ancestros ──────────────────────── */}
      {ancestorNodes.length > 0 && (
        <>
          <div className="flex shrink-0 flex-col gap-0.5 px-1">
            {ancestorNodes.map((node, i) => (
              <NavRow
                key={node.id}
                icon={node.icon}
                label={node.label}
                hint="Volver a este nivel"
                expanded={s.expanded}
                active={true}
                trailing={<ChevronLeft aria-hidden="true" className="size-4 shrink-0 text-u24-yellow/70" />}
                onClick={() => s.jumpToLevel(i)}
              />
            ))}
          </div>
          <div
            role="separator"
            aria-hidden="true"
            className="mx-3 my-2 h-px shrink-0 bg-zinc-800"
          />
        </>
      )}

      {/* ── Drill content (visibleChildren) ──────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {s.visibleChildren.map((node) => (
          <NavTreeItem
            key={node.id}
            node={node}
            expanded={s.expanded}
            isSelected={(id) => s.selectedLeafId === id || s.modalLeafId === id}
            isPathActive={(id) => s.currentPath.includes(id)}
            onActivate={(n) => {
              if (n.kind === 'leaf') {
                if ((n as NavLeaf).opensModal) s.openModal(n.id)
                else                            s.selectLeaf(n.id)
              } else {
                s.navigateInto(n.id)
              }
            }}
          />
        ))}
      </div>

      {/* ── Botones fijos abajo ──────────────────────────────────────
       *  Decisión 2026-05-23 — orden invertido:
       *    Atrás   → penúltimo (contextual, aparece/desaparece)
       *    Toggle  → último (siempre presente, anclado al fondo)
       *  Razón: cuando Atrás se muestra/oculta, NO desplaza al Toggle
       *  (que es el ancla visual permanente del fondo).
       * ─────────────────────────────────────────────────────────── */}
      <div className="mt-auto flex shrink-0 flex-col gap-1 px-1 pb-2 pt-1">
        <div
          role="separator"
          aria-hidden="true"
          className="mx-2 mb-1 h-px bg-zinc-800"
        />
        {/* Atrás (penúltimo, contextual) */}
        {s.canGoBack && (
          <NavRow
            icon={ArrowLeft}
            label="Atrás"
            hint="Volver al nivel anterior"
            expanded={s.expanded}
            active={false}
            onClick={s.goBack}
          />
        )}
        {/* Toggle siempre presente (último, anclado al fondo) */}
        <NavRow
          icon={s.expanded ? PanelLeftClose : PanelLeftOpen}
          label={s.expanded ? 'Contraer panel' : 'Expandir panel'}
          hint="Mostrar u ocultar etiquetas de texto"
          expanded={s.expanded}
          active={false}
          onClick={s.toggleExpanded}
        />
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 *  NavTreeItem — un item del listado (grupo, grupillo o hoja).
 * ───────────────────────────────────────────────────────────────────────── */

interface NavTreeItemProps {
  node: NavNode
  expanded: boolean
  isSelected: (id: string) => boolean
  isPathActive: (id: string) => boolean
  onActivate: (n: NavNode) => void
}

function NavTreeItem({ node, expanded, isSelected, isPathActive, onActivate }: NavTreeItemProps) {
  const isLeaf      = node.kind === 'leaf'
  const isContainer = !isLeaf
  const isInPath    = isPathActive(node.id)
  const active      = isLeaf ? isSelected(node.id) : isInPath

  return (
    <NavRow
      icon={node.icon}
      label={node.label}
      hint={isLeaf ? (node as NavLeaf).hint : undefined}
      expanded={expanded}
      active={active}
      trailing={isContainer ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-zinc-500" /> : null}
      onClick={() => onActivate(node)}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 *  NavRow — fila genérica con icono + label opcional + indicador activo.
 * ───────────────────────────────────────────────────────────────────────── */

interface NavRowProps {
  icon: LucideIcon
  label: string
  hint?: string
  expanded: boolean
  active: boolean
  trailing?: React.ReactNode
  onClick: () => void
}

function NavRow({ icon: Icon, label, hint, expanded, active, trailing, onClick }: NavRowProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group relative flex h-11 w-full shrink-0 items-center rounded-md',
            'text-zinc-300 transition-colors',
            'hover:bg-u24-column-hover hover:text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-inset',
            active && 'bg-u24-column-active text-u24-yellow',
          )}
        >
          {/* Rail del icono — siempre 52 px de ancho para alinear con --col-w */}
          <span className="grid w-[52px] shrink-0 place-items-center">
            <Icon aria-hidden="true" strokeWidth={2} className="size-6" />
          </span>

          {/* Label — visible solo si expanded */}
          {expanded && (
            <span className="flex-1 truncate text-left font-display text-base font-bold leading-none">
              {label}
            </span>
          )}

          {/* Trailing (chevron en grupos/grupillos) */}
          {expanded && trailing && (
            <span className="grid shrink-0 place-items-center px-2">{trailing}</span>
          )}

          {/* Indicador activo — barra vertical amarilla 3 px */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm bg-u24-yellow"
            />
          )}
        </button>
      </TooltipTrigger>
      {(!expanded || hint) && (
        <TooltipContent side="right" sideOffset={6}>
          <div className="font-medium">{label}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
