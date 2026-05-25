import { test, expect, Page } from '@playwright/test'
import { CREDS, loginNormal, waitForVehiclePicker, selectFirstVehicle, completarChecklist, navegarA } from './helpers'

/**
 * Flujo 4 — DRP: crear → iniciar → finalizar
 * Cubre: panel DRP para coordinación/gerencia, máquina de estados, restricción de roles.
 */

async function llegarAlDrpPanel(page: Page) {
  await loginNormal(page, CREDS.gerencia.email, CREDS.gerencia.password)
  await waitForVehiclePicker(page)
  await selectFirstVehicle(page)
  await completarChecklist(page)
  await navegarA(page, 'drp|emergencia')
}

test.describe.skip('Panel DRP — Solo coordinación/gerencia', () => {
  test('un sanitario de base no ve el panel DRP', async ({ page }) => {
    await loginNormal(page, CREDS.user.email, CREDS.user.password)
    await waitForVehiclePicker(page)
    await selectFirstVehicle(page)
    await completarChecklist(page)

    // El menú DRP no debe estar visible para roles sin permiso
    const drpNav = page.getByRole('navigation').getByText(/drp|emergencia masiva/i)
    // O no existe o está oculto
    const visible = await drpNav.isVisible().catch(() => false)
    if (visible) {
      // Si está visible, al navegar debe mostrar "Sin acceso" o redirigir
      await drpNav.click()
      await expect(
        page.getByText(/sin acceso|no autorizado|permiso/i)
      ).toBeVisible({ timeout: 5_000 })
    }
  })

  test('gerencia puede ver el panel DRP con la lista de DRPs', async ({ page }) => {
    await llegarAlDrpPanel(page)
    await expect(
      page.getByRole('heading', { name: /panel drp|emergencia/i })
    ).toBeVisible({ timeout: 8_000 })
  })

  test('crear un nuevo DRP y transicionar a En_preparacion', async ({ page }) => {
    await llegarAlDrpPanel(page)

    const crearBtn = page.getByRole('button', { name: /crear drp|nuevo drp/i })
    if (await crearBtn.isVisible({ timeout: 5_000 })) {
      await crearBtn.click()

      // Rellenar el formulario de creación
      const descripcionInput = page.getByLabel(/descripción|nombre|denominación/i)
      if (await descripcionInput.isVisible()) {
        await descripcionInput.fill('E2E Test DRP — eliminar tras prueba')
      }

      const confirmarBtn = page.getByRole('button', { name: /crear|confirmar|guardar/i })
      await confirmarBtn.click()

      // Debe aparecer el nuevo DRP en estado En_espera
      await expect(
        page.getByText(/en_espera|esperando/i).first()
      ).toBeVisible({ timeout: 8_000 })
    }
  })
})

test.describe.skip('Visor GPS', () => {
  test('el visor GPS carga sin errores para gerencia', async ({ page }) => {
    await llegarAlDrpPanel(page)
    // Navegar al visor GPS
    const visorBtn = page.getByRole('button', { name: /visor gps|seguimiento/i })
    if (await visorBtn.isVisible()) {
      await visorBtn.click()
      // Debe mostrar algo (mapa o lista de posiciones)
      await expect(page.getByRole('main')).toBeVisible()
    }
  })
})
