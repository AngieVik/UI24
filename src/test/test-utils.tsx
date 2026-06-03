import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BlackColumnProvider } from '@/contexts/BlackColumnContext'

/**
 * Wrapper para tests de componentes que viven dentro del chasis del
 * BlackColumn. Provee:
 *  - QueryClientProvider (necesario para useQuery / useMutation)
 *  - TooltipProvider (necesario por shadcn Tooltip)
 *  - BlackColumnProvider (necesario para useBlackColumn)
 */
function ShellWrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <BlackColumnProvider>{children}</BlackColumnProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export function renderWithShell(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: ShellWrapper, ...options })
}

export * from '@testing-library/react'
