import { useCallback, useMemo, useReducer } from 'react'
import {
  NAV_FIXED_LEAVES,
  NAV_TREE,
  findNode,
  filterByRol,
  getChildrenOf,
  type NavLeaf,
  type NavNode,
} from '@/components/layout/black-column-nav'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Rol } from '@/lib/auth-roles'

/* ─────────────────────────────────────────────────────────────────────────
 *  Máquina de estado del BlackColumn — Fase B.3
 *  Modelo drill-down con auto-colapso tras seleccionar hoja.
 *
 *  Reglas:
 *    - navigateInto(id) → push al path + expanded=true
 *    - goBack()         → pop del path + expanded=true (re-muestra labels)
 *    - selectLeaf(id)   → selectedLeafId=id + expanded=false (autocolapsa)
 *    - toggleExpanded() → toggle manual (override del comportamiento auto)
 *    - goHome()         → path=[], selectedLeafId='home', expanded=false
 *    - goCheckin()      → path=[], selectedLeafId='checkin', expanded=false
 * ───────────────────────────────────────────────────────────────────────── */

export interface BlackColumnState {
  /** Pila de ids desde raíz hasta el nodo en el que estamos. [] = raíz. */
  currentPath: string[]
  /** Si las etiquetas de texto están visibles. */
  expanded: boolean
  /** Hoja terminal activa cuyo contenido renderiza home_area. */
  selectedLeafId: string | null
  /**
   * Hoja con opensModal=true actualmente abierta como overlay (Dialog).
   * null si ningún modal está abierto.
   */
  modalLeafId: string | null
}

type Action =
  | { type: 'NAVIGATE_INTO';  id: string }
  | { type: 'GO_BACK' }
  | { type: 'JUMP_TO_LEVEL';  index: number }
  | { type: 'SELECT_LEAF';    id: string }
  | { type: 'OPEN_MODAL';     id: string }
  | { type: 'CLOSE_MODAL' }
  | { type: 'TOGGLE_EXPANDED' }
  | { type: 'GO_HOME' }
  | { type: 'GO_CHECKIN' }

const INITIAL_STATE: BlackColumnState = {
  currentPath:    [],
  expanded:       false,
  selectedLeafId: 'home',
  modalLeafId:    null,
}

function reducer(state: BlackColumnState, action: Action): BlackColumnState {
  switch (action.type) {
    case 'NAVIGATE_INTO':
      return {
        ...state,
        currentPath: [...state.currentPath, action.id],
        // No auto-expand — el usuario controla el panel manualmente
      }
    case 'GO_BACK': {
      if (state.currentPath.length === 0) return state
      return {
        ...state,
        currentPath: state.currentPath.slice(0, -1),
        expanded:    true,
      }
    }
    case 'JUMP_TO_LEVEL':
      // Trunca el path hasta el nivel indicado (inclusive). index 0 = raíz+1.
      return {
        ...state,
        currentPath: state.currentPath.slice(0, action.index + 1),
      }
    case 'SELECT_LEAF':
      return {
        ...state,
        selectedLeafId: action.id,
        // No auto-collapse — el usuario controla el panel manualmente
      }
    case 'OPEN_MODAL':
      return { ...state, modalLeafId: action.id }
    case 'CLOSE_MODAL':
      return { ...state, modalLeafId: null }
    case 'TOGGLE_EXPANDED':
      return { ...state, expanded: !state.expanded }
    case 'GO_HOME':
      return { currentPath: [], selectedLeafId: 'home', expanded: false, modalLeafId: null }
    case 'GO_CHECKIN':
      return { currentPath: [], selectedLeafId: 'checkin', expanded: false, modalLeafId: null }
    default:
      return state
  }
}

export interface UseBlackColumnStateOptions {
  /** Permite forzar el rol (testing). Si no se pasa, se lee de useAuthStore. */
  rol?: Rol | null
  /** Inyectables para tests; en producción usa los exports del módulo nav. */
  navTree?:    readonly NavNode[]
  navFixed?:   readonly NavLeaf[]
  initial?:    Partial<BlackColumnState>
}

