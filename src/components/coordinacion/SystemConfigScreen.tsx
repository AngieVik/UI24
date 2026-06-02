import { useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useSystemConfig, type ConfigEntry } from '@/hooks/useSystemConfig'

/**
 * SystemConfigScreen — gestión de flags globales del sistema.
 * Solo visible para gerencia (nav: system_config, GERENCIA_ONLY).
 *
 * Permite activar/desactivar flags booleanos ({enabled: bool} / {activo: bool})
 * y muestra el estado de versiones_cliente para el bloque de force-update.
 */
export function SystemConfigScreen() {
  const { config, versiones, loading, submitting, error, cargarConfig, setConfigValue } =
    useSystemConfig()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings2 aria-hidden="true" className="size-5" />
          <h1 className="font-display text-xl font-bold">Configuración del sistema</h1>
        </div>
        <Button variant="outline" size="sm" onClick={cargarConfig} disabled={loading}>
          <RefreshCw aria-hidden="true" className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* ── Flags del sistema ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Flags del sistema</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {loading && config.length === 0 ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          ) : (
            config.map((entry) => <ConfigRow key={entry.clave} entry={entry} onSave={setConfigValue} disabled={submitting} />)
          )}
        </CardContent>
      </Card>

      {/* ── Versiones del cliente ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Versiones del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && versiones.length === 0 ? (
            <Skeleton className="h-10 w-full" />
          ) : versiones.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">Sin registros.</p>
          ) : (
            <div className="divide-y">
              {versiones.map((v) => (
                <div key={v.version_semver} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-mono text-sm font-medium">{v.version_semver}</span>
                  {v.activa && <Badge variant="default">Activa</Badge>}
                  <span className="font-body text-sm text-muted-foreground">
                    Mínima permitida:{' '}
                    <span className="font-medium text-foreground">{v.min_version_permitida}</span>
                  </span>
                  {v.notas && (
                    <span className="font-body text-xs text-muted-foreground">{v.notas}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ── ConfigRow ─────────────────────────────────────────────────────────────── */

interface ConfigRowProps {
  entry: ConfigEntry
  onSave: (clave: string, valor: unknown) => Promise<boolean>
  disabled: boolean
}

function ConfigRow({ entry, onSave, disabled }: ConfigRowProps) {
  const { clave, valor, descripcion, updated_at } = entry

  // Detectar flags booleanos simples: {enabled: bool} o {activo: bool}
  const isBoolFlag =
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor) &&
    ('enabled' in valor || 'activo' in valor)

  const boolKey = isBoolFlag
    ? 'enabled' in (valor as Record<string, unknown>)
      ? 'enabled'
      : 'activo'
    : null

  const boolValue = boolKey ? Boolean((valor as Record<string, unknown>)[boolKey]) : null

  const [localJson, setLocalJson] = useState(JSON.stringify(valor, null, 2))
  const [editingJson, setEditingJson] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)

  async function handleToggle(checked: boolean) {
    await onSave(clave, { ...(valor as object), [boolKey!]: checked })
  }

  async function handleSaveJson() {
    try {
      const parsed = JSON.parse(localJson)
      setJsonError(null)
      const ok = await onSave(clave, parsed)
      if (ok) setEditingJson(false)
    } catch {
      setJsonError('JSON inválido')
    }
  }

  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-medium">{clave}</p>
          {descripcion && (
            <p className="font-body text-xs text-muted-foreground">{descripcion}</p>
          )}
          <p className="font-body text-xs text-muted-foreground">
            Última actualización: {new Date(updated_at).toLocaleString('es-ES')}
          </p>
        </div>

        {isBoolFlag && boolKey ? (
          <Switch
            checked={boolValue ?? false}
            onCheckedChange={handleToggle}
            disabled={disabled}
            aria-label={`Toggle ${clave}`}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocalJson(JSON.stringify(valor, null, 2))
              setEditingJson((v) => !v)
            }}
          >
            {editingJson ? 'Cancelar' : 'Editar'}
          </Button>
        )}
      </div>

      {!isBoolFlag && !editingJson && (
        <pre className="overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
          {JSON.stringify(valor, null, 2)}
        </pre>
      )}

      {editingJson && (
        <div className="space-y-2">
          <textarea
            className="w-full rounded border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            value={localJson}
            onChange={(e) => setLocalJson(e.target.value)}
          />
          {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          <Button size="sm" onClick={handleSaveJson} disabled={disabled}>
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
