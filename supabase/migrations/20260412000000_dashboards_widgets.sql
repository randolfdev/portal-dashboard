-- Dashboards & Widgets for tenant portal

create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  layout jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

create table if not exists public.widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  kind text not null check (kind in ('metric_card','chart_bar','chart_line','chart_pie','table','text')),
  title text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dashboards_tenant_id_idx on public.dashboards(tenant_id);
create index if not exists widgets_dashboard_id_idx on public.widgets(dashboard_id);

-- RLS
alter table public.dashboards enable row level security;
alter table public.widgets enable row level security;

-- dashboards: same-tenant can read, tenant_admin can manage, platform_admin can see all
create policy "dashboards_select_own" on public.dashboards
  for select using (
    public.is_platform_admin() or tenant_id = public.current_tenant_id()
  );

create policy "dashboards_manage_tenant_admin" on public.dashboards
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_tenant_id()
      and exists (select 1 from public.profiles where id = auth.uid() and role in ('tenant_admin','platform_admin'))
    )
  ) with check (
    public.is_platform_admin()
    or (
      tenant_id = public.current_tenant_id()
      and exists (select 1 from public.profiles where id = auth.uid() and role in ('tenant_admin','platform_admin'))
    )
  );

-- widgets: inherit through dashboard
create policy "widgets_select" on public.widgets
  for select using (
    exists (
      select 1 from public.dashboards d
      where d.id = dashboard_id
      and (public.is_platform_admin() or d.tenant_id = public.current_tenant_id())
    )
  );

create policy "widgets_manage" on public.widgets
  for all using (
    exists (
      select 1 from public.dashboards d
      where d.id = dashboard_id
      and (
        public.is_platform_admin()
        or (
          d.tenant_id = public.current_tenant_id()
          and exists (select 1 from public.profiles where id = auth.uid() and role in ('tenant_admin','platform_admin'))
        )
      )
    )
  ) with check (
    exists (
      select 1 from public.dashboards d
      where d.id = dashboard_id
      and (
        public.is_platform_admin()
        or (
          d.tenant_id = public.current_tenant_id()
          and exists (select 1 from public.profiles where id = auth.uid() and role in ('tenant_admin','platform_admin'))
        )
      )
    )
  );
