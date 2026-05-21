import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export function InstallChip() {
  const { canInstall, install, dismiss } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <div
      role="banner"
      aria-label="Instalar aplicación"
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40
                 flex items-center gap-3 px-4 py-2 rounded-full
                 bg-surface-1 border border-u24-yellow/40 shadow-lg text-sm"
    >
      <span className="text-fg-1">Instala U24 como app</span>
      <button
        className="px-3 py-1 rounded-full bg-u24-yellow text-black font-medium text-xs"
        onClick={install}
        aria-label="Instalar aplicación U24"
      >
        Instalar
      </button>
      <button
        className="text-fg-3 hover:text-fg-1"
        onClick={dismiss}
        aria-label="Descartar propuesta de instalación"
      >
        ✕
      </button>
    </div>
  )
}
