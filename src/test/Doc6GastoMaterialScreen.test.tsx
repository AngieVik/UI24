import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

vi.mock('@/hooks/useInventarioVehiculo', () => ({
  useInventarioVehiculo: vi.fn(),
}))
vi.mock('@/hooks/useDeducirMaterial', () => ({
  useDeducirMaterial: vi.fn(),
}))

let matriculaMock = '1111-DEMO'
vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(
    selector?: (s: { matricula: string }) => T
  ): T | { matricula: string } {
    const s = { matricula: matriculaMock }
    return selector ? selector(s) : s
  }
  return { useActivacionStore }
})

import { Doc6GastoMaterialScreen } from '@/components/operativa/Doc6GastoMaterialScreen'
import { useInventarioVehiculo } from '@/hooks/useInventarioVehiculo'
import { useDeducirMaterial } from '@/hooks/useDeducirMaterial'

const useInventarioVehiculoMock = vi.mocked(useInventarioVehiculo)
const useDeducirMaterialMock = vi.mocked(useDeducirMaterial)

const deducirMock = vi.fn()

function invReturn(
  overrides: Partial<ReturnType<typeof useInventarioVehiculo>> = {}
): ReturnType<typeof useInventarioVehiculo> {
  return { data: [], isLoading: false, isError: false, error: null, ...overrides }
}

function dedReturn(
  overrides: Partial<ReturnType<typeof useDeducirMaterial>> = {}
): ReturnType<typeof useDeducirMaterial> {
  return { deducir: deducirMock, isSubmitting: false, error: null, setError: vi.fn(), ...overrides }
}

const ITEM_A = {
  id_item: 1,
  subgrupo: 'mochila',
  stock_real: 5,
  nombre: 'Gasa estéril',
  categoria: 'Curas',
  especificacion: 'caja x10',
}
const ITEM_B = {
  id_item: 2,
  subgrupo: 'mochila',
  stock_real: 12,
  nombre: 'Suero fisiológico',
  categoria: 'Fluidos',
  especificacion: '500 ml',
}
const ITEM_C = {
  id_item: 3,
  subgrupo: 'vehiculo',
  stock_real: 0,
  nombre: 'Mascarilla FFP2',
  categoria: 'EPI',
  especificacion: null,
}

beforeEach(() => {
  matriculaMock = '1111-DEMO'
  useInventarioVehiculoMock.mockReset()
  useDeducirMaterialMock.mockReset()
  deducirMock.mockReset()
  useInventarioVehiculoMock.mockReturnValue(invReturn())
  useDeducirMaterialMock.mockReturnValue(dedReturn())
})

describe('Doc6GastoMaterialScreen — gates', () => {
  it('muestra mensaje si no hay matrícula activa', () => {
    matriculaMock = ''
    renderWithShell(<Doc6GastoMaterialScreen />)
    expect(screen.getByText(/no hay turno activo/i)).toBeInTheDocument()
  })

  it('muestra skeleton mientras carga', () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ isLoading: true }))
    renderWithShell(<Doc6GastoMaterialScreen />)
    expect(screen.getByRole('status', { name: /cargando inventario/i })).toBeInTheDocument()
  })

  it('muestra error si la query falla', () => {
    useInventarioVehiculoMock.mockReturnValue(
      invReturn({ isError: true, error: new Error('boom') })
    )
    renderWithShell(<Doc6GastoMaterialScreen />)
    expect(screen.getByText(/no se pudo cargar el inventario/i)).toBeInTheDocument()
  })
})

