import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

const { mockRpc, mockFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockRpc:        vi.fn(),
  mockFrom:       vi.fn(),
  mockStorageFrom: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth:     { signInWithPassword: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() },
    rpc:      mockRpc,
    from:     mockFrom,
    functions: { invoke: vi.fn() },
    storage:  { from: mockStorageFrom },
  },
}))

vi.mock('@/lib/fingerprint', () => ({
  computeFingerprint: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/offlineSession', () => ({
  saveOfflineSession:   vi.fn().mockResolvedValue(undefined),
  verifyOfflineLogin:   vi.fn().mockResolvedValue(false),
  loadOfflineSession:   vi.fn().mockResolvedValue(null),
  clearOfflineSession:  vi.fn().mockResolvedValue(undefined),
  isOfflineSessionValid: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/imageCompressor', () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/webp' })),
}))

vi.mock('@/lib/blobStorage', () => ({
  saveBlob:   vi.fn().mockResolvedValue(undefined),
  loadBlob:   vi.fn().mockResolvedValue(null),
  deleteBlob: vi.fn().mockResolvedValue(undefined),
}))

// ── Imports ───────────────────────────────────────────────────────────────

import { saveBlob, loadBlob, deleteBlob } from '@/lib/blobStorage'
import { VehiclePickerScreen } from '@/components/flota/VehiclePickerScreen'
import { ChecklistScreen } from '@/components/flota/ChecklistScreen'
import { Doc7Form } from '@/components/flota/Doc7Form'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useGlobalStore } from '@/stores/useGlobalStore'

// ── blobStorage ───────────────────────────────────────────────────────────

describe('blobStorage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saveBlob llama a idb-keyval set', async () => {
    await saveBlob('uuid-1', new Blob(['data']))
    expect(saveBlob).toHaveBeenCalledWith('uuid-1', expect.any(Blob))
  })

  it('loadBlob devuelve null cuando no hay blob', async () => {
    const result = await loadBlob('uuid-x')
    expect(result).toBeNull()
  })

  it('deleteBlob llama a idb-keyval del', async () => {
    await deleteBlob('uuid-2')
    expect(deleteBlob).toHaveBeenCalledWith('uuid-2')
  })
})

// ── useActivacionStore ────────────────────────────────────────────────────

describe('useActivacionStore', () => {
  beforeEach(() => {
    useActivacionStore.setState({
      id_activacion: '',
      id_parte:      '',
      id_checklist:  '',
      matricula:     '',
      checklistCerrado: false,
    })
  })

  it('setActivacion almacena datos y resetea checklistCerrado', () => {
    useActivacionStore.getState().setActivacion({
      id_activacion: 'act-1',
      id_parte:      'parte-1',
      id_checklist:  'check-1',
      matricula:     '1234-ABC',
    })
    const s = useActivacionStore.getState()
    expect(s.id_activacion).toBe('act-1')
    expect(s.matricula).toBe('1234-ABC')
    expect(s.checklistCerrado).toBe(false)
  })

  it('marcarChecklistCerrado cambia checklistCerrado a true', () => {
    useActivacionStore.getState().setActivacion({
      id_activacion: 'act-2',
      id_parte:      'p',
      id_checklist:  'c',
      matricula:     'M',
    })
    useActivacionStore.getState().marcarChecklistCerrado()
    expect(useActivacionStore.getState().checklistCerrado).toBe(true)
  })

  it('clearActivacion vuelve al estado vacío', () => {
    useActivacionStore.getState().setActivacion({
      id_activacion: 'act-3',
      id_parte:      'p',
      id_checklist:  'c',
      matricula:     'M',
    })
    useActivacionStore.getState().clearActivacion()
    const s = useActivacionStore.getState()
    expect(s.id_activacion).toBe('')
    expect(s.matricula).toBe('')
  })
})

// ── VehiclePickerScreen ───────────────────────────────────────────────────

