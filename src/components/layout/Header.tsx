import { ArrowLeft, Inbox } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HeaderProps {
  ticker?: string
  unreadCount?: number
  showBack?: boolean
  onBack?: () => void
  onOpenInbox?: () => void
}

export function Header({
  ticker,
  unreadCount = 0,
  showBack = false,
  onBack,
  onOpenInbox,
}: HeaderProps) {
  return (
    <header
      role="banner"
      className="flex h-[var(--header-h)] shrink-0 items-center gap-4 border-b border-border bg-u24-black px-3 text-white"
    >
      {/* Logo + lockup */}
      <div className="flex shrink-0 items-center gap-2 font-display tracking-tight">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-sm bg-u24-yellow text-u24-black font-black"
        >
          U
        </span>
        <span className="hidden text-sm font-bold leading-none text-white sm:inline">
          Control operativo U24
        </span>
      </div>

      {/* Ticker / marquesina */}
      <div className="relative flex-1 overflow-hidden">
        {ticker && (
          <div className="flex animate-[marquee_60s_linear_infinite] whitespace-nowrap text-sm font-medium text-zinc-200 hover:[animation-play-state:paused] motion-reduce:animate-none">
            <span className="px-6">{ticker}</span>
            <span className="px-6" aria-hidden="true">{ticker}</span>
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
                'relative grid size-9 place-items-center rounded-md text-zinc-300 transition-colors hover:bg-u24-column-hover hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-u24-black',
                unreadCount > 0 && 'text-u24-yellow',
              )}
            >
              <Inbox aria-hidden="true" className="size-[18px]" strokeWidth={2} />
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

        {showBack && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Atrás"
                onClick={onBack}
                className={cn(
                  'grid size-9 place-items-center rounded-md text-zinc-300 transition-colors hover:bg-u24-column-hover hover:text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-u24-black',
                )}
              >
                <ArrowLeft aria-hidden="true" className="size-[18px]" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Atrás</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  )
}
