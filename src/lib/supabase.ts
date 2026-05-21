import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias. ' +
        'Copia .env.example como .env.local y rellena los valores.'
    )
  }
  // En dev/test: advertencia sin bloqueo para permitir import sin .env.local
  console.warn(
    '[supabase] Variables de entorno no encontradas — usando cliente placeholder. ' +
      'Copia .env.example como .env.local para desarrollo local.'
  )
}

export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  key || 'placeholder-anon-key'
)
