import * as Sentry from '@sentry/react'

export function initSentry() {
  if (!import.meta.env.PROD) return
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment:  import.meta.env.MODE,
    release:      import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // No enviar PII: deshabilitar breadcrumbs de URL completas
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'navigation') {
        // Omit full URLs — this is a non-public medical app
        return null
      }
      return breadcrumb
    },
  })
}

export function setSentryUser(idNombre: string | null) {
  Sentry.setUser(idNombre ? { username: idNombre } : null)
}

export { Sentry }
