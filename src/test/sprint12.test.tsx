import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc:  vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth:    { signInWithPassword: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() },
    rpc:     mockRpc,
    from:    mockFrom,
    functions: { invoke: vi.fn() },
    storage: { from: vi.fn() },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/lib/fingerprint', () => ({
  computeFingerprint: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/offlineSession', () => ({
  saveOfflineSession:    vi.fn().mockResolvedValue(undefined),
  verifyOfflineLogin:    vi.fn().mockResolvedValue(true),
  loadOfflineSession:    vi.fn().mockResolvedValue(null),
  clearOfflineSession:   vi.fn().mockResolvedValue(undefined),
  isOfflineSessionValid: vi.fn().mockReturnValue(true),
}))

// ── Imports ───────────────────────────────────────────────────────────────

import { AvisosScreen } from '@/components/rrhh/AvisosScreen'
import { BandejaScreen } from '@/components/rrhh/BandejaScreen'
import { TablonScreen } from '@/components/rrhh/TablonScreen'
import { CuadranteScreen } from '@/components/rrhh/CuadranteScreen'
import { VacacionesScreen } from '@/components/rrhh/VacacionesScreen'
import { SystemConfigScreen } from '@/components/rrhh/SystemConfigScreen'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useBandejasStore } from '@/stores/useBandejasStore'
import { useStepUp } from '@/hooks/useStepUp'

// ── Helpers ───────────────────────────────────────────────────────────────

function mockFromAvisos(avisos: unknown[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: avisos, error: null }),
      }),
    }),
  }))
}

function mockFromBandeja(mensajes: unknown[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mensajes, error: null }),
        }),
      }),
    }),
  }))
}

function mockFromTablon(anuncios: unknown[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: anuncios, error: null }),
      }),
    }),
  }))
}

function mockFromCuadrante(turnos: unknown[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: turnos, error: null }),
          }),
        }),
      }),
    }),
  }))
}

function mockFromVacaciones(solicitudes: unknown[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: solicitudes, error: null }),
    }),
  }))
}

function mockFromSystemConfig(config: unknown[], versiones: unknown[]) {
  mockFrom.mockImplementation((tabla: string) => {
    if (tabla === 'system_config') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: config, error: null }),
        }),
      }
    }
    if (tabla === 'versiones_cliente') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: versiones, error: null }),
          }),
        }),
      }
    }
    return { select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
  })
}

// ── AvisosScreen ──────────────────────────────────────────────────────────

describe('AvisosScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ ejecutorId: 'user01', session: { user: { id: 'uid-1' } } as never })
    useGlobalStore.setState({ isOnline: true })
  })

  it('muestra "No hay avisos" cuando la lista está vacía', async () => {
    mockFromAvisos([])
    render(<AvisosScreen />)
    expect(await screen.findByText(/No hay avisos/i)).toBeInTheDocument()
  })

  it('renderiza avisos con el nivel y texto correctos', async () => {
    const avisos = [
      {
        id_aviso: 'av-001',
        tipo_aviso: 'sistema',
        nivel: 'critico',
        id_nombre_emisor: 'admin',
        texto: 'Alerta crítica de prueba',
        timestamp_publicacion: new Date().toISOString(),
        leido_por: [],
      },
    ]
    mockFromAvisos(avisos)
    render(<AvisosScreen />)
    expect(await screen.findByText('Alerta crítica de prueba')).toBeInTheDocument()
    expect(screen.getByText('Crítico')).toBeInTheDocument()
  })

  it('muestra el botón "Marcar leído" para avisos no leídos', async () => {
    const avisos = [
      {
        id_aviso: 'av-002',
        tipo_aviso: 'sistema',
        nivel: 'aviso',
        id_nombre_emisor: 'gestor',
        texto: 'Aviso sin leer',
        timestamp_publicacion: new Date().toISOString(),
        leido_por: [],
      },
    ]
    mockFromAvisos(avisos)
    render(<AvisosScreen />)
    await screen.findByText('Aviso sin leer')
    expect(screen.getByRole('button', { name: /Marcar aviso.*leído/i })).toBeInTheDocument()
  })

  it('llama a rpc_marcar_aviso_leido al pulsar el botón', async () => {
    const avisos = [
      {
        id_aviso: 'av-003',
        tipo_aviso: 'sistema',
        nivel: 'informativo',
        id_nombre_emisor: 'admin',
        texto: 'Aviso informativo',
        timestamp_publicacion: new Date().toISOString(),
        leido_por: [],
      },
    ]
    mockFromAvisos(avisos)
    mockRpc.mockResolvedValue({ data: null, error: null })
    render(<AvisosScreen />)
    await screen.findByText('Aviso informativo')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Marcar aviso.*leído/i }))
    })
    expect(mockRpc).toHaveBeenCalledWith('rpc_marcar_aviso_leido', expect.objectContaining({
      p_id_aviso: 'av-003',
    }))
  })
})

