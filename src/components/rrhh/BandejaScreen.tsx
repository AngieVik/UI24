import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useBandeja } from '@/hooks/useBandeja'

export function BandejaScreen() {
  const { mensajes, noLeidos, loading, error, setError, cargarMensajes, marcarLeido } = useBandeja()

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">
          Bandeja
          {noLeidos > 0 && (
            <Badge tone="warn" className="ml-2">{noLeidos} no leído{noLeidos > 1 ? 's' : ''}</Badge>
          )}
        </h1>
        <Btn variant="secondary" size="sm" onClick={cargarMensajes} aria-label="Actualizar bandeja">
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

      {!loading && mensajes.length === 0 && (
        <p className="text-fg-2 text-sm">La bandeja está vacía.</p>
      )}

      <ul className="space-y-2" aria-label="Mensajes de bandeja">
        {mensajes.map((m) => (
          <li
            key={m.id_mensaje}
            className={`rounded border p-3 space-y-1 ${
              m.estado === 'no_leido'
                ? 'border-u24-yellow/50 bg-u24-yellow/5'
                : 'border-border-1 bg-surface-1 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-fg-1 text-sm flex-1">{m.contenido}</p>
              {m.estado === 'no_leido' && (
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => marcarLeido(m.id_mensaje)}
                  aria-label="Marcar como leído"
                >
                  Leído
                </Btn>
              )}
            </div>
            <span className="text-fg-3 text-xs block">
              {new Date(m.created_at).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
              {m.estado === 'leido' && m.timestamp_lectura && (
                <> · Leído {new Date(m.timestamp_lectura).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
