import { Ambulance, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useVehiculoActivo } from '@/hooks/useVehiculoActivo'
import { useDrpActivo } from '@/hooks/useDrpActivo'
import { PanelPersonal } from '@/components/layout/panels/PanelPersonal'
import { PanelVehiculo } from '@/components/layout/panels/PanelVehiculo'
import { VisualInfoDRP } from '@/components/layout/panels/VisualInfoDRP'
import { BandejaEntradaPersonal } from '@/components/layout/panels/BandejaEntradaPersonal'

/**
 * VisualInfoHome — contenido por defecto del home_area cuando activeNav === 'home'.
 * Spec: mapeo_visual_ui.md §2 + diseño_chupiwachi.md §10.4.
 *
 * Sub-paneles:
 *   - PanelPersonal     (visible si hay personal con checkin_on > 0)  ✅ Fase C.1
 *   - PanelVehiculo     (visible si hay matrícula en useActivacionStore) ⏳ Fase C.2
 *   - VisualInfoDRP     (visible si hay DRP activo asignado)             ⏳ Fase C.4
 *   - BandejaEntradaPersonal (visible si hay checkin_on)                 ⏳ Fase C.5
 *
 * Cuando todo está vacío, mostramos el empty state honesto que invita a check-in.
 */
interface VisualInfoHomeProps {
  onGoCheckin?: () => void
}

export function VisualInfoHome({ onGoCheckin }: VisualInfoHomeProps) {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const idTerminal = useTerminalStore((s) => s.id_terminal)
  const personal   = usePersonalEnTurno()
  const vehiculo   = useVehiculoActivo()
  const drp        = useDrpActivo()

  const hasPersonal = personal.data.length > 0
  const hasVehiculo = vehiculo.data !== null
  const hasDrp      = drp.data !== null

  // Mientras carga la primera vez, no decidimos el empty state — esperamos.
  const stillLoading = personal.isLoading || vehiculo.isLoading || drp.isLoading
  const allEmpty = !stillLoading && !hasPersonal && !hasVehiculo && !hasDrp

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
      {(hasPersonal || personal.isLoading) && <PanelPersonal />}
      {(hasVehiculo || vehiculo.isLoading) && <PanelVehiculo />}
      {(hasDrp      || drp.isLoading)      && <VisualInfoDRP />}
      {hasPersonal && <BandejaEntradaPersonal personas={personal.data} />}
    </div>
  )
}
