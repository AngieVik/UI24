import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

vi.mock('@/hooks/useFlotaCompleta', () => ({
  useFlotaCompleta: vi.fn(),
}))
vi.mock('@/hooks/useActualizarVehiculo', () => ({
  useActualizarVehiculo: vi.fn(),
}))
vi.mock('@/hooks/usePersonalEnTurno', () => ({
  usePersonalEnTurno: vi.fn(),
}))

import { VehiculosScreen } from '@/components/operativa/VehiculosScreen'
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'
import { useActualizarVehiculo } from '@/hooks/useActualizarVehiculo'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'

const useFlotaCompletaMock = vi.mocked(useFlotaCompleta)
const useActualizarVehiculoMock = vi.mocked(useActualizarVehiculo)
const usePersonalEnTurnoMock = vi.mocked(usePersonalEnTurno)

const runMock = vi.fn()

const VEH_DESACT: ReturnType<typeof useFlotaCompleta>['data'][number] = {
  matricula: '1111-DEMO',
  tipo: 'A1',
  condicion_tecnica: 'operativo',
  estado_operativo: 'desactivado',
  subestado_operativo: null,
  vehiculo_id: null,
  nombre_display: null,
}
const VEH_ACTIVO: ReturnType<typeof useFlotaCompleta>['data'][number] = {
  matricula: '2222-DEMO',
  tipo: 'B',
  condicion_tecnica: 'operativo',
  estado_operativo: 'activado',
  subestado_operativo: 'en_espera',
  vehiculo_id: null,
  nombre_display: null,
}
const VEH_CRITICO: ReturnType<typeof useFlotaCompleta>['data'][number] = {
  matricula: '3333-DEMO',
  tipo: 'B',
  condicion_tecnica: 'critico',
  estado_operativo: 'desactivado',
  subestado_operativo: null,
  vehiculo_id: null,
  nombre_display: null,
}
const VEH_VIR: ReturnType<typeof useFlotaCompleta>['data'][number] = {
  matricula: '4444-DEMO',
  tipo: 'VIR',
  condicion_tecnica: 'operativo',
  estado_operativo: 'desactivado',
  subestado_operativo: null,
  vehiculo_id: null,
  nombre_display: null,
}

const ADMIN = {
  id_nombre: 'admin',
  nombre_real: 'Administrador Demo',
  rol: 'gerencia',
  telefono: null,
  checkin_at: '',
}
const TES = {
  id_nombre: 'tes_demo',
  nombre_real: 'TES Demo',
  rol: 'tes',
  telefono: null,
  checkin_at: '',
}

function flotaReturn(
  overrides: Partial<ReturnType<typeof useFlotaCompleta>> = {}
): ReturnType<typeof useFlotaCompleta> {
  return { data: [], isLoading: false, isError: false, error: null, ...overrides }
}

function actReturn(
  overrides: Partial<ReturnType<typeof useActualizarVehiculo>> = {}
): ReturnType<typeof useActualizarVehiculo> {
  return { run: runMock, isSubmitting: false, error: null, ...overrides }
}

function personalReturn(
  overrides: Partial<ReturnType<typeof usePersonalEnTurno>> = {}
): ReturnType<typeof usePersonalEnTurno> {
  return { data: [ADMIN], isLoading: false, isError: false, error: null, ...overrides }
}

/** Abre el Select de flota y hace clic en el vehículo con la matrícula dada */
async function selectVehiculo(user: ReturnType<typeof userEvent.setup>, matricula: string) {
  await user.click(screen.getByRole('combobox', { name: /selecciona un vehículo/i }))
  await user.click(screen.getByRole('option', { name: new RegExp(matricula) }))
}

beforeEach(() => {
  useFlotaCompletaMock.mockReset()
  useActualizarVehiculoMock.mockReset()
  usePersonalEnTurnoMock.mockReset()
  runMock.mockReset()
  useFlotaCompletaMock.mockReturnValue(flotaReturn())
  useActualizarVehiculoMock.mockReturnValue(actReturn())
  usePersonalEnTurnoMock.mockReturnValue(personalReturn())
})

// ──────────────────────────────────────────────────────────────────────────────

