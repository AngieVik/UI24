import { get, set, del } from 'idb-keyval'

const key = (uuid: string) => `u24-blob-${uuid}`

/** Persiste un Blob en IndexedDB para encolado offline (ADR-002). */
export async function saveBlob(uuid: string, blob: Blob): Promise<void> {
  await set(key(uuid), blob)
}

export async function loadBlob(uuid: string): Promise<Blob | null> {
  return (await get<Blob>(key(uuid))) ?? null
}

export async function deleteBlob(uuid: string): Promise<void> {
  await del(key(uuid))
}