// ── BandejaScreen ─────────────────────────────────────────────────────────

describe('BandejaScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ ejecutorId: 'user01', session: { user: { id: 'uid-1' } } as never })
    useGlobalStore.setState({ isOnline: true })
    useBandejasStore.setState({ mensajes: [], lastSyncedAt: null })
  })

  it('muestra "La bandeja está vacía" cuando no hay mensajes', async () => {
    mockFromBandeja([])
    render(<BandejaScreen />)
    expect(await screen.findByText(/La bandeja está vacía/i)).toBeInTheDocument()
  })

  it('renderiza mensajes de la bandeja', async () => {
    const mensajes = [
      {
        id_mensaje: 'msg-001',
        id_nombre_destino: 'user01',
        contenido: 'Mensaje de prueba importante',
        estado: 'no_leido',
        created_at: new Date().toISOString(),
        timestamp_lectura: null,
      },
    ]
    mockFromBandeja(mensajes)
    render(<BandejaScreen />)
    expect(await screen.findByText('Mensaje de prueba importante')).toBeInTheDocument()
  })

  it('muestra el contador de no leídos en la cabecera', async () => {
    const mensajes = [
      {
        id_mensaje: 'msg-002',
        id_nombre_destino: 'user01',
        contenido: 'Primero no leído',
        estado: 'no_leido',
        created_at: new Date().toISOString(),
        timestamp_lectura: null,
      },
      {
        id_mensaje: 'msg-003',
        id_nombre_destino: 'user01',
        contenido: 'Segundo no leído',
        estado: 'no_leido',
        created_at: new Date().toISOString(),
        timestamp_lectura: null,
      },
    ]
    useBandejasStore.setState({ mensajes: mensajes as never, lastSyncedAt: null })
    mockFromBandeja(mensajes)
    render(<BandejaScreen />)
    expect(await screen.findByText(/2 no leídos/i)).toBeInTheDocument()
  })

  it('llama a rpc_marcar_mensaje_leido al pulsar "Leído"', async () => {
    const mensajes = [
      {
        id_mensaje: 'msg-004',
        id_nombre_destino: 'user01',
        contenido: 'Mensaje a marcar',
        estado: 'no_leido',
        created_at: new Date().toISOString(),
        timestamp_lectura: null,
      },
    ]
    mockFromBandeja(mensajes)
    mockRpc.mockResolvedValue({ data: null, error: null })
    render(<BandejaScreen />)
    await screen.findByText('Mensaje a marcar')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Marcar como leído/i }))
    })
    expect(mockRpc).toHaveBeenCalledWith('rpc_marcar_mensaje_leido', expect.objectContaining({
      p_id_mensaje: 'msg-004',
    }))
  })
})

// ── TablonScreen ──────────────────────────────────────────────────────────

