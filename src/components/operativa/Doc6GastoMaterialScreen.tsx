import { useMemo, useState } from 'react'
import { Minus, Package, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useInventarioVehiculo, type InventarioItem } from '@/hooks/useInventarioVehiculo'
import { useDeducirMaterial, type DeduccionItem } from '@/hooks/useDeducirMaterial'

type CarritoEntry = DeduccionItem & {
  nombre: string
  categoria: string
}

function carritoKey(id_item: number, subgrupo: string) {
  return `${id_item}::${subgrupo}`
}

export function Doc6GastoMaterialScreen() {
  const matricula = useActivacionStore((s) => s.matricula)
  const { data: items, isLoading, isError } = useInventarioVehiculo()
  const { deducir, isSubmitting, error } = useDeducirMaterial()

  const [query, setQuery] = useState('')
  const [motivo, setMotivo] = useState('')
  const [carrito, setCarrito] = useState<Map<string, CarritoEntry>>(new Map())
  const [feedback, setFeedback] = useState<string | null>(null)

  // ─── Filtrado y agrupación por categoría ─────────────────────
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

  // ─── Acciones carrito ────────────────────────────────────────
  function addAlCarrito(it: InventarioItem) {
    const key = carritoKey(it.id_item, it.subgrupo)
    setCarrito((prev) => {
      const next = new Map(prev)
      const current = next.get(key)
      const newCantidad = Math.min((current?.cantidad ?? 0) + 1, it.stock_real)
      next.set(key, {
        id_item: it.id_item,
        subgrupo: it.subgrupo,
        cantidad: newCantidad,
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
      const current = next.get(key)
      if (!current) return prev
      if (current.cantidad <= 1) next.delete(key)
      else next.set(key, { ...current, cantidad: current.cantidad - 1 })
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

  async function confirmarGasto() {
    if (carrito.size === 0) return
    const entries = [...carrito.values()].map<DeduccionItem>((e) => ({
      id_item: e.id_item,
      subgrupo: e.subgrupo,
      cantidad: e.cantidad,
    }))
    const result = await deducir({
      items: entries,
      motivo: motivo.trim() || null,
    })
    if (!result) return
    if (result.failed === 0) {
      setCarrito(new Map())
      setMotivo('')
      setFeedback(
        result.queued > 0
          ? `${result.ok + result.queued} deducción(es) registradas (${result.queued} encoladas offline).`
          : `${result.ok} deducción(es) registradas.`
      )
    } else {
      setFeedback(`${result.ok} confirmadas, ${result.failed} fallaron.`)
    }
  }

  // ─── Renderizado ─────────────────────────────────────────────
  if (!matricula) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <Package aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">Doc-6 — Gasto de material</h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay turno activo. Inicia un turno desde Operativa → Vehículos.
        </p>
      </div>
    )
  }

  const totalItems = [...carrito.values()].reduce((a, b) => a + b.cantidad, 0)

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Package aria-hidden="true" className="size-5" />
            Doc-6 — Gasto de material
          </CardTitle>
          <Badge variant="outline">{matricula}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
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

          {isLoading && (
            <div className="space-y-2" role="status" aria-label="Cargando inventario">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}

          {!isLoading && isError && (
            <p className="text-sm text-destructive">No se pudo cargar el inventario.</p>
          )}

          {!isLoading && !isError && filteredByCategoria.length === 0 && (
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
                        aria-label={`Añadir ${it.nombre} al carrito`}
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

      {/* ─── Carrito ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShoppingCart aria-hidden="true" className="size-4" />
            Gasto pendiente
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
              Añade material de la lista para registrar el gasto.
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
                    aria-label={`Eliminar ${e.nombre} del carrito`}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Input
            placeholder="Motivo (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            aria-label="Motivo opcional del gasto"
            disabled={isSubmitting || carrito.size === 0}
          />

          <div role="alert" aria-live="polite" className="min-h-5 text-sm">
            {error && <span className="text-destructive">{error}</span>}
            {feedback && <span className="text-muted-foreground">{feedback}</span>}
          </div>

          <Button
            className="w-full"
            onClick={confirmarGasto}
            disabled={isSubmitting || carrito.size === 0}
          >
            {isSubmitting ? 'Registrando…' : `Confirmar gasto (${totalItems})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
