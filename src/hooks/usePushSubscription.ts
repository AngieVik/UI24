import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(sub !== null)
    })
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      setError('Push no disponible: falta clave VAPID pública.')
      return false
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push no soportado en este navegador.')
      return false
    }
    setIsLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const key = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      const { error: rpcErr } = await supabase.rpc('rpc_suscribir_push', {
        p_endpoint: sub.endpoint,
        p_p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
        p_auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
        p_user_agent: navigator.userAgent.slice(0, 200),
      })
      if (rpcErr) throw rpcErr
      setIsSubscribed(true)
      return true
    } catch (e) {
      setError(resolveRpcError(e))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setIsSubscribed(false)
        return true
      }
      await sub.unsubscribe()
      const { error: rpcErr } = await supabase.rpc('rpc_cancelar_push', {
        p_endpoint: sub.endpoint,
      })
      if (rpcErr) throw rpcErr
      setIsSubscribed(false)
      return true
    } catch (e) {
      setError(resolveRpcError(e))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const isPushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY

  return { isSubscribed, isLoading, error, isPushSupported, subscribe, unsubscribe }
}
