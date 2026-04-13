export type TenantContext =
  | { kind: 'admin' }
  | { kind: 'tenant'; slug: string }
  | { kind: 'root' }

export function resolveTenant(hostname: string, pathname: string): TenantContext {
  // Path-based routing: /t/<slug>/... or /admin/...
  if (pathname.startsWith('/admin')) return { kind: 'admin' }
  const pathMatch = pathname.match(/^\/t\/([^/]+)/)
  if (pathMatch) return { kind: 'tenant', slug: pathMatch[1] }

  // Subdomain-based routing (dev / custom domain)
  const bare = hostname.toLowerCase().split(':')[0]
  const parts = bare.split('.')

  if (bare === 'localhost' || bare === '127.0.0.1') {
    return { kind: 'root' }
  }

  // dev: <slug>.localhost
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    const sub = parts[0]
    if (sub === 'admin') return { kind: 'admin' }
    return { kind: 'tenant', slug: sub }
  }

  // prod: <slug>.<domain>.<tld>
  if (parts.length >= 3) {
    const sub = parts[0]
    if (sub === 'admin') return { kind: 'admin' }
    if (sub === 'www') return { kind: 'root' }
    return { kind: 'tenant', slug: sub }
  }

  return { kind: 'root' }
}

export function useTenant(): TenantContext {
  return resolveTenant(window.location.hostname, window.location.pathname)
}
