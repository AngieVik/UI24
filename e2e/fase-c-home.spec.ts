import { test, expect, type Route } from '@playwright/test'

/**
 * E2E mínimo de Fase C — valida que los 4 paneles del home renderizan
 * con datos reales tras autenticarse.
 *
 * Estrategia: mocks de red con `page.route` contra el REST de Supabase.
 * El kill-switch de realtime se devuelve TRUE para evitar abrir
 * WebSockets y mantener el test determinista. Storage IDB se inyecta
 * vía `addInitScript` con id_terminal + matrícula sintéticos.
 *
 * Cubre la última DoD pendiente de Fase C en el roadmap:
 *   "Test E2E 'home con datos' pasa en Playwright"
 */

const SUPABASE_HOST = process.env.E2E_SUPABASE_HOST || 'ygljtbpfpfdbuxvibbom.supabase.co'
const TERMINAL_ID = 'e2e-terminal-fixture'
const MATRICULA = '9999-E2E'
const ID_DRP = 'e2e-drp-aaaa-bbbb-cccc-dddddddddddd'

interface MockRow {
  match: (url: URL) => boolean
  body: unknown
}

const FIXTURES: MockRow[] = [
  // realtime_kill_switch → true (apaga el invalidator, no abre WS)
  {
    match: (u) =>
      u.pathname.endsWith('/rest/v1/system_config') &&
      u.searchParams.get('clave') === 'eq.realtime_kill_switch',
    body: [{ valor: true }],
  },

  // presencias_activas_terminal — 2 personas en el terminal
  {
    match: (u) =>
      u.pathname.endsWith('/rest/v1/presencias_activas_terminal') &&
      u.searchParams.get('id_terminal') === `eq.${TERMINAL_ID}`,
    body: [
      {
        id_nombre: 'admin',
        checkin_at: '2026-05-25T07:30:00.000Z',
        fichas_empleados: {
          nombre_real: 'Administrador Demo',
          rol: 'gerencia',
          telefono: '600 111 222',
        },
      },
      {
        id_nombre: 'tes_demo',
        checkin_at: '2026-05-25T07:35:00.000Z',
        fichas_empleados: {
          nombre_real: 'TES Demo',
          rol: 'tes',
          telefono: '600 333 444',
        },
      },
    ],
  },

  // vehiculos por matrícula
  {
    match: (u) =>
      u.pathname.endsWith('/rest/v1/vehiculos') &&
      u.searchParams.get('matricula') === `eq.${MATRICULA}`,
    body: [
      {
        matricula: MATRICULA,
        tipo: 'A1',
        condicion_tecnica: 'operativo',
        estado_operativo: 'activo',
      },
    ],
  },

  // activaciones_vehiculo abierta
  {
    match: (u) =>
      u.pathname.endsWith('/rest/v1/activaciones_vehiculo') &&
      u.searchParams.get('matricula') === `eq.${MATRICULA}`,
    body: [
      {
        pilot: 'admin',
        carry: 'tes_demo',
        timestamp_apertura: '2026-05-25T07:00:00Z',
        tipo_servicio: 'urgente',
      },
    ],
  },

  // dotaciones_drp join drps (DRP activo vía vehículo)
  {
    match: (u) =>
      u.pathname.endsWith('/rest/v1/dotaciones_drp') &&
      u.searchParams.get('matricula') === `eq.${MATRICULA}`,
    body: [
      {
        id_drp: ID_DRP,
        drps: {
          id_drp: ID_DRP,
          estado: 'En_curso',
          id_coordinacion: 'coord_e2e',
          timestamp_preparacion: '2026-05-25T07:00:00Z',
          timestamp_inicio: '2026-05-25T07:30:00Z',
        },
      },
    ],
  },

  // drp_personal_a_pie — vacío (este DRP se mete por vehículo)
  {
    match: (u) => u.pathname.endsWith('/rest/v1/drp_personal_a_pie'),
    body: [],
  },

  // mensajes_bandeja sin leer
  {
    match: (u) => u.pathname.endsWith('/rest/v1/mensajes_bandeja'),
    body: [{ id_nombre_destino: 'admin' }, { id_nombre_destino: 'admin' }],
  },
]

