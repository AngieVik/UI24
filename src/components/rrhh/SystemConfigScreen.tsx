import { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { useStepUp } from '@/hooks/useStepUp'
import { useAuthStore } from '@/stores/useAuthStore'

interface EditState {
  clave: string
  valorStr: string
}

export function SystemConfigScreen() {
  const rol = useAuthStore((s) => s.session?.user?.user_metadata?.rol as string | undefined)
  const { config, versiones, forceUpdate, loading, submitting, error, setError,
          cargarConfig, setConfigValue } = useSystemConfig()
  const { requestStepUp } = useStepUp()

  const [edit, setEdit] = useState<EditState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [tab, setTab] = useState<'config' | 'versiones'>('config')

  const esGerencia = rol === 'gerencia'

  function openEdit(clave: string, valor: unknown) {
    setEdit({ clave, valorStr: JSON.stringify(valor, null, 2) })
    setEditError(null)
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!edit) return
    setEditError(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(edit.valorStr)
    } catch {
      setEditError('JSON no válido.')
      return
    }

    try {
      await requestStepUp()
    } catch {
      return
    }

    const ok = await setConfigValue(edit.clave, parsed)
    if (ok) { setEdit(null); setEditError(null) }
  }

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">Configuración del sistema</h1>
        <Btn variant="secondary" size="sm" onClick={cargarConfig} aria-label="Actualizar configuración">
          ↺ Actualizar
        </Btn>
      </div>

      {forceUpdate && (
        <div role="alert" className="bg-red-900/60 text-red-300 p-3 rounded text-sm">
          ⚠ Esta versión del cliente ya no está soportada. Actualiza la aplicación para continuar.
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Pestañas de configuración" className="flex gap-1 border-b border-border-1">
        {(['config', 'versiones'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              tab === t ? 'bg-u24-yellow text-black font-medium' : 'text-fg-2 hover:text-fg-1'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'config' ? 'Parámetros' : 'Versiones'}
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton variant="row" />}

      {/* Tab: Parámetros */}
      {!loading && tab === 'config' && (
        <>
          {config.length === 0 && (
            <p className="text-fg-2 text-sm">No hay parámetros configurados.</p>
          )}
          <ul className="space-y-2" aria-label="Parámetros de configuración">
            {config.map((entry) => (
              <li key={entry.clave} className="border border-border-1 bg-surface-1 rounded p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-fg-1 text-sm font-mono">{entry.clave}</div>
                    {entry.descripcion && (
                      <div className="text-fg-2 text-xs">{entry.descripcion}</div>
                    )}
                    <div className="text-fg-3 text-xs font-mono break-all">
                      {JSON.stringify(entry.valor)}
                    </div>
                  </div>
                  {esGerencia && (
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(entry.clave, entry.valor)}
                      aria-label={`Editar ${entry.clave}`}
                    >
                      Editar
                    </Btn>
                  )}
                </div>
                {entry.id_nombre_modificador && (
                  <div className="text-fg-3 text-xs">
                    Modificado por {entry.id_nombre_modificador} ·{' '}
                    {new Date(entry.updated_at).toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Tab: Versiones */}
      {!loading && tab === 'versiones' && (
        <ul className="space-y-2" aria-label="Versiones del cliente">
          {versiones.map((v) => (
            <li key={v.version_semver} className="border border-border-1 bg-surface-1 rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-fg-1 text-sm font-mono">{v.version_semver}</span>
                <Badge tone={v.activa ? 'ok' : 'info'}>{v.activa ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <div className="text-fg-2 text-xs">Mínima permitida: {v.min_version_permitida}</div>
              {v.notas && <div className="text-fg-3 text-xs">{v.notas}</div>}
            </li>
          ))}
          {versiones.length === 0 && (
            <p className="text-fg-2 text-sm">No hay versiones registradas.</p>
          )}
        </ul>
      )}

      {/* Modal de edición */}
      {edit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cfg-edit-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <form
            onSubmit={handleGuardar}
            className="bg-surface-1 border border-border-1 rounded-lg p-5 w-full max-w-sm space-y-4"
          >
            <h2 id="cfg-edit-titulo" className="text-fg-1 font-cmd text-base">
              Editar: <span className="font-mono">{edit.clave}</span>
            </h2>

            <p className="text-warn-400 text-xs">
              Esta operación requiere confirmación por step-up.
            </p>

            {editError && <p role="alert" className="text-red-400 text-xs">{editError}</p>}

            <label className="flex flex-col gap-1 text-fg-2 text-xs">
              Valor (JSON)
              <textarea
                className="bg-surface-2 border border-border-1 rounded p-2 text-fg-1 text-sm font-mono resize-none"
                rows={4}
                value={edit.valorStr}
                onChange={(e) => setEdit((s) => s && { ...s, valorStr: e.target.value })}
                aria-label="Valor JSON"
                required
              />
            </label>

            <div className="flex gap-3 justify-end">
              <Btn
                variant="secondary"
                size="sm"
                type="button"
                disabled={submitting}
                onClick={() => { setEdit(null); setEditError(null) }}
              >
                Cancelar
              </Btn>
              <Btn variant="primary" size="sm" type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
