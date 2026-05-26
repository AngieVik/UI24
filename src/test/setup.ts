import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// jsdom no implementa matchMedia — stub mínimo necesario para useInstallPrompt
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom no implementa ResizeObserver — Radix UI (Tooltip, Popover, etc.) lo necesita
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverMock {
    observe()    { /* no-op */ }
    unobserve()  { /* no-op */ }
    disconnect() { /* no-op */ }
  }
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock
}

// jsdom no implementa hasPointerCapture / scrollIntoView — Radix los usa en Tooltip/Select
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
