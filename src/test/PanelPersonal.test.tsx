import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mocks de hooks de datos — panel en aislamiento.
vi.mock('@/hooks/usePersonalEnTurno', () => ({
  usePersonalEnTurno: vi.fn(),
}))
vi.mock('@/hooks/useVehiculoActivo', () => ({
  useVehiculoActivo: vi.fn(),
}))
vi.mock('@/hooks/useDrpActivo', () => ({
  useDrpActivo: vi.fn(),
}))

import { PanelPersonal } from '@/components/layout/panels/PanelPersonal'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { useVehiculoActivo } from '@/hooks/useVehiculoActivo'
import { useDrpActivo } from '@/hooks/useDrpActivo'

const usePersonalEnTurnoMock = vi.mocked(usePersonalEnTurno)
const useVehiculoActivoMock  = vi.mocked(useVehiculoActivo)
const useDrpActivoMock       = vi.mocked(useDrpActivo)

beforeEach(() => {
  usePersonalEnTurnoMock.mockReset()
  useVehiculoActivoMock.mockReset()
  useDrpActivoMock.mockReset()
  // Default: sin vehículo ni DRP → estado 'En base'
  useVehiculoActivoMock.mockReturnValue({ data: null, isLoading: false, isError: false, error: null })
  useDrpActivoMock.mockReturnValue({ data: null, isLoading: false, isError: false, error: null })
})

describe('PanelPersonal', () => {
  it('muestra skeleton mientras carga', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    })
    render(<PanelPersonal />)
    expect(screen.getByRole('status', { name: /cargando personal/i })).toBeInTheDocument()
    expect(screen.getByText('Personal en turno')).toBeInTheDocument()
    // El badge muestra "…" mientras carga
    expect(screen.getByText('…')).toBeInTheDocument()
  })

  it('muestra mensaje de error cuando la query falla', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('network'),
    })
    render(<PanelPersonal />)
    expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay nadie con check-in', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<PanelPersonal />)
    expect(screen.getByText(/nadie ha hecho check-in/i)).toBeInTheDocument()
    expect(screen.getByText('0 con check-in')).toBeInTheDocument()
  })

  it('renderiza una fila por persona con nombre, rol, teléfono y hora de check-in', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [
        {
          id_nombre:   'pmartin',
          nombre_real: 'Pedro Martín',
          rol:         'tes',
          telefono:    '600111222',
          checkin_at:  '2026-05-24T07:30:00.000Z',
        },
        {
          id_nombre:   'rsoto',
          nombre_real: 'Rosa Soto',
          rol:         'due',
          telefono:    null,
          checkin_at:  '2026-05-24T07:45:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<PanelPersonal />)

    expect(screen.getByText('2 con check-in')).toBeInTheDocument()
    expect(screen.getByText('Pedro Martín')).toBeInTheDocument()
    expect(screen.getByText('pmartin')).toBeInTheDocument()
    expect(screen.getByText('Rosa Soto')).toBeInTheDocument()
    expect(screen.getByText('rsoto')).toBeInTheDocument()
    expect(screen.getByText('TES')).toBeInTheDocument()
    expect(screen.getByText('DUE')).toBeInTheDocument()
    expect(screen.getByText('600111222')).toBeInTheDocument()
    // Iniciales (avatar fallback)
    expect(screen.getByText('PM')).toBeInTheDocument()
    expect(screen.getByText('RS')).toBeInTheDocument()
    // Estado derivado por defecto: 'En base' (sin vehículo ni DRP)
    expect(screen.getAllByText('En base').length).toBe(2)
  })

  it('estado derivado "En servicio" cuando hay vehículo activo y no hay DRP', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [{
        id_nombre: 'pmartin', nombre_real: 'Pedro Martín', rol: 'tes',
        telefono: null, checkin_at: '2026-05-24T07:30:00.000Z',
      }],
      isLoading: false, isError: false, error: null,
    })
    useVehiculoActivoMock.mockReturnValue({
      data: {
        matricula: '1234ABC', tipo: 'SVB', condicion_tecnica: 'operativo',
        estado_operativo: 'activo', pilot: 'pmartin', carry: null, tipo_servicio: 'urgente',
      },
      isLoading: false, isError: false, error: null,
    })

    render(<PanelPersonal />)
    expect(screen.getByText('En servicio')).toBeInTheDocument()
  })

  it('estado derivado "En DRP" cuando hay DRP activo', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [{
        id_nombre: 'pmartin', nombre_real: 'Pedro Martín', rol: 'tes',
        telefono: null, checkin_at: '2026-05-24T07:30:00.000Z',
      }],
      isLoading: false, isError: false, error: null,
    })
    useDrpActivoMock.mockReturnValue({
      data: {
        id_drp: 'drp-1', estado: 'En_curso', id_coordinacion: 'c',
        timestamp_preparacion: null, timestamp_inicio: '2026-05-24T08:00:00Z',
        via: 'vehiculo',
      },
      isLoading: false, isError: false, error: null,
    })

    render(<PanelPersonal />)
    expect(screen.getByText('En DRP')).toBeInTheDocument()
  })
})
