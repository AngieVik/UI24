import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useAvisos } from '@/hooks/useAvisos'
import { useAuthStore } from '@/stores/useAuthStore'

const NIVEL_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  informativo: 'ok',
  aviso:       'warn',
  critico:     'crit',
}

const NIVEL_LABEL: Record<string, string> = {
  informativo: 'Informativo',
  aviso:       'Aviso',
  critico:     'Crítico',
}

export function AvisosScreen() {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const { avisos, loading, error, setError, cargarAvisos, marcarLeido } = useAvisos()

  const noLeidos = avisos.filter(
    (a) => ejecutorId && !a.leido_por.includes(ejecutorId),
  ).length

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">
          Avisos
          {noLeidos > 0 && (
            <Badge tone="crit" className="ml-2">{noLeidos} nuevo{noLeidos > 1 ? 's' : ''}</Badge>
          )}
        </h1>
        <Btn variant="secondary" size="sm" onClick={cargarAvisos} aria-label="Actualizar avisos">
          ↺ Actualizar
        </Btn>
      </div>

      {error && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {loading && <LoadingSkeleton variant="row" />}

      {!loading && avisos.length === 0 && (
        <p className="text-fg-2 text-sm">No hay avisos.</p>
      )}

      <ul className="space-y-2" aria-label="Lista de avisos">
        {avisos.map((aviso) => {
          const leido = ejecutorId ? aviso.leido_por.includes(ejecutorId) : true
          return (
            <li
              key={aviso.id_aviso}
              className={`rounded border p-3 space-y-1 ${
                leido ? 'border-border-1 bg-surface-1' : 'border-u24-yellow/50 bg-u24-yellow/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={NIVEL_TONE[aviso.nivel] ?? 'info'}>
                  {NIVEL_LABEL[aviso.nivel] ?? aviso.nivel}
                </Badge>
                <span className="text-fg-3 text-xs">
                  {new Date(aviso.timestamp_publicacion).toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-fg-1 text-sm">{aviso.texto}</p>
              <div className="flex items-center justify-between">
                <span className="text-fg-3 text-xs">Emisor: {aviso.id_nombre_emisor}</span>
                {!leido && (
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => marcarLeido(aviso.id_aviso)}
                    aria-label={`Marcar aviso de ${aviso.id_nombre_emisor} como leído`}
                  >
                    Marcar leído
                  </Btn>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
