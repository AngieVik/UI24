import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { initSentry, setSentryUser } from '@/lib/sentry'
import { useAuthStore } from '@/stores/useAuthStore'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

initSentry()

useAuthStore.subscribe((state) => {
  setSentryUser(state.ejecutorId ?? null)
})

registerSW({ onNeedRefresh() { /* vite-plugin-pwa notifica en consola */ } })

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root en el DOM')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="u24-theme">
      <TooltipProvider delayDuration={350}>
        <App />
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
