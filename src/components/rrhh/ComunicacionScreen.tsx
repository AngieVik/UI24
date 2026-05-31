/**
 * ComunicacionScreen — handles both:
 * - `rrhh_tablon` (gestión tablón): publish/archive announcements
 * - `rrhh_marquesina`: configure the ticker text shown in the Header
 */
import { useState } from 'react'
import { Megaphone, Newspaper, RadioTower, RefreshCw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useTablon, type AnuncioItem } from '@/hooks/useTablon'
import { useSystemConfig } from '@/hooks/useSystemConfig'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'

const SECCION_OPTIONS: AnuncioItem['seccion'][] = [
  'normativas',
  'protocolos',
  'avisos_corporativos',
]
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

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function GestionTablon() {
  const { anuncios, loading, error, setError, cargarTablon } = useTablon()
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [seccion, setSeccion] = useState<AnuncioItem['seccion']>('avisos_corporativos')
  const [submitting, setSubmitting] = useState(false)

  async function handlePublicar() {
    if (!titulo.trim() || !contenido.trim()) {
      setError('Completa título y contenido.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // rpc_publicar_anuncio not in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_publicar_anuncio', {
        p_mutation_uuid: crypto.randomUUID(),
        p_seccion: seccion,
        p_titulo: titulo.trim(),
        p_contenido: contenido.trim(),
      })
      if (err) throw err
      setTitulo('')
      setContenido('')
      await cargarTablon()
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchivar(idAnuncio: string) {
    try {
      // rpc_archivar_anuncio not in generated types → cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_archivar_anuncio', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_anuncio: idAnuncio,
      })
      if (err) throw err
      await cargarTablon()
    } catch (e) {
      setError(resolveRpcError(e))
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Nuevo anuncio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field>
            <FieldLabel htmlFor="tab-seccion">Sección</FieldLabel>
            <Select
              value={seccion}
              onValueChange={(v) => setSeccion(v as AnuncioItem['seccion'])}
              disabled={submitting}
            >
              <SelectTrigger id="tab-seccion">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECCION_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SECCION_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="tab-titulo">Título</FieldLabel>
            <Input
              id="tab-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título del anuncio"
              disabled={submitting}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tab-contenido">Contenido</FieldLabel>
            <Textarea
              id="tab-contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={4}
              placeholder="Redacta el anuncio…"
              disabled={submitting}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button size="sm" className="w-full" onClick={handlePublicar} disabled={submitting}>
            <Newspaper className="size-4" aria-hidden="true" />
            {submitting ? 'Publicando…' : 'Publicar anuncio'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-muted-foreground">Anuncios activos</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={cargarTablon}
          disabled={loading}
          aria-label="Recargar tablón"
        >
          <RefreshCw className="size-3" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : anuncios.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay anuncios activos.</p>
      ) : (
        <div className="space-y-2">
          {anuncios.map((a) => (
            <Card key={a.id_anuncio}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SECCION_VARIANT[a.seccion]} className="text-xs">
                      {SECCION_LABEL[a.seccion]}
                    </Badge>
                    <span className="font-medium text-sm">{a.titulo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.contenido}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(a.timestamp_publicacion)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleArchivar(a.id_anuncio)}
                  aria-label={`Archivar ${a.titulo}`}
                >
                  <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function GestionMarquesina() {
  const { config, setConfigValue, loading } = useSystemConfig()
  const tickerEntry = config.find((c) => c.clave === 'ticker_text')
  const [texto, setTexto] = useState((tickerEntry?.valor as string | undefined) ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleGuardar() {
    setSaving(true)
    const ok = await setConfigValue('ticker_text', texto.trim())
    if (ok) setSaved(true)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-sm">
          <RadioTower aria-hidden="true" className="size-4" />
          Marquesina — texto del ticker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-body text-xs text-muted-foreground">
          El texto de la marquesina se muestra en tiempo real en el Header de todos los terminales.
        </p>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="marq-texto">Texto de la marquesina</FieldLabel>
              <Textarea
                id="marq-texto"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value)
                  setSaved(false)
                }}
                rows={3}
                placeholder="Introduce el texto del ticker…"
                disabled={saving}
              />
            </Field>
            {saved && <Badge variant="ok">Guardado correctamente</Badge>}
            <Button
              size="sm"
              className="w-full"
              onClick={handleGuardar}
              disabled={saving || !texto.trim()}
            >
              {saving ? 'Guardando…' : 'Guardar texto'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ComunicacionScreen({ vista }: { vista?: 'tablon' | 'marquesina' }) {
  const [tab, setTab] = useState<string>(vista === 'marquesina' ? 'marquesina' : 'tablon')

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Megaphone aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Comunicación</h2>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="tablon">
            <Newspaper className="size-3.5 mr-1" />
            Tablón
          </TabsTrigger>
          <TabsTrigger value="marquesina">
            <RadioTower className="size-3.5 mr-1" />
            Marquesina
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tablon" className="mt-3">
          <GestionTablon />
        </TabsContent>
        <TabsContent value="marquesina" className="mt-3">
          <GestionMarquesina />
        </TabsContent>
      </Tabs>
    </div>
  )
}
