import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'

vi.mock('@/hooks/useBandejasPersonales', () => ({
  useBandejasPersonales: vi.fn(),
}))

import { BandejaEntradaPersonal } from '@/components/layout/panels/BandejaEntradaPersonal'
import { useBandejasPersonales } from '@/hooks/useBandejasPersonales'

const useBandejasPersonalesMock = vi.mocked(useBandejasPersonales)

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>)
}

beforeEach(() => {
  useBandejasPersonalesMock.mockReset()
})

describe('BandejaEntradaPersonal', () => {
  it('muestra empty state cuando no hay personas', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    })
    renderWithTooltip(<BandejaEntradaPersonal personas={[]} />)
    expect(screen.getByText(/sin buzones cargados/i)).toBeInTheDocument()
  })

  it('renderiza una pin por cada persona, sin dot cuando no hay sin leer', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [
        { id_nombre: 'admin', unreadCount: 0 },
        { id_nombre: 'tes_demo', unreadCount: 0 },
      ],
      isLoading: false,
      isError: false,
      error: null,
    })
    renderWithTooltip(
      <BandejaEntradaPersonal
        personas={[
          { id_nombre: 'admin', nombre_real: 'Administrador Demo' },
          { id_nombre: 'tes_demo', nombre_real: 'TES Demo' },
        ]}
      />
    )
    expect(screen.getByText('AD')).toBeInTheDocument()
    expect(screen.getByText('TD')).toBeInTheDocument()
    // aria-label coherente
    expect(screen.getByLabelText(/administrador demo: sin mensajes nuevos/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tes demo: sin mensajes nuevos/i)).toBeInTheDocument()
  })

  it('renderiza dot rojo con count cuando hay mensajes sin leer', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [
        { id_nombre: 'admin', unreadCount: 3 },
        { id_nombre: 'tes_demo', unreadCount: 0 },
      ],
      isLoading: false,
      isError: false,
      error: null,
    })
    renderWithTooltip(
      <BandejaEntradaPersonal
        personas={[
          { id_nombre: 'admin', nombre_real: 'Administrador Demo' },
          { id_nombre: 'tes_demo', nombre_real: 'TES Demo' },
        ]}
      />
    )
    expect(screen.getByLabelText(/administrador demo: 3 mensajes sin leer/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('caps el count en 9+ cuando hay más de 9 sin leer', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [{ id_nombre: 'admin', unreadCount: 15 }],
      isLoading: false,
      isError: false,
      error: null,
    })
    renderWithTooltip(
      <BandejaEntradaPersonal
        personas={[{ id_nombre: 'admin', nombre_real: 'Administrador Demo' }]}
      />
    )
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('singular vs plural en aria-label (1 mensaje vs N mensajes)', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [{ id_nombre: 'admin', unreadCount: 1 }],
      isLoading: false,
      isError: false,
      error: null,
    })
    renderWithTooltip(
      <BandejaEntradaPersonal
        personas={[{ id_nombre: 'admin', nombre_real: 'Administrador Demo' }]}
      />
    )
    expect(screen.getByLabelText(/administrador demo: 1 mensaje sin leer$/i)).toBeInTheDocument()
  })

  it('muestra skeleton mientras carga', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    })
    renderWithTooltip(
      <BandejaEntradaPersonal
        personas={[{ id_nombre: 'admin', nombre_real: 'Administrador Demo' }]}
      />
    )
    expect(screen.getByRole('status', { name: /cargando bandejas/i })).toBeInTheDocument()
  })

  it('muestra mensaje de error', () => {
    useBandejasPersonalesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    })
    renderWithTooltip(
      <BandejaEntradaPersonal
        personas={[{ id_nombre: 'admin', nombre_real: 'Administrador Demo' }]}
      />
    )
    expect(screen.getByText(/no se pudo cargar/i)).toBeInTheDocument()
  })
})
