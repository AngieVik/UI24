import { useState } from 'react'
import { Download, FileText, FolderOpen, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ─────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────── */

interface DocumentoRow {
  id:          string
  nombre:      string
  categoria:   string
  descripcion: string | null
  url:         string | null
  version:     string | null
  fecha_alta:  string
  activo:      boolean
}

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const CAT_VARIANT: Record<string, 'ok' | 'info' | 'warn' | 'secondary' | 'destructive'> = {
  normativas:         'ok',
  protocolos:         'info',
  formularios:        'warn',
  manuales:           'secondary',
  comunicados:        'secondary',
}

const CAT_LABEL: Record<string, string> = {
  normativas:         'Normativas',
  protocolos:         'Protocolos',
  formularios:        'Formularios',
  manuales:           'Manuales',
  comunicados:        'Comunicados',
}

/* ─────────────────────────────────────────────────────────────────────────
 * Hook
 * ───────────────────────────────────────────────────────────────────────── */

function useRepositorio() {
  return useQuery({
    queryKey: ['repositorio_documentos'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DocumentoRow[]> => {
      // repositorio_documentos not yet in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('repositorio_documentos')
        .select('id, nombre, categoria, descripcion, url, version, fecha_alta, activo')
        .eq('activo', true)
        .order('categoria')
        .order('nombre')
      if (error) throw error
      return (data ?? []) as DocumentoRow[]
    },
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────────── */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ───────────────────────────────────────────────────────────────────────── */

export function RepositorioScreen() {
  const query = useRepositorio()

  const [search, setSearch]   = useState('')
  const [catFiltro, setCat]   = useState<string>('')

  const categorias = [...new Set((query.data ?? []).map((d) => d.categoria))].sort()

  const documentos = (query.data ?? []).filter((d) => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.nombre.toLowerCase().includes(q) || (d.descripcion ?? '').toLowerCase().includes(q)
    const matchCat = !catFiltro || d.categoria === catFiltro
    return matchSearch && matchCat
  })

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Repositorio de documentos</h2>
          {query.data && (
            <Badge variant="secondary">{query.data.length} documentos</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isLoading} aria-label="Recargar repositorio">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Search + category chips */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
            Todas
          </Button>
          {categorias.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={catFiltro === cat ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setCat(catFiltro === cat ? '' : cat)}
            >
              {CAT_LABEL[cat] ?? cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Documents list */}
      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : documentos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search || catFiltro ? 'Sin resultados para los filtros aplicados.' : 'No hay documentos en el repositorio.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{doc.nombre}</span>
                      {doc.version && (
                        <Badge variant="outline" className="text-xs font-mono">v{doc.version}</Badge>
                      )}
                      <Badge variant={CAT_VARIANT[doc.categoria] ?? 'secondary'} className="text-xs">
                        {CAT_LABEL[doc.categoria] ?? doc.categoria}
                      </Badge>
                    </div>
                    {doc.descripcion && (
                      <p className="text-xs text-muted-foreground">{doc.descripcion}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Añadido: {fmtDate(doc.fecha_alta)}</p>
                  </div>
                </div>
                {doc.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    aria-label={`Descargar ${doc.nombre}`}
                  >
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="size-4" aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
