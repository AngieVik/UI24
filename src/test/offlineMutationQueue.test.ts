import { describe, it, expect, beforeEach } from 'vitest'
import { useOfflineMutationQueue, MAX_ATTEMPTS } from '@/lib/offlineMutationQueue'

beforeEach(() => {
  useOfflineMutationQueue.setState({ pending: [], isProcessing: false })
})

describe('offlineMutationQueue', () => {
  it('enqueue añade mutación con enqueuedAt y attempts=0', () => {
    useOfflineMutationQueue.getState().enqueue({
      uuid: 'm1',
      rpcName: 'rpc_checkin',
      payload: { x: 1, mutation_uuid: 'm1' },
      ejecutorId: 'admin',
    })
    const { pending } = useOfflineMutationQueue.getState()
    expect(pending).toHaveLength(1)
    expect(pending[0].uuid).toBe('m1')
    expect(pending[0].attempts).toBe(0)
    expect(pending[0].enqueuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('remove elimina por uuid', () => {
    const q = useOfflineMutationQueue.getState()
    q.enqueue({ uuid: 'a', rpcName: 'r', payload: {}, ejecutorId: null })
    q.enqueue({ uuid: 'b', rpcName: 'r', payload: {}, ejecutorId: null })
    q.remove('a')
    expect(useOfflineMutationQueue.getState().pending.map((p) => p.uuid)).toEqual(['b'])
  })

  it('markAttempt incrementa attempts y marca failed al alcanzar MAX_ATTEMPTS', () => {
    const q = useOfflineMutationQueue.getState()
    q.enqueue({ uuid: 'x', rpcName: 'r', payload: {}, ejecutorId: null })
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      q.markAttempt('x', `err ${i}`)
    }
    const m = useOfflineMutationQueue.getState().pending[0]
    expect(m.attempts).toBe(MAX_ATTEMPTS)
    expect(m.failed).toBe(true)
    expect(m.lastError).toBe(`err ${MAX_ATTEMPTS - 1}`)
  })

  it('retryFailed resetea attempts y failed', () => {
    const q = useOfflineMutationQueue.getState()
    q.enqueue({ uuid: 'x', rpcName: 'r', payload: {}, ejecutorId: null })
    for (let i = 0; i < MAX_ATTEMPTS; i++) q.markAttempt('x', 'e')
    q.retryFailed()
    const m = useOfflineMutationQueue.getState().pending[0]
    expect(m.attempts).toBe(0)
    expect(m.failed).toBe(false)
    expect(m.lastError).toBeUndefined()
  })

  it('clearFailed elimina solo los failed', () => {
    const q = useOfflineMutationQueue.getState()
    q.enqueue({ uuid: 'ok', rpcName: 'r', payload: {}, ejecutorId: null })
    q.enqueue({ uuid: 'bad', rpcName: 'r', payload: {}, ejecutorId: null })
    for (let i = 0; i < MAX_ATTEMPTS; i++) q.markAttempt('bad', 'e')
    q.clearFailed()
    expect(useOfflineMutationQueue.getState().pending.map((p) => p.uuid)).toEqual(['ok'])
  })

  it('setProcessing flag', () => {
    useOfflineMutationQueue.getState().setProcessing(true)
    expect(useOfflineMutationQueue.getState().isProcessing).toBe(true)
    useOfflineMutationQueue.getState().setProcessing(false)
    expect(useOfflineMutationQueue.getState().isProcessing).toBe(false)
  })
})
