import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBlackColumnState } from '@/hooks/useBlackColumnState'

/* ─────────────────────────────────────────────────────────────────────────
 *  Máquina de estado del BlackColumn — Fase B.3 tests.
 *  Inyectamos rol explícitamente para no depender de useAuthStore.
 * ───────────────────────────────────────────────────────────────────────── */

describe('useBlackColumnState — inicial', () => {
  it('arranca en raíz, no expandido, con home seleccionado', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    expect(result.current.currentPath).toEqual([])
    expect(result.current.expanded).toBe(false)
    expect(result.current.selectedLeafId).toBe('home')
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.currentNodeId).toBeNull()
  })

  it('expone hojas fijas filtradas por rol', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    const ids = result.current.fixedLeaves.map((l) => l.id)
    expect(ids).toEqual(['home', 'checkin'])
  })

  it('rol sin_rol no ve ni hojas fijas ni hijos', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'sin_rol' }))
    expect(result.current.fixedLeaves).toHaveLength(0)
    expect(result.current.visibleChildren).toHaveLength(0)
  })
})

describe('useBlackColumnState — navigateInto', () => {
  it('entrar a un grupo: push al path, expanded=true', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    expect(result.current.currentPath).toEqual(['operativa'])
    expect(result.current.expanded).toBe(true)
    expect(result.current.canGoBack).toBe(true)
    expect(result.current.currentNodeId).toBe('operativa')
  })

  it('entrar a un grupillo: path con dos niveles', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    expect(result.current.currentPath).toEqual(['operativa', 'op_docs_turno'])
    expect(result.current.expanded).toBe(true)
  })

  it('intentar entrar a una hoja terminal NO modifica el estado', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    const before = { ...result.current }
    act(() => result.current.navigateInto('doc6')) // doc6 es leaf
    expect(result.current.currentPath).toEqual(before.currentPath)
  })

  it('intentar entrar a un id inexistente NO rompe', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('no-existe'))
    expect(result.current.currentPath).toEqual([])
  })
})

describe('useBlackColumnState — goBack', () => {
  it('vuelve al nivel anterior y mantiene expanded=true', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    act(() => result.current.goBack())
    expect(result.current.currentPath).toEqual(['operativa'])
    expect(result.current.expanded).toBe(true)
  })

  it('en raíz, goBack no rompe nada', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.goBack())
    expect(result.current.currentPath).toEqual([])
    expect(result.current.canGoBack).toBe(false)
  })

  it('re-expande tras seleccionar hoja y volver atrás', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    act(() => result.current.selectLeaf('doc6'))
    expect(result.current.expanded).toBe(false) // autocontraído
    act(() => result.current.goBack())
    expect(result.current.expanded).toBe(true)  // re-expandido
  })
})

describe('useBlackColumnState — selectLeaf', () => {
  it('selecciona hoja, autocontrae', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    act(() => result.current.selectLeaf('doc6'))
    expect(result.current.selectedLeafId).toBe('doc6')
    expect(result.current.expanded).toBe(false)
  })

  it('seleccionar hoja NO cambia el path (sigues en el grupo)', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    act(() => result.current.selectLeaf('doc6'))
    expect(result.current.currentPath).toEqual(['operativa', 'op_docs_turno'])
  })
})

describe('useBlackColumnState — toggleExpanded', () => {
  it('invierte expanded manualmente', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    expect(result.current.expanded).toBe(false)
    act(() => result.current.toggleExpanded())
    expect(result.current.expanded).toBe(true)
    act(() => result.current.toggleExpanded())
    expect(result.current.expanded).toBe(false)
  })

  it('toggle puede re-mostrar etiquetas tras autocontracción por hoja', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    act(() => result.current.selectLeaf('doc6'))
    expect(result.current.expanded).toBe(false)
    act(() => result.current.toggleExpanded())
    expect(result.current.expanded).toBe(true)
  })
})

describe('useBlackColumnState — goHome / goCheckin', () => {
  it('goHome resetea path, selecciona home, colapsa', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    act(() => result.current.selectLeaf('doc6'))
    act(() => result.current.toggleExpanded()) // ensaucia el estado
    act(() => result.current.goHome())
    expect(result.current.currentPath).toEqual([])
    expect(result.current.selectedLeafId).toBe('home')
    expect(result.current.expanded).toBe(false)
  })

  it('goCheckin resetea path, selecciona checkin, colapsa', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('drp'))
    act(() => result.current.goCheckin())
    expect(result.current.currentPath).toEqual([])
    expect(result.current.selectedLeafId).toBe('checkin')
    expect(result.current.expanded).toBe(false)
  })
})

describe('useBlackColumnState — visibleChildren', () => {
  it('en raíz devuelve grupos top-level visibles', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    const ids = result.current.visibleChildren.map((n) => n.id)
    expect(ids).toContain('operativa')
    expect(ids).toContain('drp')
    expect(ids).toContain('rrhh')
  })

  it('dentro de un grupo devuelve sus hijos (grupillos + leaves del grupo)', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    const ids = result.current.visibleChildren.map((n) => n.id)
    expect(ids).toContain('op_docs_turno')
    expect(ids).toContain('op_docs_clinicos')
    expect(ids).toContain('op_mantenimiento')
    expect(ids).toContain('vehiculos_op')
  })

  it('dentro de un grupillo devuelve sus hojas', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    const ids = result.current.visibleChildren.map((n) => n.id)
    expect(ids).toEqual(['doc10_op', 'doc6', 'doc8', 'chk360'])
  })

  it('filtra por rol: tes dentro de operativa no ve nada de RRHH ni Logística', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'tes' }))
    const idsRoot = result.current.visibleChildren.map((n) => n.id)
    expect(idsRoot).not.toContain('rrhh')
    expect(idsRoot).not.toContain('logistica')
    expect(idsRoot).not.toContain('flota')
  })
})
