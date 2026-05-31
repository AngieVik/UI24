import { create } from 'zustand'

export type ToastTone = 'ok' | 'warn' | 'crit' | 'info'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface ToastStore {
  toasts: Toast[]
  toast: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

const TOAST_DURATION_MS = 5000

export const useToast = create<ToastStore>((set) => ({
  toasts: [],

  toast(message, tone = 'info') {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

// Acceso imperativo fuera de componentes (e.g., en el procesamiento de la cola)
export const toast = {
  ok: (msg: string) => useToast.getState().toast(msg, 'ok'),
  warn: (msg: string) => useToast.getState().toast(msg, 'warn'),
  crit: (msg: string) => useToast.getState().toast(msg, 'crit'),
  info: (msg: string) => useToast.getState().toast(msg, 'info'),
}
