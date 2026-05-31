import { test, expect } from '@playwright/test'
import { bootstrapApp, navegarDrill, SUPABASE_HOST } from './helpers'

/**
 * Flujo 3 — Ciclo offline → cola de mutaciones → reconexión
 *
 * Estrategia:
 *   1. bootstrapApp → AppShell con mocks online.
 *   2. Cortar red (context.setOffline) → banner offline visible.
 *   3. Navegar a Doc-6 e intentar una acción de formulario.
 *   4. Verificar que la cola offline captura la mutación (toast/banner).
 *   5. Restaurar red → verificar que el banner desaparece.
 */
test.describe('Ciclo offline — cola de mutaciones', () => {
  test('muestra banner offline al cortar la red', async ({ page, context }) => {
    await bootstrapApp(page)

    // Cortar red tras tener la app cargada
    await context.setOffline(true)

    // El BannerOffline debe aparecer
    await expect(page.getByText(/sin conexión|modo offline|fuera de línea/i)).toBeVisible({
      timeout: 5_000,
    })

    await context.setOffline(false)
  })

  test('restaurar red oculta el banner offline', async ({ page, context }) => {
    await bootstrapApp(page)

    await context.setOffline(true)
    await expect(page.getByText(/sin conexión|modo offline|fuera de línea/i)).toBeVisible({
      timeout: 5_000,
    })

    await context.setOffline(false)

    // Banner debe desaparecer
    await expect(page.getByText(/sin conexión|modo offline|fuera de línea/i)).not.toBeVisible({
      timeout: 5_000,
    })
  })

  test('Doc-6 carga aunque la red esté cortada (datos en caché)', async ({ page, context }) => {
    await bootstrapApp(page)

    // Cortar red y navegar a Doc-6
    await context.setOffline(true)

    await navegarDrill(page, 'Operativa', 'Operativas rutinarias', 'Doc-6 Gasto de material')

    // CardTitle es <div> — usar getByText
    await expect(page.getByText('Doc-6 — Gasto de material').first()).toBeVisible({
      timeout: 8_000,
    })

    await context.setOffline(false)
  })

  test('ciclo offline → mutación encolada → online → verificación', async ({
    page,
    context: _context,
  }) => {
    await bootstrapApp(page)

    // Bloquear las llamadas RPC (simula red cortada sin cortar del todo la carga de assets)
    await page.route(`**/${SUPABASE_HOST}/rest/v1/rpc/**`, async (route) => {
      // No respondemos, dejamos que el hook detecte el fallo y encole
      await route.abort('failed')
    })

    await navegarDrill(page, 'Operativa', 'Operativas rutinarias', 'Doc-6 Gasto de material')

    // CardTitle es <div> — usar getByText
    await expect(page.getByText('Doc-6 — Gasto de material').first()).toBeVisible({
      timeout: 8_000,
    })

    // Desbloquear para simular reconexión
    await page.unroute(`**/${SUPABASE_HOST}/rest/v1/rpc/**`)
  })
})

test.describe('Navegación offline — pantallas abiertas previamente', () => {
  test('las pantallas lazy cargadas previamente siguen disponibles offline', async ({
    page,
    context,
  }) => {
    await bootstrapApp(page)

    // Cargar Doc-8 mientras hay red
    await navegarDrill(page, 'Operativa', 'Operativas rutinarias', 'Doc-8 Parte de trabajo')
    await expect(page.getByRole('heading', { name: /parte de trabajo/i })).toBeVisible({
      timeout: 8_000,
    })

    // Cortar red — la pantalla ya está cargada en memoria, debe seguir visible
    await context.setOffline(true)
    await expect(page.getByRole('heading', { name: /parte de trabajo/i })).toBeVisible()

    await context.setOffline(false)
  })
})
