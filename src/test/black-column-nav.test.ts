import { describe, it, expect } from 'vitest'
import {
  NAV_TREE,
  NAV_FIXED_LEAVES,
  filterByRol,
  findNode,
  getPathTo,
  getChildrenOf,
  rolPuedeVer,
  type NavNode,
} from '@/components/layout/black-column-nav'

/* ─────────────────────────────────────────────────────────────────────────
 *  filterByRol — el filtro RBAC del BlackColumn (Fase B.2).
 * ───────────────────────────────────────────────────────────────────────── */

describe('filterByRol', () => {
  it('rol "gerencia" ve absolutamente todos los grupos raíz', () => {
    const filtered = filterByRol(NAV_TREE, 'gerencia')
    const idsRaiz = filtered.map((n) => n.id)
    expect(idsRaiz).toContain('operativa')
    expect(idsRaiz).toContain('drp')
    expect(idsRaiz).toContain('modulos')
    expect(idsRaiz).toContain('logistica')
    expect(idsRaiz).toContain('flota')
    expect(idsRaiz).toContain('coord')
    expect(idsRaiz).toContain('rrhh')
    expect(idsRaiz).toContain('tablon')
    expect(idsRaiz).toContain('doc13')
  })

  it('rol "tes" NO ve Logística ni Flota ni Coordinación ni RRHH', () => {
    const filtered = filterByRol(NAV_TREE, 'tes')
    const idsRaiz = filtered.map((n) => n.id)
    expect(idsRaiz).not.toContain('logistica')
    expect(idsRaiz).not.toContain('flota')
    expect(idsRaiz).not.toContain('coord')
    expect(idsRaiz).not.toContain('rrhh')
    // pero sí ve Operativa, DRP, Tablón, Doc-13
    expect(idsRaiz).toContain('operativa')
    expect(idsRaiz).toContain('drp')
    expect(idsRaiz).toContain('tablon')
    expect(idsRaiz).toContain('doc13')
  })

  it('rol "tes" dentro de Operativa ve Vehículos + 3 grupillos', () => {
    const filtered = filterByRol(NAV_TREE, 'tes')
    const operativa = filtered.find((n) => n.id === 'operativa')
    expect(operativa).toBeDefined()
    if (operativa?.kind === 'group') {
      const ids = operativa.children.map((c) => c.id)
      // Vehículos primero según el spec refinado del 23-05-2026
      expect(ids[0]).toBe('vehiculos_op')
      expect(ids).toContain('op_docs_turno')
      expect(ids).toContain('op_docs_clinicos')
      expect(ids).toContain('op_mantenimiento')
    }
  })

  it('rol "rrhh" solo ve RRHH (más hojas globales)', () => {
    const filtered = filterByRol(NAV_TREE, 'rrhh')
    const idsRaiz = filtered.map((n) => n.id)
    expect(idsRaiz).toContain('rrhh')
    expect(idsRaiz).toContain('tablon') // hoja global
    expect(idsRaiz).toContain('doc13') // hoja global
    expect(idsRaiz).not.toContain('drp')
    expect(idsRaiz).not.toContain('logistica')
    expect(idsRaiz).not.toContain('flota')
  })

  it('rol "logistica" ve grupo Logística pero no ve "Auditoría" (responsable_logistica only)', () => {
    const filtered = filterByRol(NAV_TREE, 'logistica')
    const log = filtered.find((n) => n.id === 'logistica')
    expect(log).toBeDefined()
    if (log?.kind === 'group') {
      const invMaestro = log.children.find((c) => c.id === 'log_inventario')
      expect(invMaestro?.kind).toBe('grupillo')
      if (invMaestro?.kind === 'grupillo') {
        const ids = invMaestro.children.map((c) => c.id)
        expect(ids).toContain('log_inv_locations')
        expect(ids).toContain('log_inv_dinamicos')
        expect(ids).not.toContain('log_inv_auditoria')
        expect(ids).not.toContain('log_descuadres')
        expect(ids).not.toContain('log_inv_catalogo')
      }
    }
  })

  it('rol "responsable_logistica" sí ve auditoría y descuadres', () => {
    const filtered = filterByRol(NAV_TREE, 'responsable_logistica')
    const node = findNode('log_inv_auditoria', filtered)
    expect(node).not.toBeNull()
  })

  it('rol "coordinacion" ve RBAC roles? NO — RBAC roles es solo gerencia', () => {
    const filtered = filterByRol(NAV_TREE, 'coordinacion')
    const node = findNode('coord_rbac', filtered)
    expect(node).toBeNull()
  })

  it('rol "gerencia" sí ve RBAC roles', () => {
    const filtered = filterByRol(NAV_TREE, 'gerencia')
    const node = findNode('coord_rbac', filtered)
    expect(node).not.toBeNull()
  })

  it('rol "sin_rol" no ve absolutamente nada', () => {
    const filtered = filterByRol(NAV_TREE, 'sin_rol')
    expect(filtered).toHaveLength(0)
  })

  it('rol "inactivo" no ve absolutamente nada', () => {
    const filtered = filterByRol(NAV_TREE, 'inactivo')
    expect(filtered).toHaveLength(0)
  })

  it('rol null no ve nada', () => {
    expect(filterByRol(NAV_TREE, null)).toHaveLength(0)
  })

  it('los grupos sin hijos visibles desaparecen del árbol filtrado', () => {
    // invitado: definido en TODOS pero algunos grupos no lo incluyen
    const filtered = filterByRol(NAV_TREE, 'invitado')
    for (const node of filtered) {
      if (node.kind === 'group' || node.kind === 'grupillo') {
        const children = (node as { children: readonly NavNode[] }).children
        expect(children.length).toBeGreaterThan(0)
      }
    }
  })
})

