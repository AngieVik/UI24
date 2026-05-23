import { createContext, useContext, type ReactNode } from 'react'
import { useBlackColumnState, type UseBlackColumnStateReturn } from '@/hooks/useBlackColumnState'

/**
 * BlackColumnContext — comparte la máquina de estado del BlackColumn
 * entre el componente BlackColumn (que la lee y dispara acciones), el
 * Header (que dispara goHome al pulsar el logo) y App.tsx (que rutea el
 * home_area según selectedLeafId).
 *
 * Es local al chasis: un único Provider envuelve el AppShell. No hace
 * falta un store Zustand global — el estado del BlackColumn es UI.
 */

const Ctx = createContext<UseBlackColumnStateReturn | undefined>(undefined)

interface BlackColumnProviderProps {
  children: ReactNode
}

export function BlackColumnProvider({ children }: BlackColumnProviderProps) {
  const value = useBlackColumnState()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBlackColumn(): UseBlackColumnStateReturn {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error('useBlackColumn debe usarse dentro de BlackColumnProvider')
  }
  return ctx
}
