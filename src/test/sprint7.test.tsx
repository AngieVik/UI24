import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ── Mocks de IndexedDB y supabase ─────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { refreshSession: vi.fn() }, rpc: vi.fn() },
}))

// ── Imports ───────────────────────────────────────────────────────────────

import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { Modal, ModalError } from '@/components/feedback/ModalError'
import { ToastContainer } from '@/components/feedback/ToastContainer'
import { Header } from '@/components/layout/Header'
import { BlackColumn } from '@/components/layout/BlackColumn'
import { useToast } from '@/hooks/useToast'

// ── Badge ─────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renderiza con tono por defecto', () => {
    render(<Badge>Operativo</Badge>)
    expect(screen.getByText('Operativo')).toBeInTheDocument()
  })

  it('aplica clase de tono correctamente', () => {
    const { container } = render(<Badge tone="crit">Error</Badge>)
    expect(container.firstChild).toHaveClass('badge--crit')
  })

  it('incluye icono con aria-hidden', () => {
    const { container } = render(<Badge icon="ti-home">Home</Badge>)
    const icon = container.querySelector('.ti-home')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})

// ── Btn ───────────────────────────────────────────────────────────────────

describe('Btn', () => {
  it('renderiza y dispara onClick', () => {
    const onClick = vi.fn()
    render(<Btn onClick={onClick}>Guardar</Btn>)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('aplica tono yellow', () => {
    const { container } = render(<Btn tone="yellow">Confirmar</Btn>)
    expect(container.firstChild).toHaveClass('btn--yellow')
  })

  it('está deshabilitado cuando disabled=true', () => {
    render(<Btn disabled>Enviar</Btn>)
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('el icono lleva aria-hidden', () => {
    const { container } = render(<Btn icon="ti-home">Ir</Btn>)
    const icon = container.querySelector('.ti-home')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})

// ── LoadingSkeleton ───────────────────────────────────────────────────────

describe('LoadingSkeleton', () => {
  it('variant=card tiene role=status y aria-label', () => {
    render(<LoadingSkeleton variant="card" rows={2} />)
    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando…')
  })

  it('variant=spinner tiene role=status', () => {
    render(<LoadingSkeleton variant="spinner" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('variant=row renderiza N columnas', () => {
    const { container } = render(<LoadingSkeleton variant="row" columns={3} />)
    expect(container.querySelectorAll('.skel-pulse')).toHaveLength(3)
  })
})

// ── Modal ─────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('no renderiza nada cuando open=false', () => {
    render(
      <Modal open={false} title="Test" onClose={vi.fn()}>
        contenido
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza con role=dialog y aria-modal cuando open=true', () => {
    render(
      <Modal open={true} title="Confirmar" onClose={vi.fn()}>
        cuerpo
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
  })

  it('llama onClose al pulsar Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Escape" onClose={onClose}>
        cuerpo
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('llama onClose al pulsar el botón Cerrar', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Botón" onClose={onClose}>
        cuerpo
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('el título es accesible via aria-labelledby', () => {
    render(
      <Modal open={true} title="Mi título" onClose={vi.fn()}>
        cuerpo
      </Modal>,
    )
    expect(screen.getByText('Mi título')).toHaveAttribute('id', 'modal-title')
  })
})

// ── ModalError ────────────────────────────────────────────────────────────

describe('ModalError', () => {
  it('muestra el mensaje de error', () => {
    render(
      <ModalError
        open={true}
        message="Sesión no reconocida. Vuelve a iniciar sesión."
        onClose={vi.fn()}
      />,
    )
    expect(
      screen.getByText('Sesión no reconocida. Vuelve a iniciar sesión.'),
    ).toBeInTheDocument()
  })

  it('muestra botón Reintentar si onRetry está definido', () => {
    render(
      <ModalError open={true} message="Error" onClose={vi.fn()} onRetry={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('no muestra botón Reintentar si onRetry es undefined', () => {
    render(<ModalError open={true} message="Error" onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})

// ── Header ────────────────────────────────────────────────────────────────

describe('Header', () => {
  it('renderiza con role=banner', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('muestra el texto de marquesina', () => {
    render(<Header marquesinaText="Aviso importante del sistema" />)
    expect(screen.getByText('Aviso importante del sistema')).toBeInTheDocument()
  })

  it('el botón de mensajes tiene aria-label con conteo cuando hay no leídos', () => {
    render(<Header unreadCount={3} />)
    expect(
      screen.getByRole('button', { name: /3 sin leer/i }),
    ).toBeInTheDocument()
  })

  it('el botón de mensajes tiene aria-label genérico sin no leídos', () => {
    render(<Header unreadCount={0} />)
    expect(
      screen.getByRole('button', { name: /bandeja de mensajes/i }),
    ).toBeInTheDocument()
  })
})

// ── BlackColumn ───────────────────────────────────────────────────────────

describe('BlackColumn', () => {
  it('renderiza nav con aria-label', () => {
    render(<BlackColumn activeId="home" onSelect={vi.fn()} />)
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
  })

  it('el item activo tiene aria-current=page', () => {
    render(<BlackColumn activeId="home" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Home' })
    expect(btn).toHaveAttribute('aria-current', 'page')
  })

  it('llama onSelect con el id correcto al hacer click en item simple', () => {
    const onSelect = vi.fn()
    render(<BlackColumn activeId="home" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }))
    expect(onSelect).toHaveBeenCalledWith('checkin')
  })

  it('expande el grupo Operativa al hacer click y muestra subitems', () => {
    render(<BlackColumn activeId="home" onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Operativa rutinaria' }))
    expect(screen.getByRole('button', { name: 'Doc-8 Parte de trabajo' })).toBeInTheDocument()
  })

  it('colapsa el grupo al hacer click de nuevo', () => {
    render(<BlackColumn activeId="home" onSelect={vi.fn()} />)
    const groupBtn = screen.getByRole('button', { name: 'Operativa rutinaria' })
    fireEvent.click(groupBtn) // expand
    fireEvent.click(groupBtn) // collapse
    expect(screen.queryByRole('button', { name: 'Doc-8 Parte de trabajo' })).not.toBeInTheDocument()
  })

  it('aria-expanded refleja el estado del grupo', () => {
    render(<BlackColumn activeId="home" onSelect={vi.fn()} />)
    const groupBtn = screen.getByRole('button', { name: 'Operativa rutinaria' })
    expect(groupBtn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(groupBtn)
    expect(groupBtn).toHaveAttribute('aria-expanded', 'true')
  })
})

// ── ToastContainer + useToast ─────────────────────────────────────────────

describe('ToastContainer + useToast', () => {
  beforeEach(() => {
    useToast.setState({ toasts: [] })
  })

  it('no renderiza nada sin toasts', () => {
    render(<ToastContainer />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra un toast al llamar toast()', () => {
    render(<ToastContainer />)
    act(() => { useToast.getState().toast('Guardado correctamente', 'ok') })
    expect(screen.getByRole('alert')).toHaveTextContent('Guardado correctamente')
  })

  it('el toast tiene la clase de tono correcta', () => {
    render(<ToastContainer />)
    act(() => { useToast.getState().toast('Error crítico', 'crit') })
    expect(screen.getByRole('alert')).toHaveClass('toast--crit')
  })

  it('dismiss elimina el toast', () => {
    render(<ToastContainer />)
    act(() => { useToast.getState().toast('Mensaje', 'info') })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el contenedor tiene aria-live=polite', () => {
    act(() => { useToast.getState().toast('Hola', 'info') })
    render(<ToastContainer />)
    expect(screen.getByRole('region')).toHaveAttribute('aria-live', 'polite')
  })
})
