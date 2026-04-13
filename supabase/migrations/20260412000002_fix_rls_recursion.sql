-- Fix: RLS recursion on profiles table
-- The profiles_tenant_admin_manage policy queried profiles directly,
-- causing infinite recursion. Use a SECURITY DEFINER function instead.

create or replace function public.is_tenant_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('tenant_admin', 'platform_admin')
  )
$$;

-- Drop the broken policy
drop policy if exists "profiles_tenant_admin_manage" on public.profiles;

-- Recreate with SECURITY DEFINER function
create policy "profiles_tenant_admin_manage" on public.profiles
  for all
  using (
    tenant_id = public.current_tenant_id()
    and public.is_tenant_admin()
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.is_tenant_admin()
  );

-- Fix tenants_update_own too (same issue)
drop policy if exists "tenants_update_own" on public.tenants;
create policy "tenants_update_own" on public.tenants
  for update
  using (
    id = public.current_tenant_id()
    and public.is_tenant_admin()
  )
  with check (
    id = public.current_tenant_id()
  );

-- Fix dashboards policies (also had inline subquery on profiles)
drop policy if exists "dashboards_manage_tenant_admin" on public.dashboards;
create policy "dashboards_manage_tenant_admin" on public.dashboards
  for all
  using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  )
  with check (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

-- Fix widgets policies
drop policy if exists "widgets_manage" on public.widgets;
create policy "widgets_manage" on public.widgets
  for all
  using (
    exists (
      select 1 from public.dashboards d
      where d.id = dashboard_id
      and (
        public.is_platform_admin()
        or (d.tenant_id = public.current_tenant_id() and public.is_tenant_admin())
      )
    )
  )
  with check (
    exists (
      select 1 from public.dashboards d
      where d.id = dashboard_id
      and (
        public.is_platform_admin()
        or (d.tenant_id = public.current_tenant_id() and public.is_tenant_admin())
      )
    )
  );
