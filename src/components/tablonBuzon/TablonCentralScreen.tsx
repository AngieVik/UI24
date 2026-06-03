import { Megaphone, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTablon, type AnuncioItem } from '@/hooks/useTablon'

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
      </CardContent>
    </Card>
  )
}

export function TablonCentralScreen() {
  const { anuncios, loading, error, cargarTablon } = useTablon()

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
        <div className="space-y-2">
          {anuncios.map((a) => (
            <AnuncioCard key={a.id_anuncio} anuncio={a} />
          ))}
        </div>
      )}
    </div>
  )
}
