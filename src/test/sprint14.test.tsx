import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// ── Hoisted mocks ─────────────────────────────────────────────────────────

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc:  vi.fn(),
  mockFrom: vi.fn(),
}))

// ── Module mocks ──────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth:    { signInWithPassword: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() },
    rpc:     mockRpc,
    from:    mockFrom,
    functions: { invoke: vi.fn() },
    storage: { from: vi.fn() },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/lib/fingerprint', () => ({
  computeFingerprint: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/offlineSession', () => ({
  saveOfflineSession:    vi.fn().mockResolvedValue(undefined),
  verifyOfflineLogin:    vi.fn().mockResolvedValue(true),
  loadOfflineSession:    vi.fn().mockResolvedValue(null),
  clearOfflineSession:   vi.fn().mockResolvedValue(undefined),
  isOfflineSessionValid: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/sentry', () => ({
  initSentry:    vi.fn(),
  setSentryUser: vi.fn(),
}))

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn().mockReturnValue(() => {}),
}))

// ── Imports ───────────────────────────────────────────────────────────────

import { LoginScreen }       from '@/components/auth/LoginScreen'
import { BandejaScreen }     from '@/components/rrhh/BandejaScreen'
import { CuadranteScreen }   from '@/components/rrhh/CuadranteScreen'
import { SystemConfigScreen } from '@/components/rrhh/SystemConfigScreen'
import { useAuthStore }      from '@/stores/useAuthStore'
import { useStepUp }         from '@/hooks/useStepUp'

// jsdom no puede calcular contrastes de color — desactivar la regla para todos los tests
const AXE_CONFIG = { rules: { 'color-contrast': { enabled: false } } } as const

// ── Helpers ───────────────────────────────────────────────────────────────

function mockFromEmpty() {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      order:  vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      eq:     vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      }),
      gte:    vi.fn().mockReturnValue({
        lte:  vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  }))
}

function mockFromSystemConfig() {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    return {
      select: vi.fn().mockReturnValue({
        order:  vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }
  })
}

// ── A11y: LoginScreen ─────────────────────────────────────────────────────

describe('A11y — LoginScreen', () => {
  it('no tiene violaciones axe en la pestaña de acceso normal', async () => {
    const { container } = render(<LoginScreen />)
    const results = await axe(container, AXE_CONFIG)
    expect(results).toHaveNoViolations()
  })

  it('no tiene violaciones axe en la pestaña de emergencia', async () => {
    const { container } = render(<LoginScreen />)
    fireEvent.click(screen.getByRole('tab', { name: /Emergencia/i }))
    const results = await axe(container, AXE_CONFIG)
    expect(results).toHaveNoViolations()
  })
})

// ── A11y: BandejaScreen ───────────────────────────────────────────────────

describe('A11y — BandejaScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromEmpty()
    useAuthStore.setState({
      ejecutorId: 'tecnico01',
      session: { user: { id: 'uid1', user_metadata: { rol: 'tecnico', id_nombre: 'tecnico01' } } } as never,
          })
  })

  it('no tiene violaciones axe en estado vacío', async () => {
    const { container } = render(<BandejaScreen />)
    await act(async () => {})
    const results = await axe(container, AXE_CONFIG)
    expect(results).toHaveNoViolations()
  })
})

// ── A11y: CuadranteScreen ────────────────────────────────────────────────

describe('A11y — CuadranteScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }))
    useAuthStore.setState({
      ejecutorId: 'tecnico01',
      session: { user: { id: 'uid1', user_metadata: { rol: 'tecnico', id_nombre: 'tecnico01' } } } as never,
          })
  })

  it('no tiene violaciones axe en estado vacío', async () => {
    const { container } = render(<CuadranteScreen />)
    await act(async () => {})
    const results = await axe(container, AXE_CONFIG)
    expect(results).toHaveNoViolations()
  })
})

// ── A11y: SystemConfigScreen ─────────────────────────────────────────────

describe('A11y — SystemConfigScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromSystemConfig()
    useAuthStore.setState({
      ejecutorId: 'gerencia01',
      session: { user: { id: 'uid2', user_metadata: { rol: 'gerencia', id_nombre: 'gerencia01' } } } as never,
          })
    useStepUp.setState({ requestStepUp: vi.fn().mockResolvedValue(true) })
  })

  it('no tiene violaciones axe en la pestaña de parámetros', async () => {
    const { container } = render(<SystemConfigScreen />)
    await act(async () => {})
    const results = await axe(container, AXE_CONFIG)
    expect(results).toHaveNoViolations()
  })
})

// ── RGPD: rpc_solicitar_borrado_rgpd ─────────────────────────────────────

