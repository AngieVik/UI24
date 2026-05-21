import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type BtnTone = 'primary' | 'yellow' | 'ghost' | 'destructive'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BtnTone
  icon?: string
  children?: ReactNode
}

export function Btn({ tone = 'primary', icon, children, className = '', ...rest }: BtnProps) {
  return (
    <button className={`btn btn--${tone} ${className}`.trim()} {...rest}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
    </button>
  )
}
