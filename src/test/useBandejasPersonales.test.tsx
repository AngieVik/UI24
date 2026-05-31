import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const fromMock = vi.fn<(table: string) => unknown>()
const channelMock = vi.fn<(name: string) => unknown>(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}))
const removeChannelMock = vi.fn<(ch: unknown) => unknown>()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    channel: (name: string) => channelMock(name),
    removeChannel: (ch: unknown) => removeChannelMock(ch),
  },
}))

vi.mock('@/hooks/useRealtimeKillSwitch', () => ({
  useRealtimeKillSwitch: () => false,
}))

import { useBandejasPersonales } from '@/hooks/useBandejasPersonales'

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function buildSelectInEq(result: { data: unknown; error: unknown }) {
  const eqEstado = vi.fn().mockResolvedValue(result)
  const inDestino = vi.fn(() => ({ eq: eqEstado }))
  const select = vi.fn(() => ({ in: inDestino }))
  return { select }
}

beforeEach(() => {
  fromMock.mockReset()
  channelMock.mockClear()
  removeChannelMock.mockClear()
})

describe('useBandejasPersonales', () => {
  it('devuelve [] sin tocar supabase cuando idsNombres está vacío', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useBandejasPersonales([]), { wrapper: wrapper(client) })

    expect(result.current.data).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('agrupa los mensajes no_leido por destinatario', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'mensajes_bandeja') {
        return buildSelectInEq({
          data: [
            { id_nombre_destino: 'admin' },
            { id_nombre_destino: 'admin' },
            { id_nombre_destino: 'admin' },
            { id_nombre_destino: 'tes_demo' },
          ],
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useBandejasPersonales(['admin', 'tes_demo']), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([
      { id_nombre: 'admin', unreadCount: 3 },
      { id_nombre: 'tes_demo', unreadCount: 1 },
    ])
  })

  it('devuelve 0 cuando una persona no tiene mensajes no_leido', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'mensajes_bandeja') {
        return buildSelectInEq({
          data: [{ id_nombre_destino: 'admin' }],
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useBandejasPersonales(['admin', 'tes_demo']), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([
      { id_nombre: 'admin', unreadCount: 1 },
      { id_nombre: 'tes_demo', unreadCount: 0 },
    ])
  })

  it('propaga error de supabase', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'mensajes_bandeja') {
        return buildSelectInEq({ data: null, error: new Error('RLS') })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useBandejasPersonales(['admin']), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('RLS')
  })
})
