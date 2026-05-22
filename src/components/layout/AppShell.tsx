import type { ReactNode } from 'react'
import { WifiOff } from 'lucide-react'
import { BlackColumn } from './BlackColumn'
import { Header } from './Header'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface AppShellProps {
  activeNav: string
  onNavSelect: (id: string) => void
  ticker?: string
  unreadCount?: number
  showBack?: boolean
  onBack?: () => void
  onOpenInbox?: () => void
  children: ReactNode
}

export function AppShell({
  activeNav,
  onNavSelect,
  ticker,
  unreadCount,
  showBack,
  onBack,
  onOpenInbox,
  children,
}: AppShellProps) {
  const isOnline = useGlobalStore((s) => s.isOnline)

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <BlackColumn activeId={activeNav} onSelect={onNavSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          ticker={ticker}
          unreadCount={unreadCount}
          showBack={showBack}
          onBack={onBack}
          onOpenInbox={onOpenInbox}
        />

        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 border-b border-u24-yellow/30 bg-u24-yellow-soft px-4 py-2 text-base font-medium text-u24-black"
          >
            <WifiOff aria-hidden="true" className="size-4" />
            <span>Sin conexión — las mutaciones se encolan localmente y se sincronizarán al recuperar red.</span>
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
  )
}
