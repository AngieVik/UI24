interface LoadingSkeletonProps {
  variant?: 'card' | 'spinner' | 'row'
  rows?: number
  columns?: number
}

export function LoadingSkeleton({
  variant = 'card',
  rows = 2,
  columns = 4,
}: LoadingSkeletonProps) {
  if (variant === 'spinner') {
    return (
      <div
        className="skel-spinner"
        role="status"
        aria-label="Cargando…"
      />
    )
  }

  if (variant === 'row') {
    return (
      <div className="skel-row" role="status" aria-label="Cargando…">
        {Array.from({ length: columns }, (_, i) => (
          <div
            key={i}
            className="skel-pulse"
            style={{ flex: 1, height: 12 }}
          />
        ))}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Cargando…">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel-card">
          <div className="skel-pulse" style={{ height: 14, width: '66%' }} />
          <div className="skel-pulse" style={{ height: 10, width: '100%' }} />
          <div className="skel-pulse" style={{ height: 10, width: '78%' }} />
        </div>
      ))}
    </div>
  )
}
