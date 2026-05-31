import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

export interface ConfigEntry {
  clave: string
  valor: unknown
  descripcion: string | null
  id_nombre_modificador: string | null
  updated_at: string
}

export interface VersionEntry {
  version_semver: string
  min_version_permitida: string
  publicada_at: string
  activa: boolean
  notas: string | null
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION as string | undefined

function semverLt(a: string, b: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [aMaj, aMin, aPatch] = parse(a)
  const [bMaj, bMin, bPatch] = parse(b)
  if (aMaj !== bMaj) return aMaj < bMaj
  if (aMin !== bMin) return aMin < bMin
  return aPatch < bPatch
}

export function useSystemConfig() {
  const [config, setConfig] = useState<ConfigEntry[]>([])
  const [versiones, setVersiones] = useState<VersionEntry[]>([])
  const [forceUpdate, setForceUpdate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cfgRes, verRes] = await Promise.all([
        supabase.from('system_config').select('*').order('clave'),
        supabase
          .from('versiones_cliente')
          .select('*')
          .eq('activa', true)
          .order('publicada_at', { ascending: false }),
      ])
      if (cfgRes.error) throw cfgRes.error
      if (verRes.error) throw verRes.error
      setConfig((cfgRes.data ?? []) as ConfigEntry[])
      setVersiones((verRes.data ?? []) as VersionEntry[])

      // Verificar force-update
      if (APP_VERSION && verRes.data && verRes.data.length > 0) {
        const minVer = verRes.data[0].min_version_permitida
        setForceUpdate(semverLt(APP_VERSION, minVer))
      }
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const setConfigValue = useCallback(
    async (clave: string, valor: unknown): Promise<boolean> => {
      setSubmitting(true)
      setError(null)
      try {
        const { error: err } = await supabase.rpc('rpc_set_system_config', {
          p_clave: clave,
          p_valor: valor as import('../types/supabase').Json,
        })
        if (err) throw err
        await cargarConfig()
        return true
      } catch (e) {
        setError(resolveRpcError(e))
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [cargarConfig]
  )

  useEffect(() => {
    cargarConfig()
  }, [cargarConfig])

  return {
    config,
    versiones,
    forceUpdate,
    loading,
    submitting,
    error,
    setError,
    cargarConfig,
    setConfigValue,
  }
}
