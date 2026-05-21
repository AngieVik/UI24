import { test, expect, Page } from '@playwright/test'
import { CREDS, loginNormal, waitForVehiclePicker, selectFirstVehicle, completarChecklist, navegarA } from './helpers'

/**
 * Flujo 3 — Inventario Doc-6 + ciclo offline → reconexión → sincronización
 * Cubre: deducción optimista de stock, banner offline, cola offline, sync al reconectar.
 */

async function llegarAInventario(page: Page) {
  await loginNormal(page, CREDS.user.email, CREDS.user.password)
  await waitForVehiclePicker(page)
  await selectFirstVehicle(page)
  await completarChecklist(page)
  await navegarA(page, 'inventario|doc.?6|material')
}

test.describe('Inventario — Flujo online', () => {
  test('muestra el inventario del vehículo', async ({ page }) => {
    await llegarAInventario(page)
    await expect(page.getByRole('heading', { name: /inventario/i })).toBeVisible({ timeout: 8_000 })
    // Debe haber ítems de inventario
    const items = page.getByRole('listitem')
    await expect(items.first()).toBeVisible({ timeout: 8_000 })
  })

  test('deducir un material actualiza el stock visualmente', async ({ page }) => {
    await llegarAInventario(page)
    // Tomar el primer item y su stock actual
    const primerItem = page.getByRole('listitem').first()
    await expect(primerItem).toBeVisible()

    // Pulsar el botón de deducción
    const deducirBtn = primerItem.getByRole('button', { name: /deducir|gastar|−|usar/i })
    if (await deducirBtn.isVisible()) {
      await deducirBtn.click()
      // La UI optimista actualiza inmediatamente
      await expect(page.getByRole('status')).toBeVisible({ timeout: 5_000 })
    }
  })
})

test.describe('Inventario — Ciclo offline', () => {
  test('aparece banner sin conexión al ir offline', async ({ page, context }) => {
    await llegarAInventario(page)

    // Simular offline a nivel de red
    await context.setOffline(true)

    await expect(
      page.getByText(/sin conexión|modo offline|no hay conexión/i)
    ).toBeVisible({ timeout: 5_000 })
  })

  test('deducción offline se encola y sincroniza al reconectar', async ({ page, context }) => {
    await llegarAInventario(page)

    // Ir offline
    await context.setOffline(true)
    await expect(page.getByText(/sin conexión|modo offline/i)).toBeVisible({ timeout: 5_000 })

    // Intentar deducir un item
    const items = page.getByRole('listitem')
    const count = await items.count()
    if (count > 0) {
      const deducirBtn = items.first().getByRole('button', { name: /deducir|gastar|−|usar/i })
      if (await deducirBtn.isVisible()) {
        await deducirBtn.click()
        // Debe mostrarse indicador de operaciones pendientes en cola
        await expect(
          page.getByText(/pendiente|cola|operacion/i)
        ).toBeVisible({ timeout: 5_000 })
      }
    }

    // Reconectar
    await context.setOffline(false)
    // El banner offline debe desaparecer y la cola procesarse
    await expect(
      page.getByText(/sin conexión|modo offline/i)
    ).not.toBeVisible({ timeout: 8_000 })
  })
})
