import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E — U24 Terminal operativo
 *
 * En CI (.github/workflows/ci-e2e.yml):
 *   - El workflow hace npm run build → nohup npm run preview &
 *   - Luego pasa E2E_BASE_URL=http://localhost:4173 → webServer queda undefined.
 *
 * En local (sin E2E_BASE_URL):
 *   - webServer levanta `npm run dev` en puerto 5173.
 *   - Si ya hay un servidor corriendo, lo reutiliza (reuseExistingServer).
 *
 * Variables opcionales para tests contra staging/producción:
 *   E2E_BASE_URL          URL base de la app
 *   E2E_USER_PASSWORD     Contraseña del empleado demo
 *   E2E_GERENCIA_PASSWORD Contraseña de gerencia (opcional)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // los flujos dependen de estado de sesión compartido
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Simula tablet sanitario Android (Galaxy Tab S4)
    ...devices['Galaxy Tab S4'],
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },

  projects: [
    {
      name: 'chromium-android',
      use: { ...devices['Galaxy Tab S4'] },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // En CI el workflow gestiona el servidor → webServer queda undefined.
  // En local levanta el dev server si no hay otro corriendo.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
})
