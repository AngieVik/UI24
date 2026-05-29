import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

// ── Mocks de stores ───────────────────────────────────────────

let idChecklistMock = 'chk00001-0000-0000-0000-000000000001'
let matriculaMock  = '1234-XX'
const marcarChecklistCerradoMock = vi.fn()

vi.mock('@/stores/useActivacionStore', () => {
  function useActivacionStore<T = unknown>(
    selector?: (s: {
      id_checklist: string
      matricula: string
      marcarChecklistCerrado: () => void
    }) => T,
  ): T | object {
    const s = {
      id_checklist:           idChecklistMock,
      matricula:              matriculaMock,
      marcarChecklistCerrado: marcarChecklistCerradoMock,
    }
    return selector ? selector(s) : s
  }
  return { useActivacionStore }
})

// ── Mocks de hooks ────────────────────────────────────────────

vi.mock('@/hooks/useChecklist360Activo',   () => ({ useChecklist360Activo:   vi.fn() }))
vi.mock('@/hooks/useChecklist360Anterior', () => ({ useChecklist360Anterior: vi.fn() }))
vi.mock('@/hooks/useCerrarChecklist360',   () => ({ useCerrarChecklist360:   vi.fn() }))

// Mock useQuery para el tipo de vehículo
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn((opts: { queryKey: unknown[]; queryFn?: () => unknown }) => {
      // Solo interceptar la query del tipo de vehículo
      if (Array.isArray(opts.queryKey) && opts.queryKey[0] === 'vehiculo_tipo') {
        return { data: vehiculoTipoMock, isLoading: false, isError: false, error: null }
      }
      // Para checklist360_activo deja pasar (ya mocked via hook)
      return { data: null, isLoading: false, isError: false, error: null }
    }),
  }
})

import { Checklist360Screen } from '@/components/operativa/Checklist360Screen'
import { useChecklist360Activo }   from '@/hooks/useChecklist360Activo'
import { useChecklist360Anterior } from '@/hooks/useChecklist360Anterior'
import { useCerrarChecklist360 }   from '@/hooks/useCerrarChecklist360'

const useActivoMock   = vi.mocked(useChecklist360Activo)
const useAnteriorMock = vi.mocked(useChecklist360Anterior)
const useCerrarMock   = vi.mocked(useCerrarChecklist360)

let vehiculoTipoMock: { tipo: string } | null = { tipo: 'A2' }

// ── Fixtures ──────────────────────────────────────────────────

const CHECKLIST_ABIERTO: ReturnType<typeof useChecklist360Activo>['data'] = {
  id_checklist:       idChecklistMock,
  matricula:          '1234-XX',
  id_activacion:      'act00001-0000-0000-0000-000000000001',
  id_nombre_redactor: 'jperez',
  timestamp_inicio:   '2026-05-27T08:00:00Z',
  timestamp_cierre:   null,
  items_revisados:    {},
  cerrado:            false,
}

const CHECKLIST_CERRADO: ReturnType<typeof useChecklist360Activo>['data'] = {
  ...CHECKLIST_ABIERTO,
  timestamp_cierre: '2026-05-27T08:45:00Z',
  items_revisados: {
    parabrisas_escobillas: { estado: 'OK', campos_extra: {}, es_incidencia_heredada: false },
    opticas_frontales:     { estado: 'OBSERVACION', campos_extra: { foco_averiado: ['Cruce Izq'] }, es_incidencia_heredada: false },
  },
  cerrado: true,
}

const cerrarMock = vi.fn()

beforeEach(() => {
  idChecklistMock = 'chk00001-0000-0000-0000-000000000001'
  matriculaMock   = '1234-XX'
  vehiculoTipoMock = { tipo: 'A2' }

  useActivoMock.mockReset()
  useAnteriorMock.mockReset()
  useCerrarMock.mockReset()
  cerrarMock.mockReset()
  marcarChecklistCerradoMock.mockReset()

  useActivoMock.mockReturnValue({ data: CHECKLIST_ABIERTO, isLoading: false, isError: false, error: null })
  useAnteriorMock.mockReturnValue({ anterior: {}, isLoading: false })
  useCerrarMock.mockReturnValue({ cerrar: cerrarMock, isSubmitting: false, error: null })
})

