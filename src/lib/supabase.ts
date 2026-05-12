import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Resolution rules:
// 1. SSR / no window         -> VITE_SUPABASE_URL as-is.
// 2. Localhost dev           -> VITE_SUPABASE_URL (talks to local Supabase directly).
// 3. External host + env is loopback (127.0.0.1 / localhost)
//                            -> ${origin}/supabase  (Vite/Caddy proxy on same tunnel hostname).
// 4. External host + env is absolute external URL (e.g. https://*.ts.net/supabase)
//                            -> VITE_SUPABASE_URL (Vercel build hits the tunnel directly).
function resolveSupabaseUrl(): string {
  const env = envUrl ?? ''
  if (typeof window === 'undefined') return env
  const host = window.location.hostname
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')
  if (isLocalHost) return env
  try {
    const parsed = new URL(env)
    const envIsLoopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
    if (envIsLoopback) return `${window.location.origin}/supabase`
  } catch {
    // env not absolute -> fall through.
  }
  return env
}

const url = resolveSupabaseUrl()

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env',
  )
}

export const supabase = createClient(url, anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
