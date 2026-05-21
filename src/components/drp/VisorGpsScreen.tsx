import { useVisorGps, type VehiculoGps } from '@/hooks/useVisorGps'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface Props {
  idDrp?: string
}

function formatTs(ts: string | null) {
  if (!ts) return 'Sin datos'
  const d = new Date(ts)
  const now = Date.now()
  const diffMin = Math.floor((now - d.getTime()) / 60_000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function frescoTone(ts: string | null): 'ok' | 'warn' | 'crit' {
  if (!ts) return 'crit'
  const diffMin = (Date.now() - new Date(ts).getTime()) / 60_000
  if (diffMin < 2) return 'ok'
  if (diffMin < 10) return 'warn'
  return 'crit'
}

function VehiculoCard({ v }: { v: VehiculoGps }) {
  const tieneGps = v.lat !== null && v.lng !== null
  return (
    <li className="bg-surface-1 border border-border-1 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-fg-1 font-mono text-sm">{v.matricula}</span>
        <Badge tone={frescoTone(v.gps_timestamp)}>
          {formatTs(v.gps_timestamp)}
        </Badge>
      </div>
      {tieneGps ? (
        <div className="text-fg-2 text-xs font-mono">
          {v.lat!.toFixed(5)}, {v.lng!.toFixed(5)}
        </div>
      ) : (
        <p className="text-fg-3 text-xs">Posición no disponible</p>
      )}
      {tieneGps && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=16/${v.lat}/${v.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-u24-yellow text-xs underline"
          aria-label={`Ver ${v.matricula} en mapa`}
        >
          Ver en mapa ↗
        </a>
      )}
    </li>
  )
}

export function VisorGpsScreen({ idDrp }: Props) {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const { vehiculos, gpsError, publicandoGps, setGpsError, cargarPosiciones, publicarPosicion } =
    useVisorGps(idDrp)

  if (!isOnline) {
    return (
      <div role="main" className="p-4">
        <p className="text-fg-2 text-sm">El visor GPS requiere conexión a red.</p>
      </div>
    )
  }

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">Visor GPS</h1>
        <div className="flex gap-2">
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => { if (idDrp) cargarPosiciones() }}
            aria-label="Actualizar posiciones"
          >
            ↺ Actualizar
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            disabled={publicandoGps}
            onClick={publicarPosicion}
            aria-label="Publicar mi posición GPS"
          >
            {publicandoGps ? 'Publicando…' : 'Mi posición'}
          </Btn>
        </div>
      </div>

      {gpsError && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {gpsError}
          <button className="ml-2 underline" onClick={() => setGpsError(null)}>Cerrar</button>
        </div>
      )}

      {!idDrp ? (
        <p className="text-fg-2 text-sm">Selecciona un DRP para ver las posiciones.</p>
      ) : vehiculos.length === 0 ? (
        <p className="text-fg-2 text-sm">No hay vehículos activos en este DRP.</p>
      ) : (
        <ul className="space-y-2" aria-label="Posiciones GPS de vehículos">
          {vehiculos.map((v) => (
            <VehiculoCard key={v.matricula} v={v} />
          ))}
        </ul>
      )}

      <p className="text-fg-3 text-xs">
        Las posiciones se actualizan automáticamente cada 30 s.
      </p>
    </div>
  )
}
