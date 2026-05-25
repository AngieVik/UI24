import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Stubs antes de importar el hook
const fromMock = vi.fn<(table: string) => unknown>()
const channelMock = vi.fn<(name: string) => unknown>(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}))
const removeChannelMock = vi.fn<(ch: unknown) => unknown>()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from:          (table: string)   => fromMock(table),
    channel:       (name: string)    => channelMock(name),
    removeChannel: (ch: unknown)     => removeChannelMock(ch),
  },
}))

vi.mock('@/hooks/useRealtimeKillSwitch', () => ({
  useRealtimeKillSwitch: () => false,
}))

// Mock del store de terminal — evita que zustand/persist toque IndexedDB
// (jsdom no lo provee y nos importa solo el valor seleccionado).
let terminalState: { id_terminal: string | null } = { id_terminal: null }
function setTerminal(next: { id_terminal: string | null }) {
  terminalState = next
}
vi.mock('@/stores/useTerminalStore', () => {
  function useTerminalStore<T = unknown>(selector?: (s: typeof terminalState) => T): T | typeof terminalState {
    return selector ? selector(terminalState) : terminalState
  }
  return { useTerminalStore }
})

import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  fromMock.mockReset()
  channelMock.mockClear()
  removeChannelMock.mockClear()
  setTerminal({ id_terminal: null })
})

describe('usePersonalEnTurno', () => {
  it('no llama a supabase si no hay id_terminal', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePersonalEnTurno(), { wrapper: wrapper(client) })

    expect(result.current.data).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('mapea filas de presencias_activas_terminal + join fichas_empleados', async () => {
    setTerminal({ id_terminal: 'term-001' })

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockResolvedValue({
        data: [
          {
            id_nombre:  'pmartin',
            checkin_at: '2026-05-24T07:30:00.000Z',
            fichas_empleados: { nombre_real: 'Pedro Martín', rol: 'tes', telefono: '600111222' },
          },
        ],
        error: null,
      }),
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePersonalEnTurno(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([
      {
        id_nombre:   'pmartin',
        nombre_real: 'Pedro Martín',
        rol:         'tes',
        telefono:    '600111222',
        checkin_at:  '2026-05-24T07:30:00.000Z',
      },
    ])
    expect(fromMock).toHaveBeenCalledWith('presencias_activas_terminal')
  })

  it('marca isError si supabase devuelve error', async () => {
    setTerminal({ id_terminal: 'term-001' })

    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockResolvedValue({
        data: null,
        error: new Error('RLS denied'),
      }),
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePersonalEnTurno(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('RLS denied')
  })
})
