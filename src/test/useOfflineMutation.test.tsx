import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const rpcMock =
  vi.fn<(name: string, payload: unknown) => Promise<{ data: unknown; error: unknown }>>()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, payload: unknown) => rpcMock(name, payload),
  },
}))

// Estado mutable para el flag online
let onlineState = true
vi.mock('@/stores/useGlobalStore', () => {
  function useGlobalStore<T = unknown>(
    selector?: (s: { isOnline: boolean }) => T
  ): T | { isOnline: boolean } {
    const state = { isOnline: onlineState }
    return selector ? selector(state) : state
  }
  return { useGlobalStore }
})

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ ejecutorId: 'admin' }),
  },
}))

// crypto.randomUUID estable para los tests
let uuidCounter = 0
beforeEach(() => {
  uuidCounter = 0
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++uuidCounter}`,
  })
})

import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useOfflineMutationQueue } from '@/lib/offlineMutationQueue'

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  rpcMock.mockReset()
  onlineState = true
  useOfflineMutationQueue.setState({ pending: [], isProcessing: false })
})

describe('useOfflineMutation', () => {
  it('online: invoca supabase.rpc con p_mutation_uuid inyectado y devuelve queued=false', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true }, error: null })
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    const { result } = renderHook(
      () => useOfflineMutation<{ matricula: string }>({ rpcName: 'rpc_checkin' }),
      { wrapper: wrapper(client) }
    )

    await act(async () => {
      const out = await result.current.mutateAsync({ matricula: '1234ABC' })
      expect(out.queued).toBe(false)
      expect(out.mutation_uuid).toBe('uuid-1')
      expect(out.data).toEqual({ ok: true })
    })

    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(rpcMock).toHaveBeenCalledWith('rpc_checkin', {
      matricula: '1234ABC',
      p_mutation_uuid: 'uuid-1',
    })

    expect(useOfflineMutationQueue.getState().pending).toEqual([])
  })

  it('online: usa exactamente el prefix p_mutation_uuid del payload', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    const { result } = renderHook(
      () =>
        useOfflineMutation<{ p_matricula: string; p_km_inicio: number }>({
          rpcName: 'rpc_checkin_vehiculo',
        }),
      { wrapper: wrapper(client) }
    )

    await act(async () => {
      await result.current.mutateAsync({ p_matricula: '1234ABC', p_km_inicio: 100000 })
    })

    expect(rpcMock).toHaveBeenCalledWith('rpc_checkin_vehiculo', {
      p_matricula: '1234ABC',
      p_km_inicio: 100000,
      p_mutation_uuid: 'uuid-1',
    })
    // No encolado
    expect(useOfflineMutationQueue.getState().pending).toEqual([])
  })

  it('online: invalida queryKeys declaradas tras éxito', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        useOfflineMutation<{ x: number }>({
          rpcName: 'rpc_x',
          invalidates: [['personal_en_turno'], ['vehiculo_activo', 'foo']],
        }),
      { wrapper: wrapper(client) }
    )

    await act(async () => {
      await result.current.mutateAsync({ x: 1 })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['personal_en_turno'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vehiculo_activo', 'foo'] })
  })

  it('online: propaga error de supabase y NO invalida', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('boom') })
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        useOfflineMutation<{ x: number }>({
          rpcName: 'rpc_x',
          invalidates: [['k']],
        }),
      { wrapper: wrapper(client) }
    )

    await expect(act(() => result.current.mutateAsync({ x: 1 }))).rejects.toThrow('boom')
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('offline: encola la mutación y NO llama supabase.rpc', async () => {
    onlineState = false
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    const { result } = renderHook(
      () =>
        useOfflineMutation<{ matricula: string }>({
          rpcName: 'rpc_checkin',
          invalidates: [['personal_en_turno']],
        }),
      { wrapper: wrapper(client) }
    )

    await act(async () => {
      const out = await result.current.mutateAsync({ matricula: '1234ABC' })
      expect(out.queued).toBe(true)
      expect(out.mutation_uuid).toBe('uuid-1')
    })

    expect(rpcMock).not.toHaveBeenCalled()
    const { pending } = useOfflineMutationQueue.getState()
    expect(pending).toHaveLength(1)
    expect(pending[0].uuid).toBe('uuid-1')
    expect(pending[0].rpcName).toBe('rpc_checkin')
    expect(pending[0].payload).toEqual({ matricula: '1234ABC', p_mutation_uuid: 'uuid-1' })
    expect(pending[0].invalidates).toEqual([['personal_en_turno']])
    expect(pending[0].ejecutorId).toBe('admin')
  })

  it('offline: NO invalida queryKeys (eso lo hace el processor al drenar)', async () => {
    onlineState = false
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        useOfflineMutation<{ x: number }>({
          rpcName: 'rpc_x',
          invalidates: [['k']],
        }),
      { wrapper: wrapper(client) }
    )

    await act(async () => {
      await result.current.mutateAsync({ x: 1 })
    })
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('online: cada invocación genera un p_mutation_uuid distinto', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    const { result } = renderHook(() => useOfflineMutation<{ x: number }>({ rpcName: 'rpc_x' }), {
      wrapper: wrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync({ x: 1 })
    })
    await act(async () => {
      await result.current.mutateAsync({ x: 2 })
    })

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2))
    const uuids = rpcMock.mock.calls.map(
      (c) => (c[1] as { p_mutation_uuid: string }).p_mutation_uuid
    )
    expect(new Set(uuids).size).toBe(2)
  })
})
