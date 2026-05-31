import { Inbox } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBlackColumn } from '@/contexts/BlackColumnContext'
import logoMark from '@/assets/logo.svg'
import { cn } from '@/lib/utils'

interface HeaderProps {
  ticker?: string
  unreadCount?: number
  onOpenInbox?: () => void
}

/**
 * Header — full width arriba del chasis (decisión 2026-05-23).
 *
 * Logo principal a la izquierda: clickable → goHome. Reemplaza al antiguo
 * botón Home que vivía en el BlackColumn. El logo va sin texto al lado,
 * libre, en tamaño grande (44 px de mark).
 *
 * El botón "atrás" NO vive aquí — su lugar es abajo del BlackColumn, y
 * además puedes pulsar el icono "padre" en la cabecera de la lista para
 * volver al nivel anterior.
 */
export function Header({ ticker, unreadCount = 0, onOpenInbox }: HeaderProps) {
  const { goHome, selectedLeafId } = useBlackColumn()
  const onHomeActive = selectedLeafId === 'home'

  return (
    <header
      role="banner"
      className="flex h-[var(--header-h)] shrink-0 items-center gap-4 border-b border-zinc-900 bg-u24-black px-3 text-white"
    >
      {/* Logo — clickable → Home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={goHome}
            aria-label="Ir a Home"
            aria-current={onHomeActive ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center rounded-md p-1 bg-transparent',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-u24-black'
            )}
          >
            <img
              src={logoMark}
              alt="U24 Servicios Sanitarios"
              width={44}
              height={44}
              className="shrink-0"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="font-medium">Home</div>
          <div className="text-xs text-muted-foreground">Volver a la vista raíz</div>
        </TooltipContent>
      </Tooltip>

      {/* Ticker / marquesina */}
      <div className="relative flex-1 overflow-hidden">
        {ticker && (
          <div className="flex animate-[marquee_60s_linear_infinite] whitespace-nowrap text-base font-medium text-zinc-200 hover:[animation-play-state:paused] motion-reduce:animate-none">
            <span className="px-6">{ticker}</span>
            <span className="px-6" aria-hidden="true">
              {ticker}
            </span>
          </div>
        )}
      </div>

      {/* Acciones globales */}
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Bandejas"
              onClick={onOpenInbox}
              className={cn(
                'relative grid size-10 place-items-center rounded-md text-zinc-300 transition-colors hover:bg-u24-column-hover hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-u24-black',
                unreadCount > 0 && 'text-u24-yellow'
              )}
            >
              <Inbox aria-hidden="true" className="size-5" strokeWidth={2} />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 size-2 rounded-full bg-u24-yellow"
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Bandejas{unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
