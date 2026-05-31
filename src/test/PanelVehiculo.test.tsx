import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/useVehiculoActivo', () => ({
  useVehiculoActivo: vi.fn(),
}))

import { PanelVehiculo } from '@/components/layout/panels/PanelVehiculo'
import { useVehiculoActivo } from '@/hooks/useVehiculoActivo'

const useVehiculoActivoMock = vi.mocked(useVehiculoActivo)

beforeEach(() => {
  useVehiculoActivoMock.mockReset()
})

describe('PanelVehiculo', () => {
  it('muestra skeleton mientras carga', () => {
    useVehiculoActivoMock.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    })
    render(<PanelVehiculo />)
    expect(screen.getByRole('status', { name: /cargando vehículo/i })).toBeInTheDocument()
    expect(screen.getByText('Vehículo del terminal')).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay vehículo asignado', () => {
    useVehiculoActivoMock.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<PanelVehiculo />)
    expect(screen.getByText(/no tiene vehículo asignado/i)).toBeInTheDocument()
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
  })

  it('muestra error de carga', () => {
    useVehiculoActivoMock.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    })
    render(<PanelVehiculo />)
    expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument()
  })

  it('renderiza matrícula, tipo, pilot, carry y estado con datos completos', () => {
    useVehiculoActivoMock.mockReturnValue({
      data: {
        matricula: '1234ABC',
        tipo: 'SVB',
        condicion_tecnica: 'operativo',
        estado_operativo: 'activo',
        pilot: 'pmartin',
        carry: 'rsoto',
        tipo_servicio: 'urgente',
      },
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<PanelVehiculo />)

    expect(screen.getByText('1234ABC')).toBeInTheDocument()
    expect(screen.getByText('Operativo')).toBeInTheDocument()
    expect(screen.getByText('pmartin')).toBeInTheDocument()
    expect(screen.getByText('rsoto')).toBeInTheDocument()
    // SVB aparece en el lead y en el grid (Tipo)
    expect(screen.getAllByText('SVB').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('muestra "—" cuando pilot o carry son null', () => {
    useVehiculoActivoMock.mockReturnValue({
      data: {
        matricula: '1234ABC',
        tipo: 'SVB',
        condicion_tecnica: 'operativo',
        estado_operativo: 'activo',
        pilot: null,
        carry: null,
        tipo_servicio: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<PanelVehiculo />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('badge destructivo cuando condicion_tecnica es avería', () => {
    useVehiculoActivoMock.mockReturnValue({
      data: {
        matricula: '1234ABC',
        tipo: 'SVB',
        condicion_tecnica: 'averiado_grave',
        estado_operativo: 'fuera_servicio',
        pilot: null,
        carry: null,
        tipo_servicio: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<PanelVehiculo />)
    const badge = screen.getByText('Avería grave')
    expect(badge).toBeInTheDocument()
    // Variante destructive
    expect(badge.closest('[data-slot="badge"]')).toHaveAttribute('data-variant', 'destructive')
  })
})
