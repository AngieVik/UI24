import { Mail } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBandejasPersonales } from '@/hooks/useBandejasPersonales'
import { getInitials } from '@/lib/formatRol'

interface BandejaEntradaPersonalProps {
  /** Personal en turno del terminal. Cada item se convierte en una pin. */
  personas: readonly { id_nombre: string; nombre_real: string }[]
}

/**
 * BandejaEntradaPersonal — spec §10.4.
 *
 * Una "pin" por cada persona con check-in en el terminal: Avatar con
 * iniciales encima de un icono `Mail`. Si la persona tiene mensajes
 * sin leer (`unreadCount > 0`), aparece un dot rojo absoluto arriba
 * a la derecha.
 *
 * Sin onClick por ahora — el modal de bandeja se implementa en
 * Fase D.9 (`BandejaModal`).
 */
export function BandejaEntradaPersonal({ personas }: BandejaEntradaPersonalProps) {
  const ids = personas.map((p) => p.id_nombre)
  const { data, isLoading, isError } = useBandejasPersonales(ids)

  const unreadByPersona = new Map(data.map((b) => [b.id_nombre, b.unreadCount]))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Bandejas personales</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2" role="status" aria-label="Cargando bandejas">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
          </div>
        )}

        {!isLoading && isError && (
          <p className="text-sm text-destructive">
            No se pudo cargar las bandejas. Reintentando…
          </p>
        )}

        {!isLoading && !isError && personas.length === 0 && (
          <p className="text-sm font-light text-muted-foreground">
            Sin buzones cargados.
          </p>
        )}

        {!isLoading && !isError && personas.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2" aria-label="Bandejas personales del personal en turno">
            {personas.map((p) => {
              const unread = unreadByPersona.get(p.id_nombre) ?? 0
              const label = unread > 0
                ? `${p.nombre_real}: ${unread} mensaje${unread === 1 ? '' : 's'} sin leer`
                : `${p.nombre_real}: sin mensajes nuevos`
              return (
                <li key={p.id_nombre}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="relative flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                        aria-label={label}
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px] font-bold">
                            {getInitials(p.nombre_real)}
                          </AvatarFallback>
                        </Avatar>
                        <Mail aria-hidden="true" className="size-4 text-muted-foreground" />
                        {unread > 0 && (
                          <span
                            className="absolute -right-1 -top-1 grid size-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
                            aria-hidden="true"
                          >
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
