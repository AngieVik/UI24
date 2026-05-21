import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc:  vi.fn(),
  mockFrom: vi.fn(),
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
  verifyOfflineLogin:    vi.fn().mockResolvedValue(false),
  loadOfflineSession:    vi.fn().mockResolvedValue(null),
  clearOfflineSession:   vi.fn().mockResolvedValue(undefined),
  isOfflineSessionValid: vi.fn().mockReturnValue(true),
}))

// ── Imports ───────────────────────────────────────────────────────────────

import { DrpPanelScreen } from '@/components/drp/DrpPanelScreen'
import { VisorGpsScreen } from '@/components/drp/VisorGpsScreen'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useAuthStore } from '@/stores/useAuthStore'

const ACTIVACION_ACTIVA = {
  id_activacion:    'act-1',
  id_parte:         'parte-1',
  id_checklist:     'check-1',
  matricula:        '1234-ABC',
  checklistCerrado: true,
}

function mockFromDrps(drps: unknown[]) {
  mockFrom.mockImplementation((tabla: string) => {
    if (tabla === 'drps') {
      return {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: drps, error: null }),
          }),
        }),
      }
    }
    return {
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          is:    vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        is:    vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
  })
}

// ── DrpPanelScreen ────────────────────────────────────────────────────────

describe('DrpPanelScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGlobalStore.setState({ isOnline: true })
    useActivacionStore.setState(ACTIVACION_ACTIVA)
    useAuthStore.setState({ ejecutorId: 'coord01', session: { user: { id: 'uid-1' } } as never })
  })

  it('muestra aviso cuando no hay conexión', () => {
    useGlobalStore.setState({ isOnline: false })
    mockFromDrps([])
    render(<DrpPanelScreen />)
    expect(screen.getByText(/requiere conexión/i)).toBeInTheDocument()
  })

  it('muestra "No hay DRPs activos" cuando la lista está vacía', async () => {
    mockFromDrps([])
    render(<DrpPanelScreen />)
    expect(await screen.findByText(/No hay DRPs activos/i)).toBeInTheDocument()
  })

  it('muestra el botón "Nuevo DRP"', async () => {
    mockFromDrps([])
    render(<DrpPanelScreen />)
    await screen.findByText(/No hay DRPs activos/i)
    expect(screen.getByRole('button', { name: /Crear nuevo DRP/i })).toBeInTheDocument()
  })

  it('llama a rpc_crear_drp al pulsar "+ Nuevo DRP"', async () => {
    // Mock genérico que cubre drps (not/order) y tablas de detalle (eq)
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        eq: vi.fn().mockReturnValue({
          is:    vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }))
    mockRpc.mockResolvedValue({ data: 'drp-uuid-1', error: null })
    render(<DrpPanelScreen />)
    await screen.findByText(/No hay DRPs activos/i)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Crear nuevo DRP/i }))
    })
    expect(mockRpc).toHaveBeenCalledWith('rpc_crear_drp', expect.objectContaining({
      p_mutation_uuid: expect.any(String),
    }))
  })

  it('renderiza DRPs con su badge de estado', async () => {
    const drps = [
      {
        id_drp: 'drp-001-0000-0000-0000-000000000001',
        estado: 'En_curso',
        id_coordinacion: 'coord01',
        timestamp_preparacion: null,
        timestamp_inicio: new Date().toISOString(),
        timestamp_fin: null,
        timestamp_cancelacion: null,
      },
    ]
    mockFromDrps(drps)
    render(<DrpPanelScreen />)
    expect(await screen.findByText('En curso')).toBeInTheDocument()
    expect(screen.getByText(/coord01/)).toBeInTheDocument()
  })

  it('expande el detalle de un DRP al hacer click', async () => {
    const drps = [
      {
        id_drp: 'drp-001-0000-0000-0000-000000000001',
        estado: 'En_espera',
        id_coordinacion: 'coord01',
        timestamp_preparacion: null,
        timestamp_inicio: null,
        timestamp_fin: null,
        timestamp_cancelacion: null,
      },
    ]
    // Primera carga (cargarDrps)
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === 'drps') {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: drps, error: null }),
            }),
          }),
        }
      }
      if (tabla === 'dotaciones_drp' || tabla === 'drp_personal_a_pie' || tabla === 'descuadres_inventario') {
        return {
          select: vi.fn().mockReturnValue({
            eq:  vi.fn().mockReturnValue({
              is:    vi.fn().mockResolvedValue({ data: [], error: null }),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            is:  vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }
    })
    render(<DrpPanelScreen />)
    const item = await screen.findByRole('button', { name: /drp-001/i })
    await act(async () => { fireEvent.click(item) })
    expect(screen.getByText(/Preparar/i)).toBeInTheDocument()
    expect(screen.getByText(/Sin vehículos asignados/i)).toBeInTheDocument()
  })

  it('muestra el modal de confirmación al pulsar "Cancelar DRP"', async () => {
    const drps = [
      {
        id_drp: 'drp-001-0000-0000-0000-000000000001',
        estado: 'En_curso',
        id_coordinacion: 'coord01',
        timestamp_preparacion: null,
        timestamp_inicio: new Date().toISOString(),
        timestamp_fin: null,
        timestamp_cancelacion: null,
      },
    ]
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === 'drps') {
        return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: drps, error: null }) }) }) }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    })
    render(<DrpPanelScreen />)
    const item = await screen.findByRole('button', { name: /drp-001/i })
    await act(async () => { fireEvent.click(item) })
    fireEvent.click(screen.getByRole('button', { name: /Cancelar DRP/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/¿Cancelar DRP\?/i)).toBeInTheDocument()
  })

  it('llama a rpc_cancelar_drp al confirmar la cancelación', async () => {
    const drps = [
      {
        id_drp: 'drp-001-0000-0000-0000-000000000001',
        estado: 'En_curso',
        id_coordinacion: 'coord01',
        timestamp_preparacion: null,
        timestamp_inicio: new Date().toISOString(),
        timestamp_fin: null,
        timestamp_cancelacion: null,
      },
    ]
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === 'drps') {
        return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: drps, error: null }) }) }) }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    })
    mockRpc.mockResolvedValue({ data: null, error: null })
    render(<DrpPanelScreen />)
    const item = await screen.findByRole('button', { name: /drp-001/i })
    await act(async () => { fireEvent.click(item) })
    fireEvent.click(screen.getByRole('button', { name: /Cancelar DRP/i }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }))
    })
    expect(mockRpc).toHaveBeenCalledWith('rpc_cancelar_drp', expect.objectContaining({
      p_id_drp: 'drp-001-0000-0000-0000-000000000001',
    }))
  })

  it('muestra descuadres cuando el DRP está Finalizado_Retenido', async () => {
    const drps = [
      {
        id_drp: 'drp-retenido-uuid',
        estado: 'Finalizado_Retenido',
        id_coordinacion: 'coord01',
        timestamp_preparacion: null,
        timestamp_inicio: new Date().toISOString(),
        timestamp_fin: new Date().toISOString(),
        timestamp_cancelacion: null,
      },
    ]
    const descuadres = [
      {
        id: 'desc-001',
        id_item: 'ITEM-42',
        location_origen: '1234-ABC',
        location_destino: 'BASE',
        cantidad_diferencia: 3,
        estado: 'Pendiente_Revision',
      },
    ]
    mockFrom.mockImplementation((tabla: string) => {
      if (tabla === 'drps') {
        return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: drps, error: null }) }) }) }
      }
      if (tabla === 'dotaciones_drp') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ matricula: '1234-ABC', timestamp_entrada: new Date().toISOString(), timestamp_salida: null }], error: null }) }) }
      }
      if (tabla === 'drp_personal_a_pie') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      }
      if (tabla === 'descuadres_inventario') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: descuadres, error: null }) }) }
      }
      return { select: vi.fn().mockReturnValue({ not: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }
    })
    render(<DrpPanelScreen />)
    const item = await screen.findByRole('button', { name: /drp-rete/i })
    await act(async () => { fireEvent.click(item) })
    expect(await screen.findByText(/Descuadres pendientes/i)).toBeInTheDocument()
    expect(screen.getByText(/ITEM-42/)).toBeInTheDocument()
  })
})

