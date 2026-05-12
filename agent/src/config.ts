import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  supabaseUrl: requireEnv('SUPABASE_URL'),
  agentApiKey: requireEnv('AGENT_API_KEY'),
  // Anon key (public) — required to satisfy the Supabase edge runtime's
  // mandatory Authorization-header JWT parse. The actual auth happens via
  // X-Agent-Key (see auth.ts).
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  pollIntervalMs: parseInt(optionalEnv('POLL_INTERVAL_MS', '5000'), 10),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),

  /** Derived gateway base URL */
  get gatewayUrl(): string {
    return `${this.supabaseUrl}/functions/v1/agent-gateway`;
  },
} as const;
