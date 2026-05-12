-- Permission profiles ("perfis de acesso"): a tenant_admin can group members
-- by what they're allowed to see and do. Members without a profile see
-- nothing extra (no dashboards). tenant_admin and platform_admin bypass
-- this layer entirely (they keep seeing everything in their scope).

-- ============================================================
-- 1. Permission profile (per tenant)
-- ============================================================
create table public.permission_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  can_manage_indicators boolean not null default false,
  can_manage_dashboards boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create index permission_profiles_tenant_idx on public.permission_profiles(tenant_id);

-- ============================================================
-- 2. M2M: which dashboards a profile can view
-- ============================================================
create table public.permission_profile_dashboards (
  permission_profile_id uuid not null references public.permission_profiles(id) on delete cascade,
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (permission_profile_id, dashboard_id)
);

create index ppd_dashboard_idx on public.permission_profile_dashboards(dashboard_id);

-- ============================================================
-- 3. Link users -> profile
-- ============================================================
alter table public.profiles
  add column permission_profile_id uuid references public.permission_profiles(id) on delete set null;

create index profiles_permission_profile_idx on public.profiles(permission_profile_id);

-- ============================================================
-- 4. Helper: dashboards visible to current user
-- ============================================================
create or replace function public.user_can_view_dashboard(target_dashboard_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_tenant uuid;
  v_profile uuid;
  v_dashboard_tenant uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role, tenant_id, permission_profile_id
    into v_role, v_tenant, v_profile
    from public.profiles
   where id = auth.uid();

  if v_role = 'platform_admin' then
    return true;
  end if;

  select tenant_id into v_dashboard_tenant
    from public.dashboards
   where id = target_dashboard_id;

  if v_dashboard_tenant is distinct from v_tenant then
    return false;
  end if;

  if v_role = 'tenant_admin' then
    return true;
  end if;

  -- members must have a profile that explicitly grants access
  if v_profile is null then
    return false;
  end if;

  return exists (
    select 1
      from public.permission_profile_dashboards
     where permission_profile_id = v_profile
       and dashboard_id = target_dashboard_id
  );
end;
$$;

grant execute on function public.user_can_view_dashboard(uuid) to anon, authenticated;

-- ============================================================
-- 5. Helpers for management capabilities
-- ============================================================
create or replace function public.user_can_manage_indicators()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when (select role from public.profiles where id = auth.uid()) in ('tenant_admin','platform_admin') then true
    else coalesce(
      (select pp.can_manage_indicators
         from public.profiles p
         join public.permission_profiles pp on pp.id = p.permission_profile_id
        where p.id = auth.uid()),
      false
    )
  end;
$$;

create or replace function public.user_can_manage_dashboards()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when (select role from public.profiles where id = auth.uid()) in ('tenant_admin','platform_admin') then true
    else coalesce(
      (select pp.can_manage_dashboards
         from public.profiles p
         join public.permission_profiles pp on pp.id = p.permission_profile_id
        where p.id = auth.uid()),
      false
    )
  end;
$$;

grant execute on function public.user_can_manage_indicators() to anon, authenticated;
grant execute on function public.user_can_manage_dashboards() to anon, authenticated;

-- ============================================================
-- 6. RLS for permission_profiles itself
-- ============================================================
alter table public.permission_profiles enable row level security;

create policy "permission_profiles_select" on public.permission_profiles
  for select
  using (
    public.is_platform_admin()
    or tenant_id = public.current_tenant_id()
  );

create policy "permission_profiles_manage" on public.permission_profiles
  for all
  using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  )
  with check (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

alter table public.permission_profile_dashboards enable row level security;

create policy "ppd_select" on public.permission_profile_dashboards
  for select
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_id
         and pp.tenant_id = public.current_tenant_id()
    )
  );

create policy "ppd_manage" on public.permission_profile_dashboards
  for all
  using (
    public.is_platform_admin()
    or (
      public.is_tenant_admin()
      and exists (
        select 1 from public.permission_profiles pp
         where pp.id = permission_profile_id
           and pp.tenant_id = public.current_tenant_id()
      )
    )
  )
  with check (
    public.is_platform_admin()
    or (
      public.is_tenant_admin()
      and exists (
        select 1 from public.permission_profiles pp
         where pp.id = permission_profile_id
           and pp.tenant_id = public.current_tenant_id()
      )
    )
  );

-- ============================================================
-- 7. RLS on dashboards: members restricted to their profile's allowlist
-- ============================================================
drop policy if exists "dashboards_select_own" on public.dashboards;

create policy "dashboards_select_by_perm" on public.dashboards
  for select
  using (public.user_can_view_dashboard(id));

-- ============================================================
-- 8. Members opening allowlisted dashboards must be able to
--    INSERT jobs (each widget creates a job to fetch its data).
-- ============================================================
drop policy if exists "jobs_member_insert" on public.jobs;
create policy "jobs_member_insert" on public.jobs
  for insert
  with check (tenant_id = public.current_tenant_id());
