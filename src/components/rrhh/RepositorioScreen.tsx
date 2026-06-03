import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  FolderOpen,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useBlackColumn } from '@/contexts/BlackColumnContext'

/* ─────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────── */

interface DocumentoRow {
  id: string
  nombre: string
  categoria: string
  descripcion: string | null
  url: string | null   // leafId interno del router (App.tsx) p.ej. 'doc8', 'chk360'
  activo: boolean
}

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const CAT_VARIANT: Record<string, 'ok' | 'info' | 'warn' | 'secondary' | 'destructive'> = {
  Clínico:   'ok',
  Logística: 'info',
  Flota:     'warn',
  Operativa: 'secondary',
  RRHH:      'secondary',
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hook
 * ───────────────────────────────────────────────────────────────────────── */

function useRepositorio() {
  return useQuery({
    queryKey: ['repositorio_documentos'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DocumentoRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('repositorio_documentos')
        .select('id, nombre, categoria, descripcion, url, activo')
        .eq('activo', true)
        .order('categoria')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as DocumentoRow[]
    },
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ───────────────────────────────────────────────────────────────────────── */

export function RepositorioScreen() {
  const query = useRepositorio()
  const { selectLeaf } = useBlackColumn()
  const [search, setSearch] = useState('')
  const [catFiltro, setCat] = useState('')

  const categorias = [...new Set((query.data ?? []).map((d) => d.categoria))].sort()

  const documentos = (query.data ?? []).filter((d) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q || d.nombre.toLowerCase().includes(q) || (d.descripcion ?? '').toLowerCase().includes(q)
    const matchCat = !catFiltro || d.categoria === catFiltro
    return matchSearch && matchCat
  })

  // Group by category for display
  const byCategoria = documentos.reduce<Record<string, DocumentoRow[]>>((acc, d) => {
    ;(acc[d.categoria] ??= []).push(d)
    return acc
  }, {})

  function handleAbrir(doc: DocumentoRow) {
    if (!doc.url) return
    if (doc.url.startsWith('http')) {
      window.open(doc.url, '_blank', 'noopener,noreferrer')
    } else {
      selectLeaf(doc.url)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Repositorio de documentos</h2>
          {query.data && (
            <Badge variant="secondary">{query.data.length} documentos</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isLoading}
          aria-label="Recargar repositorio"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar documentos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar en el repositorio"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={!catFiltro ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setCat('')}
          >
            Todos
          </Button>
          {categorias.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={catFiltro === cat ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setCat(catFiltro === cat ? '' : cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : documentos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {search || catFiltro
                ? 'Sin resultados para los filtros aplicados.'
                : 'No hay documentos en el repositorio.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(byCategoria).map(([cat, docs]) => (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {cat}
                </p>
                <Badge variant={CAT_VARIANT[cat] ?? 'secondary'} className="text-xs">
                  {docs.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <Card
                    key={doc.id}
                    className={`transition-colors ${
                      doc.url ? 'cursor-pointer hover:border-foreground/30 hover:bg-muted/30' : ''
                    }`}
                    onClick={() => doc.url && handleAbrir(doc)}
                    role={doc.url ? 'button' : undefined}
                    tabIndex={doc.url ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (doc.url && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        handleAbrir(doc)
                      }
                    }}
                    aria-label={doc.url ? `Abrir ${doc.nombre}` : doc.nombre}
                  >
                    <CardContent className="flex items-start justify-between gap-3 py-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <BookOpen
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-snug">{doc.nombre}</p>
                          {doc.descripcion && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {doc.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                      {doc.url && (
                        <ArrowRight
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
