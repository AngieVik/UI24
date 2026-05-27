import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

vi.mock('@/hooks/useInventarioVehiculo', () => ({
  useInventarioVehiculo: vi.fn(),
}))
vi.mock('@/hooks/useEnviarMaterial', () => ({
  useEnviarMaterial: vi.fn(),
}))
vi.mock('@/hooks/useLocations', () => ({
  useLocations: vi.fn(),
}))
vi.mock('@/hooks/usePersonalEnTurno', () => ({
  usePersonalEnTurno: vi.fn(),
}))

let matriculaMock = '1111-DEMO'
vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(selector?: (s: { matricula: string }) => T): T | { matricula: string } {
    const s = { matricula: matriculaMock }
    return selector ? selector(s) : s
  }
  return { useActivacionStore }
})

import { Doc10EnvioMaterialScreen } from '@/components/operativa/Doc10EnvioMaterialScreen'
import { useInventarioVehiculo } from '@/hooks/useInventarioVehiculo'
import { useEnviarMaterial } from '@/hooks/useEnviarMaterial'
import { useLocations } from '@/hooks/useLocations'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'

const useInventarioVehiculoMock = vi.mocked(useInventarioVehiculo)
const useEnviarMaterialMock     = vi.mocked(useEnviarMaterial)
const useLocationsMock          = vi.mocked(useLocations)
const usePersonalEnTurnoMock    = vi.mocked(usePersonalEnTurno)

const enviarMock = vi.fn()

const ITEM_A = { id_item: 1, subgrupo: 'mochila', stock_real: 5,  nombre: 'Gasa estéril',     categoria: 'Curas',   especificacion: 'caja x10' }
const ITEM_B = { id_item: 2, subgrupo: 'mochila', stock_real: 12, nombre: 'Suero fisiológico', categoria: 'Fluidos', especificacion: '500 ml'   }

const ADMIN = { id_nombre: 'admin', nombre_real: 'Administrador Demo', rol: 'gerencia', telefono: null, checkin_at: '' }

const ALMACEN = { location_id: '00000000-0000-0000-0000-000000000001', nombre: 'Almacén Central Demo', tipo: 'almacen'  }
const VEH_OWN = { location_id: '1111-DEMO',                            nombre: 'Ambulancia 1111-DEMO', tipo: 'vehiculo' }
const VEH_OTHER = { location_id: '2222-DEMO',                          nombre: 'Ambulancia 2222-DEMO', tipo: 'vehiculo' }

beforeEach(() => {
  matriculaMock = '1111-DEMO'
  useInventarioVehiculoMock.mockReset()
  useEnviarMaterialMock.mockReset()
  useLocationsMock.mockReset()
  usePersonalEnTurnoMock.mockReset()
  enviarMock.mockReset()
  useInventarioVehiculoMock.mockReturnValue({ data: [ITEM_A, ITEM_B], isLoading: false, isError: false, error: null })
  useEnviarMaterialMock.mockReturnValue({ enviar: enviarMock, isSubmitting: false, error: null, setError: vi.fn() })
  useLocationsMock.mockReturnValue({ data: [ALMACEN, VEH_OWN, VEH_OTHER], isLoading: false, isError: false, error: null })
  usePersonalEnTurnoMock.mockReturnValue({ data: [ADMIN], isLoading: false, isError: false, error: null })
})

describe('Doc10EnvioMaterialScreen — gates', () => {
  it('muestra gate si no hay matrícula activa', () => {
    matriculaMock = ''
    renderWithShell(<Doc10EnvioMaterialScreen />)
    expect(screen.getByText(/no hay turno activo/i)).toBeInTheDocument()
  })

  it('warning si no hay nadie con presencia', () => {
    usePersonalEnTurnoMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null })
    renderWithShell(<Doc10EnvioMaterialScreen />)
    expect(screen.getByText(/no hay nadie con presencia/i)).toBeInTheDocument()
  })
})

