import { render, screen } from '@testing-library/react'
import App from './App'

describe('App shell', () => {
  it('arranca sin errores', () => {
    render(<App />)
  })

  it('contiene la región de contenido principal', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('contiene la navegación principal', () => {
    render(<App />)
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument()
  })
})
