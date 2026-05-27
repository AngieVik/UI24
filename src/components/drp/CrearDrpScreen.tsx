import { useState } from 'react'
import { CheckCircle2, ChartNoAxesColumn, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useDrp } from '@/hooks/useDrp'

export function CrearDrpScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const { crearDrp, loading, error } = useDrp()
  const [idDrpCreado, setIdDrpCreado] = useState<string | null>(null)

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          Crear un DRP requiere conexión en tiempo real.
        </p>
      </div>
    )
  }

  if (idDrpCreado) {
    return (
      <div
        role="status"
        aria-label="DRP creado"
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">DRP creado</h2>
        <p className="font-body text-sm text-muted-foreground">
          DRP <code className="font-medium text-foreground">#{idDrpCreado.slice(0, 8).toUpperCase()}</code> creado
          en estado <strong>Preparación</strong>. Ve a Estados DRP para activarlo.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIdDrpCreado(null)}
        >
          Crear otro DRP
        </Button>
      </div>
    )
  }

  async function handleCrear() {
    const id = await crearDrp()
    if (id) setIdDrpCreado(id)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <ChartNoAxesColumn aria-hidden="true" className="size-5" />
            Crear DRP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-body text-sm text-muted-foreground">
            Se creará un nuevo Dispositivo de Riesgo Previsible en estado{' '}
            <strong>Preparación</strong>. Una vez creado, ve a{' '}
            <strong>Estados DRP</strong> para activarlo y añadir dotación y personal.
          </p>

          <ul className="space-y-1 font-body text-sm text-muted-foreground">
            <li>• El DRP se crea asignado a la coordinación de la sesión activa.</li>
            <li>• Se podrá añadir dotación vehicular y personal a pie una vez activo.</li>
            <li>• Solo puede haber un DRP activo por coordinación al mismo tiempo.</li>
          </ul>

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleCrear}
            disabled={loading}
            aria-label="Crear nuevo DRP"
          >
            <ChartNoAxesColumn aria-hidden="true" className="size-4" />
            {loading ? 'Creando DRP…' : 'Crear DRP'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
