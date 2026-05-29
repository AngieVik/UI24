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

  it('expone hojas fijas filtradas por rol (solo Check-in tras 2026-05-23)', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    const ids = result.current.fixedLeaves.map((l) => l.id)
    expect(ids).toEqual(['checkin'])
  })

  it('rol sin_rol no ve ni hojas fijas ni hijos — pantalla en blanco', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'sin_rol' }))
    expect(result.current.fixedLeaves).toHaveLength(0)
    expect(result.current.visibleChildren).toHaveLength(0)
  })

  it('rol invitado ve la hoja fija Check-in pero no grupos operativos', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'invitado' }))
    const fixedIds = result.current.fixedLeaves.map((l) => l.id)
    expect(fixedIds).toContain('checkin')
    // Los grupos operativos (drp, logistica, rrhh…) no incluyen invitado
    const treeIds = result.current.visibleChildren.map((n) => n.id)
    expect(treeIds).not.toContain('operativa')
    expect(treeIds).not.toContain('drp')
  })
})

describe('useBlackColumnState — navigateInto', () => {
  it('entrar a un grupo: push al path, usuario controla expanded manualmente', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    expect(result.current.currentPath).toEqual(['operativa'])
    expect(result.current.expanded).toBe(false) // navigateInto NO auto-expande
    expect(result.current.canGoBack).toBe(true)
    expect(result.current.currentNodeId).toBe('operativa')
  })

  it('entrar a un grupillo: path con dos niveles', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    act(() => result.current.navigateInto('op_docs_turno'))
    expect(result.current.currentPath).toEqual(['operativa', 'op_docs_turno'])
    expect(result.current.expanded).toBe(false) // navigateInto NO auto-expande
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

describe('useBlackColumnState — openModal / closeModal (D-17)', () => {
  it('estado inicial sin modal abierto', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    expect(result.current.modalLeafId).toBeNull()
  })

  it('openModal establece modalLeafId sin tocar selectedLeafId', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.selectLeaf('log_inv_locations'))
    act(() => result.current.openModal('log_bandeja'))
    expect(result.current.modalLeafId).toBe('log_bandeja')
    // La pantalla anterior permanece activa debajo del modal
    expect(result.current.selectedLeafId).toBe('log_inv_locations')
  })

  it('closeModal vuelve modalLeafId a null preservando selectedLeafId', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.selectLeaf('log_inv_locations'))
    act(() => result.current.openModal('log_bandeja'))
    act(() => result.current.closeModal())
    expect(result.current.modalLeafId).toBeNull()
    expect(result.current.selectedLeafId).toBe('log_inv_locations')
  })

  it('openModal funciona con cada leafId opensModal del árbol', () => {
    const ids = ['log_bandeja', 'flota_bandeja', 'coord_bandeja', 'rrhh_bandeja', 'drp_res']
    for (const id of ids) {
      const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
      act(() => result.current.openModal(id))
      expect(result.current.modalLeafId).toBe(id)
    }
  })

  it('goHome cierra el modal activo', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.openModal('log_bandeja'))
    act(() => result.current.goHome())
    expect(result.current.modalLeafId).toBeNull()
    expect(result.current.selectedLeafId).toBe('home')
  })

  it('goCheckin cierra el modal activo', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.openModal('coord_bandeja'))
    act(() => result.current.goCheckin())
    expect(result.current.modalLeafId).toBeNull()
    expect(result.current.selectedLeafId).toBe('checkin')
  })

  it('abrir un segundo modal reemplaza el anterior sin closeModal intermedio', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.openModal('log_bandeja'))
    act(() => result.current.openModal('drp_res'))
    expect(result.current.modalLeafId).toBe('drp_res')
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

  it('dentro de un grupo devuelve sus hijos en orden (Vehículos primero)', () => {
    const { result } = renderHook(() => useBlackColumnState({ rol: 'gerencia' }))
    act(() => result.current.navigateInto('operativa'))
    const ids = result.current.visibleChildren.map((n) => n.id)
    expect(ids[0]).toBe('vehiculos_op')
    expect(ids).toContain('op_docs_turno')
    expect(ids).toContain('op_docs_clinicos')
    expect(ids).toContain('op_mantenimiento')
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
