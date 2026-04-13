-- Seed: ambiente de dev local
-- Rodar: npx supabase db reset
-- Usuario: criar via scripts/setup-dev-user.ps1

-- ============================================================
-- 1. TENANT
-- ============================================================
insert into public.tenants (id, slug, name, theme)
values (
  'a0000000-0000-0000-0000-000000000001',
  'acme',
  'ACME Hospital',
  '{"primaryColor": "#6366f1"}'::jsonb
)
on conflict (slug) do nothing;

-- ============================================================
-- 2. CONECTOR Oracle (dados de conexao do hospital)
-- ============================================================
insert into public.connectors (id, tenant_id, name, db_type, host, port, database_name, username, encrypted_password, is_active)
values (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Oracle Tasy - Hospital Modelo',
  'oracle',
  '168.138.146.45',
  1521,
  'dbauora.sub06042025400.auoravcn.oraclevcn.com',
  'tasy',
  'PLACEHOLDER_ENCRYPTED',
  true
)
on conflict (id) do nothing;

-- ============================================================
-- 3. INDICADOR: Atendimentos por Convenio
-- ============================================================
insert into public.indicators (
  id, tenant_id, connector_id, name, description, query_ast, sql_preview, schedule, is_template
)
values (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'Atendimentos por Convenio',
  'Total de atendimentos agrupados por convenio, com filtro de periodo. Exclui cancelados.',
  '{
    "version": 1,
    "source": { "schema": "", "table": "atendimento_paciente_v", "alias": "v" },
    "joins": [],
    "columns": [
      { "expression": "v.ds_convenio", "alias": "ds_convenio" },
      { "expression": "nr_atendimento", "alias": "qtd", "aggregate": "count" }
    ],
    "filters": [
      { "column": "dt_cancelamento", "operator": "is_null", "value": null, "conjunction": "and" },
      { "column": "dt_entrada", "operator": "between", "value": ["01/01/2026", "01/02/2026"], "conjunction": "and" }
    ],
    "groupBy": ["v.ds_convenio"],
    "orderBy": [{ "column": "v.ds_convenio", "direction": "asc" }]
  }'::jsonb,
  'SELECT v.ds_convenio, COUNT(nr_atendimento) AS "qtd" FROM atendimento_paciente_v v WHERE dt_cancelamento IS NULL AND dt_entrada BETWEEN ''01/01/2026'' AND ''01/02/2026'' GROUP BY v.ds_convenio ORDER BY v.ds_convenio ASC',
  'manual',
  false
)
on conflict (id) do nothing;

-- ============================================================
-- 4. DASHBOARD: Atendimentos por Convenio
-- ============================================================
insert into public.dashboards (id, tenant_id, title, slug, description, is_default, layout)
values (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Atendimentos por Convenio',
  'atendimento-convenio',
  'Visao geral dos atendimentos por convenio com percentual e filtro de periodo',
  true,
  '[
    { "widgetIndex": 0, "x": 0, "y": 0, "w": 4, "h": 2 },
    { "widgetIndex": 1, "x": 4, "y": 0, "w": 4, "h": 2 },
    { "widgetIndex": 2, "x": 8, "y": 0, "w": 4, "h": 2 },
    { "widgetIndex": 3, "x": 0, "y": 2, "w": 6, "h": 5 },
    { "widgetIndex": 4, "x": 6, "y": 2, "w": 6, "h": 5 },
    { "widgetIndex": 5, "x": 0, "y": 7, "w": 12, "h": 5 }
  ]'::jsonb
)
on conflict (tenant_id, slug) do nothing;

-- ============================================================
-- 5. WIDGETS do dashboard
-- ============================================================

-- Widget 1: Card com total de atendimentos
insert into public.widgets (id, dashboard_id, kind, title, config, indicator_id)
values (
  'f0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'metric_card',
  'Total de Atendimentos',
  '{ "indicatorMapping": { "valueKey": "total" } }'::jsonb,
  'd0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- Widget 2: Top 3 convenios por porcentagem
insert into public.widgets (id, dashboard_id, kind, title, config, indicator_id)
values (
  'f0000000-0000-0000-0000-000000000005',
  'e0000000-0000-0000-0000-000000000001',
  'metric_card',
  'Top 3 Convenios',
  '{ "metricMode": "top3_list", "indicatorMapping": { "valueKey": "qtd", "nameKey": "ds_convenio" } }'::jsonb,
  'd0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- Widget 3: Total de atendimentos do top 3
insert into public.widgets (id, dashboard_id, kind, title, config, indicator_id)
values (
  'f0000000-0000-0000-0000-000000000006',
  'e0000000-0000-0000-0000-000000000001',
  'metric_card',
  'Total Top 3',
  '{ "metricMode": "top3_total", "indicatorMapping": { "valueKey": "qtd" } }'::jsonb,
  'd0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- Widget 4: Pie chart com distribuicao por convenio
insert into public.widgets (id, dashboard_id, kind, title, config, indicator_id)
values (
  'f0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000001',
  'chart_pie',
  'Distribuicao por Convenio (%)',
  '{ "indicatorMapping": { "nameKey": "ds_convenio", "valueKey": "qtd" } }'::jsonb,
  'd0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- Widget 5: Bar chart
insert into public.widgets (id, dashboard_id, kind, title, config, indicator_id)
values (
  'f0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000001',
  'chart_bar',
  'Atendimentos por Convenio',
  '{ "indicatorMapping": { "xKey": "ds_convenio", "yKey": "qtd" } }'::jsonb,
  'd0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- Widget 6: Tabela detalhada com percentual
insert into public.widgets (id, dashboard_id, kind, title, config, indicator_id)
values (
  'f0000000-0000-0000-0000-000000000004',
  'e0000000-0000-0000-0000-000000000001',
  'table',
  'Detalhamento por Convenio',
  '{ "indicatorMapping": { "nameKey": "ds_convenio", "valueKey": "qtd" } }'::jsonb,
  'd0000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;