async function mockSupabase(route: Route) {
  const url = new URL(route.request().url())
  const fixture = FIXTURES.find((f) => f.match(url))
  if (fixture) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.body),
    })
    return
  }
  // Fallback: respondemos [] vacío para que ninguna query inesperada rompa
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  })
}

test.describe('Fase C — home con datos', () => {
  test('los 4 paneles renderizan tras bypass dev', async ({ page }) => {
    // 1) Interceptamos REST de Supabase ANTES de cargar la app.
    await page.route(`**/${SUPABASE_HOST}/rest/v1/**`, mockSupabase)

    // 2) Inyectamos storage previo (id_terminal + matrícula activa) para
    //    que los hooks gated puedan disparar.
    await page.addInitScript(
      ({ terminalId, matricula }) => {
        // sessionStorage para useAuthStore (estructura igual que el bypass dev)
        sessionStorage.setItem(
          'u24-auth',
          JSON.stringify({
            state: {
              session: {
                access_token: 'e2e-bypass-token',
                user: {
                  id: '00000000-0000-0000-0000-0000000000e2',
                  app_metadata: { rol: 'gerencia', id_nombre: 'admin' },
                  user_metadata: { rol: 'gerencia', id_nombre: 'admin' },
                },
              },
              ejecutorId: 'admin',
              rol: 'gerencia',
            },
            version: 0,
          })
        )
        // IDB del terminal — el adapter idb-keyval lo lee en el primer render
        // del store con persist. Hacemos el seed via la promesa de idb.
        const req = indexedDB.open('keyval-store', 1)
        req.onupgradeneeded = () => req.result.createObjectStore('keyval')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('keyval', 'readwrite')
          const store = tx.objectStore('keyval')
          store.put(
            {
              state: { id_terminal: terminalId, tipoGalleta: 'temporal', fingerprint: terminalId },
              version: 0,
            },
            'u24-terminal'
          )
          store.put(
            {
              state: {
                id_activacion: 'e2e-act',
                id_parte: '',
                id_checklist: '',
                matricula,
                checklistCerrado: true,
              },
              version: 0,
            },
            'u24-activacion'
          )
        }
      },
      { terminalId: TERMINAL_ID, matricula: MATRICULA }
    )

    // 3) Cargamos.
    await page.goto('/')

    // 4) Verificamos los 4 paneles.
    // PanelPersonal
    await expect(page.getByText('Personal en turno')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Administrador Demo')).toBeVisible()
    await expect(page.getByText('TES Demo')).toBeVisible()
    await expect(page.getByText('2 con check-in')).toBeVisible()
    await expect(page.getByText('600 111 222')).toBeVisible()
    // Estado derivado "En DRP" (porque mockeamos drp activo)
    await expect(page.getByText('En DRP').first()).toBeVisible()

    // PanelVehiculo
    await expect(page.getByText('Vehículo del terminal')).toBeVisible()
    await expect(page.getByText(MATRICULA)).toBeVisible()
    await expect(page.getByText('Urgente')).toBeVisible()
    // Pilot y carry — aparecen en PanelPersonal (id_nombre) + PanelVehiculo (celda)
    await expect(page.getByText('admin', { exact: true })).toHaveCount(2)
    await expect(page.getByText('tes_demo', { exact: true })).toHaveCount(2)

    // VisualInfoDRP
    await expect(page.getByText(/DRP e2e-drp/i)).toBeVisible()
    await expect(page.getByText('En curso')).toBeVisible()
    await expect(page.getByText('Por vehículo')).toBeVisible()
    await expect(page.getByText('coord_e2e')).toBeVisible()

    // BandejaEntradaPersonal
    await expect(page.getByText('Bandejas personales')).toBeVisible()
    // Iniciales de los avatares (admin → AD, tes_demo → TD)
    await expect(page.getByText('AD').first()).toBeVisible()
    await expect(page.getByText('TD').first()).toBeVisible()
  })
})
