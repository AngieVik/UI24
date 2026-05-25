import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRealtimeKillSwitch } from '@/hooks/useRealtimeKillSwitch'

interface RealtimeInvalidatorOptions {
  /** Prefijo lógico del canal — debe ser estable por suscriptor. Internamente se le añade un sufijo único por instancia. */
  channelName: string
  /** Tabla `public.<table>` a observar. */
  table: string
  /** Filtro Supabase (ej. `id_terminal=eq.uuid`). */
  filter?: string
  /** Query key de TanStack a invalidar cuando llegue cualquier cambio. */
  queryKey: QueryKey
}

/**
 * Suscribe un canal Realtime de Supabase a cambios en una tabla
 * (`*` de eventos: INSERT, UPDATE, DELETE) y, en cada cambio, invalida
 * el `queryKey` indicado para que TanStack Query refetchee.
 *
 * Patrón canónico decidido en Fase C: TanStack Query es el source of
 * truth de los datos servidor; Realtime actúa como invalidator, no
 * como cache paralelo.
 *
 * Si `realtime_kill_switch` está activo en `system_config`, el hook
 * no abre canal — el caller debe configurar `refetchInterval` en su
 * `useQuery` para hacer polling de respaldo:
 *
 *     const realtimeActive = useRealtimeInvalidator({ ... })
 *     useQuery({
 *       ...,
 *       refetchInterval: realtimeActive ? false : 30_000,
 *     })
 *
 * **Nota sobre nombres de canal**: Supabase cachea canales por nombre.
 * En React 19 StrictMode el doble mount llamaría `.on()` sobre un
 * canal ya suscrito y fallaría con `cannot add postgres_changes
 * callbacks after subscribe()`. Para evitarlo, el adapter sufija el
 * nombre con un identificador único por instancia (generado con
 * `useRef`), garantizando un canal nuevo por cada mount.
 *
 * @returns `true` si el canal Realtime está suscrito, `false` si está
 *   desactivado por el kill-switch.
 */
export function useRealtimeInvalidator({
  channelName,
  table,
  filter,
  queryKey,
}: RealtimeInvalidatorOptions): boolean {
  const queryClient = useQueryClient()
  const killSwitch = useRealtimeKillSwitch()
  // Estabilizamos el queryKey serializado para el dep array
  const queryKeySerialized = JSON.stringify(queryKey)
  // Identificador único por mount — sobrevive a re-renders pero se
  // regenera en el siguiente mount (necesario para StrictMode).
  const instanceIdRef = useRef<string | null>(null)
  if (instanceIdRef.current === null) {
    instanceIdRef.current = Math.random().toString(36).slice(2, 10)
  }

  useEffect(() => {
    if (killSwitch) return

    const uniqueName = `${channelName}-${instanceIdRef.current}`
    const channel = supabase
      .channel(uniqueName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => {
          queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeySerialized) })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [killSwitch, channelName, table, filter, queryKeySerialized, queryClient])

  return !killSwitch
}
