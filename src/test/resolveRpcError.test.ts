import { describe, it, expect } from 'vitest'
import { resolveRpcError } from '@/lib/resolveRpcError'

describe('resolveRpcError', () => {
  it('devuelve mensaje español para código conocido', () => {
    const err = new Error('ERR_AUTH_001: auth.uid() no mapea a ninguna ficha')
    expect(resolveRpcError(err)).toBe('Sesión no reconocida. Vuelve a iniciar sesión.')
  })

  it('devuelve mensaje de inventario con código conocido', () => {
    const err = new Error('ERR_INVENTARIO_006: Stock insuficiente. Disponible: 3, solicitado: 10')
    expect(resolveRpcError(err)).toBe('Stock insuficiente.')
  })

  it('devuelve fallback para código desconocido', () => {
    const err = new Error('ERR_DESCONOCIDO_999: algo raro')
    expect(resolveRpcError(err)).toBe('Error inesperado. Contacta con soporte.')
  })

  it('devuelve fallback para errores de red sin prefijo ERR_', () => {
    const err = new Error('Failed to fetch')
    expect(resolveRpcError(err)).toBe('Error inesperado. Contacta con soporte.')
  })

  it('acepta strings además de Error', () => {
    expect(resolveRpcError('ERR_KM_001: km retrograde')).toBe(
      'El kilómetro de cierre no puede ser menor que el de apertura.'
    )
  })

  it('cubre todos los dominios definidos en error_handling.md', () => {
    const codigos = [
      'ERR_AUTH_001',
      'ERR_AUTH_002',
      'ERR_AUTH_003',
      'ERR_AUTH_004',
      'ERR_STEPUP_001',
      'ERR_STEPUP_002',
      'ERR_STEPUP_003',
      'ERR_STEPUP_004',
      'ERR_STEPUP_005',
      'ERR_DESBLOQUEO_001',
      'ERR_DESBLOQUEO_002',
      'ERR_DESBLOQUEO_003',
      'ERR_VEHICULO_001',
      'ERR_VEHICULO_002',
      'ERR_VEHICULO_003',
      'ERR_VEHICULO_004',
      'ERR_VEHICULO_005',
      'ERR_INVENTARIO_001',
      'ERR_INVENTARIO_002',
      'ERR_INVENTARIO_003',
      'ERR_INVENTARIO_004',
      'ERR_INVENTARIO_005',
      'ERR_INVENTARIO_006',
      'ERR_CHECKLIST_001',
      'ERR_KM_001',
    ]
    for (const codigo of codigos) {
      const result = resolveRpcError(new Error(`${codigo}: desc`))
      expect(result, `${codigo} debe tener mensaje UI`).not.toBe(
        'Error inesperado. Contacta con soporte.'
      )
    }
  })
})