// ── Gate ──────────────────────────────────────────────────────

describe('Checklist360Screen — gate', () => {
  it('muestra gate si no hay id_checklist', () => {
    idChecklistMock = ''
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/no hay vehículo activado/i)).toBeInTheDocument()
  })

  it('muestra gate si no hay matrícula', () => {
    matriculaMock = ''
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/no hay vehículo activado/i)).toBeInTheDocument()
  })

  it('gate muestra título correcto', () => {
    idChecklistMock = ''
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/checklist 360° — revisión del vehículo/i)).toBeInTheDocument()
  })
})

// ── Loading / error ───────────────────────────────────────────

describe('Checklist360Screen — loading / error', () => {
  it('muestra skeleton mientras carga', () => {
    useActivoMock.mockReturnValue({ data: null, isLoading: true, isError: false, error: null })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByRole('status', { name: /cargando checklist/i })).toBeInTheDocument()
  })

  it('muestra error si falla la query', () => {
    useActivoMock.mockReturnValue({ data: null, isLoading: false, isError: true, error: new Error('pg error') })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/no se pudo cargar el checklist/i)).toBeInTheDocument()
  })
})

// ── Checklist cerrado (readonly) ──────────────────────────────

describe('Checklist360Screen — checklist cerrado', () => {
  it('muestra vista readonly si cerrado = true', () => {
    useActivoMock.mockReturnValue({ data: CHECKLIST_CERRADO, isLoading: false, isError: false, error: null })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/revisión 360° completada/i)).toBeInTheDocument()
  })

  it('muestra badge Completado', () => {
    useActivoMock.mockReturnValue({ data: CHECKLIST_CERRADO, isLoading: false, isError: false, error: null })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByLabelText(/checklist completado/i)).toBeInTheDocument()
  })

  it('lista incidencias del checklist cerrado', () => {
    useActivoMock.mockReturnValue({ data: CHECKLIST_CERRADO, isLoading: false, isError: false, error: null })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText('opticas_frontales')).toBeInTheDocument()
  })

  it('no muestra el formulario si cerrado', () => {
    useActivoMock.mockReturnValue({ data: CHECKLIST_CERRADO, isLoading: false, isError: false, error: null })
    renderWithShell(<Checklist360Screen />)
    expect(screen.queryByRole('button', { name: /completar revisión 360°/i })).not.toBeInTheDocument()
  })
})

// ── Formulario abierto ────────────────────────────────────────

describe('Checklist360Screen — formulario', () => {
  it('muestra matrícula del vehículo', () => {
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByLabelText(/matrícula 1234-XX/i)).toBeInTheDocument()
  })

  it('muestra contador 0/N en el badge', () => {
    renderWithShell(<Checklist360Screen />)
    // Badge "0/28" para vehículo no VIR (28 ítems visibles)
    expect(screen.getByLabelText(/0 de \d+ ítems evaluados/i)).toBeInTheDocument()
  })

  it('botón completar deshabilitado cuando no todos los ítems están evaluados', () => {
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByRole('button', { name: /faltan \d+ ítems/i })).toBeDisabled()
  })

  it('muestra secciones del checklist', () => {
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByLabelText(/sección: frente/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sección: lateral derecho/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sección: trasera/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sección: cabina y sistemas/i)).toBeInTheDocument()
  })
})

// ── Botones de estado ─────────────────────────────────────────