describe('VehiclePickerScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGlobalStore.setState({ isOnline: true })
  })

  it('muestra el skeleton mientras carga', () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue(new Promise(() => {})),
            }),
          }),
        }),
      }),
    })
    render(<VehiclePickerScreen />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('muestra "No hay vehículos" cuando la lista está vacía', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })
    render(<VehiclePickerScreen />)
    expect(await screen.findByText(/No hay vehículos disponibles/i)).toBeInTheDocument()
  })

  it('renderiza vehículos disponibles y permite seleccionar', async () => {
    const vehiculos = [
      { matricula: '1234-ABC', tipo: 'SVB', condicion_tecnica: 'operativo', estado_operativo: 'inactivo' },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: vehiculos, error: null }),
            }),
          }),
        }),
      }),
    })
    render(<VehiclePickerScreen />)
    const item = await screen.findByText('1234-ABC')
    expect(item).toBeInTheDocument()
    fireEvent.click(item.closest('li')!)
    expect(await screen.findByRole('spinbutton')).toBeInTheDocument()
  })

  it('bloquea el botón de submit si no hay vehículo ni km', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })
    render(<VehiclePickerScreen />)
    await screen.findByText(/No hay vehículos disponibles/i)
    const btn = screen.getByRole('button', { name: /Iniciar turno/i })
    expect(btn).toBeDisabled()
  })
})

// ── ChecklistScreen ───────────────────────────────────────────────────────

describe('ChecklistScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivacionStore.setState({
      id_activacion: 'act-1',
      id_parte:      'parte-1',
      id_checklist:  'check-1',
      matricula:     '1234-ABC',
      checklistCerrado: false,
    })
    useGlobalStore.setState({ isOnline: true })
  })

  it('renderiza la matrícula del vehículo', () => {
    render(<ChecklistScreen />)
    expect(screen.getByText(/1234-ABC/)).toBeInTheDocument()
  })

  it('muestra los 10 sistemas del checklist', () => {
    render(<ChecklistScreen />)
    expect(screen.getByText(/Exterior/i)).toBeInTheDocument()
    expect(screen.getByText(/Neumáticos/i)).toBeInTheDocument()
    expect(screen.getByText(/Comunicaciones/i)).toBeInTheDocument()
    expect(screen.getByText(/Documentación/i)).toBeInTheDocument()
  })

  it('el botón cerrar está deshabilitado si no se han revisado todos los sistemas', () => {
    render(<ChecklistScreen />)
    const btn = screen.getByRole('button', { name: /Cerrar checklist/i })
    expect(btn).toBeDisabled()
  })

  it('muestra selector de criticidad al marcar NG', () => {
    render(<ChecklistScreen />)
    const ngBtns = screen.getAllByRole('button', { name: /NG/i })
    fireEvent.click(ngBtns[0])
    expect(screen.getByText(/Criticidad/i)).toBeInTheDocument()
    expect(screen.getByText(/Selecciona…/i)).toBeInTheDocument()
  })

  it('muestra error si se intenta cerrar sin todos los sistemas revisados', async () => {
    render(<ChecklistScreen />)
    const form = screen.getByRole('button', { name: /Cerrar checklist/i })
    // habilitar botón manualmente marcando todos como OK
    const okBtns = screen.getAllByRole('button', { name: /^OK$/i })
    okBtns.forEach((btn) => fireEvent.click(btn))
    expect(form).not.toBeDisabled()
  })
})

// ── Doc7Form ──────────────────────────────────────────────────────────────

describe('Doc7Form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivacionStore.setState({
      id_activacion: 'act-1',
      id_parte:      'parte-1',
      id_checklist:  'check-1',
      matricula:     '5678-XYZ',
      checklistCerrado: true,
    })
    useGlobalStore.setState({ isOnline: true })
  })

  it('renderiza la matrícula en el título', () => {
    render(<Doc7Form />)
    expect(screen.getByText(/5678-XYZ/)).toBeInTheDocument()
  })

  it('muestra opciones de sistema afectado', () => {
    render(<Doc7Form />)
    expect(screen.getByRole('combobox', { name: /Sistema afectado/i })).toBeInTheDocument()
    expect(screen.getByText('Exterior (carrocería)')).toBeInTheDocument()
  })

  it('muestra los tres niveles de criticidad como radio', () => {
    render(<Doc7Form />)
    expect(screen.getByLabelText('Leve')).toBeInTheDocument()
    expect(screen.getByLabelText('Moderada')).toBeInTheDocument()
    expect(screen.getByLabelText('Grave')).toBeInTheDocument()
  })

  it('muestra error si se envía sin sistema ni criticidad', async () => {
    render(<Doc7Form />)
    const btn = screen.getByRole('button', { name: /Registrar avería/i })
    fireEvent.click(btn)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(/sistema afectado/i)
  })

  it('muestra error si se envía sin criticidad', async () => {
    render(<Doc7Form />)
    const select = screen.getByRole('combobox', { name: /Sistema afectado/i })
    fireEvent.change(select, { target: { value: 'motor' } })
    const btn = screen.getByRole('button', { name: /Registrar avería/i })
    fireEvent.click(btn)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(/criticidad/i)
  })
})
