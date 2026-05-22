import { Ambulance, CirclePlus, DoorOpen, LogIn, Mail, MapPin, UserCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTerminalStore } from '@/stores/useTerminalStore'

/**
 * VisualInfoHome — contenido por defecto del home_area cuando activeNav === 'home'.
 * Spec: mapeo_visual_ui.md §2.
 *
 * Sub-paneles:
 *   - PanelPersonal     (visible si hay personal con checkin_on > 0)
 *   - PanelVehiculo     (visible si hay ID_vehiculo del terminal)
 *   - VisualInfoDRP     (visible si hay DRP activo asignado)
 *   - BandejaEntradaPersonal (siempre visible si hay checkin_on)
 *
 * Estado actual: stores aún sin poblar. Cuando todos los paneles están vacíos
 * mostramos un empty state honesto que invita a hacer check-in.
 */
interface VisualInfoHomeProps {
  onGoCheckin?: () => void
}

export function VisualInfoHome({ onGoCheckin }: VisualInfoHomeProps) {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const idTerminal = useTerminalStore((s) => s.id_terminal)

  // Mientras los hooks de personal/vehículo no estén implementados, asumimos sin datos.
  const hasPersonal = false
  const hasVehiculo = false
  const hasDrp      = false

  const allEmpty = !hasPersonal && !hasVehiculo && !hasDrp

  if (allEmpty) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="grid size-14 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <Ambulance aria-hidden="true" className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold leading-tight">
            Terminal sin turno activo
          </h2>
          <p className="font-body text-base font-light text-muted-foreground">
            No hay personal en turno ni vehículo asignado.
            Pulsa <strong>Check-in</strong> para iniciar.
          </p>
        </div>
        <Button onClick={onGoCheckin}>
          <LogIn aria-hidden="true" className="size-4" />
          Ir a Check-in
        </Button>
        <p className="font-body text-xs font-light text-muted-foreground">
          Sesión activa: <span className="font-medium text-foreground">{ejecutorId ?? 'desconocida'}</span>
          {idTerminal && (
            <>
              {' · '}terminal <span className="font-medium text-foreground">{idTerminal.slice(0, 8)}</span>
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {hasPersonal && <PanelPersonal />}
      {hasVehiculo && <PanelVehiculo />}
      {hasDrp      && <VisualInfoDRP />}
      {hasPersonal && <BandejaEntradaPersonal />}
    </div>
  )
}

/* ─── Sub-paneles (estructura — el cableado de datos llega en Fase B) ─── */

function PanelPersonal() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle>Personal en turno</CardTitle>
        <Badge variant="secondary" className="gap-1">
          <UserCheck aria-hidden="true" className="size-3" />
          0 con check-in
        </Badge>
      </CardHeader>
      <CardContent className="text-base text-muted-foreground">
        Pendiente de cableado con <code className="font-body">usePersonaStore</code>.
      </CardContent>
    </Card>
  )
}

function PanelVehiculo() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle>Vehículo del terminal</CardTitle>
        <Badge variant="outline">Sin asignar</Badge>
      </CardHeader>
      <CardContent className="text-base text-muted-foreground">
        Pendiente de cableado con <code className="font-body">useActivacionStore</code>.
      </CardContent>
    </Card>
  )
}

function VisualInfoDRP() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4" />
          DRP activo
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Añadir asistencia Doc-1">
            <CirclePlus className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Entrar a filiación">
            <DoorOpen className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-base text-muted-foreground">
        Pendiente de cableado con <code className="font-body">useDrpStore</code>.
      </CardContent>
    </Card>
  )
}

function BandejaEntradaPersonal() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Bandejas personales</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-base">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
          <Mail aria-hidden="true" className="size-4 text-muted-foreground" />
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">—</AvatarFallback>
          </Avatar>
        </div>
        <span className="text-xs text-muted-foreground">Sin buzones cargados.</span>
      </CardContent>
    </Card>
  )
}
