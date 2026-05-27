import { useState } from 'react'
import { Tags, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CatalogoItem {
  id_item:       number
  nombre:        string
  categoria:     string
  especificacion: string | null
  archivado:     boolean
}

function useCatalogo() {
  return useQuery({
    queryKey: ['catalogo_items'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CatalogoItem[]> => {
      const { data, error } = await supabase
        .from('catalogo_items')
        .select('id_item, nombre, categoria, especificacion, archivado')
        .eq('archivado', false)
        .order('categoria').order('nombre')
      if (error) throw error
      return (data ?? []) as CatalogoItem[]
    },
  })
}

export function CatalogoItemsScreen() {
  const query = useCatalogo()
  const [search, setSearch] = useState('')

  const items = (query.data ?? []).filter((i) => {
    const q = search.toLowerCase()
    return (
      i.nombre.toLowerCase().includes(q) ||
      i.categoria.toLowerCase().includes(q) ||
      (i.especificacion ?? '').toLowerCase().includes(q)
    )
  })

  const categorias = [...new Set((query.data ?? []).map((i) => i.categoria))].sort()

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tags aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Catálogo de ítems</h2>
          {query.data && (
            <Badge variant="secondary">{query.data.length} ítems</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isLoading} aria-label="Recargar catálogo">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Buscar por nombre, categoría o especificación…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar ítems del catálogo"
        />
      </div>

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
              {search ? 'Sin resultados para esta búsqueda.' : 'No hay ítems en el catálogo.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs font-bold uppercase">#</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Nombre</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Categoría</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
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
                      <Badge variant="info" className="text-xs">{item.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.archivado ? 'secondary' : 'ok'}>
                        {item.archivado ? 'Archivado' : 'Activo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!search && categorias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Categorías:</span>
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => setSearch(c)}
              className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Filtrar por categoría ${c}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
