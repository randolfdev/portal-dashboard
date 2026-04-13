// Supabase Edge Function: encrypt-credential
// Encrypts a database password using AES-256-GCM for safe storage.
// Called by the portal UI when saving a connector.

// deno-lint-ignore-file
// @ts-ignore — Deno runtime resolves this at deploy time
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
// @ts-ignore — esm.sh import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JSON_HEADERS = { 'content-type': 'application/json' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

// ---------------------------------------------------------------------------
// Crypto helpers — AES-256-GCM
// ---------------------------------------------------------------------------

/** Import the base64-encoded 32-byte encryption key as a CryptoKey. */
async function getEncryptionKey(): Promise<CryptoKey> {
  const b64 = Deno.env.get('ENCRYPTION_KEY')
  if (!b64) throw new Error('ENCRYPTION_KEY env var is not set')

  const rawBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  if (rawBytes.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${rawBytes.length}`)
  }

  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns base64( iv (12 bytes) || ciphertext || tag (16 bytes) ).
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    encoded,
  )

  // Combine iv + ciphertext+tag into a single buffer
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipherBuffer), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a value previously produced by `encrypt()`.
 * Expects base64( iv (12 bytes) || ciphertext || tag ).
 */
export async function decrypt(encryptedB64: string): Promise<string> {
  const key = await getEncryptionKey()
  const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0))

  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    ciphertext,
  )

  return new TextDecoder().decode(plainBuffer)
}

// ---------------------------------------------------------------------------
// Edge Function handler
// ---------------------------------------------------------------------------

// @ts-ignore — Deno global is injected by the edge runtime
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    // --- Authenticate the user via Supabase JWT ---
    const authHeader = req.headers.get('authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the JWT by fetching the user with it
    const supabaseAuth = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(jwt)

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401)
    }

    // --- Encrypt the password ---
    const body = await req.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return jsonResponse({ error: 'password (string) is required in the request body' }, 400)
    }

    const encrypted = await encrypt(password)
    return jsonResponse({ encrypted })
  } catch (err: any) {
    return jsonResponse({ error: err.message ?? 'Internal server error' }, 500)
  }
})
