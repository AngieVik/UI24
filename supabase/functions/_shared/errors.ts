import { corsHeaders } from './cors.ts'

export function errorResponse(code: string, status = 400, detail?: string): Response {
  return new Response(
    JSON.stringify({ error: code, detail: detail ?? null }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

export function okResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
