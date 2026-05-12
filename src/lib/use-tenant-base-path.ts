/** Returns the URL prefix the tenant app is mounted under.
 *  - Path-based access (e.g. /t/renal-vida/...) returns "/t/renal-vida".
 *  - Subdomain-based access (e.g. acme.localhost) returns "".
 *  Used to build absolute Links that survive both routing modes.
 */
export function useTenantBasePath(): string {
  if (typeof window === 'undefined') return ''
  return window.location.pathname.match(/^\/t\/[^/]+/)?.[0] ?? ''
}
