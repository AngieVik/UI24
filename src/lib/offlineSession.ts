import { get, set, del } from 'idb-keyval'
import { deriveKey, generateSalt, verifyPassword } from './pbkdf2'

const IDB_KEY = 'u24-offline-session'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 días (ADR-009)

export interface OfflineSession {
  id_nombre: string
  password_hash: string
  password_salt: string
  iterations: number
  cached_at: string
  ttl_expires_at: string
}

export function isOfflineSessionValid(s: OfflineSession): boolean {
  return new Date(s.ttl_expires_at) > new Date()
}

export async function saveOfflineSession(id_nombre: string, password: string): Promise<void> {
  const salt = generateSalt()
  const hash = await deriveKey(password, salt)
  const now = new Date()
  const session: OfflineSession = {
    id_nombre,
    password_hash: hash,
    password_salt: salt,
    iterations: 100_000,
    cached_at: now.toISOString(),
    ttl_expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
  }
  await set(IDB_KEY, session)
}

export async function loadOfflineSession(): Promise<OfflineSession | null> {
  return (await get<OfflineSession>(IDB_KEY)) ?? null
}

export async function clearOfflineSession(): Promise<void> {
  await del(IDB_KEY)
}

export async function verifyOfflineLogin(id_nombre: string, password: string): Promise<boolean> {
  const s = await loadOfflineSession()
  if (!s) return false
  if (s.id_nombre !== id_nombre) return false
  if (!isOfflineSessionValid(s)) return false
  return verifyPassword(password, s.password_hash, s.password_salt, s.iterations)
}