describe('Checklist360Screen — botones de estado', () => {
  it('botón OK selecciona el estado OK en un ítem', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)

    const btnOK = screen.getAllByRole('button', { name: /correcto — parabrisas_escobillas/i })[0]
    await user.click(btnOK)

    // Aria-pressed debe ser true
    expect(btnOK).toHaveAttribute('aria-pressed', 'true')
  })

  it('botón OBS despliega sub-campos', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)

    const btnOBS = screen.getAllByRole('button', { name: /observación — parabrisas_escobillas/i })[0]
    await user.click(btnOBS)

    // Sub-campo zona_afectada aparece
    expect(screen.getByLabelText(/zona afectada/i)).toBeInTheDocument()
  })

  it('sub-campos desaparecen al volver a OK', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)

    const btnOBS = screen.getAllByRole('button', { name: /observación — parabrisas_escobillas/i })[0]
    await user.click(btnOBS)
    expect(screen.getByLabelText(/zona afectada/i)).toBeInTheDocument()

    const btnOK = screen.getAllByRole('button', { name: /correcto — parabrisas_escobillas/i })[0]
    await user.click(btnOK)
    expect(screen.queryByLabelText(/zona afectada/i)).not.toBeInTheDocument()
  })

  it('botón N/A selecciona NO_APLICA', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)

    const btnNA = screen.getAllByRole('button', { name: /no aplica — parabrisas_escobillas/i })[0]
    await user.click(btnNA)
    expect(btnNA).toHaveAttribute('aria-pressed', 'true')
  })
})

// ── VIR ───────────────────────────────────────────────────────

describe('Checklist360Screen — VIR', () => {
  it('no muestra sección VIR para vehículo no VIR', () => {
    vehiculoTipoMock = { tipo: 'A2' }
    renderWithShell(<Checklist360Screen />)
    expect(screen.queryByLabelText(/sección: adaptación vir/i)).not.toBeInTheDocument()
  })

  it('muestra sección VIR para vehículo VIR', () => {
    vehiculoTipoMock = { tipo: 'VIR' }
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByLabelText(/sección: adaptación vir/i)).toBeInTheDocument()
  })

  it('muestra badge VIR 4x4 en el encabezado cuando es VIR', () => {
    vehiculoTipoMock = { tipo: 'VIR' }
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByLabelText(/vehículo tipo VIR/i)).toBeInTheDocument()
  })
})

// ── Herencia de incidencias ───────────────────────────────────

describe('Checklist360Screen — herencia', () => {
  it('pre-rellena ítems con incidencias del turno anterior', () => {
    useAnteriorMock.mockReturnValue({
      anterior: {
        opticas_frontales: {
          estado: 'OBSERVACION' as const,
          campos_extra: { foco_averiado: ['Largas Der'] },
          es_incidencia_heredada: false,
        },
      },
      isLoading: false,
    })
    renderWithShell(<Checklist360Screen />)

    // El botón OBS del ítem heredado debe estar aria-pressed=true
    const btnOBS = screen.getAllByRole('button', { name: /observación — opticas_frontales/i })[0]
    expect(btnOBS).toHaveAttribute('aria-pressed', 'true')
  })

  it('muestra badge "Heredado" en ítem con incidencia anterior', () => {
    useAnteriorMock.mockReturnValue({
      anterior: {
        opticas_frontales: {
          estado: 'OBSERVACION' as const,
          campos_extra: {},
          es_incidencia_heredada: false,
        },
      },
      isLoading: false,
    })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByLabelText(/incidencia heredada del turno anterior/i)).toBeInTheDocument()
  })

  it('muestra UI especial para danos_previos_chapa heredado', () => {
    useAnteriorMock.mockReturnValue({
      anterior: {
        danos_previos_chapa: {
          estado: 'OBSERVACION' as const,
          campos_extra: { nuevo_dano_detectado: 'Arañazo lateral' },
          es_incidencia_heredada: false,
        },
      },
      isLoading: false,
    })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/daños reportados en el turno anterior/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/todo sigue igual/i)).toBeInTheDocument()
  })

  it('no pre-rellena ítems OK del turno anterior', () => {
    useAnteriorMock.mockReturnValue({
      anterior: {
        opticas_frontales: {
          estado: 'OK' as const,
          campos_extra: {},
          es_incidencia_heredada: false,
        },
      },
      isLoading: false,
    })
    renderWithShell(<Checklist360Screen />)

    // OK no debe estar pre-seleccionado (el ítem empieza sin estado)
    const btnOK = screen.getAllByRole('button', { name: /correcto — opticas_frontales/i })[0]
    expect(btnOK).toHaveAttribute('aria-pressed', 'false')
  })
})

