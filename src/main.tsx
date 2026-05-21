import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { initSentry, setSentryUser } from '@/lib/sentry'
import { useAuthStore } from '@/stores/useAuthStore'

initSentry()

// Suscribir cambios de sesión para actualizar el contexto de Sentry
useAuthStore.subscribe((state) => {
  setSentryUser(state.ejecutorId ?? null)
})

// Registro del Service Worker — recarga silenciosa cuando hay nueva versión
registerSW({ onNeedRefresh() { /* vite-plugin-pwa notifica en consola */ } })

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root en el DOM')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
