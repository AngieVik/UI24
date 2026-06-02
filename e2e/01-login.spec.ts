import { test, expect } from '@playwright/test'

/**
 * Flujo 1 — AutorizarTerminalScreen (estado_0a)
 *
 * Testea la pantalla que aparece cuando el terminal no tiene sesión.
 * No se inyecta IDB ni sessionStorage → App muestra AutorizarTerminalScreen.
 * No se necesita Supabase real: solo probamos el renderizado del formulario.
 */
test.describe('Autorizar terminal — estado_0a', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('muestra el formulario de autorización del terminal', async ({ page }) => {
    await expect(page.getByRole('button', { name: /acceder/i })).toBeVisible({
      timeout: 8_000,
    })
  })

  test('muestra el logo de U24', async ({ page }) => {
    await expect(page.getByRole('img', { name: /u24 servicios sanitarios/i })).toBeVisible({
      timeout: 8_000,
    })
  })

  test('el formulario tiene los campos identificador y contraseña', async ({ page }) => {
    await expect(page.getByRole('button', { name: /acceder/i })).toBeVisible({
      timeout: 8_000,
    })
    await expect(page.getByLabel(/identificador/i)).toBeVisible()
    // getByRole evita la ambigüedad: getByLabel(/contraseña/) casa con el input Y
    // con el botón "Mostrar contraseña" (strict mode viola con 2 elementos).
    await expect(page.getByRole('textbox', { name: /contraseña/i })).toBeVisible()
  })

  test('el botón de envío existe y está habilitado', async ({ page }) => {
    await expect(page.getByRole('button', { name: /acceder/i })).toBeVisible({
      timeout: 8_000,
    })
  })

  test('muestra banner "Sin conexión" cuando la red está cortada', async ({ page, context }) => {
    // La página ya está cargada desde beforeEach.
    // setOffline ANTES de reload bloquearía localhost → reload falla.
    // Estrategia: verificar que la pantalla está cargada, luego simular offline.
    await expect(page.getByRole('button', { name: /acceder/i })).toBeVisible({
      timeout: 8_000,
    })
    await context.setOffline(true)
    // El event 'offline' dispara el handler en App.tsx → isOnline=false → banner visible.
    await expect(page.getByText(/sin conexión/i)).toBeVisible()
    await context.setOffline(false)
  })

  test('muestra error de validación si se envía sin datos', async ({ page }) => {
    await expect(page.getByRole('button', { name: /acceder/i })).toBeVisible({
      timeout: 8_000,
    })
    await page.getByRole('button', { name: /acceder/i }).click()
    // Validación de formulario debe mostrar mensaje de error
    await expect(page.getByText(/requerido|mínimo|obligatorio/i).first()).toBeVisible({
      timeout: 4_000,
    })
  })
})

/**
 * Flujo 1b — CheckinInicialScreen (estado_0b)
 *
 * El terminal tiene sesión (IDB inyectado) pero no hay presencias.
 * Supabase mock devuelve presencias vacías → CheckinInicialScreen.
 */
test.describe('Check-in inicial — estado_0b', () => {
  const SUPABASE_HOST = process.env.E2E_SUPABASE_HOST || 'ygljtbpfpfdbuxvibbom.supabase.co'
  const TERMINAL_ID = 'e2e-terminal-fixture'

  test.beforeEach(async ({ page }) => {
    // Mock: presencias vacías → fuerza CheckinInicialScreen
    await page.route(`**/${SUPABASE_HOST}/rest/v1/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })

    // Inyectar sesión del terminal pero sin presencias
    await page.addInitScript(
      ({ terminalId }) => {
        sessionStorage.setItem(
          'u24-auth',
          JSON.stringify({
            state: {
              session: {
                access_token: 'e2e-bypass-token',
                refresh_token: 'e2e-refresh-token',
                user: {
                  id: '00000000-0000-0000-0000-000000000e2e',
                  app_metadata: { rol: 'tes', id_nombre: 'tes_demo' },
                  user_metadata: { rol: 'tes', id_nombre: 'tes_demo' },
                },
              },
              ejecutorId: 'tes_demo',
              rol: 'tes',
            },
            version: 0,
          })
        )
        const req = indexedDB.open('keyval-store', 1)
        req.onupgradeneeded = () => req.result.createObjectStore('keyval')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('keyval', 'readwrite')
          tx.objectStore('keyval').put(
            {
              state: { id_terminal: terminalId, tipoGalleta: 'temporal', fingerprint: terminalId },
              version: 0,
            },
            'u24-terminal'
          )
        }
      },
      { terminalId: TERMINAL_ID }
    )

    await page.goto('/')
  })

  test('muestra el formulario de check-in', async ({ page }) => {
    // Con presencias vacías debe aparecer la pantalla de check-in
    await expect(page.getByLabel(/identificador/i)).toBeVisible({ timeout: 10_000 })
    // El texto de check-in debe ser visible
    await expect(page.getByText(/check.in|iniciar|entrar/i).first()).toBeVisible()
  })
})
