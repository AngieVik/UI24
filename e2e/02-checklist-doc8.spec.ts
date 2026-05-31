import { test, expect } from '@playwright/test'
import { bootstrapApp, navegarDrill } from './helpers'

/**
 * Flujo 2 — AppShell: navegación a Checklist360 y Doc-8
 *
 * Estrategia: bootstrapApp inyecta stores + mocks API → AppShell visible.
 * Se navega vía BlackColumn (drill-down) hasta las pantallas.
 * No se necesitan credenciales reales ni Supabase activo.
 */
test.describe('AppShell — navegación a pantallas operativas', () => {
  test('home muestra los paneles de información', async ({ page }) => {
    await bootstrapApp(page, { rol: 'gerencia', idNombre: 'admin' })

    await expect(page.getByText('Personal en turno')).toBeVisible()
    await expect(page.getByText('Vehículo del terminal')).toBeVisible()
    await expect(page.getByText('Bandejas personales')).toBeVisible()
  })

  test('navegar a Operativas rutinarias → Doc-8 Parte de trabajo', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    // Drill: Operativa → Operativas rutinarias → Doc-8 Parte de trabajo
    await navegarDrill(page, 'Operativa', 'Operativas rutinarias', 'Doc-8 Parte de trabajo')

    // La pantalla Doc-8 debe cargar (lazy) y mostrar su título
    await expect(
      page.getByRole('heading', { name: /parte de trabajo/i })
    ).toBeVisible({ timeout: 8_000 })
  })

  test('navegar a Operativas rutinarias → Doc-Checklist360', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    await navegarDrill(page, 'Operativa', 'Operativas rutinarias', 'Doc-Checklist360')

    // La pantalla Checklist360 debe cargar y mostrar al menos un ítem
    await expect(
      page.getByRole('heading', { name: /checklist/i })
    ).toBeVisible({ timeout: 8_000 })
  })

  test('navegar a Operativa → Vehículos', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    await navegarDrill(page, 'Operativa', 'Vehículos')

    await expect(
      page.getByRole('heading', { name: /vehículos|vehículo/i })
    ).toBeVisible({ timeout: 8_000 })
  })

  test('navegar a Doc-6 Gasto de material', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    await navegarDrill(page, 'Operativa', 'Operativas rutinarias', 'Doc-6 Gasto de material')

    await expect(
      page.getByRole('heading', { name: /gasto de material|doc.?6/i })
    ).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('AppShell — BlackColumn y breadcrumb', () => {
  test('la BlackColumn está presente con aria-label correcto', async ({ page }) => {
    await bootstrapApp(page)

    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' })
    ).toBeVisible()
  })

  test('navegar un nivel y volver al home con el breadcrumb', async ({ page }) => {
    await bootstrapApp(page)

    // Entrar en Operativa
    await page.getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('button', { name: /^Operativa$/i })
      .click()

    // Debe haber un breadcrumb para volver a Operativa
    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('button', { name: /^Operativa$/i })
    ).toBeVisible()

    // Pulsar breadcrumb vuelve al nivel anterior
    await page.getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('button', { name: /^Operativa$/i })
      .first()
      .click()
    await page.waitForTimeout(300)

    // Home debe seguir renderizando los paneles
    await expect(page.getByText('Personal en turno')).toBeVisible()
  })
})
