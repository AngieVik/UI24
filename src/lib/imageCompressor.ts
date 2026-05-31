export interface CompressOptions {
  maxPx?: number
  quality?: number
}

/**
 * Comprime una imagen a WebP ≤maxPx px en el lado más largo, calidad 0.70.
 * Usa OffscreenCanvas + createImageBitmap — sin Base64 (ADR-002).
 */
export async function compressImage(
  file: File | Blob,
  { maxPx = 1200, quality = 0.7 }: CompressOptions = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  const ratio = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * ratio)
  const h = Math.round(bitmap.height * ratio)

  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return canvas.convertToBlob({ type: 'image/webp', quality })
}
