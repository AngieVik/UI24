import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BlackColumnProvider } from '@/contexts/BlackColumnContext'

// ─── jest-axe matcher ──────────────────────────────────────────────────────────
beforeAll(() => {
  expect.extend(toHaveNoViolations)
})

// ─── Mocks globales ───────────────────────────────────────────────────────────
vi.mock('@/hooks/useLoginFlow', () => ({
  useLoginFlow: () => ({
    isLoading: false,
    error: null,
    loginNormal: vi.fn(),
    loginEmergencia: vi.fn(),
  }),
}))
vi.mock('@/hooks/useAutorizarTerminal', () => ({
  useAutorizarTerminal: () => ({ autorizar: vi.fn(), isSubmitting: false, error: null }),
}))
vi.mock('@/hooks/useCheckinTrabajador', () => ({
  useCheckinTrabajador: () => ({ checkin: vi.fn(), isSubmitting: false, error: null }),
}))
vi.mock('@/hooks/useAbrirTurno', () => ({
  useAbrirTurno: () => ({ abrir: vi.fn(), isSubmitting: false }),
}))
vi.mock('@/stores/useGlobalStore', () => ({
  useGlobalStore: (sel: (s: { isOnline: boolean }) => unknown) => sel({ isOnline: true }),
}))
vi.mock('@/stores/useTerminalStore', () => ({
  useTerminalStore: (sel: (s: { id_terminal: string | null }) => unknown) =>
    sel({ id_terminal: null }),
}))
// Logo SVG: jsdom no procesa módulos SVG — devolvemos string vacío
vi.mock('@/assets/logo.svg', () => ({ default: '' }))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withShell(ui: React.ReactElement) {
  return render(
    <TooltipProvider delayDuration={0}>
      <BlackColumnProvider>{ui}</BlackColumnProvider>
    </TooltipProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A11y — pantallas de acceso', () => {
  it('LoginScreen no tiene violaciones axe', async () => {
    const { LoginScreen } = await import('@/components/auth/LoginScreen')
    const { container } = render(<LoginScreen />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AutorizarTerminalScreen no tiene violaciones axe', async () => {
    const { AutorizarTerminalScreen } = await import('@/components/auth/AutorizarTerminalScreen')
    const { container } = render(<AutorizarTerminalScreen />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('CheckinInicialScreen no tiene violaciones axe', async () => {
    const { CheckinInicialScreen } = await import('@/components/auth/CheckinInicialScreen')
    const { container } = render(<CheckinInicialScreen />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('A11y — navegación principal', () => {
  it('BlackColumn no tiene violaciones axe', async () => {
    const { useAuthStore } = await import('@/stores/useAuthStore')
    useAuthStore.setState({
      session: { user: { app_metadata: { rol: 'gerencia' } } } as never,
      ejecutorId: 'admin',
      rol: 'gerencia',
    })
    const { BlackColumn } = await import('@/components/layout/BlackColumn')
    const { container } = withShell(<BlackColumn />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
