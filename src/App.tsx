import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { AppShell } from '@/components/layout/AppShell'
import { VisualInfoHome } from '@/components/layout/VisualInfoHome'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Punto de entrada de la app. Solo dos estados:
 *
 *   estado_0 — sin sesión → <LoginScreen />
 *   estado_1 — con sesión → <AppShell> con routing state-based
 *
 * El check-in operativo (selección de vehículo / inicio de turno) NO es un
 * gate del estado_1: vive como una ruta interna ("activeNav === 'checkin'").
 * Spec: mapeo_visual_ui.md §1 + diseño_chupiwachi.md §6.
 */
export default function App() {
  const session   = useAuthStore((s) => s.session)
  const setOnline = useGlobalStore((s) => s.setOnline)

  // Routing state-based — siguiendo el árbol del BlackColumn.
  const [activeNav, setActiveNav] = useState('home')

  useEffect(() => {
    const onlineHandler  = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
    }
  }, [setOnline])

  // estado_0
  if (!session) {
    return <LoginScreen />
  }

  // estado_1
  const showBack = activeNav !== 'home'
  const handleBack = () => setActiveNav('home')

  return (
    <AppShell
      activeNav={activeNav}
      onNavSelect={setActiveNav}
      showBack={showBack}
      onBack={handleBack}
      ticker="Tablón · sistema en reconstrucción · Fase A completada · home_area activo con shadcn + lucide + tokens U24."
    >
      {renderRoute(activeNav, () => setActiveNav('checkin'))}
    </AppShell>
  )
}

function renderRoute(activeNav: string, goCheckin: () => void) {
  if (activeNav === 'home') {
    return <VisualInfoHome onGoCheckin={goCheckin} />
  }
  return <RoutePlaceholder activeNav={activeNav} />
}

/* ─── Placeholder honesto para rutas aún sin implementar (Fase B) ─── */
function RoutePlaceholder({ activeNav }: { activeNav: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="font-display text-lg">Ruta: {activeNav}</CardTitle>
          <Badge variant="outline">Fase B — pendiente</Badge>
        </CardHeader>
        <CardContent className="space-y-2 font-body text-base font-light text-muted-foreground">
          <p>
            Esta vista forma parte del terminal y está documentada en{' '}
            <code className="font-medium text-foreground">mapeo_visual_ui.md §3</code>,
            pero todavía no está reconstruida con shadcn/ui + tokens U24.
          </p>
          <p>
            Se implementará en la <strong>Fase B</strong> tras validar el chasis,
            siguiendo el orden del documento{' '}
            <code className="font-medium text-foreground">diseño_chupiwachi.md §8</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
