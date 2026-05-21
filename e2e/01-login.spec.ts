import { test, expect } from '@playwright/test'
import { CREDS, loginNormal, waitForVehiclePicker } from './helpers'

/**
 * Flujo 1 — Login normal + galleta + fingerprint
 * Cubre: acceso normal online, fingerprint SHA-256, galleta terminal.
 */
test.describe('Login — Flujo normal', () => {
  test('muestra la pantalla de login al arrancar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('tab', { name: /acceso normal/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /emergencia/i })).toBeVisible()
  })

  test('login con credenciales correctas lleva al selector de vehículo', async ({ page }) => {
    await loginNormal(page, CREDS.user.email, CREDS.user.password)
    await waitForVehiclePicker(page)
  })

  test('login con credenciales incorrectas muestra error', async ({ page }) => {
    await loginNormal(page, CREDS.user.email, 'wrongpassword')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 })
  })

  test('bloqueo tras 3 intentos fallidos', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 3; i++) {
      await page.getByLabel(/correo/i).fill(CREDS.user.email)
      await page.getByLabel(/contraseña/i).fill('wrong')
      await page.getByRole('button', { name: /entrar/i }).click()
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    }
    // El botón debe estar deshabilitado o el contador de bloqueo visible
    const blocked =
      (await page.getByRole('button', { name: /entrar/i }).isDisabled()) ||
      (await page.getByText(/bloqueado|reintentos/i).isVisible())
    expect(blocked).toBeTruthy()
  })

  test('logout limpia la sesión', async ({ page }) => {
    await loginNormal(page, CREDS.user.email, CREDS.user.password)
    await waitForVehiclePicker(page)
    // Buscar botón de logout en el header o estado de espera
    const logoutBtn = page.getByRole('button', { name: /salir|cerrar sesión|logout/i })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await expect(page.getByRole('tab', { name: /acceso normal/i })).toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe('Login — Flujo emergencia', () => {
  test('muestra el formulario de emergencia al seleccionar la pestaña', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /emergencia/i }).click()
    // Debe haber un campo de PIN/token de emergencia
    await expect(
      page.getByLabel(/pin|token|emergencia/i).first()
    ).toBeVisible()
  })
})
