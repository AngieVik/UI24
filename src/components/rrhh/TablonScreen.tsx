import { useState } from 'react'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useTablon, type AnuncioItem } from '@/hooks/useTablon'

type Seccion = AnuncioItem['seccion']

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'normativas',          label: 'Normativas' },
  { id: 'protocolos',          label: 'Protocolos' },
  { id: 'avisos_corporativos', label: 'Avisos corporativos' },
]

function AnuncioCard({ a }: { a: AnuncioItem }) {
  const [expandido, setExpandido] = useState(false)
  return (
    <li className="border border-border-1 bg-surface-1 rounded p-3 space-y-1">
      <button
        className="w-full text-left flex items-center justify-between"
        aria-expanded={expandido}
        onClick={() => setExpandido((v) => !v)}
      >
        <span className="text-fg-1 text-sm font-medium">{a.titulo}</span>
        <span className="text-fg-3 text-xs">
          {new Date(a.timestamp_publicacion).toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })}
        </span>
      </button>
      {expandido && (
        <div className="text-fg-2 text-sm whitespace-pre-line pt-1 border-t border-border-1">
          {a.contenido}
          <div className="text-fg-3 text-xs mt-2">Autor: {a.id_nombre_autor}</div>
        </div>
      )}
    </li>
  )
}

export function TablonScreen() {
  const { loading, error, setError, cargarTablon, porSeccion } = useTablon()
  const [seccionActiva, setSeccionActiva] = useState<Seccion>('normativas')

  const lista = porSeccion(seccionActiva)

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">Tablón de anuncios</h1>
        <Btn variant="secondary" size="sm" onClick={cargarTablon} aria-label="Actualizar tablón">
          ↺ Actualizar
        </Btn>
      </div>

      {error && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Tabs de sección */}
      <div role="tablist" aria-label="Secciones del tablón" className="flex gap-1 border-b border-border-1">
        {SECCIONES.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={seccionActiva === id}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              seccionActiva === id
                ? 'bg-u24-yellow text-black font-medium'
                : 'text-fg-2 hover:text-fg-1'
            }`}
            onClick={() => setSeccionActiva(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton variant="row" />}

      {!loading && lista.length === 0 && (
        <p className="text-fg-2 text-sm">No hay anuncios en esta sección.</p>
      )}

      <ul className="space-y-2" aria-label={`Anuncios de ${seccionActiva}`}>
        {lista.map((a) => <AnuncioCard key={a.id_anuncio} a={a} />)}
      </ul>
    </div>
  )
}