export interface UseBlackColumnStateReturn extends BlackColumnState {
  /** Hojas fijas (Home, Check-in) filtradas por rol. */
  fixedLeaves: readonly NavLeaf[]
  /** Hijos visibles del nodo activo (o raíz si currentPath=[]), filtrados por rol. */
  visibleChildren: readonly NavNode[]
  /** Si el botón "atrás" debe mostrarse (estamos dentro de un grupo/grupillo). */
  canGoBack: boolean
  /** Id del nodo en el que estamos (último del path) o null si raíz. */
  currentNodeId: string | null

  navigateInto:   (id: string) => void
  goBack:         () => void
  /** Salta directamente al nivel `index` del path (útil para breadcrumbs). */
  jumpToLevel:    (index: number) => void
  selectLeaf:     (id: string) => void
  /** Abre una hoja con opensModal=true como Dialog overlay. */
  openModal:      (id: string) => void
  closeModal:     () => void
  toggleExpanded: () => void
  goHome:         () => void
  goCheckin:      () => void
}

export function useBlackColumnState(
  options: UseBlackColumnStateOptions = {},
): UseBlackColumnStateReturn {
  const rolFromStore = useAuthStore((s) => s.rol)
  const rol      = options.rol      !== undefined ? options.rol      : rolFromStore
  const navTree  = options.navTree  ?? NAV_TREE
  const navFixed = options.navFixed ?? NAV_FIXED_LEAVES

  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    ...options.initial,
  })

  // Hojas fijas filtradas por rol.
  const fixedLeaves = useMemo<readonly NavLeaf[]>(
    () => navFixed.filter((l) => {
      if (rol == null || rol === 'sin_rol' || rol === 'inactivo') return false
      return l.rolesPermitidos.includes(rol)
    }),
    [navFixed, rol],
  )

  // Árbol completo filtrado por rol (recalcula solo si rol o tree cambian).
  const treeForRol = useMemo<NavNode[]>(
    () => filterByRol(navTree, rol),
    [navTree, rol],
  )

  // Nodo activo y sus hijos visibles.
  const currentNodeId = state.currentPath.length > 0
    ? state.currentPath[state.currentPath.length - 1]
    : null

  const visibleChildren = useMemo<readonly NavNode[]>(
    () => getChildrenOf(currentNodeId, treeForRol),
    [currentNodeId, treeForRol],
  )

  const navigateInto = useCallback((id: string) => {
    // Solo permitir drill si el nodo destino es group o grupillo y existe.
    const target = findNode(id)
    if (!target || target.kind === 'leaf') return
    dispatch({ type: 'NAVIGATE_INTO', id })
  }, [])

  const goBack         = useCallback(() => dispatch({ type: 'GO_BACK' }), [])
  const jumpToLevel    = useCallback((index: number) => dispatch({ type: 'JUMP_TO_LEVEL', index }), [])
  const selectLeaf     = useCallback((id: string) => dispatch({ type: 'SELECT_LEAF', id }), [])
  const openModal      = useCallback((id: string) => dispatch({ type: 'OPEN_MODAL', id }), [])
  const closeModal     = useCallback(() => dispatch({ type: 'CLOSE_MODAL' }), [])
  const toggleExpanded = useCallback(() => dispatch({ type: 'TOGGLE_EXPANDED' }), [])
  const goHome         = useCallback(() => dispatch({ type: 'GO_HOME' }), [])
  const goCheckin      = useCallback(() => dispatch({ type: 'GO_CHECKIN' }), [])

  return {
    ...state,
    fixedLeaves,
    visibleChildren,
    canGoBack:     state.currentPath.length > 0,
    currentNodeId,
    navigateInto,
    goBack,
    jumpToLevel,
    selectLeaf,
    openModal,
    closeModal,
    toggleExpanded,
    goHome,
    goCheckin,
  }
}
