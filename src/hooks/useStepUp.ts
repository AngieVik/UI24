import { create } from 'zustand'
import { useAuthStore } from '@/stores/useAuthStore'
import { verifyOfflineLogin } from '@/lib/offlineSession'

interface StepUpStore {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  _resolve: ((ok: boolean) => void) | null
  requestStepUp: () => Promise<boolean>
  submitPin: (password: string) => Promise<void>
  cancel: () => void
}

export const useStepUp = create<StepUpStore>()((set, get) => ({
  isOpen: false,
  isLoading: false,
  error: null,
  _resolve: null,

  requestStepUp() {
    return new Promise<boolean>((resolve) => {
      set({ isOpen: true, isLoading: false, error: null, _resolve: resolve })
    })
  },

  async submitPin(password) {
    set({ isLoading: true, error: null })
    const ejecutorId = useAuthStore.getState().ejecutorId
    if (!ejecutorId) {
      set({ isLoading: false, error: 'Sesión no reconocida. Vuelve a iniciar sesión.' })
      return
    }
    const ok = await verifyOfflineLogin(ejecutorId, password)
    if (!ok) {
      set({ isLoading: false, error: 'Contraseña incorrecta. Inténtalo de nuevo.' })
      return
    }
    const resolve = get()._resolve
    set({ isOpen: false, isLoading: false, error: null, _resolve: null })
    resolve?.(true)
  },

  cancel() {
    const resolve = get()._resolve
    set({ isOpen: false, error: null, _resolve: null })
    resolve?.(false)
  },
}))
