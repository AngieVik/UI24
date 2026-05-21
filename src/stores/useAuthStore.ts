import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  // id_nombre del empleado — lo que va en la cola, nunca el JWT
  ejecutorId: string | null
  setSession: (session: Session | null) => void
  clearSession: () => void
}

// sessionStorage: sobrevive a F5 pero no al cierre de pestaña (ADR-009)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      ejecutorId: null,

      setSession(session) {
        const ejecutorId =
          (session?.user?.user_metadata?.id_nombre as string | undefined) ?? null
        set({ session, ejecutorId })
      },

      clearSession() {
        set({ session: null, ejecutorId: null })
      },
    }),
    {
      name: 'u24-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
