import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/useDrpActivo', () => ({
  useDrpActivo: vi.fn(),
}))

import { VisualInfoDRP } from '@/components/layout/panels/VisualInfoDRP'
import { useDrpActivo } from '@/hooks/useDrpActivo'

const useDrpActivoMock = vi.mocked(useDrpActivo)

beforeEach(() => {
  useDrpActivoMock.mockReset()
})

describe('VisualInfoDRP', () => {
  it('muestra skeleton mientras carga', () => {
    useDrpActivoMock.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    })
    render(<VisualInfoDRP />)
    expect(screen.getByRole('status', { name: /cargando drp/i })).toBeInTheDocument()
    expect(screen.getByText('DRP activo')).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay DRP activo', () => {
    useDrpActivoMock.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<VisualInfoDRP />)
    expect(screen.getByText(/no hay ningún drp activo/i)).toBeInTheDocument()
    // Acciones deshabilitadas
    expect(screen.getByRole('button', { name: /añadir asistencia doc-1/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /entrar a filiación/i })).toBeDisabled()
  })

  it('muestra mensaje de error', () => {
    useDrpActivoMock.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    })
    render(<VisualInfoDRP />)
    expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument()
  })

  it('renderiza ID, estado, coordinación y vía cuando hay DRP por vehículo', () => {
    useDrpActivoMock.mockReturnValue({
      data: {
        id_drp: 'abcdef12-3456-7890-abcd-ef1234567890',
        estado: 'En_curso',
        id_coordinacion: 'coord1',
        timestamp_preparacion: '2026-05-24T09:00:00.000Z',
        timestamp_inicio: '2026-05-24T10:00:00.000Z',
        via: 'vehiculo',
      },
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<VisualInfoDRP />)

    expect(screen.getByText('DRP abcdef12')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByText('coord1')).toBeInTheDocument()
    expect(screen.getByText('Por vehículo')).toBeInTheDocument()
    // Acciones habilitadas
    expect(screen.getByRole('button', { name: /añadir asistencia doc-1/i })).not.toBeDisabled()
  })

  it('marca la vía como "A pie" cuando via === personal_a_pie', () => {
    useDrpActivoMock.mockReturnValue({
      data: {
        id_drp: 'xyz12345-0000-0000-0000-000000000000',
        estado: 'En_preparacion',
        id_coordinacion: 'coord2',
        timestamp_preparacion: '2026-05-24T09:00:00.000Z',
        timestamp_inicio: null,
        via: 'personal_a_pie',
      },
      isLoading: false,
      isError: false,
      error: null,
    })
    render(<VisualInfoDRP />)
    expect(screen.getByText('A pie')).toBeInTheDocument()
    expect(screen.getByText('En preparación')).toBeInTheDocument()
  })
})
