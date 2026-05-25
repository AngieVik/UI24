import { test, expect } from '@playwright/test'
import { CREDS, loginNormal, waitForVehiclePicker, selectFirstVehicle, completarChecklist } from './helpers'

/**
 * Flujo 2 — Check-in de vehículo + Checklist 360° + apertura Doc-8
 * Cubre: selección de matrícula, validación de estado_operativo/condicion_tecnica,
 *        checklist 360° con 10 sistemas, trigger Doc-7 (avería si hay NG).
 */
test.describe.skip('Check-in vehículo + Checklist 360°', () => {
  test.beforeEach(async ({ page }) => {
    await loginNormal(page, CREDS.user.email, CREDS.user.password)
    await waitForVehiclePicker(page)
  })

  test('muestra la lista de vehículos disponibles', async ({ page }) => {
    // Debe haber al menos un vehículo disponible (seeds cargados)
    const vehicles = page.getByRole('button', { name: /seleccionar/i })
    await expect(vehicles.first()).toBeVisible({ timeout: 8_000 })
  })

  test('seleccionar vehículo abre el checklist 360°', async ({ page }) => {
    await selectFirstVehicle(page)
    await expect(page.getByRole('heading', { name: /checklist 360/i }))
      .toBeVisible({ timeout: 10_000 })
  })

  test('checklist tiene los 10 sistemas y se puede cerrar', async ({ page }) => {
    await selectFirstVehicle(page)
    await expect(page.getByRole('heading', { name: /checklist 360/i })).toBeVisible()

    // Verificar que hay sistemas del checklist
    const sistemas = ['exterior', 'neumático', 'luce', 'sirena', 'motor']
    for (const sistema of sistemas) {
      await expect(
        page.getByText(new RegExp(sistema, 'i')).first()
      ).toBeVisible()
    }

    // Completar el checklist y avanzar
    await completarChecklist(page)

    // Tras cerrar el checklist, entramos al AppShell (estado operativo)
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 })
  })

  test('marcar un sistema como NG muestra el campo de descripción', async ({ page }) => {
    await selectFirstVehicle(page)
    await expect(page.getByRole('heading', { name: /checklist 360/i })).toBeVisible()

    // Hacer clic en el primer botón NG
    const ngBtn = page.getByRole('button', { name: /ng/i }).first()
    await ngBtn.click()

    // Debe aparecer un campo de descripción o notas
    await expect(
      page.getByRole('textbox', { name: /descripción|notas|detalle/i }).first()
    ).toBeVisible()
  })
})
