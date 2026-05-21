import { useGlobalStore } from '@/stores/useGlobalStore'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'

export function BannerOffline() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const isProcessing = useOfflineQueue((s) => s.isProcessing)
  const pendingCount = useOfflineQueue(
    (s) => s.queue.filter((m) => m.status === 'pending').length,
  )

  if (isOnline && !isProcessing) return null

  if (!isOnline) {
    return (
      <div className="banner" role="status" aria-live="polite">
        <i className="ti ti-wifi-off" aria-hidden="true" />
        <span>
          <b>Sin conexión</b> · Los partes de trabajo y registros clínicos
          siguen disponibles.
        </span>
      </div>
    )
  }

  return (
    <div className="banner banner--sync" role="status" aria-live="polite">
      <i className="ti ti-refresh" aria-hidden="true" />
      <span>
        <b>Sincronizando datos…</b>{' '}
        {pendingCount}{' '}
        {pendingCount === 1 ? 'operación pendiente' : 'operaciones pendientes'}
      </span>
    </div>
  )
}
