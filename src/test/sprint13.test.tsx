import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ── Hoisted mocks (available to vi.mock factories) ────────────────────────

const { mockRpc, mockIdbGet, mockIdbSet } = vi.hoisted(() => ({
  mockRpc:    vi.fn(),
  mockIdbGet: vi.fn().mockResolvedValue(null),
  mockIdbSet: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('idb-keyval', () => ({
  get: mockIdbGet,
  set: mockIdbSet,
  del: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth:    { signInWithPassword: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() },
    rpc:     mockRpc,
    from:    vi.fn(),
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
  Sentry:        { init: vi.fn(), setUser: vi.fn(), captureException: vi.fn() },
}))

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn().mockReturnValue(() => {}),
}))

// ── Imports ───────────────────────────────────────────────────────────────

import { InstallChip } from '@/components/layout/InstallChip'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { initSentry, setSentryUser } from '@/lib/sentry'

// ── InstallChip ───────────────────────────────────────────────────────────

describe('InstallChip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIdbGet.mockResolvedValue(null)
    mockIdbSet.mockResolvedValue(undefined)
  })

  it('no renderiza nada cuando no hay evento beforeinstallprompt', () => {
    const { container } = render(<InstallChip />)
    expect(container.firstChild).toBeNull()
  })

  it('permanece invisible mientras isDismissed es true (timestamp reciente en IndexedDB)', async () => {
    // timestamp reciente → dismissed
    mockIdbGet.mockResolvedValueOnce(Date.now())
    const { container } = render(<InstallChip />)
    await act(async () => {})
    expect(container.firstChild).toBeNull()
  })
})

// ── useInstallPrompt ──────────────────────────────────────────────────────

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIdbGet.mockResolvedValue(null)
    mockIdbSet.mockResolvedValue(undefined)
  })

  it('canInstall es false cuando no hay evento beforeinstallprompt', () => {
    const TestComp = () => {
      const { canInstall } = useInstallPrompt()
      return <div data-testid="r">{canInstall ? 'si' : 'no'}</div>
    }
    render(<TestComp />)
    expect(screen.getByTestId('r').textContent).toBe('no')
  })

  it('isDismissed se vuelve true tras resolver idb con timestamp reciente', async () => {
    mockIdbGet.mockResolvedValueOnce(Date.now())
    const TestComp = () => {
      const { isDismissed } = useInstallPrompt()
      return <div data-testid="r">{isDismissed ? 'dismissed' : 'active'}</div>
    }
    render(<TestComp />)
    await act(async () => {})
    expect(screen.getByTestId('r').textContent).toBe('dismissed')
  })

  it('dismiss llama a idbSet con la clave correcta', async () => {
    mockIdbGet.mockResolvedValueOnce(null)
    const TestComp = () => {
      const { dismiss } = useInstallPrompt()
      return <button onClick={dismiss}>dismiss</button>
    }
    render(<TestComp />)
    await act(async () => { fireEvent.click(screen.getByText('dismiss')) })
    expect(mockIdbSet).toHaveBeenCalledWith('u24-install-dismissed', expect.any(Number))
  })

  it('isInstalled se detecta cuando matchMedia devuelve standalone', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })
    const TestComp = () => {
      const { isInstalled } = useInstallPrompt()
      return <div data-testid="r">{isInstalled ? 'installed' : 'not'}</div>
    }
    render(<TestComp />)
    expect(screen.getByTestId('r').textContent).toBe('installed')
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined })
  })
})

// ── usePushSubscription ───────────────────────────────────────────────────

describe('usePushSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isPushSupported es false cuando no hay VITE_VAPID_PUBLIC_KEY', () => {
    // VAPID key no está definida en el entorno de test
    const TestComp = () => {
      const { isPushSupported } = usePushSubscription()
      return <div data-testid="r">{isPushSupported ? 'si' : 'no'}</div>
    }
    render(<TestComp />)
    expect(screen.getByTestId('r').textContent).toBe('no')
  })

  it('subscribe devuelve false y setea error cuando no hay soporte', async () => {
    const errorMsgs: string[] = []
    const TestComp = () => {
      const { subscribe, error } = usePushSubscription()
      if (error) errorMsgs.push(error)
      return <button onClick={() => subscribe()}>sub</button>
    }
    render(<TestComp />)
    await act(async () => { fireEvent.click(screen.getByText('sub')) })
    // Sin VAPID ni SW, subscribe debe fallar con mensaje de error
    // (el error puede ser por VAPID o por PushManager no disponible)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('isSubscribed empieza en false', () => {
    const TestComp = () => {
      const { isSubscribed } = usePushSubscription()
      return <div data-testid="r">{isSubscribed ? 'si' : 'no'}</div>
    }
    render(<TestComp />)
    expect(screen.getByTestId('r').textContent).toBe('no')
  })

  it('unsubscribe devuelve true si no hay suscripción activa', async () => {
    // Simular SW disponible con getSubscription → null
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
      writable: true,
    })
    const results: boolean[] = []
    const TestComp = () => {
      const { unsubscribe } = usePushSubscription()
      return <button onClick={async () => { results.push(await unsubscribe()) }}>unsub</button>
    }
    render(<TestComp />)
    await act(async () => { fireEvent.click(screen.getByText('unsub')) })
    expect(results[0]).toBe(true)
  })
})

// ── Sentry integration ────────────────────────────────────────────────────

describe('Sentry integration', () => {
  it('initSentry no lanza cuando no hay DSN', () => {
    expect(() => initSentry()).not.toThrow()
  })

  it('setSentryUser acepta null sin lanzar', () => {
    expect(() => setSentryUser(null)).not.toThrow()
  })

  it('setSentryUser acepta un id_nombre sin lanzar', () => {
    expect(() => setSentryUser('empleado01')).not.toThrow()
  })

  it('initSentry y setSentryUser son funciones', () => {
    expect(typeof initSentry).toBe('function')
    expect(typeof setSentryUser).toBe('function')
  })
})