describe('TablonScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ ejecutorId: 'user01', session: { user: { id: 'uid-1' } } as never })
  })

  it('renderiza las pestañas de sección', async () => {
    mockFromTablon([])
    render(<TablonScreen />)
    expect(screen.getByRole('tab', { name: /Normativas/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Protocolos/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Avisos corporativos/i })).toBeInTheDocument()
  })

  it('muestra "No hay anuncios" cuando la sección está vacía', async () => {
    mockFromTablon([])
    render(<TablonScreen />)
    expect(await screen.findByText(/No hay anuncios en esta sección/i)).toBeInTheDocument()
  })

  it('renderiza un anuncio en la sección activa', async () => {
    const anuncios = [
      {
        id_anuncio: 'an-001',
        seccion: 'normativas',
        titulo: 'Nueva normativa de turno',
        contenido: 'El turno nocturno cambia de horario.',
        estado: 'activo',
        id_nombre_autor: 'admin',
        timestamp_publicacion: new Date().toISOString(),
      },
    ]
    mockFromTablon(anuncios)
    render(<TablonScreen />)
    expect(await screen.findByText('Nueva normativa de turno')).toBeInTheDocument()
  })

  it('expande el contenido del anuncio al hacer click', async () => {
    const anuncios = [
      {
        id_anuncio: 'an-002',
        seccion: 'normativas',
        titulo: 'Protocolo de emergencia',
        contenido: 'Texto del protocolo de emergencia extendido.',
        estado: 'activo',
        id_nombre_autor: 'rrhh',
        timestamp_publicacion: new Date().toISOString(),
      },
    ]
    mockFromTablon(anuncios)
    render(<TablonScreen />)
    const boton = await screen.findByRole('button', { name: /Protocolo de emergencia/i })
    expect(screen.queryByText(/Texto del protocolo/i)).not.toBeInTheDocument()
    await act(async () => { fireEvent.click(boton) })
    expect(screen.getByText(/Texto del protocolo/i)).toBeInTheDocument()
  })
})

// ── CuadranteScreen ───────────────────────────────────────────────────────

describe('CuadranteScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ ejecutorId: 'empleado01', session: { user: { id: 'uid-1' } } as never })
  })

  it('renderiza las cabeceras de los días de la semana', async () => {
    mockFromCuadrante([])
    render(<CuadranteScreen />)
    expect(screen.getByRole('columnheader', { name: /Lun/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Dom/i })).toBeInTheDocument()
  })

  it('renderiza los botones de navegación semanal', async () => {
    mockFromCuadrante([])
    render(<CuadranteScreen />)
    expect(screen.getByRole('button', { name: /Semana anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Semana siguiente/i })).toBeInTheDocument()
  })

  it('renderiza el badge del turno en la celda correspondiente', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const turnos = [
      { id: 1, id_nombre: 'empleado01', fecha: today, tipo_turno: 'T', es_excepcion_absoluta: false },
    ]
    mockFromCuadrante(turnos)
    render(<CuadranteScreen />)
    expect(await screen.findByText('T')).toBeInTheDocument()
  })

  it('muestra "—" en días sin turno asignado', async () => {
    mockFromCuadrante([])
    render(<CuadranteScreen />)
    const celdas = await screen.findAllByText('—')
    expect(celdas.length).toBeGreaterThanOrEqual(7)
  })
})

// ── VacacionesScreen ──────────────────────────────────────────────────────

