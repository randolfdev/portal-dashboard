-- Allow anonymous reads on public.tenants so the login page can resolve
-- the tenant slug and apply its branding (name, theme, logo_url) before auth.
-- All sensitive data lives in other tables (profiles, connectors, etc.) which
-- keep their own RLS.

drop policy if exists "tenants_public_select" on public.tenants;
create policy "tenants_public_select" on public.tenants
  for select
  to anon, authenticated
  using (true);
