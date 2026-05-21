import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// ── Hoisted mocks (deben declararse antes de vi.mock) ─────────────────────

const { mockRpc, mockRefreshSession } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockRefreshSession: vi.fn(),
}))

// ── Mocks de módulos ──────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { refreshSession: mockRefreshSession },
    rpc: mockRpc,
  },
}))

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ ejecutorId: 'test-empleado', session: null }),
  },
}))

vi.mock('@/stores/useGlobalStore', () => ({
  useGlobalStore: {
    getState: () => ({ setPendingQueueCount: vi.fn() }),
  },
}))

// ── Import del módulo bajo prueba (después de los mocks) ──────────────────

import { useOfflineQueue } from '@/hooks/useOfflineQueue'

// ── Helper ────────────────────────────────────────────────────────────────

function freshQueue() {
  return renderHook(() => useOfflineQueue())
}

// ── Tests: enqueue ────────────────────────────────────────────────────────

describe('useOfflineQueue — enqueue', () => {
  it('genera un mutation_uuid único por mutación', () => {
    const { result } = freshQueue()
    let uuid1!: string, uuid2!: string
    act(() => {
      uuid1 = result.current.enqueue('rpc_deducir_material', { id_item: 1, cantidad: 2 })
      uuid2 = result.current.enqueue('rpc_deducir_material', { id_item: 1, cantidad: 2 })
    })
    expect(uuid1).not.toBe(uuid2)
    expect(uuid1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('el payload incluye mutation_uuid para el ledger ADR-012', () => {
    const { result } = freshQueue()
    let uuid!: string
    act(() => {
      uuid = result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    const mutation = result.current.queue.find((m) => m.mutation_uuid === uuid)
    expect(mutation?.payload.mutation_uuid).toBe(uuid)
  })

  it('la mutación no guarda el JWT — solo ejecutorId', () => {
    const { result } = freshQueue()
    let uuid!: string
    act(() => {
      uuid = result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    const mutation = result.current.queue.find((m) => m.mutation_uuid === uuid)
    expect(mutation?.ejecutorId).toBe('test-empleado')
    expect(mutation?.payload).not.toHaveProperty('jwt')
    expect(mutation?.payload).not.toHaveProperty('token')
    expect(mutation?.payload).not.toHaveProperty('access_token')
  })

  it('se puede especificar mutation_uuid externamente', () => {
    const { result } = freshQueue()
    const fixedUuid = '00000000-0000-0000-0000-000000000001'
    act(() => {
      result.current.enqueue('rpc_deducir_material', {}, fixedUuid)
    })
    const mutation = result.current.queue.find(
      (m) => m.mutation_uuid === fixedUuid,
    )
    expect(mutation).toBeDefined()
    expect(mutation?.payload.mutation_uuid).toBe(fixedUuid)
  })
})

// ── Tests: processQueue ───────────────────────────────────────────────────

describe('useOfflineQueue — processQueue', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRefreshSession.mockReset()
    mockRefreshSession.mockResolvedValue({ error: null })
  })

  it('refresca la sesión antes del primer batch', async () => {
    mockRpc.mockResolvedValue({ error: null })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    await act(async () => {
      await result.current.processQueue()
    })
    expect(mockRefreshSession).toHaveBeenCalledOnce()
  })

  it('lanza SESSION_REFRESH_FAILED si el refresh falla', async () => {
    mockRefreshSession.mockResolvedValue({ error: new Error('expired') })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    await expect(
      act(async () => result.current.processQueue()),
    ).rejects.toThrow('SESSION_REFRESH_FAILED')
  })

  it('elimina mutaciones exitosas de la cola', async () => {
    mockRpc.mockResolvedValue({ error: null })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    const before = result.current.queue.length
    expect(before).toBeGreaterThan(0)
    await act(async () => {
      await result.current.processQueue()
    })
    // Todas las mutaciones enviadas con éxito en este test deben haber desaparecido
    const stillPending = result.current.queue.filter((m) => m.status === 'pending')
    expect(stillPending).toHaveLength(0)
  })

  it('el payload lleva mutation_uuid para idempotencia servidor (ADR-012)', async () => {
    mockRpc.mockResolvedValue({ error: null })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 99 })
    })
    await act(async () => {
      await result.current.processQueue()
    })
    const call = mockRpc.mock.calls[0]
    expect(call?.[1]).toHaveProperty('mutation_uuid')
  })

  it('marca como failed tras MAX_ATTEMPTS intentos', async () => {
    mockRpc.mockResolvedValue({ error: new Error('ERR_INVENTARIO_006: stock insuficiente') })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    // 3 procesados = MAX_ATTEMPTS
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.processQueue()
      })
    }
    const candidates = result.current.queue.filter(
      (m) => m.rpc_name === 'rpc_deducir_material',
    )
    expect(candidates.some((m) => m.status === 'failed')).toBe(true)
  })

  it('retryFailed vuelve las mutaciones fallidas a pending con attempts=0', async () => {
    mockRpc.mockResolvedValue({ error: new Error('network error') })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.processQueue()
      })
    }
    const failedBefore = result.current.queue.filter((m) => m.status === 'failed')
    expect(failedBefore.length).toBeGreaterThan(0)

    act(() => { result.current.retryFailed() })

    const afterRetry = result.current.queue.filter(
      (m) => failedBefore.some((f) => f.mutation_uuid === m.mutation_uuid),
    )
    expect(afterRetry.every((m) => m.status === 'pending' && m.attempts === 0)).toBe(true)
  })
})

// ── Tests: isProcessing ───────────────────────────────────────────────────

describe('useOfflineQueue — isProcessing', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRefreshSession.mockReset()
  })

  it('empieza en false', () => {
    const { result } = freshQueue()
    expect(result.current.isProcessing).toBe(false)
  })

  it('vuelve a false tras procesar con éxito', async () => {
    mockRefreshSession.mockResolvedValue({ error: null })
    mockRpc.mockResolvedValue({ error: null })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    await act(async () => {
      await result.current.processQueue()
    })
    expect(result.current.isProcessing).toBe(false)
  })

  it('vuelve a false tras SESSION_REFRESH_FAILED', async () => {
    mockRefreshSession.mockResolvedValue({ error: new Error('expired') })
    const { result } = freshQueue()
    act(() => {
      result.current.enqueue('rpc_deducir_material', { id_item: 1 })
    })
    try {
      await act(async () => { await result.current.processQueue() })
    } catch {
      // esperado
    }
    expect(result.current.isProcessing).toBe(false)
  })
})