// ── Envío ─────────────────────────────────────────────────────

describe('Checklist360Screen — envío', () => {
  /**
   * Helper: evalúa los N primeros ítems visibles con OK para
   * poder llegar al estado "todos completos".
   */
  async function evaluarTodos(user: ReturnType<typeof userEvent.setup>) {
    // Hay 28 ítems para vehículo no VIR; conseguir todos los botones OK
    const botonesOK = screen.getAllByRole('button', { name: /^correcto —/i })
    for (const btn of botonesOK) {
      await user.click(btn)
    }
  }

  it('botón completar se habilita cuando todos los ítems están evaluados', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)
    await evaluarTodos(user)

    const btnCompletar = screen.getByRole('button', { name: /completar revisión 360°/i })
    expect(btnCompletar).not.toBeDisabled()
  })

  it('clic en completar abre el modal de confirmación', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)
    await evaluarTodos(user)

    await user.click(screen.getByRole('button', { name: /completar revisión 360°/i }))
    expect(screen.getByText(/confirmar revisión 360°/i)).toBeInTheDocument()
  })

  it('cancelar en modal cierra el modal sin llamar a cerrar', async () => {
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)
    await evaluarTodos(user)

    await user.click(screen.getByRole('button', { name: /completar revisión 360°/i }))
    await user.click(screen.getByRole('button', { name: /cancelar confirmación/i }))

    expect(cerrarMock).not.toHaveBeenCalled()
    expect(screen.queryByText(/confirmar revisión 360°/i)).not.toBeInTheDocument()
  })

  it('confirmar llama a cerrar con los respuestas correctas', async () => {
    cerrarMock.mockResolvedValue({ online: true, id_checklist: idChecklistMock })
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)
    await evaluarTodos(user)

    await user.click(screen.getByRole('button', { name: /completar revisión 360°/i }))
    await user.click(screen.getByRole('button', { name: /confirmar revisión/i }))

    await waitFor(() =>
      expect(cerrarMock).toHaveBeenCalledWith(
        expect.objectContaining({ id_checklist: idChecklistMock }),
      ),
    )
  })

  it('muestra feedback online tras éxito', async () => {
    cerrarMock.mockResolvedValue({ online: true, id_checklist: idChecklistMock })
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)
    await evaluarTodos(user)

    await user.click(screen.getByRole('button', { name: /completar revisión 360°/i }))
    await user.click(screen.getByRole('button', { name: /confirmar revisión/i }))

    await waitFor(() =>
      expect(screen.getByRole('status', { name: /checklist completado/i })).toBeInTheDocument(),
    )
  })

  it('muestra feedback offline si la mutación se encoló', async () => {
    cerrarMock.mockResolvedValue({ online: false, id_checklist: idChecklistMock })
    const user = userEvent.setup()
    renderWithShell(<Checklist360Screen />)
    await evaluarTodos(user)

    await user.click(screen.getByRole('button', { name: /completar revisión 360°/i }))
    await user.click(screen.getByRole('button', { name: /confirmar revisión/i }))

    await waitFor(() =>
      expect(screen.getByRole('status', { name: /checklist encolado offline/i })).toBeInTheDocument(),
    )
  })

  it('muestra error de envío si cerrar falla', () => {
    useCerrarMock.mockReturnValue({
      cerrar: cerrarMock,
      isSubmitting: false,
      error: 'ERR_CHECKLIST_002: Checklist ya cerrado',
    })
    renderWithShell(<Checklist360Screen />)
    expect(screen.getByText(/ERR_CHECKLIST_002/i)).toBeInTheDocument()
  })
})
