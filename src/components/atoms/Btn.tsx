import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type BtnTone = 'primary' | 'yellow' | 'ghost' | 'destructive'
export type BtnVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'
export type BtnSize = 'sm' | 'md' | 'lg'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BtnTone
  variant?: BtnVariant
  size?: BtnSize
  icon?: string
  children?: ReactNode
}

export function Btn({
  tone,
  variant,
  size,
  icon,
  children,
  className = '',
  ...rest
}: BtnProps) {
  const modifier = variant ?? tone ?? 'primary'
  const sizeClass = size ? ` btn--${size}` : ''
  return (
    <button className={`btn btn--${modifier}${sizeClass} ${className}`.trim()} {...rest}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
    </button>
  )
}
