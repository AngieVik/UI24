import { useMemo, useState } from 'react'
import { ArrowLeftRight, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useInventarioVehiculo, type InventarioItem } from '@/hooks/useInventarioVehiculo'
import { useEnviarMaterial, type EnvioItem } from '@/hooks/useEnviarMaterial'
import { useLocations } from '@/hooks/useLocations'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { formatRol } from '@/lib/formatRol'

const DESTINO_EXTERNO = '__externo__'

type CarritoEntry = EnvioItem & {
  nombre: string
  categoria: string
}

function carritoKey(id_item: number, subgrupo: string) {
  return `${id_item}::${subgrupo}`
}

export function Doc10EnvioMaterialScreen() {
  const matricula = useActivacionStore((s) => s.matricula)
  const { data: items, isLoading: invLoading, isError: invError } = useInventarioVehiculo()
  const { data: locations, isLoading: locLoading } = useLocations()
  const personal = usePersonalEnTurno()
  const { enviar, isSubmitting, error } = useEnviarMaterial()

  const [query, setQuery] = useState('')
  const [operador, setOperador] = useState('')
  const [destinoSelect, setDestinoSelect] = useState('')
  const [destinoExterno, setDestinoExterno] = useState('')
  const [carrito, setCarrito] = useState<Map<string, CarritoEntry>>(new Map())
  const [feedback, setFeedback] = useState<string | null>(null)

  // Auto-seleccionar operador si solo hay 1 presente
  useMemo(() => {
    if (!operador && personal.data.length === 1) {
      setOperador(personal.data[0].id_nombre)
    }
  }, [personal.data, operador])

  // Destinos disponibles = locations sin el propio vehículo + 'externo'
  const destinosLista = useMemo(
    () => locations.filter((l) => l.location_id !== matricula),
    [locations, matricula]
  )

  const filteredByCategoria = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items
      .filter((it) => it.stock_real > 0)
      .filter((it) => {
        if (!q) return true
        return (
          it.nombre.toLowerCase().includes(q) ||
          it.categoria.toLowerCase().includes(q) ||
          (it.especificacion?.toLowerCase().includes(q) ?? false)
        )
      })

    const groups = new Map<string, InventarioItem[]>()
    for (const it of filtered) {
      const key = it.categoria || 'Sin categoría'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(it)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [items, query])

  function addAlCarrito(it: InventarioItem) {
    const key = carritoKey(it.id_item, it.subgrupo)
    setCarrito((prev) => {
      const next = new Map(prev)
      const cur = next.get(key)
      const nueva = Math.min((cur?.cantidad ?? 0) + 1, it.stock_real)
      next.set(key, {
        id_item: it.id_item,
        subgrupo: it.subgrupo,
        cantidad: nueva,
        nombre: it.nombre,
        categoria: it.categoria,
      })
      return next
    })
    setFeedback(null)
  }

  function restarDelCarrito(key: string) {
    setCarrito((prev) => {
      const next = new Map(prev)
      const cur = next.get(key)
      if (!cur) return prev
      if (cur.cantidad <= 1) next.delete(key)
      else next.set(key, { ...cur, cantidad: cur.cantidad - 1 })
      return next
    })
  }

  function eliminarDelCarrito(key: string) {
    setCarrito((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }

  async function confirmarEnvio() {
    if (carrito.size === 0 || !operador || !destinoSelect) return
    setFeedback(null)
    const entries = [...carrito.values()].map<EnvioItem>((e) => ({
      id_item: e.id_item,
      subgrupo: e.subgrupo,
      cantidad: e.cantidad,
    }))
    const res = await enviar({
      operador,
      location_destino: destinoSelect === DESTINO_EXTERNO ? null : destinoSelect,
      destino_externo: destinoSelect === DESTINO_EXTERNO ? destinoExterno.trim() : null,
      items: entries,
    })
    if (!res) return
    setCarrito(new Map())
    setDestinoExterno('')
    setFeedback(
      res.online
        ? `Envío registrado (transferencia ${res.id_transferencia?.slice(0, 8)}).`
        : 'Envío encolado offline. Se aplicará al reconectar.'
    )
  }

  if (!matricula) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <ArrowLeftRight aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">Doc-10 — Envío de material</h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay turno activo. Inicia un turno desde Operativa → Vehículos.
        </p>
      </div>
    )
  }

  const sinOperador = !personal.isLoading && personal.data.length === 0
  const totalItems = [...carrito.values()].reduce((a, b) => a + b.cantidad, 0)
  const destinoOk =
    destinoSelect === DESTINO_EXTERNO ? destinoExterno.trim().length >= 2 : destinoSelect.length > 0
  const submitDisabled = isSubmitting || carrito.size === 0 || !operador || !destinoOk

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <ArrowLeftRight aria-hidden="true" className="size-5" />
            Doc-10 — Envío de material
          </CardTitle>
          <Badge variant="outline">{matricula} → ?</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {sinOperador && (
            <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              No hay nadie con presencia en el terminal para firmar el envío.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Operador (firma)
              </span>
              <Select
                value={operador}
                onValueChange={setOperador}
                disabled={isSubmitting || sinOperador}
              >
                <SelectTrigger aria-label="Operador">
                  <SelectValue placeholder="Selecciona operador" />
                </SelectTrigger>
                <SelectContent>
                  {personal.data.map((p) => (
                    <SelectItem key={p.id_nombre} value={p.id_nombre}>
                      <span className="font-bold">{p.nombre_real}</span>
                      <span className="ml-2 text-xs font-light text-muted-foreground">
                        {formatRol(p.rol)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Destino
              </span>
              {locLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={destinoSelect}
                  onValueChange={setDestinoSelect}
                  disabled={isSubmitting}
                >
                  <SelectTrigger aria-label="Destino">
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinosLista.map((l) => (
                      <SelectItem key={l.location_id} value={l.location_id}>
                        <span className="font-bold">{l.nombre}</span>
                        <span className="ml-2 text-xs font-light text-muted-foreground">
                          {l.tipo}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value={DESTINO_EXTERNO}>
                      <span className="font-bold">— Destino externo —</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </label>

            {destinoSelect === DESTINO_EXTERNO && (
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Describe el destino externo
                </span>
                <Input
                  value={destinoExterno}
                  onChange={(e) => setDestinoExterno(e.target.value)}
                  placeholder="Ej. Hospital General · Centro de salud Norte · …"
                  disabled={isSubmitting}
                  aria-label="Destino externo"
                />
              </label>
            )}
          </div>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Buscar por nombre, categoría o especificación…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              aria-label="Buscar material"
            />
          </div>

          {invLoading && (
            <div className="space-y-2" role="status" aria-label="Cargando inventario">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}

          {!invLoading && invError && (
            <p className="text-sm text-destructive">No se pudo cargar el inventario.</p>
          )}

          {!invLoading && !invError && filteredByCategoria.length === 0 && (
            <p className="text-sm font-light text-muted-foreground">
              {query.length > 0
                ? 'Ningún material coincide con tu búsqueda.'
                : 'Sin material con stock disponible en este vehículo.'}
            </p>
          )}

          {filteredByCategoria.map(([categoria, list]) => (
            <section key={categoria} aria-label={`Categoría ${categoria}`}>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {categoria}
                <span className="ml-1 font-light">· {list.length}</span>
              </h3>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {list.map((it) => {
                  const key = carritoKey(it.id_item, it.subgrupo)
                  const inCart = carrito.get(key)?.cantidad ?? 0
                  return (
                    <li key={key} className="flex items-center gap-2 px-2 py-1.5">
                      <div className="flex flex-1 flex-col leading-tight">
                        <span className="font-bold">{it.nombre}</span>
                        <span className="text-xs font-light text-muted-foreground">
                          {it.subgrupo}
                          {it.especificacion && ` · ${it.especificacion}`}
                        </span>
                      </div>
                      <Badge variant="secondary" aria-label={`Stock ${it.stock_real}`}>
                        {it.stock_real}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addAlCarrito(it)}
                        disabled={isSubmitting || inCart >= it.stock_real}
                        aria-label={`Añadir ${it.nombre} al envío`}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        {inCart > 0 ? `× ${inCart}` : 'Añadir'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>

      {/* ─── Carrito ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShoppingCart aria-hidden="true" className="size-4" />
            Envío pendiente
            <Badge variant="secondary">{totalItems}</Badge>
          </CardTitle>
          {carrito.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCarrito(new Map())}
              disabled={isSubmitting}
            >
              Vaciar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {carrito.size === 0 ? (
            <p className="text-sm font-light text-muted-foreground">
              Añade material desde la lista para preparar el envío.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {[...carrito.entries()].map(([key, e]) => (
                <li key={key} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="flex flex-1 flex-col leading-tight">
                    <span className="font-bold">{e.nombre}</span>
                    <span className="text-xs font-light text-muted-foreground">
                      {e.categoria} · {e.subgrupo}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => restarDelCarrito(key)}
                    disabled={isSubmitting}
                    aria-label={`Restar ${e.nombre}`}
                  >
                    <Minus aria-hidden="true" className="size-4" />
                  </Button>
                  <Badge variant="default" aria-label={`Cantidad ${e.cantidad}`}>
                    {e.cantidad}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => eliminarDelCarrito(key)}
                    disabled={isSubmitting}
                    aria-label={`Eliminar ${e.nombre} del envío`}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div role="alert" aria-live="polite" className="min-h-5 text-sm">
            {error && <span className="text-destructive">{error}</span>}
            {feedback && <span className="text-muted-foreground">{feedback}</span>}
          </div>

          <Button className="w-full" onClick={confirmarEnvio} disabled={submitDisabled}>
            <Package aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Enviando…' : `Enviar transferencia (${totalItems})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
