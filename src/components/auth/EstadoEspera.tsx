import { useAuthStore } from '@/stores/useAuthStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import { Btn } from '@/components/atoms/Btn'
import { Badge } from '@/components/atoms/Badge'
import { supabase } from '@/lib/supabase'

export function EstadoEspera() {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const clearSession = useAuthStore((s) => s.clearSession)
  const tipoGalleta = useTerminalStore((s) => s.tipoGalleta)

  async function logout() {
    await supabase.auth.signOut()
    clearSession()
  }

  return (
    <div className="estado-espera" role="main" aria-label="Esperando asignación">
      <div className="estado-espera__card">
        <i className="ti ti-clock estado-espera__icon" aria-hidden="true" />
        <h1 className="estado-espera__title">Esperando asignación</h1>
        <p className="estado-espera__msg">
          Tu cuenta está activa. En cuanto coordinación te asigne un vehículo o rol la
          aplicación continuará automáticamente.
        </p>
        {ejecutorId && (
          <p className="estado-espera__user">
            <i className="ti ti-user" aria-hidden="true" />{' '}
            {ejecutorId}
            {tipoGalleta === 'permanente' && (
              <Badge tone="ok" style={{ marginLeft: '0.5rem' }}>
                Terminal permanente
              </Badge>
            )}
          </p>
        )}
        <Btn tone="ghost" onClick={logout}>
          Cerrar sesión
        </Btn>
      </div>
    </div>
  )
}
