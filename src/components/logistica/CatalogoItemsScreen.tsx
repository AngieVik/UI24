import { useState } from 'react'
import { Tags, RefreshCw, Search, Plus, Pencil, Archive, ChevronUp, ChevronDown } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useAuthStore } from '@/stores/useAuthStore'

// ── Types ────────────────────────────────────────────────────────────

interface CatalogoItem {
  id_item: number
  nombre: string
  categoria: string
  especificacion: string | null
  archivado: boolean
}

type SortField = 'nombre' | 'categoria'
type SortDir = 'asc' | 'desc'

// ── Query ────────────────────────────────────────────────────────────

function useCatalogo() {
  return useQuery({
    queryKey: ['catalogo_items'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CatalogoItem[]> => {
      const { data, error } = await supabase
        .from('catalogo_items')
        .select('id_item, nombre, categoria, especificacion, archivado')
        .eq('archivado', false)
        .order('categoria')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as CatalogoItem[]
    },
  })
}

// ── Item dialog ──────────────────────────────────────────────────────

interface ItemDialogProps {
  open: boolean
  editing: CatalogoItem | null
  categorias: string[]
  onClose: () => void
  onSaved: () => void
}

function ItemDialog({ open, editing, categorias, onClose, onSaved }: ItemDialogProps) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState(editing?.nombre ?? '')
  const [categoria, setCategoria] = useState(editing?.categoria ?? '')
  const [categoriaCustom, setCategoriaCustom] = useState('')
  const [especificacion, setEspecificacion] = useState(editing?.especificacion ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = editing !== null
  const categoriaFinal = categoria === '__custom__' ? categoriaCustom.trim() : categoria

  async function handleSave() {
    if (!nombre.trim() || !categoriaFinal) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any).rpc('rpc_editar_catalogo_item', {
          p_id_item: editing.id_item,
          p_nombre: nombre.trim(),
          p_categoria: categoriaFinal,
          p_especificacion: especificacion.trim() || null,
        })
        if (err) throw err
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any).rpc('rpc_crear_catalogo_item', {
          p_nombre: nombre.trim(),
          p_categoria: categoriaFinal,
          p_especificacion: especificacion.trim() || null,
        })
        if (err) throw err
      }
      await qc.invalidateQueries({ queryKey: ['catalogo_items'] })
      onSaved()
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSaving(false)
    }
  }

  const canSave = nombre.trim() && categoriaFinal && !saving

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar ítem' : 'Nuevo ítem del catálogo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Field>
            <FieldLabel htmlFor="cat-nombre">Nombre</FieldLabel>
            <Input
              id="cat-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del ítem"
              disabled={saving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cat-categoria">Categoría</FieldLabel>
            <Select value={categoria} onValueChange={setCategoria} disabled={saving}>
              <SelectTrigger id="cat-categoria">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Nueva categoría…</SelectItem>
              </SelectContent>
            </Select>
            {categoria === '__custom__' && (
              <Input
                className="mt-1"
                value={categoriaCustom}
                onChange={(e) => setCategoriaCustom(e.target.value)}
                placeholder="Escribe la nueva categoría"
                disabled={saving}
              />
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="cat-esp">
              Especificación{' '}
              <span className="font-light text-muted-foreground">— opcional</span>
            </FieldLabel>
            <Input
              id="cat-esp"
              value={especificacion}
              onChange={(e) => setEspecificacion(e.target.value)}
              placeholder="Talla, color, referencia…"
              disabled={saving}
            />
          </Field>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────

export function CatalogoItemsScreen() {
  const query = useCatalogo()
  const qc = useQueryClient()
  const rol = useAuthStore((s) => s.rol)

  const [search, setSearch] = useState('')
  const [categFilter, setCategFilter] = useState('__all__')
  const [sortField, setSortField] = useState<SortField>('nombre')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogoItem | null>(null)

  const canManage = rol === 'responsable_logistica' || rol === 'gerencia'

  const categorias = [...new Set((query.data ?? []).map((i) => i.categoria))].sort()

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronUp className="inline size-3 opacity-30" aria-hidden="true" />
    return sortDir === 'asc' ? (
      <ChevronUp className="inline size-3" aria-hidden="true" />
    ) : (
      <ChevronDown className="inline size-3" aria-hidden="true" />
    )
  }

  const items = (query.data ?? [])
    .filter((i) => {
      const q = search.toLowerCase()
      const matchSearch =
        i.nombre.toLowerCase().includes(q) ||
        i.categoria.toLowerCase().includes(q) ||
        (i.especificacion ?? '').toLowerCase().includes(q)
      const matchCateg = categFilter === '__all__' || i.categoria === categFilter
      return matchSearch && matchCateg
    })
    .sort((a, b) => {
      const va = a[sortField].toLowerCase()
      const vb = b[sortField].toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es')
    })

  async function archivarItem(item: CatalogoItem) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('rpc_archivar_catalogo_item', {
        p_id_item: item.id_item,
        p_archivar: true,
      })
      await qc.invalidateQueries({ queryKey: ['catalogo_items'] })
    } catch {
      // error silenciado — el AlertDialog ya confirma
    }
  }

  function openCreate() {
    setEditingItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: CatalogoItem) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tags aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Catálogo de ítems</h2>
          {query.data && <Badge variant="secondary">{query.data.length} ítems</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4 mr-1" aria-hidden="true" />
              Nuevo ítem
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isLoading}
            aria-label="Recargar catálogo"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar nombre, especificación…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar ítems del catálogo"
          />
        </div>
        <Select value={categFilter} onValueChange={setCategFilter}>
          <SelectTrigger className="w-48" aria-label="Filtrar por categoría">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search || categFilter !== '__all__'
                ? 'Sin resultados para este filtro.'
                : 'No hay ítems en el catálogo.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-xs font-bold uppercase">#</TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    <button
                      onClick={() => toggleSort('nombre')}
                      className="flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Ordenar por nombre"
                    >
                      Nombre <SortIcon field="nombre" />
                    </button>
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase">
                    <button
                      onClick={() => toggleSort('categoria')}
                      className="flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Ordenar por categoría"
                    >
                      Categoría <SortIcon field="categoria" />
                    </button>
                  </TableHead>
                  {canManage && (
                    <TableHead className="text-xs font-bold uppercase">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id_item}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.id_item}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.nombre}</div>
                      {item.especificacion && (
                        <div className="text-xs text-muted-foreground">{item.especificacion}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info" className="text-xs">
                        {item.categoria}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => openEdit(item)}
                            aria-label={`Editar ${item.nombre}`}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                aria-label={`Archivar ${item.nombre}`}
                              >
                                <Archive className="size-3.5" aria-hidden="true" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Archivar ítem?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se archivará «{item.nombre}». Dejará de aparecer en el catálogo
                                  activo y en las plantillas de stock. El histórico se conserva.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => archivarItem(item)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Archivar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog crear / editar */}
      <ItemDialog
        open={dialogOpen}
        editing={editingItem}
        categorias={categorias}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setDialogOpen(false)}
      />
    </div>
  )
}