describe('Doc6GastoMaterialScreen — listado y filtros', () => {
  it('oculta items con stock 0 y agrupa por categoría', () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A, ITEM_B, ITEM_C] }))
    renderWithShell(<Doc6GastoMaterialScreen />)

    // Categorías visibles
    expect(screen.getByText(/^Curas/i)).toBeInTheDocument()
    expect(screen.getByText(/^Fluidos/i)).toBeInTheDocument()
    // Items con stock
    expect(screen.getByText('Gasa estéril')).toBeInTheDocument()
    expect(screen.getByText('Suero fisiológico')).toBeInTheDocument()
    // Item con stock 0 oculto
    expect(screen.queryByText('Mascarilla FFP2')).not.toBeInTheDocument()
  })

  it('filtra por nombre con el buscador', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A, ITEM_B] }))
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    await user.type(screen.getByLabelText(/buscar material/i), 'suero')

    expect(screen.queryByText('Gasa estéril')).not.toBeInTheDocument()
    expect(screen.getByText('Suero fisiológico')).toBeInTheDocument()
  })
})

describe('Doc6GastoMaterialScreen — carrito', () => {
  it('añadir un item al carrito muestra la cantidad y actualiza el botón', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A] }))
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    const addBtn = screen.getByRole('button', { name: /añadir gasa estéril al carrito/i })
    await user.click(addBtn)

    // Texto del botón pasa a "× 1"
    expect(addBtn).toHaveTextContent(/× 1/)
    // El badge del header del carrito ahora dice 1
    expect(screen.getByText(/gasto pendiente/i)).toBeInTheDocument()
  })

  it('no permite añadir más allá del stock_real', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [{ ...ITEM_A, stock_real: 2 }] }))
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    const addBtn = screen.getByRole('button', { name: /añadir gasa estéril/i })
    await user.click(addBtn)
    await user.click(addBtn)
    await user.click(addBtn)

    expect(addBtn).toHaveTextContent(/× 2/)
    expect(addBtn).toBeDisabled()
  })

  it('botón "Vaciar" limpia el carrito', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A] }))
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril/i }))
    expect(screen.getByRole('button', { name: /vaciar/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /vaciar/i }))
    expect(screen.queryByRole('button', { name: /vaciar/i })).not.toBeInTheDocument()
  })
})

describe('Doc6GastoMaterialScreen — confirmar', () => {
  it('confirmar envía la lista de deducciones y vacía el carrito al éxito', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A, ITEM_B] }))
    deducirMock.mockResolvedValue({ ok: 2, failed: 0, queued: 0 })
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril/i }))
    await user.click(screen.getByRole('button', { name: /añadir suero fisiológico/i }))

    await user.click(screen.getByRole('button', { name: /confirmar gasto/i }))

    await waitFor(() => expect(deducirMock).toHaveBeenCalled())
    const call = deducirMock.mock.calls[0][0]
    expect(call.items).toHaveLength(2)
    expect(call.items[0]).toMatchObject({ id_item: 1, subgrupo: 'mochila', cantidad: 1 })
    expect(call.items[1]).toMatchObject({ id_item: 2, subgrupo: 'mochila', cantidad: 1 })
    expect(call.motivo).toBeNull()

    // Tras éxito, feedback visible
    await waitFor(() =>
      expect(screen.getByText(/2 deducción\(es\) registradas\./i)).toBeInTheDocument()
    )
  })

  it('muestra mensaje cuando algunas fallaron', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A] }))
    deducirMock.mockResolvedValue({ ok: 0, failed: 1, queued: 0 })
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril/i }))
    await user.click(screen.getByRole('button', { name: /confirmar gasto/i }))

    await waitFor(() => expect(screen.getByText(/0 confirmadas, 1 fallaron/i)).toBeInTheDocument())
  })

  it('motivo opcional se envía si está presente', async () => {
    useInventarioVehiculoMock.mockReturnValue(invReturn({ data: [ITEM_A] }))
    deducirMock.mockResolvedValue({ ok: 1, failed: 0, queued: 0 })
    const user = userEvent.setup()
    renderWithShell(<Doc6GastoMaterialScreen />)

    await user.click(screen.getByRole('button', { name: /añadir gasa estéril/i }))
    await user.type(screen.getByLabelText(/motivo opcional/i), 'Curación de paciente')
    await user.click(screen.getByRole('button', { name: /confirmar gasto/i }))

    await waitFor(() => expect(deducirMock).toHaveBeenCalled())
    expect(deducirMock.mock.calls[0][0].motivo).toBe('Curación de paciente')
  })
})