describe('Doc10EnvioMaterialScreen — selectores', () => {
  it('lista destinos excluyendo el propio vehículo y añadiendo opción externa', async () => {
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    await user.click(screen.getByRole('combobox', { name: /destino/i }))

    expect(screen.getByRole('option', { name: /almacén central demo/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /ambulancia 2222-DEMO/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /ambulancia 1111-DEMO/i })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /destino externo/i })).toBeInTheDocument()
  })

  it('si elijo destino externo aparece el campo de texto libre', async () => {
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    await user.click(screen.getByRole('combobox', { name: /destino/i }))
    await user.click(screen.getByRole('option', { name: /destino externo/i }))

    expect(screen.getByLabelText(/destino externo/i)).toBeInTheDocument()
  })

  it('lista items del inventario agrupados por categoría', () => {
    renderWithShell(<Doc10EnvioMaterialScreen />)
    expect(screen.getByText(/^Curas/i)).toBeInTheDocument()
    expect(screen.getByText(/^Fluidos/i)).toBeInTheDocument()
    expect(screen.getByText('Gasa estéril')).toBeInTheDocument()
    expect(screen.getByText('Suero fisiológico')).toBeInTheDocument()
  })
})

describe('Doc10EnvioMaterialScreen — carrito y envío', () => {
  it('añade item al carrito y muestra cantidad', async () => {
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    const addBtn = screen.getByRole('button', { name: /añadir gasa estéril al envío/i })
    await user.click(addBtn)
    expect(addBtn).toHaveTextContent(/× 1/)
  })

  it('submit deshabilitado sin destino', async () => {
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril al envío/i }))

    expect(screen.getByRole('button', { name: /enviar transferencia/i })).toBeDisabled()
  })

  it('envío con destino interno llama enviar con location_destino', async () => {
    enviarMock.mockResolvedValue({ online: true, id_transferencia: 'abc-12345-xxx' })
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril al envío/i }))
    await user.click(screen.getByRole('combobox', { name: /destino/i }))
    await user.click(screen.getByRole('option', { name: /almacén central demo/i }))

    await user.click(screen.getByRole('button', { name: /enviar transferencia/i }))

    await waitFor(() => expect(enviarMock).toHaveBeenCalled())
    expect(enviarMock).toHaveBeenCalledWith(expect.objectContaining({
      operador:         'admin',
      location_destino: ALMACEN.location_id,
      destino_externo:  null,
      items:            [{ id_item: 1, subgrupo: 'mochila', cantidad: 1 }],
    }))
  })

  it('envío con destino externo requiere texto y envía destino_externo', async () => {
    enviarMock.mockResolvedValue({ online: true, id_transferencia: 'abc-67890-xxx' })
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril al envío/i }))
    await user.click(screen.getByRole('combobox', { name: /destino/i }))
    await user.click(screen.getByRole('option', { name: /destino externo/i }))

    // Sin texto → submit aún disabled
    expect(screen.getByRole('button', { name: /enviar transferencia/i })).toBeDisabled()

    await user.type(screen.getByLabelText(/destino externo/i), 'Hospital General')
    await user.click(screen.getByRole('button', { name: /enviar transferencia/i }))

    await waitFor(() => expect(enviarMock).toHaveBeenCalled())
    expect(enviarMock).toHaveBeenCalledWith(expect.objectContaining({
      destino_externo: 'Hospital General',
      location_destino: null,
    }))
  })

  it('feedback tras éxito muestra id_transferencia truncado', async () => {
    enviarMock.mockResolvedValue({ online: true, id_transferencia: 'abc12345-6789-xxx' })
    const user = userEvent.setup()
    renderWithShell(<Doc10EnvioMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril al envío/i }))
    await user.click(screen.getByRole('combobox', { name: /destino/i }))
    await user.click(screen.getByRole('option', { name: /almacén central demo/i }))
    await user.click(screen.getByRole('button', { name: /enviar transferencia/i }))

    await waitFor(() =>
      expect(screen.getByText(/envío registrado/i)).toBeInTheDocument(),
    )
  })

  it('muestra error del hook', () => {
    useEnviarMaterialMock.mockReturnValue({
      enviar: enviarMock, isSubmitting: false,
      error: 'ERR_DOC10_007: Item 5 (mochila) no en inventario',
      setError: vi.fn(),
    })
    renderWithShell(<Doc10EnvioMaterialScreen />)
    expect(screen.getByText(/ERR_DOC10_007/)).toBeInTheDocument()
  })
})
