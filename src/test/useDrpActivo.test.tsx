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

let activacionState: { matricula: string } = { matricula: '' }
function setMatricula(matricula: string) {
  activacionState = { matricula }
}
vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(
    selector?: (s: typeof activacionState) => T
  ): T | typeof activacionState {
    return selector ? selector(activacionState) : activacionState
  }
  return { useActivacionStore }
})

let personalMock: {
  data: { id_nombre: string }[]
  isLoading: boolean
  isError: boolean
  error: Error | null
} = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
}
vi.mock('@/hooks/usePersonalEnTurno', () => ({
  usePersonalEnTurno: () => personalMock,
}))

import { useDrpActivo } from '@/hooks/useDrpActivo'

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function buildSelectWithIn(result: { data: unknown; error: unknown }) {
  // Para el query de personal_a_pie: select → in → is → in (estado)
  const inEstado = vi.fn().mockResolvedValue(result)
  const isSalida = vi.fn(() => ({ in: inEstado }))
  const inNombres = vi.fn(() => ({ is: isSalida }))
  const select = vi.fn(() => ({ in: inNombres }))
  return { select }
}

function buildSelectWithEq(result: { data: unknown; error: unknown }) {
  // Para dotaciones_drp: select → eq → is → in (estado)
  const inEstado = vi.fn().mockResolvedValue(result)
  const isSalida = vi.fn(() => ({ in: inEstado }))
  const eq = vi.fn(() => ({ is: isSalida }))
  const select = vi.fn(() => ({ eq }))
  return { select }
}

beforeEach(() => {
  fromMock.mockReset()
  channelMock.mockClear()
  removeChannelMock.mockClear()
  setMatricula('')
  personalMock = { data: [], isLoading: false, isError: false, error: null }
})

describe('useDrpActivo', () => {
  it('no llama a supabase sin matrícula ni personal', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDrpActivo(), { wrapper: wrapper(client) })

    expect(result.current.data).toBeNull()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('devuelve DRP vía vehículo cuando dotaciones_drp tiene match', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'dotaciones_drp') {
        return buildSelectWithEq({
          data: [
            {
              id_drp: 'drp-1',
              drps: {
                id_drp: 'drp-1',
                estado: 'En_curso',
                id_coordinacion: 'coord1',
                timestamp_preparacion: '2026-05-24T09:00:00Z',
                timestamp_inicio: '2026-05-24T10:00:00Z',
              },
            },
          ],
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDrpActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.id_drp).toBe('drp-1')
    expect(result.current.data?.via).toBe('vehiculo')
    expect(result.current.data?.estado).toBe('En_curso')
  })

  it('devuelve DRP vía personal_a_pie cuando no hay vehículo pero sí personal', async () => {
    personalMock = {
      data: [{ id_nombre: 'pmartin' }],
      isLoading: false,
      isError: false,
      error: null,
    } as typeof personalMock

    fromMock.mockImplementation((table) => {
      if (table === 'drp_personal_a_pie') {
        return buildSelectWithIn({
          data: [
            {
              id_drp: 'drp-2',
              drps: {
                id_drp: 'drp-2',
                estado: 'En_preparacion',
                id_coordinacion: 'coord2',
                timestamp_preparacion: '2026-05-24T08:00:00Z',
                timestamp_inicio: null,
              },
            },
          ],
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDrpActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.id_drp).toBe('drp-2')
    expect(result.current.data?.via).toBe('personal_a_pie')
  })

  it('prioriza entrada por vehículo si el mismo DRP aparece por ambas vías', async () => {
    setMatricula('1234ABC')
    personalMock = {
      data: [{ id_nombre: 'pmartin' }],
      isLoading: false,
      isError: false,
      error: null,
    } as typeof personalMock

    const drpDuplicado = {
      id_drp: 'drp-shared',
      estado: 'En_curso',
      id_coordinacion: 'coord3',
      timestamp_preparacion: '2026-05-24T09:00:00Z',
      timestamp_inicio: '2026-05-24T10:00:00Z',
    }

    fromMock.mockImplementation((table) => {
      if (table === 'dotaciones_drp') {
        return buildSelectWithEq({
          data: [{ id_drp: 'drp-shared', drps: drpDuplicado }],
          error: null,
        })
      }
      if (table === 'drp_personal_a_pie') {
        return buildSelectWithIn({
          data: [{ id_drp: 'drp-shared', drps: drpDuplicado }],
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDrpActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.via).toBe('vehiculo')
  })

  it('prioriza estado En_curso sobre En_preparacion / En_espera', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'dotaciones_drp') {
        return buildSelectWithEq({
          data: [
            {
              id_drp: 'drp-espera',
              drps: {
                id_drp: 'drp-espera',
                estado: 'En_espera',
                id_coordinacion: 'c',
                timestamp_preparacion: '2026-05-24T11:00:00Z',
                timestamp_inicio: null,
              },
            },
            {
              id_drp: 'drp-curso',
              drps: {
                id_drp: 'drp-curso',
                estado: 'En_curso',
                id_coordinacion: 'c',
                timestamp_preparacion: '2026-05-24T08:00:00Z',
                timestamp_inicio: '2026-05-24T09:00:00Z',
              },
            },
          ],
          error: null,
        })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDrpActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.id_drp).toBe('drp-curso')
  })

  it('propaga error de supabase', async () => {
    setMatricula('1234ABC')

    fromMock.mockImplementation((table) => {
      if (table === 'dotaciones_drp') {
        return buildSelectWithEq({ data: null, error: new Error('RLS') })
      }
      throw new Error('unexpected table ' + table)
    })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDrpActivo(), { wrapper: wrapper(client) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('RLS')
  })
})
