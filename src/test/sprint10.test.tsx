import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

const { mockRpc, mockFrom, mockChannel } = vi.hoisted(() => ({
  mockRpc:     vi.fn(),
  mockFrom:    vi.fn(),
  mockChannel: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth:     { signInWithPassword: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() },
    rpc:      mockRpc,
    from:     mockFrom,
    functions: { invoke: vi.fn() },
    storage:  { from: vi.fn() },
    channel:  mockChannel,
    removeChannel: vi.fn(),
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

// ── Imports ───────────────────────────────────────────────────────────────

import { InventarioScreen } from '@/components/operativa/InventarioScreen'
import { SalaEsperaScreen } from '@/components/operativa/SalaEsperaScreen'
import { InformesScreen } from '@/components/operativa/InformesScreen'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useGlobalStore } from '@/stores/useGlobalStore'

const ACTIVACION_ACTIVA = {
  id_activacion:    'act-1',
  id_parte:         'parte-1',
  id_checklist:     'check-1',
  matricula:        '1234-ABC',
  checklistCerrado: true,
}

// ── InventarioScreen ──────────────────────────────────────────────────────

describe('InventarioScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivacionStore.setState(ACTIVACION_ACTIVA)
    useGlobalStore.setState({ isOnline: true })
  })

  it('muestra la matrícula en el título', () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      }),
    })
    render(<InventarioScreen />)
    expect(screen.getByText(/1234-ABC/)).toBeInTheDocument()
  })

  it('muestra mensaje cuando el inventario está vacío', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })
    render(<InventarioScreen />)
    expect(await screen.findByText(/No hay ítems/i)).toBeInTheDocument()
  })

  it('renderiza ítems del inventario agrupados por subgrupo', async () => {
    const datos = [
      {
        id_item: 1, subgrupo: 'Medicación', stock_real: 5,
        catalogo_items: { nombre: 'Adrenalina', categoria: 'Farmacología', especificacion: '1mg/ml' },
      },
      {
        id_item: 2, subgrupo: 'Material', stock_real: 0,
        catalogo_items: { nombre: 'Vías IV', categoria: 'Material', especificacion: null },
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: datos, error: null }),
          }),
        }),
      }),
    })
    render(<InventarioScreen />)
    expect(await screen.findByText('Adrenalina')).toBeInTheDocument()
    expect(screen.getByText('Medicación')).toBeInTheDocument()
    expect(screen.getByText('5 ud.')).toBeInTheDocument()
  })

  it('botón deducir abre el modal con el nombre del ítem', async () => {
    const datos = [
      {
        id_item: 1, subgrupo: 'Medicación', stock_real: 3,
        catalogo_items: { nombre: 'Midazolam', categoria: 'Farmacología', especificacion: null },
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: datos, error: null }),
          }),
        }),
      }),
    })
    render(<InventarioScreen />)
    await screen.findByText('Midazolam')
    const deducirBtn = screen.getByRole('button', { name: /Deducir Midazolam/i })
    fireEvent.click(deducirBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Confirmar deducción/i)).toBeInTheDocument()
  })
})

// ── SalaEsperaScreen ──────────────────────────────────────────────────────

describe('SalaEsperaScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivacionStore.setState(ACTIVACION_ACTIVA)
    mockChannel.mockReturnValue({
      on:        vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    })
  })

  it('muestra aviso offline cuando no hay conexión', () => {
    useGlobalStore.setState({ isOnline: false })
    render(<SalaEsperaScreen />)
    expect(screen.getByText(/requiere conexión/i)).toBeInTheDocument()
  })

  it('muestra botón "Abrir sesión" cuando no hay sesión activa', () => {
    useGlobalStore.setState({ isOnline: true })
    render(<SalaEsperaScreen />)
    expect(screen.getByRole('button', { name: /Abrir sesión/i })).toBeInTheDocument()
  })

  it('llama a rpc_abrir_sesion_filiacion al hacer click', async () => {
    useGlobalStore.setState({ isOnline: true })
    mockRpc.mockResolvedValue({ data: { id_sesion: 'sesion-1' }, error: null })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    render(<SalaEsperaScreen />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Abrir sesión/i }))
    })
    expect(mockRpc).toHaveBeenCalledWith(
      'rpc_abrir_sesion_filiacion',
      expect.objectContaining({ mutation_uuid: expect.any(String) }),
    )
  })
})

// ── InformesScreen ────────────────────────────────────────────────────────

describe('InformesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useActivacionStore.setState(ACTIVACION_ACTIVA)
    useGlobalStore.setState({ isOnline: true })
  })

  it('muestra mensaje sin activación cuando id_activacion está vacío', () => {
    useActivacionStore.setState({ ...ACTIVACION_ACTIVA, id_activacion: '' })
    render(<InformesScreen />)
    expect(screen.getByText(/Sin activación activa/i)).toBeInTheDocument()
  })

  it('muestra "No hay informes" cuando la lista está vacía', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    render(<InformesScreen />)
    expect(await screen.findByText(/No hay informes/i)).toBeInTheDocument()
  })

  it('muestra el botón "Nuevo informe"', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    render(<InformesScreen />)
    await screen.findByText(/No hay informes/i)
    expect(screen.getByRole('button', { name: /Nuevo informe/i })).toBeInTheDocument()
  })

  it('abre el formulario al pulsar "Nuevo informe"', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    render(<InformesScreen />)
    await screen.findByText(/No hay informes/i)
    fireEvent.click(screen.getByRole('button', { name: /Nuevo informe/i }))
    expect(screen.getByRole('form', { name: /Nuevo informe asistencial/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre del paciente/i)).toBeInTheDocument()
  })

  it('renderiza informes existentes con badge de estado', async () => {
    const informes = [
      {
        id_doc: 'doc-1',
        id_activacion: 'act-1',
        id_nombre_redactor: 'user01',
        timestamp_asistencia: new Date().toISOString(),
        datos_paciente: { nombre: 'María García', motivo: 'Dolor torácico' },
        estado: 'borrador',
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq:    vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: informes, error: null }),
        }),
      }),
    })
    render(<InformesScreen />)
    expect(await screen.findByText('María García')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    expect(screen.getByText('Dolor torácico')).toBeInTheDocument()
  })
})
