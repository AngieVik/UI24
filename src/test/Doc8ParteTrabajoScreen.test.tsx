import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

// ── Mocks de stores ───────────────────────────────────────────

let idParteMock    = 'abc12345-0000-0000-0000-000000000001'
let checklistMock  = false

vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(
    selector?: (s: { id_parte: string; checklistCerrado: boolean }) => T,
  ): T | { id_parte: string; checklistCerrado: boolean } {
    const s = { id_parte: idParteMock, checklistCerrado: checklistMock }
    return selector ? selector(s) : s
  }
  return { useActivacionStore }
})

// ── Mocks de hooks ────────────────────────────────────────────

vi.mock('@/hooks/useDoc8Activo',     () => ({ useDoc8Activo:     vi.fn() }))
vi.mock('@/hooks/useDoc6DelTurno',   () => ({ useDoc6DelTurno:   vi.fn() }))
vi.mock('@/hooks/useAnotarParte',    () => ({ useAnotarParte:    vi.fn() }))
vi.mock('@/hooks/usePersonalEnTurno',() => ({ usePersonalEnTurno: vi.fn() }))

import { Doc8ParteTrabajoScreen } from '@/components/operativa/Doc8ParteTrabajoScreen'
import { useDoc8Activo, type Doc8Data } from '@/hooks/useDoc8Activo'
import { useDoc6DelTurno }    from '@/hooks/useDoc6DelTurno'
import { useAnotarParte }     from '@/hooks/useAnotarParte'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'

const useDoc8Mock      = vi.mocked(useDoc8Activo)
const useDoc6Mock      = vi.mocked(useDoc6DelTurno)
const useAnotarMock    = vi.mocked(useAnotarParte)
const usePersonalMock  = vi.mocked(usePersonalEnTurno)

// ── Fixtures ──────────────────────────────────────────────────

const DOC8: Doc8Data = {
  id_parte:         'abc12345-0000-0000-0000-000000000001',
  id_activacion:    'act00001-0000-0000-0000-000000000001',
  id_nombre:        'jperez',
  km_inicio:        125000,
  km_fin:           null,
  timestamp_inicio: '2026-05-27T08:00:00Z',
  timestamp_fin:    null,
  estado:           'Abierto_En_Turno',
  notas:            null,
  matricula:        '1111-AA',
  pilot:            'jperez',
  carry:            'mgomez',
  tipo_servicio:    'guardia_urgencias',
}

const PERSONAL = [
  {
    id_nombre:   'jperez',
    nombre_real: 'Juan Pérez',
    rol:         'tes',
    telefono:    null,
    checkin_at:  '2026-05-27T07:55:00Z',
  },
  {
    id_nombre:   'mgomez',
    nombre_real: 'María Gómez',
    rol:         'due',
    telefono:    null,
    checkin_at:  '2026-05-27T07:57:00Z',
  },
]

const GASTOS = [
  {
    id_deduccion:       'ded00001',
    id_item:            1,
    nombre_item:        'Gasa estéril',
    categoria:          'Curas',
    cantidad:           2,
    id_nombre_operador: 'jperez',
    created_at:         '2026-05-27T09:30:00Z',
  },
]

const anotarMock = vi.fn()

beforeEach(() => {
  idParteMock   = 'abc12345-0000-0000-0000-000000000001'
  checklistMock = false

  useDoc8Mock.mockReset()
  useDoc6Mock.mockReset()
  useAnotarMock.mockReset()
  usePersonalMock.mockReset()
  anotarMock.mockReset()

  useDoc8Mock.mockReturnValue({ data: DOC8, isLoading: false, isError: false, error: null })
  useDoc6Mock.mockReturnValue({ data: GASTOS, isLoading: false, isError: false, error: null })
  useAnotarMock.mockReturnValue({ anotar: anotarMock, isSubmitting: false, error: null })
  usePersonalMock.mockReturnValue({ data: PERSONAL, isLoading: false, isError: false, error: null })
})

// ── Gate ──────────────────────────────────────────────────────

