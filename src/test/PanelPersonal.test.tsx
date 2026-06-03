import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePersonalEnTurno', () => ({
  usePersonalEnTurno: vi.fn(),
}))

import { PanelPersonal } from '@/components/layout/panels/PanelPersonal'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'

const usePersonalEnTurnoMock = vi.mocked(usePersonalEnTurno)

beforeEach(() => {
  usePersonalEnTurnoMock.mockReset()
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

  it('renderiza una fila por persona con nombre, rol y teléfono', () => {
    usePersonalEnTurnoMock.mockReturnValue({
      data: [
        {
          id_nombre: 'pmartin',
          nombre_real: 'Pedro Martín',
          rol: 'tes',
          telefono: '600111222',
          checkin_at: '2026-05-24T07:30:00.000Z',
        },
        {
          id_nombre: 'rsoto',
          nombre_real: 'Rosa Soto',
          rol: 'due',
          telefono: null,
          checkin_at: '2026-05-24T07:45:00.000Z',
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
    expect(screen.getByText('PM')).toBeInTheDocument()
    expect(screen.getByText('RS')).toBeInTheDocument()
    // Estado y Check-in ya no se muestran en este panel
    expect(screen.queryByText('En base')).not.toBeInTheDocument()
    expect(screen.queryByText('Check-in')).not.toBeInTheDocument()
  })
})
