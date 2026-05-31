import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

vi.mock('@/hooks/useMiPresencia', () => ({
  useMiPresencia: vi.fn(),
}))
vi.mock('@/hooks/useCheckinTrabajador', () => ({
  useCheckinTrabajador: vi.fn(),
}))

import { PresenciaScreen } from '@/components/operativa/PresenciaScreen'
import { useMiPresencia } from '@/hooks/useMiPresencia'
import { useCheckinTrabajador } from '@/hooks/useCheckinTrabajador'

const useMiPresenciaMock = vi.mocked(useMiPresencia)
const useCheckinTrabajadorMock = vi.mocked(useCheckinTrabajador)

const checkoutMock = vi.fn()
const checkinMock = vi.fn()

function presenciaReturn(
  overrides: Partial<ReturnType<typeof useMiPresencia>> = {}
): ReturnType<typeof useMiPresencia> {
  return {
    ejecutorId: 'admin',
    personal: [],
    isLoading: false,
    checkout: checkoutMock,
    isSubmitting: false,
    error: null,
    ...overrides,
  }
}

function checkinReturn(
  overrides: Partial<ReturnType<typeof useCheckinTrabajador>> = {}
): ReturnType<typeof useCheckinTrabajador> {
  return {
    checkin: checkinMock,
    isSubmitting: false,
    error: null,
    setError: vi.fn(),
    ...overrides,
  }
}

const ADMIN = {
  id_nombre: 'admin',
  nombre_real: 'Administrador Demo',
  rol: 'gerencia',
  telefono: null,
  checkin_at: '2026-05-26T08:00:00Z',
}
const TES = {
  id_nombre: 'tes_demo',
  nombre_real: 'TES Demo',
  rol: 'tes',
  telefono: null,
  checkin_at: '2026-05-26T08:05:00Z',
}

beforeEach(() => {
  useMiPresenciaMock.mockReset()
  useCheckinTrabajadorMock.mockReset()
  checkoutMock.mockReset()
  checkinMock.mockReset()
  useMiPresenciaMock.mockReturnValue(presenciaReturn())
  useCheckinTrabajadorMock.mockReturnValue(checkinReturn())
})

describe('PresenciaScreen — sumar otro trabajador', () => {
  it('renderiza el form de check-in con identificador + contraseña', () => {
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByText(/sumar otro trabajador/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Identificador')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sumar al turno/i })).toBeEnabled()
  })

  it('al submit válido llama checkin con (id_nombre, password)', async () => {
    checkinMock.mockResolvedValue({
      id_nombre: 'tes_demo',
      id_terminal: 't1',
      nombre_real: 'TES Demo',
      rol: 'tes',
    })
    const user = userEvent.setup()
    renderWithShell(<PresenciaScreen />)

    await user.type(screen.getByLabelText('Identificador'), 'tes_demo')
    await user.type(screen.getByLabelText('Contraseña'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sumar al turno/i }))

    await waitFor(() =>
      expect(checkinMock).toHaveBeenCalledWith({ id_nombre: 'tes_demo', password: 'Password123!' })
    )
  })

  it('si checkin devuelve null el form NO se resetea (para corregir)', async () => {
    checkinMock.mockResolvedValue(null)
    const user = userEvent.setup()
    renderWithShell(<PresenciaScreen />)

    await user.type(screen.getByLabelText('Identificador'), 'wrong')
    await user.type(screen.getByLabelText('Contraseña'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sumar al turno/i }))

    await waitFor(() => expect(checkinMock).toHaveBeenCalled())
    expect(screen.getByLabelText('Identificador')).toHaveValue('wrong')
  })

  it('muestra error del hook de checkin', () => {
    useCheckinTrabajadorMock.mockReturnValue(checkinReturn({ error: 'Credenciales incorrectas' }))
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument()
  })

  it('valida con Zod (password mínimo 8 chars)', async () => {
    const user = userEvent.setup()
    renderWithShell(<PresenciaScreen />)

    await user.type(screen.getByLabelText('Identificador'), 'tes_demo')
    await user.type(screen.getByLabelText('Contraseña'), 'short')
    await user.click(screen.getByRole('button', { name: /sumar al turno/i }))

    await waitFor(() => expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument())
    expect(checkinMock).not.toHaveBeenCalled()
  })
})

describe('PresenciaScreen — lista con check-out por item', () => {
  it('lista personal y muestra avatar + rol', () => {
    useMiPresenciaMock.mockReturnValue(presenciaReturn({ personal: [ADMIN, TES] }))
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByText('Administrador Demo')).toBeInTheDocument()
    expect(screen.getByText('TES Demo')).toBeInTheDocument()
    expect(screen.getByText('AD')).toBeInTheDocument()
    expect(screen.getByText('TD')).toBeInTheDocument()
  })

  it('marca "Tú" junto al id_nombre del logueado', () => {
    useMiPresenciaMock.mockReturnValue(
      presenciaReturn({ ejecutorId: 'admin', personal: [ADMIN, TES] })
    )
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByText(/admin · Tú/i)).toBeInTheDocument()
  })

  it('click en "Salir" llama checkout(id_nombre)', async () => {
    useMiPresenciaMock.mockReturnValue(
      presenciaReturn({ ejecutorId: 'admin', personal: [ADMIN, TES] })
    )
    checkoutMock.mockResolvedValue({ noop: false })
    const user = userEvent.setup()
    renderWithShell(<PresenciaScreen />)

    await user.click(screen.getByRole('button', { name: /check-out de tes demo/i }))
    expect(checkoutMock).toHaveBeenCalledWith('tes_demo')
  })

  it('botones deshabilitados mientras isSubmitting', () => {
    useMiPresenciaMock.mockReturnValue(
      presenciaReturn({ ejecutorId: 'admin', personal: [ADMIN], isSubmitting: true })
    )
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByRole('button', { name: /check-out de administrador demo/i })).toBeDisabled()
  })

  it('si checkout devuelve null muestra error', async () => {
    useMiPresenciaMock.mockReturnValue(presenciaReturn({ ejecutorId: 'admin', personal: [ADMIN] }))
    checkoutMock.mockResolvedValue(null)
    const user = userEvent.setup()
    renderWithShell(<PresenciaScreen />)

    await user.click(screen.getByRole('button', { name: /check-out de administrador demo/i }))
    await waitFor(() =>
      expect(screen.getByText(/no se pudo completar el check-out/i)).toBeInTheDocument()
    )
  })

  it('empty state cuando no hay nadie en turno', () => {
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByText(/nadie tiene presencia activa/i)).toBeInTheDocument()
  })

  it('skeleton mientras carga', () => {
    useMiPresenciaMock.mockReturnValue(presenciaReturn({ isLoading: true }))
    renderWithShell(<PresenciaScreen />)
    expect(screen.getByRole('status', { name: /cargando personal/i })).toBeInTheDocument()
  })
})

describe('PresenciaScreen — no expone botón "Marcar mi presencia"', () => {
  it('no existe botón "Marcar mi presencia" (la marca el login automáticamente)', () => {
    useMiPresenciaMock.mockReturnValue(presenciaReturn({ ejecutorId: 'admin', personal: [] }))
    renderWithShell(<PresenciaScreen />)
    expect(screen.queryByRole('button', { name: /marcar mi presencia/i })).not.toBeInTheDocument()
  })
})
