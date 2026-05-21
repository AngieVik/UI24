import { useState, useEffect, useCallback } from 'react'
import { get as idbGet, set as idbSet } from 'idb-keyval'

const IDB_KEY_DISMISSED = 'u24-install-dismissed'
// Respetar el rechazo durante 30 días
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Comprobar si ya está instalada como standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (standalone) {
      setIsInstalled(true)
      return
    }

    // Comprobar si está descartada en IndexedDB
    idbGet<number>(IDB_KEY_DISMISSED).then((ts) => {
      if (ts && Date.now() - ts < DISMISS_TTL_MS) {
        setIsDismissed(true)
      } else {
        setIsDismissed(false)
      }
    })

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => setIsInstalled(true)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setPromptEvent(null)
    }
  }, [promptEvent])

  const dismiss = useCallback(async () => {
    await idbSet(IDB_KEY_DISMISSED, Date.now())
    setIsDismissed(true)
    setPromptEvent(null)
  }, [])

  const canInstall = !isInstalled && !isDismissed && promptEvent !== null

  return { canInstall, isInstalled, isDismissed, install, dismiss }
}
