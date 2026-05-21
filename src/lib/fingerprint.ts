export async function computeFingerprint(): Promise<string> {
  const parts: string[] = [navigator.userAgent]

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(200,0,255,0.5)'
      ctx.fillRect(0, 0, 240, 60)
      ctx.fillStyle = '#111'
      ctx.font = '14px Arial'
      ctx.fillText('U24🚑fp', 10, 35)
      parts.push(canvas.toDataURL())
    }
  } catch {
    // Canvas bloqueado (modo privacidad) — fingerprint degrada sin romper
  }

  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`)
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

  const encoded = new TextEncoder().encode(parts.join('|'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
