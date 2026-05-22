import { describe, it, expect } from 'vitest'
import {
  NAV_TREE,
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

  it('rol "tes" dentro de Operativa solo ve documentos del turno + clínicos + mantenimiento + Vehículos', () => {
    const filtered = filterByRol(NAV_TREE, 'tes')
    const operativa = filtered.find((n) => n.id === 'operativa')
    expect(operativa).toBeDefined()
    if (operativa?.kind === 'group') {
      const ids = operativa.children.map((c) => c.id)
      expect(ids).toContain('op_docs_turno')
      expect(ids).toContain('op_docs_clinicos')
      expect(ids).toContain('op_mantenimiento')
      expect(ids).toContain('vehiculos_op')
    }
  })

  it('rol "rrhh" solo ve RRHH (más hojas globales)', () => {
    const filtered = filterByRol(NAV_TREE, 'rrhh')
    const idsRaiz = filtered.map((n) => n.id)
    expect(idsRaiz).toContain('rrhh')
    expect(idsRaiz).toContain('tablon')   // hoja global
    expect(idsRaiz).toContain('doc13')    // hoja global
    expect(idsRaiz).not.toContain('drp')
    expect(idsRaiz).not.toContain('logistica')
    expect(idsRaiz).not.toContain('flota')
  })

  it('rol "logistica" ve grupo Logística pero no ve "Auditoría" (responsable_logistica only)', () => {
    const filtered = filterByRol(NAV_TREE, 'logistica')
    const log = filtered.find((n) => n.id === 'logistica')
    expect(log).toBeDefined()
    if (log?.kind === 'group') {
      // Inventario maestro existe pero sin auditoría
      const invMaestro = log.children.find((c) => c.id === 'log_inventario')
      expect(invMaestro?.kind).toBe('grupillo')
      if (invMaestro?.kind === 'grupillo') {
        const ids = invMaestro.children.map((c) => c.id)
        expect(ids).toContain('log_inv_locations')
        expect(ids).toContain('log_inv_dinamicos')
        expect(ids).not.toContain('log_inv_auditoria')
        expect(ids).not.toContain('log_descuadres')
        expect(ids).not.toContain('log_catalogo_alt')
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
  it('encuentra hojas fijas (Home, Check-in)', () => {
    expect(findNode('home')?.id).toBe('home')
    expect(findNode('checkin')?.id).toBe('checkin')
  })

  it('encuentra hojas de primer nivel', () => {
    expect(findNode('tablon')?.id).toBe('tablon')
    expect(findNode('doc13')?.id).toBe('doc13')
  })

  it('encuentra hojas dentro de grupillos', () => {
    expect(findNode('doc6')?.id).toBe('doc6')
    expect(findNode('log_stock_actual')?.id).toBe('log_stock_actual')
  })

  it('devuelve null para ids inexistentes', () => {
    expect(findNode('no-existe')).toBeNull()
  })
})

describe('getPathTo', () => {
  it('hoja fija → [id]', () => {
    expect(getPathTo('home')).toEqual(['home'])
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
    expect(children[0]?.id).toBe('op_docs_turno')
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
