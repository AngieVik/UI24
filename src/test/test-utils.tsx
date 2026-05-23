import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BlackColumnProvider } from '@/contexts/BlackColumnContext'

/**
 * Wrapper para tests de componentes que viven dentro del chasis del
 * BlackColumn. Provee TooltipProvider (necesario por shadcn Tooltip) y
 * BlackColumnProvider (necesario para useBlackColumn).
 */
function ShellWrapper({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <BlackColumnProvider>{children}</BlackColumnProvider>
    </TooltipProvider>
  )
}

export function renderWithShell(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: ShellWrapper, ...options })
}

export * from '@testing-library/react'
