import { test, expect } from '@playwright/test'
import { bootstrapApp, navegarDrill } from './helpers'

/**
 * Flujo 4 — DRP: acceso por rol + navegación al panel
 *
 * El panel DRP es visible para todos los roles (TODOS en black-column-nav),
 * pero las acciones de creación/estados son exclusivas de coordinacion/gerencia.
 *
 * Estrategia: bootstrapApp con distintos roles y verificar visibilidad del nav.
 */
test.describe('DRP — visibilidad por rol', () => {
  test('rol "gerencia" ve el grupo DRP en la navegación', async ({ page }) => {
    await bootstrapApp(page, { rol: 'gerencia', idNombre: 'admin' })

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    await expect(nav.getByRole('button', { name: /^DRP$/i })).toBeVisible()
  })

  test('rol "tes" ve el grupo DRP en la navegación', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    await expect(nav.getByRole('button', { name: /^DRP$/i })).toBeVisible()
  })

  test('navegar a Visor DRP carga la pantalla', async ({ page }) => {
    await bootstrapApp(page, { rol: 'gerencia', idNombre: 'admin' })

    await navegarDrill(page, 'DRP', 'Visor DRP')

    await expect(page.getByRole('heading', { name: /visor.*drp|drp.*visor/i })).toBeVisible({
      timeout: 8_000,
    })
  })

  test('navegar a Operativa DRP carga la pantalla', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    await navegarDrill(page, 'DRP', 'Operativa DRP')

    await expect(page.getByRole('heading', { name: /operativa.*drp|drp.*operativa/i })).toBeVisible(
      { timeout: 8_000 }
    )
  })
})

test.describe('DRP — acciones exclusivas de coordinacion/gerencia', () => {
  test('rol "gerencia" ve "Crear DRP" en el nav', async ({ page }) => {
    await bootstrapApp(page, { rol: 'gerencia', idNombre: 'admin' })

    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('button', { name: /^DRP$/i })
      .click()
    await page.waitForTimeout(300)

    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('button', { name: /crear drp/i })
    ).toBeVisible()
  })

  test('rol "tes" NO ve "Crear DRP" en el nav', async ({ page }) => {
    await bootstrapApp(page, { rol: 'tes', idNombre: 'tes_demo' })

    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('button', { name: /^DRP$/i })
      .click()
    await page.waitForTimeout(300)

    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('button', { name: /crear drp/i })
    ).not.toBeVisible()
  })

  test('rol "gerencia" ve "Estados DRP"', async ({ page }) => {
    await bootstrapApp(page, { rol: 'gerencia', idNombre: 'admin' })

    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('button', { name: /^DRP$/i })
      .click()
    await page.waitForTimeout(300)

    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('button', { name: /estados drp/i })
    ).toBeVisible()
  })
})

test.describe('DRP — panel con DRP activo', () => {
  test('home muestra el panel VisualInfoDRP cuando hay un DRP activo', async ({ page }) => {
    // conDrp: true inyecta datos de DRP en los mocks
    await bootstrapApp(page, { rol: 'gerencia', idNombre: 'admin', conDrp: true })

    // El panel DRP debe aparecer en el home
    await expect(page.getByText(/en curso/i).first()).toBeVisible({ timeout: 8_000 })
  })
})
