import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface AnuncioItem {
  id_anuncio: string
  seccion: 'normativas' | 'protocolos' | 'avisos_corporativos'
  titulo: string
  contenido: string
  estado: 'activo' | 'archivado'
  id_nombre_autor: string
  timestamp_publicacion: string
}

export function useTablon() {
  const [anuncios, setAnuncios] = useState<AnuncioItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarTablon = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('tablon_anuncios')
        .select('id_anuncio, seccion, titulo, contenido, estado, id_nombre_autor, timestamp_publicacion')
        .eq('estado', 'activo')
        .order('timestamp_publicacion', { ascending: false })
      if (err) throw err
      setAnuncios((data ?? []) as AnuncioItem[])
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarTablon() }, [cargarTablon])

  const porSeccion = (seccion: AnuncioItem['seccion']) =>
    anuncios.filter((a) => a.seccion === seccion)

  return { anuncios, loading, error, setError, cargarTablon, porSeccion }
}
