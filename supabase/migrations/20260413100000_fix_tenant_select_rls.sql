-- Fix: tenants SELECT policy causes "Database error querying schema"
-- because current_tenant_id() queries profiles which also has RLS,
-- causing infinite recursion.
--
-- Solution: use a SECURITY DEFINER function that bypasses RLS to
-- check if the user belongs to the tenant being queried.

create or replace function public.user_belongs_to_tenant(tid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and tenant_id = tid
  )
$$;

-- Replace the problematic select policy on tenants
drop policy if exists "tenants_select_own_or_admin" on public.tenants;
create policy "tenants_select_own_or_admin" on public.tenants
  for select
  using (
    public.is_platform_admin()
    or public.user_belongs_to_tenant(id)
  );

-- Also fix profiles select to avoid recursion
-- The issue: profiles RLS calls current_tenant_id() which queries profiles again
drop policy if exists "profiles_select_self_or_same_tenant_or_admin" on public.profiles;
create policy "profiles_select_self_or_same_tenant_or_admin" on public.profiles
  for select
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or public.user_belongs_to_tenant(tenant_id)
  );