describe('Doc8ParteTrabajoScreen — gate', () => {
  it('muestra gate si no hay id_parte (sin turno activo)', () => {
    idParteMock = ''
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/no hay turno activo/i)).toBeInTheDocument()
    expect(screen.getByText(/inicia un turno/i)).toBeInTheDocument()
  })

  it('gate tiene el título correcto', () => {
    idParteMock = ''
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/doc-8 — parte de trabajo/i)).toBeInTheDocument()
  })
})

// ── Loading y error ───────────────────────────────────────────

describe('Doc8ParteTrabajoScreen — loading / error', () => {
  it('muestra skeleton mientras carga', () => {
    useDoc8Mock.mockReturnValue({ data: null, isLoading: true, isError: false, error: null })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByRole('status', { name: /cargando parte/i })).toBeInTheDocument()
  })

  it('muestra error si falla la query', () => {
    useDoc8Mock.mockReturnValue({ data: null, isLoading: false, isError: true, error: new Error('pg error') })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/no se pudo cargar el parte/i)).toBeInTheDocument()
  })
})

// ── Encabezado del parte ──────────────────────────────────────

describe('Doc8ParteTrabajoScreen — encabezado', () => {
  it('muestra matrícula y badge de estado', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/matrícula 1111-AA/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/estado: abierto en turno/i)).toBeInTheDocument()
  })

  it('muestra km_inicio', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText('125000')).toBeInTheDocument()
  })

  it('muestra — cuando km_fin es null', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    // "Km fin" label + "—" value
    const label = screen.getByText(/^Km fin$/i)
    expect(label.closest('div')?.querySelector('dd')).toHaveTextContent('—')
  })

  it('muestra badge Cerrado si estado = Enviado_Cerrado', () => {
    useDoc8Mock.mockReturnValue({
      data: { ...DOC8, estado: 'Enviado_Cerrado' },
      isLoading: false, isError: false, error: null,
    })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/estado: cerrado/i)).toBeInTheDocument()
  })
})

// ── Dotación y servicio ───────────────────────────────────────

describe('Doc8ParteTrabajoScreen — dotación', () => {
  it('muestra pilot y carry', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    // 'jperez' aparece en la card Dotación (dd) y también en la tabla de personal — getAllByText es correcto
    expect(screen.getAllByText('jperez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('mgomez').length).toBeGreaterThan(0)
  })

  it('muestra tipo de servicio formateado', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText('Guardia urgencias')).toBeInTheDocument()
  })

  it('muestra — para carry null', () => {
    useDoc8Mock.mockReturnValue({
      data: { ...DOC8, carry: null },
      isLoading: false, isError: false, error: null,
    })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    // carry label → —
    const label = screen.getByText(/^Carry$/i)
    expect(label.closest('div')?.querySelector('dd')).toHaveTextContent('—')
  })
})

// ── Personal en turno ─────────────────────────────────────────

describe('Doc8ParteTrabajoScreen — personal en turno', () => {
  it('muestra tabla con las personas', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('María Gómez')).toBeInTheDocument()
  })

  it('muestra count en el badge', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/2 personas en turno/i)).toBeInTheDocument()
  })

  it('muestra empty state si no hay personal', () => {
    usePersonalMock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/nadie ha hecho check-in/i)).toBeInTheDocument()
  })
})

// ── Checklist360 ──────────────────────────────────────────────

describe('Doc8ParteTrabajoScreen — checklist360', () => {
  it('badge Pendiente cuando checklistCerrado = false', () => {
    checklistMock = false
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/checklist pendiente/i)).toBeInTheDocument()
  })

  it('badge Completado cuando checklistCerrado = true', () => {
    checklistMock = true
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/checklist completado/i)).toBeInTheDocument()
  })

  it('muestra hint de completar cuando el checklist está pendiente', () => {
    checklistMock = false
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/revisión 360° de inicio de turno no está completada/i)).toBeInTheDocument()
  })
})

// ── Gastos de material ────────────────────────────────────────

