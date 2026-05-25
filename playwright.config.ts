import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E — U24 Terminal operativo
 * Ejecutar contra staging o producción con variables de entorno:
 *   E2E_BASE_URL       URL base de la app (default: http://localhost:4173)
 *   E2E_USER_EMAIL     Correo del empleado demo
 *   E2E_USER_PASSWORD  Contraseña del empleado demo
 *   E2E_GERENCIA_EMAIL    (opcional) Para tests de coordinación/DRP
 *   E2E_GERENCIA_PASSWORD (opcional)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // los flujos dependen de estado de sesión
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'e2e-report' }],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Simula dispositivo Android (tablet sanitario típico)
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

  // Levantar el dev server antes de correr en local — Fase C usa dev
  // porque el roadmap prohíbe builds de producción hasta cerrar Fase E.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
})
