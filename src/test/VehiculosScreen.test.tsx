import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

vi.mock('@/hooks/useVehiculosDisponibles', () => ({
  useVehiculosDisponibles: vi.fn(),
}))
vi.mock('@/hooks/useActivarVehiculo', () => ({
  useActivarVehiculo: vi.fn(),
}))
vi.mock('@/hooks/usePersonalEnTurno', () => ({
  usePersonalEnTurno: vi.fn(),
}))

let matriculaActivaMock = ''
vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(selector?: (s: { matricula: string }) => T): T | { matricula: string } {
    const s = { matricula: matriculaActivaMock }
    return selector ? selector(s) : s
  }
  return { useActivacionStore }
})

import { VehiculosScreen } from '@/components/operativa/VehiculosScreen'
import { useVehiculosDisponibles } from '@/hooks/useVehiculosDisponibles'
import { useActivarVehiculo } from '@/hooks/useActivarVehiculo'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'

const useVehiculosDisponiblesMock = vi.mocked(useVehiculosDisponibles)
const useActivarVehiculoMock      = vi.mocked(useActivarVehiculo)
const usePersonalEnTurnoMock      = vi.mocked(usePersonalEnTurno)

const runMock = vi.fn()
const ADMIN = { id_nombre: 'admin',    nombre_real: 'Administrador Demo', rol: 'gerencia', telefono: null, checkin_at: '' }
const TES   = { id_nombre: 'tes_demo', nombre_real: 'TES Demo',           rol: 'tes',      telefono: null, checkin_at: '' }

beforeEach(() => {
  useVehiculosDisponiblesMock.mockReset()
  useActivarVehiculoMock.mockReset()
  usePersonalEnTurnoMock.mockReset()
  runMock.mockReset()
  matriculaActivaMock = ''
  useActivarVehiculoMock.mockReturnValue({ run: runMock, isSubmitting: false, error: null })
  usePersonalEnTurnoMock.mockReturnValue({ data: [ADMIN], isLoading: false, isError: false, error: null })
})

describe('VehiculosScreen', () => {
  it('muestra warning cuando no hay nadie en turno', () => {
    usePersonalEnTurnoMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null })
    useVehiculosDisponiblesMock.mockReturnValue({
      data: [{ matricula: '1111-DEMO', tipo: 'A1', condicion_tecnica: 'operativo' }],
      isLoading: false, isError: false, error: null,
    })
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByText(/no hay nadie con presencia en el terminal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activar vehículo/i })).toBeDisabled()
  })

  it('muestra mensaje cuando no hay vehículos disponibles', () => {
    useVehiculosDisponiblesMock.mockReturnValue({
      data: [], isLoading: false, isError: false, error: null,
    })
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByText(/no hay vehículos disponibles/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /activar vehículo/i })).toBeDisabled()
  })

  it('muestra "vehículo ya activado" cuando hay matrícula en el store', () => {
    matriculaActivaMock = '1111-DEMO'
    useVehiculosDisponiblesMock.mockReturnValue({
      data: [], isLoading: false, isError: false, error: null,
    })
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByText(/vehículo ya activado/i)).toBeInTheDocument()
    expect(screen.getByText('1111-DEMO')).toBeInTheDocument()
  })

  it('envía run con {matricula, pilot, carry, km_inicio} cuando el form es válido', async () => {
    usePersonalEnTurnoMock.mockReturnValue({ data: [ADMIN, TES], isLoading: false, isError: false, error: null })
    useVehiculosDisponiblesMock.mockReturnValue({
      data: [
        { matricula: '1111-DEMO', tipo: 'A1', condicion_tecnica: 'operativo' },
        { matricula: '2222-DEMO', tipo: 'B',  condicion_tecnica: 'operativo' },
      ],
      isLoading: false, isError: false, error: null,
    })
    runMock.mockResolvedValue({ online: true, matricula: '1111-DEMO' })

    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)

    // Seleccionar vehículo
    await user.click(screen.getByRole('combobox', { name: /vehículo/i }))
    await user.click(screen.getByRole('option', { name: /1111-DEMO/i }))

    // Seleccionar pilot
    await user.click(screen.getByRole('combobox', { name: /^pilot$/i }))
    await user.click(screen.getByRole('option', { name: /administrador demo/i }))

    // Km
    const km = screen.getByLabelText(/kilómetros al inicio/i)
    await user.clear(km)
    await user.type(km, '120000')

    await user.click(screen.getByRole('button', { name: /activar vehículo/i }))

    await waitFor(() => expect(runMock).toHaveBeenCalled())
    expect(runMock).toHaveBeenCalledWith({
      matricula: '1111-DEMO',
      pilot:     'admin',
      carry:     null,
      km_inicio: 120000,
    })
  })

  it('auto-selecciona pilot si solo hay 1 presente', async () => {
    usePersonalEnTurnoMock.mockReturnValue({ data: [ADMIN], isLoading: false, isError: false, error: null })
    useVehiculosDisponiblesMock.mockReturnValue({
      data: [{ matricula: '1111-DEMO', tipo: 'A1', condicion_tecnica: 'operativo' }],
      isLoading: false, isError: false, error: null,
    })
    runMock.mockResolvedValue({ online: true, matricula: '1111-DEMO' })

    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)

    // Sin tocar el select de pilot, completar otros campos y enviar
    await user.click(screen.getByRole('combobox', { name: /vehículo/i }))
    await user.click(screen.getByRole('option', { name: /1111-DEMO/i }))
    const km = screen.getByLabelText(/kilómetros al inicio/i)
    await user.clear(km)
    await user.type(km, '50000')
    await user.click(screen.getByRole('button', { name: /activar vehículo/i }))

    await waitFor(() =>
      expect(runMock).toHaveBeenCalledWith(expect.objectContaining({ pilot: 'admin' })),
    )
  })

  it('muestra error devuelto por el hook', () => {
    useVehiculosDisponiblesMock.mockReturnValue({
      data: [{ matricula: '1111-DEMO', tipo: 'A1', condicion_tecnica: 'operativo' }],
      isLoading: false, isError: false, error: null,
    })
    useActivarVehiculoMock.mockReturnValue({
      run: runMock, isSubmitting: false, error: 'ERR_VEHICULO_006: El vehículo no está disponible',
    })
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByText(/ERR_VEHICULO_006/)).toBeInTheDocument()
  })
})