describe('VacacionesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ ejecutorId: 'empleado01', session: { user: { id: 'uid-1' } } as never })
    useGlobalStore.setState({ isOnline: true })
  })

  it('muestra "No tienes solicitudes" cuando no hay vacaciones propias', async () => {
    mockFromVacaciones([])
    render(<VacacionesScreen />)
    expect(await screen.findByText(/No tienes solicitudes de vacaciones/i)).toBeInTheDocument()
  })

  it('renderiza solicitudes propias con su estado', async () => {
    const solicitudes = [
      {
        id: 'sol-001',
        id_nombre: 'empleado01',
        periodo_anual: '2026',
        fecha_inicio: '2026-07-01',
        fecha_fin: '2026-07-14',
        preferencia_seleccion: 'opcion_1',
        observaciones: null,
        estado: 'Aprobada',
        resolucion_rrhh: null,
        id_nombre_resolutor: null,
        created_at: new Date().toISOString(),
        timestamp_resolucion: null,
      },
    ]
    mockFromVacaciones(solicitudes)
    render(<VacacionesScreen />)
    expect(await screen.findByText(/2026-07-01/)).toBeInTheDocument()
    expect(screen.getByText('Aprobada')).toBeInTheDocument()
  })

  it('muestra el formulario al pulsar "+ Solicitar"', async () => {
    mockFromVacaciones([])
    render(<VacacionesScreen />)
    await screen.findByText(/No tienes solicitudes/i)
    fireEvent.click(screen.getByRole('button', { name: /Nueva solicitud de vacaciones/i }))
    expect(screen.getByRole('form', { name: /Nueva solicitud de vacaciones/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Fecha de inicio/i)).toBeInTheDocument()
  })

  it('llama a rpc_enviar_solicitud_vacaciones al enviar el formulario', async () => {
    mockFromVacaciones([])
    mockRpc.mockResolvedValue({ data: 'sol-nuevo-uuid', error: null })
    render(<VacacionesScreen />)
    await screen.findByText(/No tienes solicitudes/i)
    fireEvent.click(screen.getByRole('button', { name: /Nueva solicitud de vacaciones/i }))
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/Fecha de fin/i), { target: { value: '2026-08-15' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/i }))
    })
    expect(mockRpc).toHaveBeenCalledWith('rpc_enviar_solicitud_vacaciones', expect.objectContaining({
      p_fecha_inicio: '2026-08-01',
      p_fecha_fin:    '2026-08-15',
    }))
  })
})

// ── SystemConfigScreen ────────────────────────────────────────────────────

describe('SystemConfigScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ ejecutorId: 'gerente01', session: { user: { id: 'uid-g', user_metadata: { rol: 'gerencia' } } } as never })
    useStepUp.setState({ requestStepUp: vi.fn().mockResolvedValue(true) } as never)
  })

  it('renderiza las dos pestañas (Parámetros y Versiones)', async () => {
    mockFromSystemConfig([], [])
    render(<SystemConfigScreen />)
    expect(screen.getByRole('tab', { name: /Parámetros/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Versiones/i })).toBeInTheDocument()
  })

  it('muestra los parámetros de configuración', async () => {
    const config = [
      { clave: 'max_vehiculos_drp', valor: 5, descripcion: 'Máximo de vehículos por DRP', id_nombre_modificador: null, updated_at: new Date().toISOString() },
    ]
    mockFromSystemConfig(config, [])
    render(<SystemConfigScreen />)
    expect(await screen.findByText('max_vehiculos_drp')).toBeInTheDocument()
  })

  it('muestra el botón "Editar" solo para gerencia', async () => {
    const config = [
      { clave: 'feature_drp', valor: true, descripcion: null, id_nombre_modificador: null, updated_at: new Date().toISOString() },
    ]
    mockFromSystemConfig(config, [])
    render(<SystemConfigScreen />)
    await screen.findByText('feature_drp')
    expect(screen.getByRole('button', { name: /Editar feature_drp/i })).toBeInTheDocument()
  })

  it('abre el modal de edición al pulsar Editar', async () => {
    const config = [
      { clave: 'feature_drp', valor: true, descripcion: null, id_nombre_modificador: null, updated_at: new Date().toISOString() },
    ]
    mockFromSystemConfig(config, [])
    render(<SystemConfigScreen />)
    await screen.findByText('feature_drp')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Editar feature_drp/i }))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Editar/i })).toBeInTheDocument()
    expect(screen.getByText('feature_drp', { selector: 'span' })).toBeInTheDocument()
  })
})
