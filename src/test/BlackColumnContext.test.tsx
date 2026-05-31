import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { BlackColumnProvider, useBlackColumn } from '@/contexts/BlackColumnContext'

describe('BlackColumnContext', () => {
  it('lanza si se usa useBlackColumn fuera del Provider', () => {
    // Silenciamos el error de React para no contaminar la salida del test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useBlackColumn())).toThrow(
      /useBlackColumn debe usarse dentro de BlackColumnProvider/
    )
    spy.mockRestore()
  })

  it('expone el estado del hook dentro del Provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BlackColumnProvider>{children}</BlackColumnProvider>
    )
    const { result } = renderHook(() => useBlackColumn(), { wrapper })
    expect(result.current.currentPath).toEqual([])
    expect(result.current.selectedLeafId).toBe('home')
    expect(result.current.expanded).toBe(false)
    expect(typeof result.current.navigateInto).toBe('function')
    expect(typeof result.current.goHome).toBe('function')
    expect(typeof result.current.goBack).toBe('function')
    expect(typeof result.current.toggleExpanded).toBe('function')
  })
})
