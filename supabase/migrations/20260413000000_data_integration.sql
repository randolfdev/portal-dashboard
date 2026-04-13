-- ============================================================
-- Data Integration Layer
-- ============================================================

-- 1. CONNECTORS: per-tenant database connection config
create table public.connectors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  db_type text not null check (db_type in ('oracle','mysql','postgres','sqlserver')),
  host text not null,
  port integer not null,
  database_name text not null,
  username text not null,
  encrypted_password text not null,
  extra_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index connectors_tenant_id_idx on public.connectors(tenant_id);

-- 2. AGENT_KEYS: API keys for on-premise agents
create table public.agent_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key_hash text not null,
  label text not null default 'default',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index agent_keys_tenant_id_idx on public.agent_keys(tenant_id);

-- 3. SCHEMA_CACHE: synced database dictionary
create table public.schema_cache (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.connectors(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  schema_name text not null,
  table_name text not null,
  columns jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  unique(connector_id, schema_name, table_name)
);
create index schema_cache_connector_idx on public.schema_cache(connector_id);
create index schema_cache_tenant_idx on public.schema_cache(tenant_id);

-- 4. INDICATORS: saved queries = reusable data sources
create table public.indicators (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  name text not null,
  description text,
  query_ast jsonb not null,
  sql_preview text,
  schedule text not null default 'manual'
    check (schedule in ('manual','5min','15min','1h','daily')),
  is_template boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index indicators_tenant_idx on public.indicators(tenant_id);
create index indicators_connector_idx on public.indicators(connector_id);

-- 5. JOBS: execution queue for the agent
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  indicator_id uuid references public.indicators(id) on delete cascade,
  connector_id uuid not null references public.connectors(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','running','completed','failed','cancelled')),
  query_ast jsonb not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  row_count integer,
  created_at timestamptz not null default now()
);
create index jobs_tenant_status_idx on public.jobs(tenant_id, status);
create index jobs_indicator_idx on public.jobs(indicator_id);

-- 6. INDICATOR_RESULTS: latest data for each indicator
create table public.indicator_results (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.indicators(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  data jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);
create index results_indicator_idx on public.indicator_results(indicator_id);
create index results_tenant_idx on public.indicator_results(tenant_id);

-- 7. Widget <-> Indicator link
alter table public.widgets
  add column if not exists indicator_id uuid references public.indicators(id) on delete set null;

-- ============================================================
-- RLS
-- ============================================================
alter table public.connectors enable row level security;
alter table public.agent_keys enable row level security;
alter table public.schema_cache enable row level security;
alter table public.indicators enable row level security;
alter table public.jobs enable row level security;
alter table public.indicator_results enable row level security;

-- connectors
create policy "connectors_select" on public.connectors
  for select using (
    public.is_platform_admin() or tenant_id = public.current_tenant_id()
  );
create policy "connectors_manage" on public.connectors
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  ) with check (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

-- agent_keys
create policy "agent_keys_select" on public.agent_keys
  for select using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );
create policy "agent_keys_manage" on public.agent_keys
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  ) with check (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

-- schema_cache
create policy "schema_cache_select" on public.schema_cache
  for select using (
    public.is_platform_admin() or tenant_id = public.current_tenant_id()
  );

-- indicators
create policy "indicators_select" on public.indicators
  for select using (
    public.is_platform_admin() or tenant_id = public.current_tenant_id()
  );
create policy "indicators_manage" on public.indicators
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  ) with check (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

-- jobs
create policy "jobs_select" on public.jobs
  for select using (
    public.is_platform_admin() or tenant_id = public.current_tenant_id()
  );
create policy "jobs_manage" on public.jobs
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  ) with check (
    public.is_platform_admin()
    or (tenant_id = public.current_tenant_id() and public.is_tenant_admin())
  );

-- indicator_results
create policy "results_select" on public.indicator_results
  for select using (
    public.is_platform_admin() or tenant_id = public.current_tenant_id()
  );