describe('VehiculosScreen — selector de flota (dropdown)', () => {
  it('muestra skeleton mientras carga la flota', () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ isLoading: true }))
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByRole('status', { name: /cargando flota/i })).toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay vehículos', () => {
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByText(/no hay vehículos en la flota/i)).toBeInTheDocument()
  })

  it('muestra error al fallar la carga', () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ isError: true, error: new Error('boom') }))
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByText(/no se pudo cargar la flota/i)).toBeInTheDocument()
  })

  it('muestra el dropdown de flota cuando hay vehículos', () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_DESACT] }))
    renderWithShell(<VehiculosScreen />)
    expect(screen.getByRole('combobox', { name: /selecciona un vehículo/i })).toBeInTheDocument()
  })

  it('el dropdown agrupa los vehículos por tipo', async () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_DESACT, VEH_VIR] }))
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)

    await user.click(screen.getByRole('combobox', { name: /selecciona un vehículo/i }))

    // Deben aparecer labels de grupo
    expect(screen.getByText('A1')).toBeInTheDocument()
    expect(screen.getByText('VIR')).toBeInTheDocument()
    // Y las matrículas
    expect(screen.getByRole('option', { name: /1111-DEMO/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /4444-DEMO/i })).toBeInTheDocument()
  })

  it('NO muestra el panel de gestión hasta seleccionar un vehículo', () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_DESACT] }))
    renderWithShell(<VehiculosScreen />)
    expect(screen.queryByText(/iniciar turno/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/finalizar turno/i)).not.toBeInTheDocument()
  })
})

// ──────────────────────────────────────────────────────────────────────────────

describe('VehiculosScreen — vehículo desactivado', () => {
  beforeEach(() => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_DESACT] }))
  })

  it('al seleccionar vehículo desactivado muestra el botón Iniciar turno', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')

    expect(screen.getByRole('button', { name: /^iniciar turno$/i })).toBeInTheDocument()
  })

  it('al clicar Iniciar turno aparece el formulario de activación', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')

    await user.click(screen.getByRole('button', { name: /^iniciar turno$/i }))

    expect(screen.getByRole('combobox', { name: /^pilot$/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /^carry$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/kilómetros inicio/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /tipo de servicio/i })).toBeInTheDocument()
  })

  it('vehículo con condición crítica tiene el botón Iniciar turno deshabilitado', async () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_CRITICO] }))
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '3333-DEMO')

    expect(screen.getByRole('button', { name: /^iniciar turno$/i })).toBeDisabled()
  })

  it('botón Confirmar deshabilitado sin pilot ni km_inicio', async () => {
    usePersonalEnTurnoMock.mockReturnValue(personalReturn({ data: [] }))
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')
    await user.click(screen.getByRole('button', { name: /^iniciar turno$/i }))

    expect(screen.getByRole('button', { name: /confirmar inicio/i })).toBeDisabled()
  })

  it('auto-selecciona pilot si solo hay 1 presente', async () => {
    runMock.mockResolvedValue({
      online: true,
      matricula: '1111-DEMO',
      estado_operativo: 'activado',
    })
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')
    await user.click(screen.getByRole('button', { name: /^iniciar turno$/i }))

    const km = screen.getByLabelText(/kilómetros inicio/i)
    await user.clear(km)
    await user.type(km, '120000')

    await user.click(screen.getByRole('button', { name: /confirmar inicio/i }))

    await waitFor(() =>
      expect(runMock).toHaveBeenCalledWith(
        expect.objectContaining({
          matricula: '1111-DEMO',
          estado_destino: 'activado',
          pilot: 'admin',
          km_inicio: 120000,
        })
      )
    )
  })

  it('tipo_servicio incluido en el submit', async () => {
    usePersonalEnTurnoMock.mockReturnValue(personalReturn({ data: [ADMIN, TES] }))
    runMock.mockResolvedValue({
      online: true,
      matricula: '1111-DEMO',
      estado_operativo: 'activado',
    })
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')
    await user.click(screen.getByRole('button', { name: /^iniciar turno$/i }))

    // Seleccionar pilot
    await user.click(screen.getByRole('combobox', { name: /^pilot$/i }))
    await user.click(screen.getByRole('option', { name: /administrador demo/i }))

    // Cambiar tipo de servicio
    await user.click(screen.getByRole('combobox', { name: /tipo de servicio/i }))
    await user.click(screen.getByRole('option', { name: /^dispositivo$/i }))

    const km = screen.getByLabelText(/kilómetros inicio/i)
    await user.clear(km)
    await user.type(km, '50000')

    await user.click(screen.getByRole('button', { name: /confirmar inicio/i }))

    await waitFor(() =>
      expect(runMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_servicio: 'dispositivo',
        })
      )
    )
  })

  it('Cancelar en el formulario vuelve a mostrar el botón Iniciar turno', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')
    await user.click(screen.getByRole('button', { name: /^iniciar turno$/i }))

    expect(screen.getByRole('button', { name: /confirmar inicio/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(screen.getByRole('button', { name: /^iniciar turno$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirmar inicio/i })).not.toBeInTheDocument()
  })
})

