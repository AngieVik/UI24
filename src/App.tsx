import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { AutorizarTerminalScreen } from '@/components/auth/AutorizarTerminalScreen'
import { CheckinInicialScreen } from '@/components/auth/CheckinInicialScreen'
import { AppShell } from '@/components/layout/AppShell'
import { VisualInfoHome } from '@/components/layout/VisualInfoHome'
import { PresenciaScreen } from '@/components/operativa/PresenciaScreen'
import { VehiculosScreen } from '@/components/operativa/VehiculosScreen'
import { Doc6GastoMaterialScreen } from '@/components/operativa/Doc6GastoMaterialScreen'
import { useBlackColumn } from '@/contexts/BlackColumnContext'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { findNode } from '@/components/layout/black-column-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Punto de entrada — TRES estados.
 *
 *   estado_0a — terminal sin autorizar (sin sesión Supabase
 *               o sin id_terminal en cliente) → <AutorizarTerminalScreen />
 *
 *   estado_0b — terminal autorizado pero sin presencias activas
 *               (presencias_activas_terminal vacía para este terminal)
 *               → <CheckinInicialScreen />
 *
 *   estado_1  — terminal con sesión + al menos un trabajador presente
 *               → <AppShell> con routing por selectedLeafId
 *
 * La sesión Supabase es del TERMINAL (usuario máquina
 * terminal_<fp>@u24.local) y persiste indefinidamente. Los
 * trabajadores entran/salen sin tocar la sesión.
 */
export default function App() {
  const session   = useAuthStore((s) => s.session)
  const idTerminal = useTerminalStore((s) => s.id_terminal)
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

  // estado_0a — sin sesión o sin id_terminal
  if (!session || !idTerminal) {
    return <AutorizarTerminalScreen />
  }

  // estado_0b / estado_1 dependen de si hay presencias
  return <RouterPresencias />
}

/**
 * Decide entre CheckinInicialScreen (estado_0b) y AppShell (estado_1)
 * según haya o no personal en turno en este terminal.
 */
function RouterPresencias() {
  const personal = usePersonalEnTurno()

  // Primer pintado: mientras carga la primera vez, mostramos skeleton
  // para no parpadear entre estados.
  if (personal.isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center p-6" aria-busy="true">
        <Skeleton className="h-32 w-72" />
      </main>
    )
  }

  if (personal.data.length === 0) {
    return <CheckinInicialScreen />
  }

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
  const { selectedLeafId, goCheckin } = useBlackColumn()

  if (selectedLeafId === 'home' || selectedLeafId == null) {
    return <VisualInfoHome onGoCheckin={goCheckin} />
  }

  if (selectedLeafId === 'checkin') {
    return <PresenciaScreen />
  }

  if (selectedLeafId === 'vehiculos_op') {
    return <VehiculosScreen />
  }

  if (selectedLeafId === 'doc6') {
    return <Doc6GastoMaterialScreen />
  }

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
