import { Badge } from '@/components/atoms/Badge'
import { Btn } from '@/components/atoms/Btn'
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton'
import { useCuadrante, TURNO_LABEL } from '@/hooks/useCuadrante'

const TURNO_TONE: Record<string, 'ok' | 'warn' | 'crit' | 'info'> = {
  T: 'ok',
  L: 'info',
  V: 'warn',
  B: 'crit',
  C: 'info',
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export function CuadranteScreen() {
  const { turnos, semanaOffset, semanaActual, setSemanaOffset, loading, error, setError } =
    useCuadrante()

  const dias = dateRange(semanaActual.start, semanaActual.end)
  const turnoMap = Object.fromEntries(turnos.map((t) => [t.fecha, t]))

  function fmtFecha(iso: string) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', timeZone: 'UTC',
    })
  }

  return (
    <div role="main" className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-fg-1 font-cmd text-lg">Mi cuadrante</h1>
        <div className="flex gap-2 items-center">
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => setSemanaOffset((o) => o - 1)}
            aria-label="Semana anterior"
          >
            ‹
          </Btn>
          <span className="text-fg-2 text-xs">
            {fmtFecha(semanaActual.start)} – {fmtFecha(semanaActual.end)}
          </span>
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => setSemanaOffset((o) => o + 1)}
            aria-label="Semana siguiente"
          >
            ›
          </Btn>
          {semanaOffset !== 0 && (
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => setSemanaOffset(0)}
              aria-label="Volver a semana actual"
            >
              Hoy
            </Btn>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-900/40 text-red-300 text-sm p-3 rounded">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {loading && <LoadingSkeleton variant="row" />}

      <div
        role="grid"
        aria-label="Cuadrante semanal"
        className="grid grid-cols-7 gap-1"
      >
        <div role="row" className="contents">
          {DIAS.map((dia) => (
            <div key={dia} className="text-fg-3 text-xs text-center py-1" role="columnheader">
              {dia}
            </div>
          ))}
        </div>

        <div role="row" className="contents">
        {dias.map((fecha, i) => {
          const turno = turnoMap[fecha]
          const esHoy = fecha === new Date().toISOString().slice(0, 10)
          return (
            <div
              key={fecha}
              role="gridcell"
              aria-label={`${DIAS[i % 7]} ${fmtFecha(fecha)}${turno ? `: ${TURNO_LABEL[turno.tipo_turno]}` : ': Sin asignar'}`}
              className={`rounded p-1.5 text-center space-y-1 min-h-[60px] border ${
                esHoy ? 'border-u24-yellow' : 'border-border-1'
              } bg-surface-1`}
            >
              <div className={`text-xs ${esHoy ? 'text-u24-yellow font-medium' : 'text-fg-2'}`}>
                {fmtFecha(fecha).slice(0, 5)}
              </div>
              {turno ? (
                <Badge tone={TURNO_TONE[turno.tipo_turno] ?? 'info'}>
                  {turno.tipo_turno}
                </Badge>
              ) : (
                <span className="text-fg-3 text-xs">—</span>
              )}
            </div>
          )
        })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(TURNO_LABEL).map(([code, label]) => (
          <span key={code} className="flex items-center gap-1 text-xs text-fg-2">
            <Badge tone={TURNO_TONE[code] ?? 'info'}>{code}</Badge>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
