-- Tenant admin policies + schema additions

-- Add logo_url and email to existing tables
alter table public.tenants add column if not exists logo_url text;
alter table public.profiles add column if not exists email text;

-- Update trigger to store email
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- Let tenant_admin manage profiles within their tenant
create policy "profiles_tenant_admin_manage" on public.profiles
  for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'tenant_admin'
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'tenant_admin'
    )
  );

-- Let tenant_admin update their own tenant (theme, logo, name)
create policy "tenants_update_own" on public.tenants
  for update
  using (
    id = public.current_tenant_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('tenant_admin','platform_admin')
    )
  )
  with check (
    id = public.current_tenant_id()
  );

-- Backfill email from existing auth.users
update public.profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id and (p.email is null or p.email = '');
