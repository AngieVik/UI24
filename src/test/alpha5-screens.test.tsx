/**
 * Tests Alpha.5 — ServiciosScreen, IncidenciasScreen, RbacScreen, RepositorioScreen
 *
 * Estrategia:
 *  - Supabase mockeado con cadenas teables (resuelven { data: [], error: null })
 *  - useAuthStore mockeado con selector; rol configurable por test
 *  - renderWithShell provee QueryClientProvider + BlackColumnProvider
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithShell } from '@/test/test-utils'

/* ── Mock de Supabase ────────────────────────────────────────────────────── */

type SupabaseResult = { data: unknown; error: unknown }

let mockFromResult: SupabaseResult = { data: [], error: null }
let mockRpcResult: SupabaseResult = { data: null, error: null }

/** Crea una cadena Supabase con los métodos más comunes. */
function makeChain(result: SupabaseResult) {
  const chain: Record<string, unknown> = {
    then(
      resolve: (v: SupabaseResult) => unknown,
      reject?: (e: unknown) => unknown
    ): Promise<unknown> {
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  for (const m of ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'limit', 'order', 'not', 'is']) {
    chain[m] = vi.fn(() => chain)
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => makeChain(mockFromResult)),
    rpc: vi.fn(() => Promise.resolve(mockRpcResult)),
  },
}))

/* ── Mock de useAuthStore ────────────────────────────────────────────────── */

let mockRol: string | null = 'gerencia'

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn().mockImplementation(
    (selector: (s: { rol: string | null; session: null; ejecutorId: null }) => unknown) =>
      selector({ rol: mockRol, session: null, ejecutorId: null })
  ),
}))

/* ── Imports de componentes (después de los mocks) ───────────────────────── */

import { ServiciosScreen } from '@/components/rrhh/ServiciosScreen'
import { IncidenciasScreen } from '@/components/flota/IncidenciasScreen'
import { RbacScreen } from '@/components/coordinacion/RbacScreen'
import { RepositorioScreen } from '@/components/rrhh/RepositorioScreen'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function setRol(rol: string | null) {
  mockRol = rol
}

