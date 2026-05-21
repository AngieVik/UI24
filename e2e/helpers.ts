import { Page, expect } from '@playwright/test'

export const CREDS = {
  user: {
    email:    process.env.E2E_USER_EMAIL    || 'demo@u24.local',
    password: process.env.E2E_USER_PASSWORD || 'Demo1234!',
  },
  gerencia: {
    email:    process.env.E2E_GERENCIA_EMAIL    || 'gerencia@u24.local',
    password: process.env.E2E_GERENCIA_PASSWORD || 'Gerencia1234!',
  },
}

/** Login normal completo hasta la pantalla de espera */
export async function loginNormal(page: Page, email: string, password: string) {
  await page.goto('/')
  // Pestaña "Acceso normal" (activa por defecto)
  await expect(page.getByRole('tab', { name: /acceso normal/i })).toBeVisible()
  await page.getByLabel(/correo/i).fill(email)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
}

/** Espera hasta que aparezca el selector de vehículo */
export async function waitForVehiclePicker(page: Page) {
  await expect(page.getByRole('heading', { name: /seleccionar vehículo/i }))
    .toBeVisible({ timeout: 10_000 })
}

/** Selecciona el primer vehículo disponible de la lista */
export async function selectFirstVehicle(page: Page) {
  const firstVehicle = page.getByRole('button', { name: /seleccionar/i }).first()
  await firstVehicle.click()
}

/** Completa el checklist 360° marcando todos como OK */
export async function completarChecklist(page: Page) {
  await expect(page.getByRole('heading', { name: /checklist 360/i }))
    .toBeVisible({ timeout: 10_000 })
  // Marcar todos los sistemas como OK
  const togglesOk = page.getByRole('button', { name: /ok/i })
  const count = await togglesOk.count()
  for (let i = 0; i < count; i++) {
    await togglesOk.nth(i).click()
  }
  await page.getByRole('button', { name: /cerrar checklist/i }).click()
}

/** Navega a una sección del shell usando la columna negra */
export async function navegarA(page: Page, seccion: string) {
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(seccion, 'i') }).click()
}
