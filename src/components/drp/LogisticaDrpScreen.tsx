import { useState } from 'react'
import { AlertCircle, CheckCircle2, Package, RefreshCw, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useDrp, type DescuadrePendiente } from '@/hooks/useDrp'
import { useGlobalStore } from '@/stores/useGlobalStore'

function fmtItem(d: DescuadrePendiente): string {
  const diff = d.cantidad_diferencia
  return `Ítem #${d.id_item} — ${diff > 0 ? `+${diff}` : diff} uds — ${d.location_origen} → ${d.location_destino}`
}

interface DescuadreRowProps {
  desc: DescuadrePendiente
  onResolver: (id: string, res: 'Resuelto' | 'Archivado', notas?: string) => Promise<void>
  isActing: boolean
}

function DescuadreRow({ desc, onResolver, isActing }: DescuadreRowProps) {
  const [notas, setNotas] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <Card aria-label={`Descuadre ítem ${desc.id_item}`}>
      <CardContent className="space-y-2 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-body text-sm font-medium">{fmtItem(desc)}</span>
          <Badge variant="warn">{desc.estado}</Badge>
        </div>
        {open ? (
          <div className="space-y-2">
            <Field>
              <FieldLabel htmlFor={`nota-${desc.id_descuadre}`}>
                Notas <span className="font-light text-muted-foreground">— opcional</span>
              </FieldLabel>
              <Textarea
                id={`nota-${desc.id_descuadre}`}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                placeholder="Justificación del ajuste…"
                disabled={isActing}
                className="resize-none"
              />
            </Field>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isActing}
                onClick={() => onResolver(desc.id_descuadre, 'Resuelto', notas.trim() || undefined)}
                aria-label="Marcar como resuelto"
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Resuelto
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isActing}
                onClick={() =>
                  onResolver(desc.id_descuadre, 'Archivado', notas.trim() || undefined)
                }
                aria-label="Archivar descuadre"
              >
                Archivar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isActing}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
            aria-label={`Gestionar descuadre ítem ${desc.id_item}`}
          >
            Gestionar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function LogisticaDrpScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const {
    drps,
    drpActivo,
    descuadresPendientes,
    loading,
    error,
    cargarDrps,
    cargarDetalle,
    resolverDescuadre,
  } = useDrp()

  const [actingId, setActingId] = useState<string | null>(null)

  const drpConDatos =
    drpActivo ?? drps.find((d) => d.estado === 'En_curso' || d.estado === 'En_preparacion') ?? null

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          La logística DRP requiere conexión en tiempo real.
        </p>
      </div>
    )
  }

  async function handleResolver(id: string, res: 'Resuelto' | 'Archivado', notas?: string) {
    setActingId(id)
    await resolverDescuadre(id, res, notas)
    setActingId(null)
  }

  async function handleSeleccionarDrp(idDrp: string) {
    await cargarDetalle(idDrp)
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Logística DRP</h2>
          {descuadresPendientes.length > 0 && (
            <Badge variant="warn">{descuadresPendientes.length} descuadres</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={cargarDrps}
          disabled={loading}
          aria-label="Recargar"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Selector de DRP activo */}
      {!drpConDatos &&
        (loading ? (
          <Skeleton className="h-16 w-full" />
        ) : drps.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No hay DRPs activos en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Seleccionar DRP</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {drps
                .filter((d) => d.estado === 'En_curso')
                .map((d) => (
                  <Button
                    key={d.id_drp}
                    size="sm"
                    variant="outline"
                    onClick={() => handleSeleccionarDrp(d.id_drp)}
                  >
                    #{d.id_drp.slice(0, 8).toUpperCase()}
                  </Button>
                ))}
            </CardContent>
          </Card>
        ))}

      {/* Descuadres del DRP activo */}
      {drpConDatos && (
        <>
          <div className="flex items-center gap-2">
            <span className="font-body text-sm text-muted-foreground">
              DRP #{drpConDatos.id_drp.slice(0, 8).toUpperCase()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cargarDetalle(drpConDatos.id_drp)}
              disabled={loading}
              aria-label="Actualizar descuadres"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : descuadresPendientes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CheckCircle2 className="size-8 text-green-600/60" aria-hidden="true" />
                <p className="font-body text-sm text-muted-foreground">
                  No hay descuadres pendientes en este DRP.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {descuadresPendientes.map((d) => (
                <DescuadreRow
                  key={d.id_descuadre}
                  desc={d}
                  onResolver={handleResolver}
                  isActing={actingId === d.id_descuadre}
                />
              ))}
            </div>
          )}
        </>
      )}

      {drpConDatos && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <AlertCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="font-body text-xs text-muted-foreground">
            Los descuadres se calculan comparando el stock real de las dotaciones del DRP con el
            stock esperado según plantillas.
          </p>
        </div>
      )}
    </div>
  )
}
