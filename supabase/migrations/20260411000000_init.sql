-- Portal Dashboard: initial schema
-- Multi-tenant (single DB) with RLS isolation

create extension if not exists "pgcrypto";

-- ============================================================
-- tenants
-- ============================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- profiles: maps auth.users -> tenant + role
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  role text not null default 'member'
    check (role in ('member', 'tenant_admin', 'platform_admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_tenant_id_idx on public.profiles(tenant_id);

-- ============================================================
-- helpers
-- ============================================================
create or replace function public.current_tenant_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'platform_admin'
  )
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "tenants_select_own_or_admin" on public.tenants;
create policy "tenants_select_own_or_admin" on public.tenants
  for select
  using (public.is_platform_admin() or id = public.current_tenant_id());

drop policy if exists "tenants_admin_all" on public.tenants;
create policy "tenants_admin_all" on public.tenants
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "profiles_select_self_or_same_tenant_or_admin" on public.profiles;
create policy "profiles_select_self_or_same_tenant_or_admin" on public.profiles
  for select
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or tenant_id = public.current_tenant_id()
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================
-- auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
