import { Megaphone, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTablon, type AnuncioItem } from '@/hooks/useTablon'

/* ─────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────── */

const SECCION_LABEL: Record<string, string> = {
  normativas: 'Normativas',
  protocolos: 'Protocolos',
  avisos_corporativos: 'Avisos corporativos',
}

const SECCION_VARIANT: Record<string, 'ok' | 'info' | 'warn'> = {
  normativas: 'ok',
  protocolos: 'info',
  avisos_corporativos: 'warn',
}

const SECCIONES: AnuncioItem['seccion'][] = ['normativas', 'protocolos', 'avisos_corporativos']

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────────── */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─────────────────────────────────────────────────────────────────────────
 * AnuncioCard
 * ───────────────────────────────────────────────────────────────────────── */

function AnuncioCard({ anuncio }: { anuncio: AnuncioItem }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SECCION_VARIANT[anuncio.seccion]} className="text-xs">
            {SECCION_LABEL[anuncio.seccion]}
          </Badge>
          <span className="font-medium text-sm">{anuncio.titulo}</span>
        </div>
        <p className="text-sm text-muted-foreground">{anuncio.contenido}</p>
        <p className="text-xs text-muted-foreground">
          {fmtDate(anuncio.timestamp_publicacion)}
          {' · '}Por: <span className="font-medium">{anuncio.id_nombre_autor}</span>
        </p>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main component
 * ───────────────────────────────────────────────────────────────────────── */

export function TablonCentralScreen() {
  const { anuncios, loading, error, cargarTablon, porSeccion } = useTablon()

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Tablón central</h2>
          {!loading && anuncios.length > 0 && (
            <Badge variant="secondary">{anuncios.length} anuncios</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={cargarTablon}
          disabled={loading}
          aria-label="Recargar tablón"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : anuncios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No hay anuncios activos en el tablón.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="todos">
          <TabsList className="w-full">
            <TabsTrigger value="todos">
              Todos
              <Badge variant="secondary" className="ml-1 text-xs">
                {anuncios.length}
              </Badge>
            </TabsTrigger>
            {SECCIONES.map((sec) => {
              const count = porSeccion(sec).length
              if (count === 0) return null
              return (
                <TabsTrigger key={sec} value={sec}>
                  {SECCION_LABEL[sec]}
                  <Badge variant={SECCION_VARIANT[sec]} className="ml-1 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="todos" className="mt-3 space-y-2">
            {anuncios.map((a) => (
              <AnuncioCard key={a.id_anuncio} anuncio={a} />
            ))}
          </TabsContent>

          {SECCIONES.map((sec) => (
            <TabsContent key={sec} value={sec} className="mt-3 space-y-2">
              {porSeccion(sec).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay anuncios en {SECCION_LABEL[sec].toLowerCase()}.
                </p>
              ) : (
                porSeccion(sec).map((a) => <AnuncioCard key={a.id_anuncio} anuncio={a} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
