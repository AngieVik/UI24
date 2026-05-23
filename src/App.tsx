import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { AppShell } from '@/components/layout/AppShell'
import { VisualInfoHome } from '@/components/layout/VisualInfoHome'
import { useBlackColumn } from '@/contexts/BlackColumnContext'
import { findNode } from '@/components/layout/black-column-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Punto de entrada — dos estados estrictos.
 *
 *   estado_0 — sin sesión → <LoginScreen />
 *   estado_1 — con sesión → <AppShell> con routing por selectedLeafId
 *
 * AppShell envuelve todo en BlackColumnProvider, así que cualquier hijo
 * (incluido el HomeArea) puede leer el estado del BlackColumn via context.
 */
export default function App() {
  const session   = useAuthStore((s) => s.session)
  const setOnline = useGlobalStore((s) => s.setOnline)

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

  if (!session) return <LoginScreen />

  return (
    <AppShell ticker="Tablón · BlackColumn drill-down activo · pulsa los grupos para entrar, pulsa el padre activo o el botón de atrás para volver.">
      <HomeArea />
    </AppShell>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 *  HomeArea — lee selectedLeafId del Context y rutea al Screen.
 * ───────────────────────────────────────────────────────────────────────── */
function HomeArea() {
  const { selectedLeafId } = useBlackColumn()

  if (selectedLeafId === 'home' || selectedLeafId == null) {
    return <VisualInfoHome />
  }

  // Cualquier otra hoja → placeholder honesto hasta que cada Screen se
  // implemente en Fase D.
  return <LeafPlaceholder leafId={selectedLeafId} />
}

function LeafPlaceholder({ leafId }: { leafId: string }) {
  const node  = findNode(leafId)
  const label = node?.label ?? leafId

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="font-display text-lg">{label}</CardTitle>
          <Badge variant="outline">Fase D — pendiente</Badge>
        </CardHeader>
        <CardContent className="space-y-2 font-body text-base font-light text-muted-foreground">
          <p>
            Esta vista forma parte del terminal y está documentada en{' '}
            <code className="font-medium text-foreground">mapeo_visual_ui.md §3</code>,
            pero todavía no está reconstruida con shadcn/ui + tokens U24.
          </p>
          <p>
            Se implementará en la <strong>Fase D</strong> tras validar el chasis
            y `visual_info_home`. Orden de Screens documentado en{' '}
            <code className="font-medium text-foreground">
              06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md
            </code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
