import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), refreshSession: vi.fn() },
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    from: vi.fn().mockReturnValue({
      select: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
    }),
  },
}))

vi.mock('@/lib/fingerprint', () => ({
  computeFingerprint: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/offlineSession', () => ({
  saveOfflineSession: vi.fn(),
  verifyOfflineLogin: vi.fn().mockResolvedValue(false),
  loadOfflineSession: vi.fn().mockResolvedValue(null),
  clearOfflineSession: vi.fn(),
  isOfflineSessionValid: vi.fn().mockReturnValue(true),
}))

// ── Imports ───────────────────────────────────────────────────────────────

import App from './App'
import { useAuthStore } from '@/stores/useAuthStore'
import { useActivacionStore } from '@/stores/useActivacionStore'

// ── Tests ─────────────────────────────────────────────────────────────────

describe('App shell', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, ejecutorId: null })
    useActivacionStore.setState({
      id_activacion: '',
      id_parte: '',
      id_checklist: '',
      matricula: '',
      checklistCerrado: false,
    })
  })

  it('arranca sin errores y muestra login cuando no hay sesión', () => {
    render(<App />)
    expect(screen.getByText('U24')).toBeInTheDocument()
  })

  it('muestra los tabs de login en estado no autenticado', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: 'Acceso normal' })).toBeInTheDocument()
  })

  it('muestra el picker de vehículo cuando hay sesión pero sin activacion', () => {
    useAuthStore.setState({
      session: { user: { id: '1', user_metadata: { id_nombre: 'tes01' } } } as never,
      ejecutorId: 'tes01',
    })
    render(<App />)
    expect(screen.getByRole('main', { name: /Selección de vehículo/i })).toBeInTheDocument()
  })

  it('muestra la navegación principal cuando hay sesión y activacion con checklist cerrado', () => {
    useAuthStore.setState({
      session: { user: { id: '1', user_metadata: { id_nombre: 'tes01' } } } as never,
      ejecutorId: 'tes01',
    })
    useActivacionStore.setState({
      id_activacion:    'act-1',
      id_parte:         'parte-1',
      id_checklist:     'check-1',
      matricula:        '1234-ABC',
      checklistCerrado: true,
    })
    render(<App />)
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
  })
})