function setFromData(data: unknown) {
  mockFromResult = { data, error: null }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ServiciosScreen
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('ServiciosScreen', () => {
  beforeEach(() => {
    setRol('coordinacion')
    setFromData([])
    mockRpcResult = { data: null, error: null }
  })

  it('renderiza el título y la navegación de semana', () => {
    renderWithShell(<ServiciosScreen />)
    expect(screen.getByText('Planificación de servicios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /semana anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /semana siguiente/i })).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay servicios', async () => {
    renderWithShell(<ServiciosScreen />)
    await waitFor(() => {
      expect(
        screen.getByText(/no hay servicios planificados para esta semana/i)
      ).toBeInTheDocument()
    })
  })

  it('muestra botón "Nuevo servicio" para roles con permiso (coordinacion)', async () => {
    setRol('coordinacion')
    renderWithShell(<ServiciosScreen />)
    expect(screen.getByRole('button', { name: /nuevo servicio/i })).toBeInTheDocument()
  })

  it('oculta botón "Nuevo servicio" para roles sin permiso (tes)', async () => {
    setRol('tes')
    renderWithShell(<ServiciosScreen />)
    expect(screen.queryByRole('button', { name: /nuevo servicio/i })).not.toBeInTheDocument()
  })

  it('oculta botón "Nuevo servicio" para flota', async () => {
    setRol('flota')
    renderWithShell(<ServiciosScreen />)
    expect(screen.queryByRole('button', { name: /nuevo servicio/i })).not.toBeInTheDocument()
  })

  it('renderiza tarjetas de servicio cuando hay datos', async () => {
    setFromData([
      {
        id: 'srv-001',
        fecha: new Date().toISOString().slice(0, 10),
        turno: 'M',
        id_nombre: 'angie',
        tipo_servicio: 'SVB emergencia',
        matricula: null,
        estado: 'Planificado',
        titulo: 'Traslado urgente UCI',
        nombre: null,
        telefono: null,
        direccion: null,
        localidad: null,
        coordenadas: null,
        origen: null,
        destino: null,
        franjas_horarias: [],
        vehiculos_asignados: [],
        personal_asignado: [],
        notas: null,
      },
    ])
    renderWithShell(<ServiciosScreen />)
    await waitFor(() => {
      expect(screen.getByText('Traslado urgente UCI')).toBeInTheDocument()
    })
  })

  it('muestra enlace Maps cuando el servicio tiene coordenadas', async () => {
    setFromData([
      {
        id: 'srv-002',
        fecha: new Date().toISOString().slice(0, 10),
        turno: 'T',
        id_nombre: 'angie',
        tipo_servicio: 'Traslado programado',
        matricula: null,
        estado: 'Planificado',
        titulo: null,
        nombre: null,
        telefono: null,
        direccion: null,
        localidad: null,
        coordenadas: '37.38,-5.99',
        origen: null,
        destino: null,
        franjas_horarias: [],
        vehiculos_asignados: [],
        personal_asignado: [],
        notas: null,
      },
    ])
    renderWithShell(<ServiciosScreen />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /ver en maps/i })).toBeInTheDocument()
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
 * IncidenciasScreen
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('IncidenciasScreen', () => {
  beforeEach(() => {
    setRol('flota')
    setFromData([])
    mockRpcResult = { data: null, error: null }
  })

  it('renderiza el título sin pestañas internas (navegación via BlackColumn)', () => {
    renderWithShell(<IncidenciasScreen vista="ancladas" />)
    expect(screen.getByText('Incidencias ancladas')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('muestra estado vacío en tab Últimas', async () => {
    renderWithShell(<IncidenciasScreen vista="ultimas" />)
    await waitFor(() => {
      expect(screen.getByText(/no hay incidencias recientes/i)).toBeInTheDocument()
    })
  })

  it('muestra estado vacío en tab Ancladas', async () => {
    renderWithShell(<IncidenciasScreen vista="ancladas" />)
    await waitFor(() => {
      expect(screen.getByText(/no hay incidencias ancladas/i)).toBeInTheDocument()
    })
  })

  it('muestra botón "Nueva incidencia" para flota', () => {
    setRol('flota')
    renderWithShell(<IncidenciasScreen />)
    expect(screen.getByRole('button', { name: /nueva incidencia/i })).toBeInTheDocument()
  })

  it('muestra botón "Nueva incidencia" para responsable_flota', () => {
    setRol('responsable_flota')
    renderWithShell(<IncidenciasScreen />)
    expect(screen.getByRole('button', { name: /nueva incidencia/i })).toBeInTheDocument()
  })

  it('muestra botón "Nueva incidencia" para gerencia', () => {
    setRol('gerencia')
    renderWithShell(<IncidenciasScreen />)
    expect(screen.getByRole('button', { name: /nueva incidencia/i })).toBeInTheDocument()
  })

  it('oculta botón "Nueva incidencia" para tes', () => {
    setRol('tes')
    renderWithShell(<IncidenciasScreen />)
    expect(screen.queryByRole('button', { name: /nueva incidencia/i })).not.toBeInTheDocument()
  })

  it('oculta botón "Nueva incidencia" para coordinacion', () => {
    setRol('coordinacion')
    renderWithShell(<IncidenciasScreen />)
    expect(screen.queryByRole('button', { name: /nueva incidencia/i })).not.toBeInTheDocument()
  })

  it('renderiza tarjetas con prioridad y matrícula cuando hay datos', async () => {
    setFromData([
      {
        id_incidencia: 'inc-001',
        matricula: '0401UI',
        descripcion: 'Frenos desgastados',
        origen_tipo: 'manual',
        origen_id: null,
        prioridad: 'alta',
        notas_taller: 'Pendiente repuesto',
        anclada: true,
        archivada: false,
        id_nombre_registrador: 'flota1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    setRol('flota')
    renderWithShell(<IncidenciasScreen vista="ancladas" />)
    await waitFor(() => {
      expect(screen.getByText('Frenos desgastados')).toBeInTheDocument()
      expect(screen.getByText('0401UI')).toBeInTheDocument()
      expect(screen.getByText('alta')).toBeInTheDocument()
    })
  })

  it('muestra botones anclar y editar para roles con permiso', async () => {
    setFromData([
      {
        id_incidencia: 'inc-002',
        matricula: '0101UI',
        descripcion: 'Luz piloto averiada',
        origen_tipo: 'checklist',
        origen_id: null,
        prioridad: 'normal',
        notas_taller: null,
        anclada: false,
        archivada: false,
        id_nombre_registrador: 'flota1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    setRol('responsable_flota')
    renderWithShell(<IncidenciasScreen vista="ultimas" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /anclar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /editar incidencia/i })).toBeInTheDocument()
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
 * RbacScreen
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('RbacScreen', () => {
  beforeEach(() => {
    setRol('gerencia')
    setFromData([])
    mockRpcResult = { data: [], error: null }
  })

  it('renderiza el título y las dos pestañas', () => {
    renderWithShell(<RbacScreen />)
    expect(screen.getByText('RBAC — Roles y permisos')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /empleados/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /permisos por rol/i })).toBeInTheDocument()
  })

  it('muestra tabla de empleados en Tab 1', async () => {
    setFromData([
      { id_nombre: 'angie', rol: 'gerencia', nombre_real: 'Angie Vik', activo: true },
    ])
    renderWithShell(<RbacScreen />)
    await waitFor(() => {
      expect(screen.getByText('angie')).toBeInTheDocument()
      expect(screen.getByText('gerencia')).toBeInTheDocument()
    })
  })

  it('Tab 2 muestra matriz de permisos para gerencia', async () => {
    setRol('gerencia')
    mockRpcResult = {
      data: [
        { rol: 'flota', accion: 'ver_incidencias', permitido: true },
        { rol: 'tes', accion: 'ver_incidencias', permitido: false },
      ],
      error: null,
    }
    renderWithShell(<RbacScreen />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /permisos por rol/i }))
    await waitFor(() => {
      expect(screen.getByText('Ver incidencias')).toBeInTheDocument()
    })
  })

  it('Tab 2 muestra acceso denegado para roles sin permiso', async () => {
    setRol('logistica')
    renderWithShell(<RbacScreen />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /permisos por rol/i }))
    expect(
      screen.getByText(/solo gerencia y coordinación pueden ver la matriz/i)
    ).toBeInTheDocument()
  })

  it('Tab 2 es accesible para coordinacion', async () => {
    setRol('coordinacion')
    mockRpcResult = { data: [], error: null }
    renderWithShell(<RbacScreen />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /permisos por rol/i }))
    // No muestra el mensaje de "sin acceso" — la matriz carga (aunque vacía)
    expect(
      screen.queryByText(/solo gerencia y coordinación pueden ver la matriz/i)
    ).not.toBeInTheDocument()
  })

  it('muestra botón Editar rol en la tabla de empleados', async () => {
    setFromData([
      { id_nombre: 'pepe', rol: 'tes', nombre_real: 'Pepe Demo', activo: true },
    ])
    renderWithShell(<RbacScreen />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /editar rol de pepe/i })).toBeInTheDocument()
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
 * RepositorioScreen
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('RepositorioScreen', () => {
  beforeEach(() => {
    setRol('tes')
    setFromData([])
    mockRpcResult = { data: null, error: null }
  })

  it('renderiza el título y la búsqueda', () => {
    renderWithShell(<RepositorioScreen />)
    expect(screen.getByText('Repositorio de documentos')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: /buscar en el repositorio/i })).toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay documentos', async () => {
    renderWithShell(<RepositorioScreen />)
    await waitFor(() => {
      expect(screen.getByText(/no hay documentos en el repositorio/i)).toBeInTheDocument()
    })
  })

  it('muestra tarjetas de documentos agrupadas por categoría', async () => {
    setFromData([
      {
        id: 'doc-001',
        nombre: 'Doc-8 — Parte de trabajo',
        categoria: 'Operativa',
        descripcion: 'Parte diario de trabajo',
        url: 'doc8',
        activo: true,
      },
      {
        id: 'doc-002',
        nombre: 'Doc-2 — Informe asistencial',
        categoria: 'Clínico',
        descripcion: 'Informe clínico del servicio',
        url: 'doc2',
        activo: true,
      },
    ])
    renderWithShell(<RepositorioScreen />)
    await waitFor(() => {
      expect(screen.getByText('Doc-8 — Parte de trabajo')).toBeInTheDocument()
      expect(screen.getByText('Doc-2 — Informe asistencial')).toBeInTheDocument()
      // Categorías aparecen en botones de filtro Y en cabeceras de sección
      expect(screen.getAllByText('Operativa').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Clínico').length).toBeGreaterThan(0)
    })
  })

  it('filtra por búsqueda de texto', async () => {
    setFromData([
      {
        id: 'doc-001',
        nombre: 'Doc-8 — Parte de trabajo',
        categoria: 'Operativa',
        descripcion: null,
        url: 'doc8',
        activo: true,
      },
      {
        id: 'doc-002',
        nombre: 'Repostaje combustible',
        categoria: 'Flota',
        descripcion: null,
        url: 'fuel',
        activo: true,
      },
    ])
    renderWithShell(<RepositorioScreen />)
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByText('Doc-8 — Parte de trabajo')).toBeInTheDocument()
    })
    await user.type(screen.getByRole('searchbox', { name: /buscar/i }), 'repostaje')
    expect(screen.queryByText('Doc-8 — Parte de trabajo')).not.toBeInTheDocument()
    expect(screen.getByText('Repostaje combustible')).toBeInTheDocument()
  })

  it('muestra el badge con el total de documentos', async () => {
    setFromData([
      { id: '1', nombre: 'A', categoria: 'Flota', descripcion: null, url: 'fuel', activo: true },
      { id: '2', nombre: 'B', categoria: 'Flota', descripcion: null, url: 'adblue', activo: true },
    ])
    renderWithShell(<RepositorioScreen />)
    await waitFor(() => {
      expect(screen.getByText('2 documentos')).toBeInTheDocument()
    })
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
 * resolveRpcError — nuevos códigos A5
 * ═══════════════════════════════════════════════════════════════════════════ */

import { resolveRpcError } from '@/lib/resolveRpcError'

describe('resolveRpcError — códigos Alpha.5', () => {
  const NUEVOS_CODIGOS_A5 = [
    'ERR_INCIDENCIA_001',
    'ERR_INCIDENCIA_002',
    'ERR_INCIDENCIA_003',
    'ERR_INCIDENCIA_004',
    'ERR_PERMISO_001',
    'ERR_PERMISO_002',
    'ERR_PERMISO_003',
    'ERR_PERMISO_004',
  ]

  for (const codigo of NUEVOS_CODIGOS_A5) {
    it(`${codigo} devuelve mensaje español definido`, () => {
      const result = resolveRpcError(new Error(`${codigo}: descripción del error`))
      expect(result).not.toBe('Error inesperado. Contacta con soporte.')
      expect(result.length).toBeGreaterThan(5)
    })
  }

  it('ERR_INCIDENCIA_001 indica falta de permiso', () => {
    expect(resolveRpcError(new Error('ERR_INCIDENCIA_001: x'))).toContain('permiso')
  })

  it('ERR_INCIDENCIA_002 indica incidencia no encontrada', () => {
    expect(resolveRpcError(new Error('ERR_INCIDENCIA_002: x'))).toContain('no encontrada')
  })

  it('ERR_PERMISO_002 indica que solo gerencia puede modificar', () => {
    expect(resolveRpcError(new Error('ERR_PERMISO_002: x'))).toContain('gerencia')
  })

  // Códigos Alpha.4 siguen funcionando
  it('ERR_SUBINV_001 sigue resuelto', () => {
    const result = resolveRpcError(new Error('ERR_SUBINV_001: x'))
    expect(result).not.toBe('Error inesperado. Contacta con soporte.')
  })

  it('ERR_ENVIO_002 sigue resuelto', () => {
    const result = resolveRpcError(new Error('ERR_ENVIO_002: x'))
    expect(result).not.toBe('Error inesperado. Contacta con soporte.')
  })
})
