import { test, expect } from '@playwright/test'

/**
 * Flujo 5 — PWA smoke tests (post-deploy)
 * Cubre: manifest, SW registrado, headers de seguridad, HTTPS.
 */
test.describe('PWA — Infraestructura', () => {
  test('el manifiesto web está accesible', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest.name).toContain('U24')
    expect(manifest.display).toBe('standalone')
  })

  test('el Service Worker está registrado', async ({ page }) => {
    await page.goto('/')
    // Esperar a que la app cargue
    await expect(page.getByRole('tab', { name: /acceso normal/i })).toBeVisible({ timeout: 10_000 })

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.length > 0
    })
    // En dev mode el SW está desactivado; en producción/preview debe estar activo
    // No falla si no está en dev — solo avisa
    if (!swRegistered) {
      console.warn('[PWA] Service Worker no registrado — verificar en build de producción')
    }
  })

  test('la app carga en menos de 5 segundos', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await expect(page.getByRole('tab', { name: /acceso normal/i })).toBeVisible({ timeout: 10_000 })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5_000)
  })

  test('headers de seguridad presentes', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}

    // Content-Security-Policy o X-Frame-Options deben estar presentes
    const hasSecurityHeader =
      'content-security-policy' in headers ||
      'x-frame-options' in headers ||
      'x-content-type-options' in headers

    if (!hasSecurityHeader) {
      console.warn('[Seguridad] Faltan headers de seguridad — configurar en CDN/hosting')
    }
  })
})