describe('Doc8ParteTrabajoScreen — gastos de material', () => {
  it('muestra item y cantidad en la tabla', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText('Gasa estéril')).toBeInTheDocument()
    expect(screen.getByLabelText(/cantidad 2/i)).toBeInTheDocument()
  })

  it('muestra badge con el count de gastos', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/1 gastos registrados/i)).toBeInTheDocument()
  })

  it('empty state si no hay gastos', () => {
    useDoc6Mock.mockReturnValue({ data: [], isLoading: false, isError: false, error: null })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/sin gastos de material registrados/i)).toBeInTheDocument()
  })
})

// ── Anotaciones ───────────────────────────────────────────────

describe('Doc8ParteTrabajoScreen — anotaciones', () => {
  it('textarea habilitada cuando el parte está abierto', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/anotaciones del turno/i)).not.toBeDisabled()
  })

  it('textarea deshabilitada cuando el parte está cerrado', () => {
    useDoc8Mock.mockReturnValue({
      data: { ...DOC8, estado: 'Enviado_Cerrado' },
      isLoading: false, isError: false, error: null,
    })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByLabelText(/anotaciones del turno/i)).toBeDisabled()
  })

  it('botón guardar deshabilitado sin cambios', () => {
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByRole('button', { name: /guardar anotación/i })).toBeDisabled()
  })

  it('botón guardar habilitado tras escribir en textarea', async () => {
    const user = userEvent.setup()
    renderWithShell(<Doc8ParteTrabajoScreen />)

    await user.type(screen.getByLabelText(/anotaciones del turno/i), 'incidencia de prueba')
    expect(screen.getByRole('button', { name: /guardar anotación/i })).not.toBeDisabled()
  })

  it('llama a anotar con el id_parte y las notas correctas', async () => {
    anotarMock.mockResolvedValue({ online: true, id_parte: idParteMock })
    const user = userEvent.setup()
    renderWithShell(<Doc8ParteTrabajoScreen />)

    await user.type(screen.getByLabelText(/anotaciones del turno/i), 'nueva anotación')
    await user.click(screen.getByRole('button', { name: /guardar anotación/i }))

    await waitFor(() => expect(anotarMock).toHaveBeenCalledWith({
      id_parte: idParteMock,
      notas:    'nueva anotación',
    }))
  })

  it('muestra feedback de éxito tras guardar', async () => {
    anotarMock.mockResolvedValue({ online: true, id_parte: idParteMock })
    const user = userEvent.setup()
    renderWithShell(<Doc8ParteTrabajoScreen />)

    await user.type(screen.getByLabelText(/anotaciones del turno/i), 'x')
    await user.click(screen.getByRole('button', { name: /guardar anotación/i }))

    await waitFor(() =>
      expect(screen.getByText(/anotación guardada/i)).toBeInTheDocument(),
    )
  })

  it('muestra feedback offline si la mutación se encoló', async () => {
    anotarMock.mockResolvedValue({ online: false, id_parte: idParteMock })
    const user = userEvent.setup()
    renderWithShell(<Doc8ParteTrabajoScreen />)

    await user.type(screen.getByLabelText(/anotaciones del turno/i), 'x')
    await user.click(screen.getByRole('button', { name: /guardar anotación/i }))

    await waitFor(() =>
      expect(screen.getByText(/encolada offline/i)).toBeInTheDocument(),
    )
  })

  it('muestra error si falla la mutación', () => {
    useAnotarMock.mockReturnValue({
      anotar: anotarMock, isSubmitting: false,
      error: 'ERR_DOC8_002: El parte ya está cerrado',
    })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.getByText(/ERR_DOC8_002/)).toBeInTheDocument()
  })

  it('no muestra botón guardar cuando el parte está cerrado', () => {
    useDoc8Mock.mockReturnValue({
      data: { ...DOC8, estado: 'Enviado_Cerrado' },
      isLoading: false, isError: false, error: null,
    })
    renderWithShell(<Doc8ParteTrabajoScreen />)
    expect(screen.queryByRole('button', { name: /guardar anotación/i })).not.toBeInTheDocument()
  })
})
