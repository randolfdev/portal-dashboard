/**
 * Local Agent - Versão simplificada para desenvolvimento.
 *
 * Conecta direto no Supabase local via REST (service_role key)
 * e executa jobs pendentes no Oracle.
 *
 * Uso: npx ts-node src/local-agent.ts
 */

import oracledb from 'oracledb';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { OracleDialect } from './query-compiler/oracle-dialect';
import type { QueryAST } from './query-compiler/index';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS || '3000', 10);

const compiler = new OracleDialect();

// ============================================================
// Supabase REST helpers (service_role bypasses RLS)
// ============================================================
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function supabaseGet(table: string, query: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers });
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as unknown[];
}

async function supabasePatch(table: string, query: string, body: unknown): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table} failed: ${res.status} ${await res.text()}`);
}

async function supabasePost(table: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${table} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

// ============================================================
// Oracle execution
// ============================================================
async function syncSchemaFromOracle(
  connectorConfig: { host: string; port: number; database: string; username: string; password: string; extra: Record<string, unknown> },
  connectorId: string,
): Promise<void> {
  const connectString =
    (connectorConfig.extra?.connectString as string) ||
    `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${connectorConfig.host})(PORT=${connectorConfig.port}))(CONNECT_DATA=(SERVICE_NAME=${connectorConfig.database})))`;

  console.log(`  [oracle] Connecting for schema sync as "${connectorConfig.username}"`);

  const connection = await oracledb.getConnection({
    user: connectorConfig.username,
    password: connectorConfig.password,
    connectString,
  });

  try {
    // Resolve current schema
    const schemaResult = await connection.execute<[string]>(
      "SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM DUAL"
    );
    const schema = schemaResult.rows?.[0]?.[0] ?? connectorConfig.username.toUpperCase();

    console.log(`  [oracle] Fetching schema dictionary for "${schema}"`);

    // Fetch all columns
    const colResult = await connection.execute<Record<string, unknown>>(
      `SELECT
         atc.OWNER        AS "schema",
         atc.TABLE_NAME   AS "table",
         atc.COLUMN_NAME  AS "column",
         atc.DATA_TYPE    AS "type",
         atc.NULLABLE     AS "nullable"
       FROM ALL_TAB_COLUMNS atc
       WHERE atc.OWNER = :owner
       ORDER BY atc.TABLE_NAME, atc.COLUMN_ID`,
      [schema],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Fetch primary keys
    const pkResult = await connection.execute<Record<string, unknown>>(
      `SELECT
         acc.OWNER        AS "schema",
         acc.TABLE_NAME   AS "table",
         acc.COLUMN_NAME  AS "column"
       FROM ALL_CONSTRAINTS ac
       JOIN ALL_CONS_COLUMNS acc
         ON ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
        AND ac.OWNER = acc.OWNER
       WHERE ac.CONSTRAINT_TYPE = 'P'
         AND ac.OWNER = :owner`,
      [schema],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const pkSet = new Set<string>();
    for (const row of (pkResult.rows ?? []) as Record<string, string>[]) {
      pkSet.add(`${row.schema}.${row.table}.${row.column}`);
    }

    // Group columns by table
    const tableMap = new Map<string, {
      schema: string;
      table: string;
      columns: { name: string; type: string; nullable: boolean; primaryKey: boolean }[];
    }>();

    for (const row of (colResult.rows ?? []) as Record<string, string>[]) {
      const tableKey = `${row.schema}.${row.table}`;
      if (!tableMap.has(tableKey)) {
        tableMap.set(tableKey, { schema: row.schema, table: row.table, columns: [] });
      }
      const colKey = `${row.schema}.${row.table}.${row.column}`;
      tableMap.get(tableKey)!.columns.push({
        name: row.column,
        type: row.type,
        nullable: row.nullable === 'Y',
        primaryKey: pkSet.has(colKey),
      });
    }

    const tables = Array.from(tableMap.values());
    console.log(`  [oracle] Found ${tables.length} tables`);

    // Delete existing cache for this connector
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/schema_cache?connector_id=eq.${connectorId}`,
      { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } },
    );
    if (!delRes.ok) {
      console.warn(`  [oracle] Warning: failed to clear old schema_cache: ${delRes.status}`);
    }

    // Insert new schema cache rows
    if (tables.length > 0) {
      const rows = tables.map((t) => ({
        connector_id: connectorId,
        schema_name: t.schema,
        table_name: t.table,
        columns: t.columns,
      }));

      // Insert in batches of 200
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        await supabasePost('schema_cache', batch);
      }
    }

    console.log(`  [oracle] Schema cache updated (${tables.length} tables)`);
  } finally {
    await connection.close();
  }
}

