// Starts Vite and prints the FIXED public URL backed by Tailscale Funnel.
// Use: `npm run dev:public`
//
// One-time bootstrap (auth + sudo, interactive): `bash scripts/setup-funnel.sh`
//
// Tailscale Funnel exposes :5173 (the SPA) on a stable `*.ts.net` hostname.
// Supabase calls are proxied through Vite at /supabase (see vite.config.ts),
// so a single funnel reaches both the front and the backend.

import { spawn, execSync } from 'node:child_process'

const PORT = 5173
const APP_PATH = '/t/renal-vida/login'

function getTailscaleHost() {
  try {
    const raw = execSync('tailscale status --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const status = JSON.parse(raw)
    const dns = status?.Self?.DNSName
    if (!dns) return null
    return dns.replace(/\.$/, '')
  } catch {
    return null
  }
}

function funnelExposesPort(port) {
  try {
    const out = execSync('tailscale funnel status', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.includes(`127.0.0.1:${port}`) || out.includes(`localhost:${port}`)
  } catch {
    return false
  }
}

const host = getTailscaleHost()
if (!host) {
  console.error('\n\x1b[31mTailscale nao esta rodando / autenticado.\x1b[0m')
  console.error('Rode o bootstrap (uma vez):\n  bash scripts/setup-funnel.sh\n')
  process.exit(1)
}

const publicUrl = `https://${host}${APP_PATH}`

if (!funnelExposesPort(PORT)) {
  console.warn(
    `\n\x1b[33mAviso:\x1b[0m Tailscale Funnel parece nao estar expondo :${PORT}.\n` +
      `Habilite com:  sudo tailscale funnel --bg ${PORT}\n`,
  )
}

process.stdout.write(
  `\n\x1b[1m\x1b[42m  PUBLIC URL: ${publicUrl}  \x1b[0m\n` +
    `  Link fixo via Tailscale Funnel. Compartilhe com o cliente.\n\n`,
)

const vite = spawn('npm', ['run', 'dev'], { stdio: 'inherit', env: process.env })

function shutdown() {
  try {
    vite.kill('SIGTERM')
  } catch {}
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
vite.on('exit', (code) => process.exit(code ?? 0))
