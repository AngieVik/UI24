import { type Page, type Route, expect } from '@playwright/test'

// ── Configuración de entorno ───────────────────────────────────────────────

export const SUPABASE_HOST = process.env.E2E_SUPABASE_HOST || 'ygljtbpfpfdbuxvibbom.supabase.co'

export const TERMINAL_ID = 'e2e-terminal-fixture'
export const MATRICULA = '9999-E2E'
export const ID_DRP = 'e2e-drp-aaaa-bbbb-cccc-dddddddddddd'

// ── Credenciales para tests de formulario (real o mock) ───────────────────

export const CREDS = {
  gerencia: {
    id_nombre: 'admin',
    password: process.env.E2E_GERENCIA_PASSWORD || 'Gerencia1234!',
  },
  tes: {
    id_nombre: 'tes_demo',
    password: process.env.E2E_USER_PASSWORD || 'Demo1234!',
  },
}

// ── Fixtures Supabase mock ─────────────────────────────────────────────────

interface MockRow {
  match: (url: URL) => boolean
  body: unknown
}

export function buildFixtures(
  opts: {
    rol?: string
    idNombre?: string
    conDrp?: boolean
  } = {}
): MockRow[] {
  const { rol = 'gerencia', idNombre = 'admin', conDrp = true } = opts

  return [
    // realtime kill-switch → apaga WS para tests deterministas
    {
      match: (u) =>
        u.pathname.endsWith('/rest/v1/system_config') &&
        u.searchParams.get('clave') === 'eq.realtime_kill_switch',
      body: [{ valor: true }],
    },
    // presencias_activas_terminal
    {
      match: (u) =>
        u.pathname.endsWith('/rest/v1/presencias_activas_terminal') &&
        u.searchParams.get('id_terminal') === `eq.${TERMINAL_ID}`,
      body: [
        {
          id_nombre: idNombre,
          checkin_at: '2026-05-31T07:30:00.000Z',
          fichas_empleados: {
            nombre_real: rol === 'gerencia' ? 'Gerencia Demo' : 'TES Demo',
            rol,
            telefono: '600 000 001',
          },
        },
      ],
    },
    // vehículo activo
    {
      match: (u) =>
        u.pathname.endsWith('/rest/v1/vehiculos') &&
        u.searchParams.get('matricula') === `eq.${MATRICULA}`,
      body: [
        {
          matricula: MATRICULA,
          tipo: 'A1',
          condicion_tecnica: 'operativo',
          estado_operativo: 'activado',
        },
      ],
    },
    // activación del vehículo
    {
      match: (u) =>
        u.pathname.endsWith('/rest/v1/activaciones_vehiculo') &&
        u.searchParams.get('matricula') === `eq.${MATRICULA}`,
      body: [
        {
          pilot: idNombre,
          carry: null,
          timestamp_apertura: '2026-05-31T07:00:00Z',
          tipo_servicio: 'urgente',
        },
      ],
    },
    // DRP activo (opcional)
    {
      match: (u) =>
        u.pathname.endsWith('/rest/v1/dotaciones_drp') &&
        u.searchParams.get('matricula') === `eq.${MATRICULA}`,
      body: conDrp
        ? [
            {
              id_drp: ID_DRP,
              drps: {
                id_drp: ID_DRP,
                estado: 'En_curso',
                id_coordinacion: 'coord_e2e',
                timestamp_preparacion: '2026-05-31T07:00:00Z',
                timestamp_inicio: '2026-05-31T07:30:00Z',
              },
            },
          ]
        : [],
    },
    { match: (u) => u.pathname.endsWith('/rest/v1/drp_personal_a_pie'), body: [] },
    { match: (u) => u.pathname.endsWith('/rest/v1/mensajes_bandeja'), body: [] },
  ]
}

export async function mockSupabase(route: Route, fixtures: MockRow[]) {
  const url = new URL(route.request().url())
  const fixture = fixtures.find((f) => f.match(url))
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(fixture ? fixture.body : []),
  })
}

// ── Bootstrap: inyecta stores + mocks API + carga la app ──────────────────

export interface BootstrapOpts {
  rol?: string
  idNombre?: string
  conDrp?: boolean
}

/**
 * Lleva la app al estado_1 (AppShell visible) sin tocar Supabase real.
 * Inyecta:
 *   - sessionStorage `u24-auth` con sesión sintética
 *   - IDB `u24-terminal` con id_terminal fixture
 *   - IDB `u24-activacion` con vehículo activo
 * Mockea toda la API de Supabase con datos fixture.
 */
export async function bootstrapApp(page: Page, opts: BootstrapOpts = {}) {
  const { rol = 'gerencia', idNombre = 'admin', conDrp = false } = opts
  const fixtures = buildFixtures({ rol, idNombre, conDrp })

  await page.route(`**/${SUPABASE_HOST}/rest/v1/**`, (route) => mockSupabase(route, fixtures))

  await page.addInitScript(
    ({ terminalId, matricula, rolSesion, idNombreSesion }) => {
      // Auth store (sessionStorage, igual que el patrón del bypass dev)
      sessionStorage.setItem(
        'u24-auth',
        JSON.stringify({
          state: {
            session: {
              access_token: 'e2e-bypass-token',
              refresh_token: 'e2e-refresh-token',
              user: {
                id: '00000000-0000-0000-0000-000000000e2e',
                app_metadata: { rol: rolSesion, id_nombre: idNombreSesion },
                user_metadata: { rol: rolSesion, id_nombre: idNombreSesion },
              },
            },
            ejecutorId: idNombreSesion,
            rol: rolSesion,
          },
          version: 0,
        })
      )
      // Terminal + activacion stores (IndexedDB vía idb-keyval)
      const req = indexedDB.open('keyval-store', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('keyval')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('keyval', 'readwrite')
        const kv = tx.objectStore('keyval')
        kv.put(
          {
            state: { id_terminal: terminalId, tipoGalleta: 'temporal', fingerprint: terminalId },
            version: 0,
          },
          'u24-terminal'
        )
        kv.put(
          {
            state: {
              id_activacion: 'e2e-act-001',
              id_parte: 'e2e-parte-001',
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
    { terminalId: TERMINAL_ID, matricula: MATRICULA, rolSesion: rol, idNombreSesion: idNombre }
  )

  await page.goto('/')
  // Esperar a que el AppShell esté listo (home visible = estado_1)
  await expect(page.getByText('Personal en turno')).toBeVisible({ timeout: 12_000 })
}

// ── Navegación por BlackColumn ─────────────────────────────────────────────

/**
 * Navega al AppShell home (pantalla de bienvenida).
 * El logo o el texto del panel deben estar visibles.
 */
export async function goHome(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('button', { name: /home/i })
    .click()
}

/**
 * Navega a una hoja de primer nivel pulsando su botón en el nav.
 * Para hojas dentro de grupos (drill-down), usa `navegarDrill`.
 */
export async function navegarLeafDirecto(page: Page, ariaLabel: string) {
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await nav.getByRole('button', { name: new RegExp(ariaLabel, 'i') }).click()
}

/**
 * Navega a una hoja dentro de un grupo pulsando primero el grupo y
 * después la hoja. Para drill-down de dos niveles (grupo → grupillo → hoja)
 * usa el helper dos veces.
 */
export async function navegarDrill(page: Page, ...labels: string[]) {
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  for (const label of labels) {
    await nav.getByRole('button', { name: new RegExp(label, 'i') }).click()
    await page.waitForTimeout(200) // pequeña pausa para la animación de drill
  }
}
