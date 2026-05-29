import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithShell, screen, within } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { BlackColumn } from '@/components/layout/BlackColumn'
import { useAuthStore } from '@/stores/useAuthStore'

/**
 * Tests del componente BlackColumn (Fase B.6).
 *
 * Las interacciones críticas:
 *   - drill-down a grupo y grupillo
 *   - encabezado padre activo aparece y vuelve atrás al pulsarlo
 *   - botón Atrás aparece SOLO dentro de un grupo
 *   - Toggle siempre presente
 *   - orden de botones inferiores: Atrás penúltimo, Toggle último
 *   - RBAC visual oculta items para roles sin permiso
 */

beforeEach(() => {
  // Estado inicial: rol gerencia (ve todo).
  useAuthStore.setState({
    session: { user: { app_metadata: { rol: 'gerencia' } } } as never,
    ejecutorId: 'admin',
    rol: 'gerencia',
  })
})

describe('BlackColumn — render inicial (raíz)', () => {
  it('renderiza Check-in arriba y los 9 items raíz', () => {
    renderWithShell(<BlackColumn />)
    // Check-in (hoja fija)
    expect(screen.getByRole('button', { name: 'Check-in | Check-out' })).toBeInTheDocument()
    // Algunos grupos raíz
    expect(screen.getByRole('button', { name: 'Operativa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DRP' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gestión y RRHH' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tablón central' })).toBeInTheDocument()
  })

  it('en raíz NO muestra el botón Atrás', () => {
    renderWithShell(<BlackColumn />)
    expect(screen.queryByRole('button', { name: 'Atrás' })).not.toBeInTheDocument()
  })

  it('en raíz SIEMPRE muestra el botón Toggle', () => {
    renderWithShell(<BlackColumn />)
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument()
  })

  it('NO renderiza el botón Home (movido al logo del Header)', () => {
    renderWithShell(<BlackColumn />)
    expect(screen.queryByRole('button', { name: /^Home$/i })).not.toBeInTheDocument()
  })
})

describe('BlackColumn — drill-down a grupo', () => {
  it('pulsar Operativa muestra sus hijos', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    // Hijos visibles
    expect(screen.getByRole('button', { name: 'Vehículos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Operativas rutinarias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Documentos clínicos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mantenimiento' })).toBeInTheDocument()
  })

  it('al entrar en un grupo aparece el botón Atrás', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeInTheDocument()
  })

  it('el encabezado del padre activo aparece con aria-current="page"', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    // Hay dos botones con texto "Operativa": el encabezado (active) y posiblemente
    // ninguno en la lista de hijos (porque desaparece). El encabezado tiene aria-current.
    const padre = screen.getByRole('button', { name: 'Operativa', current: 'page' })
    expect(padre).toBeInTheDocument()
  })

  it('pulsar el encabezado del padre activo = goBack (vuelve a raíz)', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    expect(screen.getByRole('button', { name: 'Vehículos' })).toBeInTheDocument()

    // Click en el encabezado padre Operativa (el que tiene aria-current=page)
    await user.click(screen.getByRole('button', { name: 'Operativa', current: 'page' }))

    // Vuelve a raíz — Vehículos ya no debe estar visible
    expect(screen.queryByRole('button', { name: 'Vehículos' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Operativa' })).toBeInTheDocument()
    // Atrás desaparece en raíz
    expect(screen.queryByRole('button', { name: 'Atrás' })).not.toBeInTheDocument()
  })
})

describe('BlackColumn — drill-down a grupillo (3 niveles)', () => {
  it('pulsar grupillo muestra sus hojas', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    await user.click(screen.getByRole('button', { name: 'Operativas rutinarias' }))

    expect(screen.getByRole('button', { name: 'Doc-10 Envío de material' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Doc-6 Gasto de material' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Doc-8 Parte de trabajo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Doc-Checklist360' })).toBeInTheDocument()
  })

  it('en grupillo, el encabezado padre es el grupillo (no el grupo)', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    await user.click(screen.getByRole('button', { name: 'Operativas rutinarias' }))

    // El padre directo es "Operativas rutinarias"
    expect(
      screen.getByRole('button', { name: 'Operativas rutinarias', current: 'page' }),
    ).toBeInTheDocument()
  })

  it('Atrás desde grupillo vuelve al grupo (no a raíz)', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    await user.click(screen.getByRole('button', { name: 'Operativas rutinarias' }))
    await user.click(screen.getByRole('button', { name: 'Atrás' }))

    // Estamos de nuevo en el grupo Operativa
    expect(screen.getByRole('button', { name: 'Vehículos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Operativas rutinarias' })).toBeInTheDocument()
  })
})

describe('BlackColumn — orden de botones inferiores', () => {
  it('en raíz, Toggle está al fondo (es el último botón)', () => {
    const { container } = renderWithShell(<BlackColumn />)
    const buttons = within(container).getAllByRole('button')
    const lastBtn = buttons[buttons.length - 1]
    expect(lastBtn).toHaveAttribute('aria-label', 'Expandir panel')
  })

  it('dentro de un grupo, orden = ... Atrás, Toggle (Toggle último)', async () => {
    const user = userEvent.setup()
    const { container } = renderWithShell(<BlackColumn />)
    await user.click(screen.getByRole('button', { name: 'Operativa' }))

    const buttons = within(container).getAllByRole('button')
    const lastBtn       = buttons[buttons.length - 1]
    const penultimaBtn  = buttons[buttons.length - 2]
    // Toggle se actualiza a "Contraer panel" cuando expanded=true
    expect(lastBtn.getAttribute('aria-label')).toMatch(/Contraer panel|Expandir panel/)
    expect(penultimaBtn).toHaveAttribute('aria-label', 'Atrás')
  })
})

describe('BlackColumn — Toggle manual', () => {
  it('pulsar Toggle cambia el label de Expandir a Contraer y viceversa', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expandir panel' }))
    expect(screen.getByRole('button', { name: 'Contraer panel' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Contraer panel' }))
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument()
  })
})

describe('BlackColumn — RBAC visual', () => {
  it('rol "tes" no ve Logística ni Flota ni Coordinación ni RRHH', () => {
    useAuthStore.setState({ rol: 'tes' })
    renderWithShell(<BlackColumn />)
    expect(screen.queryByRole('button', { name: 'Logística' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Flota' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Coordinación y seguridad' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gestión y RRHH' })).not.toBeInTheDocument()
    // pero sí ve Operativa, DRP, Tablón, Doc-13
    expect(screen.getByRole('button', { name: 'Operativa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DRP' })).toBeInTheDocument()
  })

  it('rol "sin_rol" solo ve el Toggle (sin contenido drill)', () => {
    useAuthStore.setState({ rol: 'sin_rol' })
    renderWithShell(<BlackColumn />)
    // No hay Check-in ni grupos
    expect(screen.queryByRole('button', { name: 'Check-in | Check-out' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Operativa' })).not.toBeInTheDocument()
    // Pero el Toggle siempre está
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument()
  })
})

describe('BlackColumn — selección de hoja', () => {
  it('al seleccionar una hoja, queda activa y expanded no cambia (usuario controla)', async () => {
    const user = userEvent.setup()
    renderWithShell(<BlackColumn />)

    // navigateInto y selectLeaf NO tocan expanded — el panel sigue colapsado
    await user.click(screen.getByRole('button', { name: 'Operativa' }))
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument()

    // Pulsar la hoja — selectLeaf no cambia expanded
    await user.click(screen.getByRole('button', { name: 'Vehículos' }))
    expect(screen.getByRole('button', { name: 'Vehículos', current: 'page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument()
  })
})
