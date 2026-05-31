import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface AvisoItem {
  id_aviso: string
  tipo_aviso: string
  nivel: 'informativo' | 'aviso' | 'critico'
  id_nombre_emisor: string
  texto: string
  timestamp_publicacion: string
  leido_por: string[]
}

export function useAvisos() {
  const ejecutorId = useAuthStore((s) => s.ejecutorId)
  const [avisos, setAvisos] = useState<AvisoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarAvisos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('doc11_avisos')
        .select(
          'id_aviso, tipo_aviso, nivel, id_nombre_emisor, texto, timestamp_publicacion, leido_por'
        )
        .order('timestamp_publicacion', { ascending: false })
        .limit(50)
      if (err) throw err
      setAvisos((data ?? []) as AvisoItem[])
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const marcarLeido = useCallback(
    async (idAviso: string): Promise<boolean> => {
      try {
        const { error: err } = await supabase.rpc('rpc_marcar_aviso_leido', { p_id_aviso: idAviso })
        if (err) throw err
        setAvisos((prev) =>
          prev.map((a) =>
            a.id_aviso === idAviso && ejecutorId && !a.leido_por.includes(ejecutorId)
              ? { ...a, leido_por: [...a.leido_por, ejecutorId] }
              : a
          )
        )
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      }
    },
    [ejecutorId]
  )

  useEffect(() => {
    cargarAvisos()
  }, [cargarAvisos])

  return { avisos, loading, error, setError, cargarAvisos, marcarLeido }
}
