import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const fromMock = vi.fn<(table: string) => unknown>()
const channelMock = vi.fn<(name: string) => unknown>(() => ({
  on:        vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}))
const removeChannelMock = vi.fn<(ch: unknown) => unknown>()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from:          (table: string) => fromMock(table),
    channel:       (name: string)  => channelMock(name),
    removeChannel: (ch: unknown)   => removeChannelMock(ch),
  },
}))

vi.mock('@/hooks/useRealtimeKillSwitch', () => ({
  useRealtimeKillSwitch: () => false,
}))

let activacionState: { matricula: string } = { matricula: '' }
function setMatricula(matricula: string) {
  activacionState = { matricula }
}
vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(selector?: (s: typeof activacionState) => T): T | typeof activacionState {
    return selector ? selector(activacionState) : activacionState
  }
  return { useActivacionStore }
})

import { useVehiculoActivo } from '@/hooks/useVehiculoActivo'

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function buildBuilder(result: { data: unknown; error: unknown }) {
  return {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    is:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

beforeEach(() => {
  fromMock.mockReset()
  channelMock.mockClear()
  removeChannelMock.mockClear()
  setMatricula('')
})

describe('useVehiculoActivo', () => {
  it('no llama a supabase si no hay matrícula', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useVehiculoActivo(), { wrapper: wrapper(client) })

    expect(result.current.data).toBeNull()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('combina datos de vehiculos y activaciones_vehiculo', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'vehiculos') {
        return buildBuilder({
          data: {
            matricula:         '1234ABC',
            tipo:              'SVB',
            condicion_tecnica: 'operativo',
            estado_operativo:  'activo',
          },
          error: null,
        })
      }
      if (table === 'activaciones_vehiculo') {
        return buildBuilder({
          data: { pilot: 'pmartin', carry: 'rsoto', timestamp_apertura: '2026-05-24T07:00:00Z', tipo_servicio: 'urgente' },
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useVehiculoActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual({
      matricula:         '1234ABC',
      tipo:              'SVB',
      condicion_tecnica: 'operativo',
      estado_operativo:  'activo',
      pilot:             'pmartin',
      carry:             'rsoto',
      tipo_servicio:     'urgente',
    })
  })

  it('pilot/carry quedan en null cuando no hay activación abierta', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'vehiculos') {
        return buildBuilder({
          data: {
            matricula:         '1234ABC',
            tipo:              'SVB',
            condicion_tecnica: 'operativo',
            estado_operativo:  'inactivo',
          },
          error: null,
        })
      }
      return buildBuilder({ data: null, error: null })
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useVehiculoActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.pilot).toBeNull()
    expect(result.current.data?.carry).toBeNull()
  })

  it('devuelve null si el vehículo no existe', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'vehiculos') return buildBuilder({ data: null, error: null })
      return buildBuilder({ data: null, error: null })
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useVehiculoActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeNull()
  })

  it('propaga error de supabase', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'vehiculos') return buildBuilder({ data: null, error: new Error('RLS') })
      return buildBuilder({ data: null, error: null })
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useVehiculoActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('RLS')
  })
})
