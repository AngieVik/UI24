import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente global de TanStack Query para el terminal U24.
 *
 * Defaults pensados para operación en ambulancia (cobertura intermitente,
 * datos del home que cambian con Realtime, no con refetch agresivo):
 *
 * - `staleTime: 30s` — evita refetch en cada montaje cuando el usuario
 *   navega por el BlackColumn. Los cambios reales llegan por Realtime
 *   (ver useRealtimeInvalidator).
 * - `gcTime: 5min` — mantiene en cache los datos del home aunque el
 *   usuario se mueva a un Screen feature y vuelva.
 * - `refetchOnWindowFocus: false` — un terminal montado en cabina no
 *   pierde foco como una pestaña de escritorio; el foco no es señal de
 *   datos viejos.
 * - `retry: 1` — un solo reintento ante error de red. La cola offline
 *   (rules.md §"Arquitectura de datos") cubre las mutaciones; las
 *   queries de lectura mejor fallan rápido para no bloquear la UI.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