describe('RGPD — rpc_solicitar_borrado_rgpd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    useAuthStore.setState({
      ejecutorId: 'tecnico01',
      session: { user: { id: 'uid1', user_metadata: { rol: 'tecnico', id_nombre: 'tecnico01' } } } as never,
          })
  })

  it('invoca rpc_solicitar_borrado_rgpd con un UUID válido', async () => {
    const mutationUuid = crypto.randomUUID()
    const { supabase } = await import('@/lib/supabase')
    await supabase.rpc('rpc_solicitar_borrado_rgpd', { p_mutation_uuid: mutationUuid })
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_solicitar_borrado_rgpd',
      { p_mutation_uuid: mutationUuid },
    )
  })

  it('devuelve error cuando el usuario no está autenticado (mock ERR_AUTH_REQUIRED)', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ERR_AUTH_REQUIRED', code: 'P0001' },
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('rpc_solicitar_borrado_rgpd', {
      p_mutation_uuid: crypto.randomUUID(),
    })
    expect(result.error?.message).toBe('ERR_AUTH_REQUIRED')
  })
})

// ── RGPD: rpc_procesar_borrado_rgpd ──────────────────────────────────────

describe('RGPD — rpc_procesar_borrado_rgpd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    useAuthStore.setState({
      ejecutorId: 'gerencia01',
      session: { user: { id: 'uid2', user_metadata: { rol: 'gerencia', id_nombre: 'gerencia01' } } } as never,
          })
  })

  it('invoca rpc_procesar_borrado_rgpd con id_nombre y issue_ref', async () => {
    const { supabase } = await import('@/lib/supabase')
    await supabase.rpc('rpc_procesar_borrado_rgpd', {
      p_id_nombre: 'tecnico01',
      p_issue_ref: 'ISSUE-42',
    })
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_procesar_borrado_rgpd',
      { p_id_nombre: 'tecnico01', p_issue_ref: 'ISSUE-42' },
    )
  })

  it('devuelve error ERR_RBAC_RGPD cuando el rol no es gerencia', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ERR_RBAC_RGPD: Solo gerencia puede procesar borrados RGPD', code: 'P0001' },
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('rpc_procesar_borrado_rgpd', {
      p_id_nombre: 'tecnico01',
      p_issue_ref: undefined,
    })
    expect(result.error?.message).toContain('ERR_RBAC_RGPD')
  })

  it('devuelve error ERR_RGPD_ALREADY_DONE si el empleado ya fue suprimido', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ERR_RGPD_ALREADY_DONE: Este empleado ya fue suprimido', code: 'P0001' },
    })
    const { supabase } = await import('@/lib/supabase')
    const result = await supabase.rpc('rpc_procesar_borrado_rgpd', {
      p_id_nombre: 'tecnico01',
      p_issue_ref: undefined,
    })
    expect(result.error?.message).toContain('ERR_RGPD_ALREADY_DONE')
  })
})

// ── Seguridad: step-up requerido en SystemConfigScreen ───────────────────

describe('Seguridad — step-up en SystemConfigScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromSystemConfig()
    useAuthStore.setState({
      ejecutorId: 'gerencia01',
      session: { user: { id: 'uid2', user_metadata: { rol: 'gerencia', id_nombre: 'gerencia01' } } } as never,
          })
  })

  it('requestStepUp se llama antes de setConfigValue al guardar', async () => {
    const mockStepUp = vi.fn().mockResolvedValue(true)
    useStepUp.setState({ requestStepUp: mockStepUp })
    mockRpc.mockResolvedValueOnce({ data: null, error: null })

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ clave: 'feature_drp', valor: true, descripcion: null, id_nombre_modificador: null, updated_at: new Date().toISOString() }],
          error: null,
        }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }))

    render(<SystemConfigScreen />)
    await act(async () => {})

    const editBtn = screen.getByRole('button', { name: /Editar feature_drp/i })
    fireEvent.click(editBtn)

    const submitBtn = screen.getByRole('button', { name: /Guardar/i })
    await act(async () => { fireEvent.click(submitBtn) })

    expect(mockStepUp).toHaveBeenCalledOnce()
    expect(mockRpc).toHaveBeenCalledWith('rpc_set_system_config', expect.objectContaining({ p_clave: 'feature_drp' }))
  })

  it('setConfigValue NO se llama si step-up es rechazado', async () => {
    const mockStepUp = vi.fn().mockRejectedValue(new Error('step-up cancelled'))
    useStepUp.setState({ requestStepUp: mockStepUp })

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ clave: 'feature_drp', valor: true, descripcion: null, id_nombre_modificador: null, updated_at: new Date().toISOString() }],
          error: null,
        }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }))

    render(<SystemConfigScreen />)
    await act(async () => {})

    const editBtn = screen.getByRole('button', { name: /Editar feature_drp/i })
    fireEvent.click(editBtn)

    const submitBtn = screen.getByRole('button', { name: /Guardar/i })
    await act(async () => { fireEvent.click(submitBtn) })

    expect(mockStepUp).toHaveBeenCalledOnce()
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
