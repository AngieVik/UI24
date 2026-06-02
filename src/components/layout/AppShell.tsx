import type { ReactNode } from 'react'
import { Download, WifiOff, X } from 'lucide-react'
import { BlackColumn } from './BlackColumn'
import { Header } from './Header'
import { BlackColumnProvider } from '@/contexts/BlackColumnContext'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

interface AppShellProps {
  ticker?: string
  unreadCount?: number
  onOpenInbox?: () => void
  children: ReactNode
}

/**
 * AppShell — chasis del estado_1.
 *
 * Layout (decisión 2026-05-23):
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ HEADER (full width, sticky top)                       │
 *   ├──────────┬────────────────────────────────────────────┤
 *   │ Black    │  banner_offline (si aplica)                │
 *   │ Column   ├────────────────────────────────────────────┤
 *   │          │                                            │
 *   │          │  home_area (children)                      │
 *   │          │                                            │
 *   └──────────┴────────────────────────────────────────────┘
 *
 * El BlackColumnProvider envuelve ambos para que Header (logo → goHome)
 * y BlackColumn compartan la misma instancia del hook.
 */
export function AppShell({ ticker, unreadCount, onOpenInbox, children }: AppShellProps) {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const { canInstall, install, dismiss } = useInstallPrompt()

  return (
    <BlackColumnProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
        <Header ticker={ticker} unreadCount={unreadCount} onOpenInbox={onOpenInbox} />

        <div className="flex min-h-0 flex-1">
          <BlackColumn />

          <div className="flex min-w-0 flex-1 flex-col">
            {canInstall && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2 text-sm"
              >
                <Download aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground">
                  Instala U24 como app para acceso rápido sin navegador
                </span>
                <button
                  type="button"
                  onClick={install}
                  className="rounded bg-foreground px-2 py-0.5 text-xs font-medium text-background hover:opacity-80"
                >
                  Instalar
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Descartar instalación"
                  className="ml-1 grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </div>
            )}

            {!isOnline && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 border-b border-u24-yellow/30 bg-u24-yellow-soft px-4 py-2 text-base font-medium text-u24-black"
              >
                <WifiOff aria-hidden="true" className="size-4" />
                <span>
                  Sin conexión — las mutaciones se encolan localmente y se sincronizarán al
                  recuperar red.
                </span>
              </div>
            )}

            <main
              id="main-content"
              role="main"
              aria-label="Contenido principal"
              className="min-h-0 flex-1 overflow-y-auto bg-background"
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </BlackColumnProvider>
  )
}