// ──────────────────────────────────────────────────────────────────────────────

describe('VehiculosScreen — vehículo activado', () => {
  beforeEach(() => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_ACTIVO] }))
  })

  it('al seleccionar vehículo activado muestra botones de subestado', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    expect(screen.getByRole('button', { name: /en espera/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /en ruta/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /estacionado/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alerta/i })).toBeInTheDocument()
  })

  it('muestra el botón Finalizar turno cuando activado', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    expect(screen.getByRole('button', { name: /finalizar turno/i })).toBeInTheDocument()
  })

  it('el subestado actual (en_espera) aparece como aria-pressed=true', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    const btnEspera = screen.getByRole('button', { name: /en espera/i })
    expect(btnEspera).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicar subestado diferente llama run con el subestado correcto', async () => {
    runMock.mockResolvedValue({
      online: true,
      matricula: '2222-DEMO',
      estado_operativo: 'activado',
    })
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    await user.click(screen.getByRole('button', { name: /en ruta/i }))

    await waitFor(() =>
      expect(runMock).toHaveBeenCalledWith(
        expect.objectContaining({
          matricula: '2222-DEMO',
          estado_destino: 'ruta',
        })
      )
    )
  })

  it('clicar Finalizar turno muestra el campo km_fin', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    await user.click(screen.getByRole('button', { name: /finalizar turno/i }))

    expect(screen.getByLabelText(/kilómetros fin/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar finalización/i })).toBeInTheDocument()
  })

  it('finalizar turno llama run con desactivado + km_fin', async () => {
    runMock.mockResolvedValue({
      online: true,
      matricula: '2222-DEMO',
      estado_operativo: 'desactivado',
    })
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    await user.click(screen.getByRole('button', { name: /finalizar turno/i }))

    const km = screen.getByLabelText(/kilómetros fin/i)
    await user.clear(km)
    await user.type(km, '88000')

    await user.click(screen.getByRole('button', { name: /confirmar finalización/i }))

    await waitFor(() =>
      expect(runMock).toHaveBeenCalledWith(
        expect.objectContaining({
          matricula: '2222-DEMO',
          estado_destino: 'desactivado',
          km_fin: 88000,
        })
      )
    )
  })

  it('Cancelar en finalizar vuelve a mostrar los botones de subestado', async () => {
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    await user.click(screen.getByRole('button', { name: /finalizar turno/i }))
    expect(screen.queryByRole('button', { name: /finalizar turno/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))
    expect(screen.getByRole('button', { name: /finalizar turno/i })).toBeInTheDocument()
  })
})

// ──────────────────────────────────────────────────────────────────────────────

describe('VehiculosScreen — errores y feedback', () => {
  it('muestra error devuelto por el hook', async () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_DESACT] }))
    useActualizarVehiculoMock.mockReturnValue(
      actReturn({
        error: 'ERR_PILOT_002: El pilot debe estar presente en un terminal',
      })
    )
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '1111-DEMO')

    expect(screen.getByText(/ERR_PILOT_002/)).toBeInTheDocument()
  })

  it('muestra feedback offline cuando run devuelve online=false', async () => {
    useFlotaCompletaMock.mockReturnValue(flotaReturn({ data: [VEH_ACTIVO] }))
    runMock.mockResolvedValue({
      online: false,
      matricula: '2222-DEMO',
      estado_operativo: 'activado',
    })
    const user = userEvent.setup()
    renderWithShell(<VehiculosScreen />)
    await selectVehiculo(user, '2222-DEMO')

    await user.click(screen.getByRole('button', { name: /en ruta/i }))

    await waitFor(() => expect(screen.getByText(/encolado/i)).toBeInTheDocument())
  })
})
