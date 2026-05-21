import type { ReactNode } from 'react'
import { BlackColumn } from './BlackColumn'
import { Header } from './Header'
import { InstallChip } from './InstallChip'
import { BannerOffline } from '@/components/feedback/BannerOffline'
import { ToastContainer } from '@/components/feedback/ToastContainer'
import { useBandejasStore } from '@/stores/useBandejasStore'

interface AppShellProps {
  activeNav: string
  onNavSelect: (id: string) => void
  marquesinaText?: string
  children: ReactNode
}

export function AppShell({
  activeNav,
  onNavSelect,
  marquesinaText,
  children,
}: AppShellProps) {
  const unreadCount = useBandejasStore(
    (s) => s.mensajes.filter((m) => m.estado === 'no_leido').length,
  )

  return (
    <div className="app-shell">
      <Header
        marquesinaText={marquesinaText}
        unreadCount={unreadCount}
      />

      <div className="app-shell__body">
        <BlackColumn activeId={activeNav} onSelect={onNavSelect} />
        <main
          className="app-shell__main"
          id="main-content"
          role="main"
          aria-label="Contenido principal"
        >
          {children}
        </main>
      </div>

      <InstallChip />
      <BannerOffline />
      <ToastContainer />
    </div>
  )
}
