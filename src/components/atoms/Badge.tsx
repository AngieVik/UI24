import type { CSSProperties, ReactNode } from 'react'

export type BadgeTone = 'ok' | 'warn' | 'crit' | 'info' | 'neutral' | 'solid-yellow'

interface BadgeProps {
  tone?: BadgeTone
  icon?: string
  style?: CSSProperties
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, style, className = '', children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()} style={style}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
    </span>
  )
}