// ── VisorGpsScreen ────────────────────────────────────────────────────────

describe('VisorGpsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGlobalStore.setState({ isOnline: true })
    useActivacionStore.setState(ACTIVACION_ACTIVA)
  })

  it('muestra aviso cuando no hay conexión', () => {
    useGlobalStore.setState({ isOnline: false })
    render(<VisorGpsScreen />)
    expect(screen.getByText(/requiere conexión/i)).toBeInTheDocument()
  })

  it('muestra mensaje cuando no se proporciona un DRP', () => {
    render(<VisorGpsScreen />)
    expect(screen.getByText(/Selecciona un DRP/i)).toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay vehículos en el DRP', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    render(<VisorGpsScreen idDrp="drp-uuid-1" />)
    expect(await screen.findByText(/No hay vehículos activos/i)).toBeInTheDocument()
  })

  it('renderiza tarjetas GPS para cada vehículo', async () => {
    const dotaciones = [
      {
        matricula: '1234-ABC',
        vehiculos: {
          lat: 37.38,
          lng: -5.99,
          gps_timestamp: new Date().toISOString(),
          estado_operativo: 'en_drp',
        },
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: dotaciones, error: null }),
        }),
      }),
    })
    render(<VisorGpsScreen idDrp="drp-uuid-1" />)
    expect(await screen.findByText('1234-ABC')).toBeInTheDocument()
    expect(screen.getByText(/37.38/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver 1234-ABC en mapa/i })).toBeInTheDocument()
  })

  it('muestra "Sin datos" para vehículos sin posición GPS', async () => {
    const dotaciones = [
      {
        matricula: '9999-ZZZ',
        vehiculos: {
          lat: null,
          lng: null,
          gps_timestamp: null,
          estado_operativo: 'en_drp',
        },
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: dotaciones, error: null }),
        }),
      }),
    })
    render(<VisorGpsScreen idDrp="drp-uuid-1" />)
    expect(await screen.findByText('9999-ZZZ')).toBeInTheDocument()
    expect(screen.getByText(/Posición no disponible/i)).toBeInTheDocument()
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
  })

  it('muestra botón "↺ Actualizar"', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    render(<VisorGpsScreen idDrp="drp-uuid-1" />)
    await screen.findByText(/No hay vehículos activos/i)
    expect(screen.getByRole('button', { name: /Actualizar posiciones/i })).toBeInTheDocument()
  })
})