/* ─────────────────────────────────────────────────────────────────────────
 *  findNode / getPathTo / getChildrenOf
 * ───────────────────────────────────────────────────────────────────────── */

describe('findNode', () => {
  it('encuentra hoja fija Check-in (Home se removió 2026-05-23)', () => {
    expect(findNode('checkin')?.id).toBe('checkin')
    expect(findNode('home')).toBeNull()
  })

  it('encuentra hojas de primer nivel', () => {
    expect(findNode('tablon')?.id).toBe('tablon')
    expect(findNode('doc13')?.id).toBe('doc13')
  })

  it('encuentra hojas dentro de grupillos', () => {
    expect(findNode('doc6')?.id).toBe('doc6')
    expect(findNode('log_stock_historial')?.id).toBe('log_stock_historial')
  })

  it('devuelve null para ids inexistentes', () => {
    expect(findNode('no-existe')).toBeNull()
  })
})

describe('getPathTo', () => {
  it('hoja fija Check-in → [id]', () => {
    expect(getPathTo('checkin')).toEqual(['checkin'])
  })

  it('hoja raíz → [id]', () => {
    expect(getPathTo('tablon')).toEqual(['tablon'])
  })

  it('hoja dentro de grupillo → [group, grupillo, leaf]', () => {
    expect(getPathTo('doc6')).toEqual(['operativa', 'op_docs_turno', 'doc6'])
  })

  it('hoja del grupo (sin grupillo) → [group, leaf]', () => {
    expect(getPathTo('vehiculos_op')).toEqual(['operativa', 'vehiculos_op'])
  })

  it('devuelve null para ids inexistentes', () => {
    expect(getPathTo('no-existe')).toBeNull()
  })
})

describe('getChildrenOf', () => {
  it('parentId null → primer nivel', () => {
    const children = getChildrenOf(null)
    expect(children).toBe(NAV_TREE)
  })

  it('grupo → sus hijos directos', () => {
    const children = getChildrenOf('operativa')
    expect(children.length).toBe(4)
    expect(children[0]?.id).toBe('vehiculos_op')
  })

  it('grupillo → sus hojas', () => {
    const children = getChildrenOf('op_docs_turno')
    expect(children.length).toBe(4)
    expect(children.every((c) => c.kind === 'leaf')).toBe(true)
  })

  it('hoja → []', () => {
    const children = getChildrenOf('doc6')
    expect(children).toEqual([])
  })
})

describe('rolPuedeVer', () => {
  it('rol válido en lista → true', () => {
    const operativa = NAV_TREE.find((n) => n.id === 'operativa')!
    expect(rolPuedeVer(operativa, 'tes')).toBe(true)
  })

  it('rol no en lista → false', () => {
    const log = NAV_TREE.find((n) => n.id === 'logistica')!
    expect(rolPuedeVer(log, 'tes')).toBe(false)
  })

  it('sin_rol e inactivo siempre false', () => {
    const operativa = NAV_TREE.find((n) => n.id === 'operativa')!
    expect(rolPuedeVer(operativa, 'sin_rol')).toBe(false)
    expect(rolPuedeVer(operativa, 'inactivo')).toBe(false)
  })
})

/* ─────────────────────────────────────────────────────────────────────────
 *  Fallback RBAC (correcciones críticas Fase D)
 *  Regla: galleta emergencia sin rol → invitado (puede ver Check-in).
 *         sin_rol → ningún nodo visible, pantalla en blanco.
 * ───────────────────────────────────────────────────────────────────────── */

describe('RBAC fallback — invitado y sin_rol', () => {
  it('invitado puede ver la hoja fija Check-in | Check-out', () => {
    const checkin = NAV_FIXED_LEAVES.find((l) => l.id === 'checkin')!
    expect(checkin).toBeDefined()
    expect(rolPuedeVer(checkin, 'invitado')).toBe(true)
  })

  it('sin_rol NO puede ver la hoja fija Check-in | Check-out', () => {
    const checkin = NAV_FIXED_LEAVES.find((l) => l.id === 'checkin')!
    expect(rolPuedeVer(checkin, 'sin_rol')).toBe(false)
  })

  it('invitado solo ve las hojas raíz globales (tablón, buzón) — no grupos operativos', () => {
    const filtered = filterByRol(NAV_TREE, 'invitado')
    const ids = filtered.map((n) => n.id)
    expect(ids).toContain('tablon')
    expect(ids).toContain('doc13')
    expect(ids).not.toContain('operativa')
    expect(ids).not.toContain('drp')
    expect(ids).not.toContain('logistica')
    expect(ids).not.toContain('rrhh')
  })

  it('sin_rol no ve ningún nodo del árbol ni hojas fijas', () => {
    expect(filterByRol(NAV_TREE, 'sin_rol')).toHaveLength(0)
    const checkin = NAV_FIXED_LEAVES.find((l) => l.id === 'checkin')!
    expect(rolPuedeVer(checkin, 'sin_rol')).toBe(false)
  })
})