async function executeOnOracle(
  connectorConfig: { host: string; port: number; database: string; username: string; password: string; extra: Record<string, unknown> },
  queryAst: QueryAST,
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  // Use full connect descriptor for maximum compatibility
  const connectString =
    (connectorConfig.extra?.connectString as string) ||
    `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${connectorConfig.host})(PORT=${connectorConfig.port}))(CONNECT_DATA=(SERVICE_NAME=${connectorConfig.database})))`;

  console.log(`  [oracle] Connecting as "${connectorConfig.username}"`);
  console.log(`  [oracle] ConnectString: ${connectString}`);

  const connection = await oracledb.getConnection({
    user: connectorConfig.username,
    password: connectorConfig.password,
    connectString,
  });

  try {
    const { sql, params } = compiler.compile(queryAst);
    console.log(`  [oracle] SQL: ${sql}`);
    console.log(`  [oracle] Params: ${JSON.stringify(params)}`);

    const result = await connection.execute(sql, params as oracledb.BindParameters, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: 50_000,
    });

    // Oracle returns UPPERCASE column names — normalize to lowercase
    const rawRows = (result.rows ?? []) as Record<string, unknown>[];
    const rows = rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase()] = value;
      }
      return normalized;
    });
    console.log(`  [oracle] Returned ${rows.length} rows`);

    return { rows, rowCount: rows.length };
  } finally {
    await connection.close();
  }
}

// ============================================================
// Poll loop
// ============================================================
async function pollAndExecute(): Promise<void> {
  // 1. Buscar jobs pendentes
  const jobs = (await supabaseGet(
    'jobs',
    'select=id,connector_id,indicator_id,query_ast,tenant_id&status=eq.pending&order=created_at.asc&limit=5',
  )) as Array<{
    id: string;
    connector_id: string;
    indicator_id: string | null;
    query_ast: QueryAST;
    tenant_id: string;
  }>;

  if (jobs.length === 0) return;

  console.log(`[agent] Found ${jobs.length} pending job(s)`);

  for (const job of jobs) {
    console.log(`[agent] Processing job ${job.id}`);

    // 2. Marcar como running
    await supabasePatch('jobs', `id=eq.${job.id}`, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      // 3. Buscar dados do conector
      const [connector] = (await supabaseGet(
        'connectors',
        `select=host,port,database_name,username,encrypted_password,extra_config&id=eq.${job.connector_id}`,
      )) as Array<{
        host: string;
        port: number;
        database_name: string;
        username: string;
        encrypted_password: string;
        extra_config: Record<string, unknown>;
      }>;

      if (!connector) {
        throw new Error(`Connector ${job.connector_id} not found`);
      }

      // 4. Para dev local, a senha esta em texto plano no seed
      //    Em producao, seria decryptPassword(connector.encrypted_password)
      const password = process.env.ORACLE_PASSWORD || connector.encrypted_password;

      const connCfg = {
        host: process.env.ORACLE_HOST || connector.host,
        port: parseInt(process.env.ORACLE_PORT || String(connector.port), 10),
        database: process.env.ORACLE_DATABASE || connector.database_name,
        username: process.env.ORACLE_USERNAME || connector.username,
        password,
        extra: connector.extra_config || {},
      };

      // 5. Verificar se é um job de sync_schema
      const ast = job.query_ast as QueryAST & { type?: string };
      if (ast.type === 'sync_schema') {
        console.log(`[agent] Job ${job.id} is a schema sync request`);
        await syncSchemaFromOracle(connCfg, job.connector_id);

        await supabasePatch('jobs', `id=eq.${job.id}`, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        console.log(`[agent] Job ${job.id} schema sync completed`);
        continue;
      }

      // 6. Executar query no Oracle
      const { rows, rowCount } = await executeOnOracle(connCfg, job.query_ast);

      // 7. Salvar resultado
      await supabasePost('indicator_results', {
        indicator_id: job.indicator_id ?? job.id,
        tenant_id: job.tenant_id,
        job_id: job.id,
        data: rows,
        metadata: { rowCount, executedAt: new Date().toISOString() },
        fetched_at: new Date().toISOString(),
      });

      // 8. Marcar job como completed
      await supabasePatch('jobs', `id=eq.${job.id}`, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        row_count: rowCount,
      });

      console.log(`[agent] Job ${job.id} completed (${rowCount} rows)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[agent] Job ${job.id} failed: ${msg}`);

      await supabasePatch('jobs', `id=eq.${job.id}`, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: msg,
      });
    }
  }
}

// ============================================================
// Main
// ============================================================
async function main(): Promise<void> {
  console.log('=== Portal Dashboard - Local Agent ===');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Poll interval: ${POLL_MS}ms`);
  console.log(`Oracle: ${process.env.ORACLE_HOST || 'from connector DB'}:${process.env.ORACLE_PORT || 'from connector DB'}/${process.env.ORACLE_DATABASE || 'from connector DB'}`);
  console.log('Waiting for jobs...\n');

  // Loop infinito
  const tick = async () => {
    try {
      await pollAndExecute();
    } catch (err) {
      console.error('[agent] Poll error:', err instanceof Error ? err.message : err);
    }
    setTimeout(tick, POLL_MS);
  };

  tick();
}

main();
