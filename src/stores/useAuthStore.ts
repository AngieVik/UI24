import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { isRol, type Rol } from '@/lib/auth-roles'

interface AuthState {
  session: Session | null
  /**
   * id_nombre del empleado — leído de session.user.app_metadata.id_nombre
   * (inyectado por el Custom Access Token Hook). Fallback a
   * user_metadata.id_nombre por compatibilidad con sesiones antiguas y con
   * el bypass de desarrollo.
   */
  ejecutorId: string | null
  /**
   * Rol del usuario — leído de session.user.app_metadata.rol (inyectado
   * por el Custom Access Token Hook). `null` mientras no haya sesión.
   * El valor `'sin_rol'` significa que el JWT no trae rol (usuario sin
   * ficha ni galleta de emergencia). `'inactivo'` significa que su ficha
   * tiene activo=false.
   *
   * Fallback de roles (regla aprobada Fase D — correcciones críticas):
   *   - Sesión vía galleta/PIN de emergencia sin rol explícito en BD → `invitado`
   *     (puede ver Check-in | Check-out, nada más).
   *   - Sin check-in, sin cookie y sin rol en BD → `sin_rol`
   *     (pantalla en blanco, ningún nodo visible).
   */
  rol: Rol | null
  setSession: (session: Session | null) => void
  /**
   * Sobreescribe el rol derivado del JWT. Úsalo SOLO cuando el flujo de
   * acceso de emergencia necesita elevar `sin_rol` a `invitado`.
   */
  overrideRol: (rol: Rol) => void
  clearSession: () => void
}

/**
 * Decodifica el payload del JWT sin validar firma (la firma la valida
 * el servidor en cada request). Devuelve null si el token es inválido.
 *
 * IMPORTANTE: el Custom Access Token Hook inyecta `app_metadata.rol` e
 * `id_nombre` directamente en los CLAIMS del JWT, no en el objeto
 * `auth.users.app_metadata`. Por eso leemos del JWT, no de
 * `session.user.app_metadata` (que vendría vacío o con solo provider).
 */
function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64URL → base64 estándar
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function readAppMetadataFromSession(session: Session | null): Record<string, unknown> {
  if (!session) return {}
  // Prioridad 1: claims del JWT (lo que inyecta el hook).
  const payload = decodeJwtPayload(session.access_token)
  const jwtAppMeta = (payload?.app_metadata as Record<string, unknown> | undefined) ?? {}
  // Prioridad 2: app_metadata del objeto user (fallback para bypass dev).
  const userAppMeta = (session.user?.app_metadata as Record<string, unknown> | undefined) ?? {}
  // Prioridad 3: user_metadata (fallback histórico).
  const userMeta = (session.user?.user_metadata as Record<string, unknown> | undefined) ?? {}
  return { ...userMeta, ...userAppMeta, ...jwtAppMeta }
}

function extractEjecutorId(session: Session | null): string | null {
  const meta = readAppMetadataFromSession(session)
  const value = meta.id_nombre
  return typeof value === 'string' && value.length > 0 ? value : null
}

function extractRol(session: Session | null): Rol | null {
  if (!session) return null
  const meta = readAppMetadataFromSession(session)
  return isRol(meta.rol) ? meta.rol : 'sin_rol'
}

// sessionStorage: sobrevive a F5 pero no al cierre de pestaña (ADR-009)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      ejecutorId: null,
      rol: null,

      setSession(session) {
        set({
          session,
          ejecutorId: extractEjecutorId(session),
          rol: extractRol(session),
        })
      },

      overrideRol(rol) {
        set({ rol })
      },

      clearSession() {
        set({ session: null, ejecutorId: null, rol: null })
      },
    }),
    {
      name: 'u24-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
