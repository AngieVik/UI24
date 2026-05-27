import { ClipboardEdit, UserPlus, WifiOff, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFiliacion, type EstadoPaciente } from '@/hooks/useFiliacion'
import { useGlobalStore } from '@/stores/useGlobalStore'

const ESTADO_LABEL: Record<EstadoPaciente, string> = {
  en_espera:   'En espera',
  en_consulta: 'En consulta',
  alta:        'Alta',
}

const ESTADO_VARIANT: Record<EstadoPaciente, 'warn' | 'ok' | 'secondary'> = {
  en_espera:   'warn',
  en_consulta: 'ok',
  alta:        'secondary',
}

const SIGUIENTE_ESTADO: Partial<Record<EstadoPaciente, EstadoPaciente>> = {
  en_espera:   'en_consulta',
  en_consulta: 'alta',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export function ModuloFiliacionScreen() {
  const isOnline = useGlobalStore((s) => s.isOnline)
  const {
    idSesion, pacientes,
    isLoadingSesion, isLoadingPacientes, isSubmitting, error,
    abrirSesion, admitirPaciente, actualizarEstado,
  } = useFiliacion()

  if (!isOnline) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <WifiOff className="size-10 text-muted-foreground/60" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Sin conexión</h2>
        <p className="font-body text-sm text-muted-foreground">
          El módulo de filiación requiere conexión en tiempo real.
        </p>
      </div>
    )
  }

  if (!idSesion) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <ClipboardEdit aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold">Módulo de filiación</h2>
        <p className="font-body text-sm text-muted-foreground">
          Gestión de pacientes en tiempo real durante dispositivos y emergencias.
          Abre una sesión para comenzar.
        </p>
        <Button
          onClick={() => abrirSesion()}
          disabled={isLoadingSesion}
          aria-label="Abrir sesión de filiación"
        >
          {isLoadingSesion ? 'Abriendo sesión…' : 'Abrir sesión de filiación'}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  const enEspera   = pacientes.filter((p) => p.estado === 'en_espera').length
  const enConsulta = pacientes.filter((p) => p.estado === 'en_consulta').length
  const conAlta    = pacientes.filter((p) => p.estado === 'alta').length

  return (
    <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-3 p-3">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardEdit aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Filiación</h2>
          <span className="font-mono text-xs text-muted-foreground">
            Sesión #{idSesion.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <Button
          size="sm"
          onClick={admitirPaciente}
          disabled={isSubmitting}
          aria-label="Admitir nuevo paciente"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Admitiendo…' : 'Admitir paciente'}
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="font-display text-2xl font-bold">{enEspera}</span>
            <Badge variant="warn" className="text-xs">En espera</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="font-display text-2xl font-bold">{enConsulta}</span>
            <Badge variant="ok" className="text-xs">En consulta</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="font-display text-2xl font-bold">{conAlta}</span>
            <Badge variant="secondary" className="text-xs">Alta</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Lista de pacientes */}
      {isLoadingPacientes ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : pacientes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay pacientes en esta sesión. Pulsa «Admitir paciente» para registrar el primero.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Pacientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase">#</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Admisión</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Estado</TableHead>
                  <TableHead className="sr-only">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.map((p, i) => {
                  const nextEstado = SIGUIENTE_ESTADO[p.estado]
                  return (
                    <TableRow key={p.id_paciente}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="text-xs">{fmtTime(p.timestamp_admision)}</TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_VARIANT[p.estado]}>
                          {ESTADO_LABEL[p.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {nextEstado && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSubmitting}
                            onClick={() => actualizarEstado(p.id_paciente, nextEstado)}
                            aria-label={`Pasar paciente ${i + 1} a ${ESTADO_LABEL[nextEstado]}`}
                          >
                            <Check className="size-3" aria-hidden="true" />
                            {ESTADO_LABEL[nextEstado]}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
