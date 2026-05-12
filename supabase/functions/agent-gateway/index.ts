// Supabase Edge Function: agent-gateway
// Central endpoint for the on-premise agent.
// Routes via ?action= URL parameter.

// deno-lint-ignore-file
// @ts-ignore — Deno runtime resolves this at deploy time
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
// @ts-ignore — esm.sh import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JSON_HEADERS = { 'content-type': 'application/json' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

/** SHA-256 hash a plain-text key and return the hex digest. */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// @ts-ignore — Deno global is injected by the edge runtime
Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // --- Authentication via X-Agent-Key (preferred) or Bearer fallback ---
    // The Supabase edge runtime always parses the Authorization header as JWT,
    // so the agent sends its raw API key in X-Agent-Key and uses the anon key
    // in Authorization to satisfy the runtime.
    const headerKey = req.headers.get('x-agent-key') ?? ''
    const authHeader = req.headers.get('authorization') ?? ''
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '')
    const token = headerKey || bearerToken
    if (!token) {
      return jsonResponse({ error: 'Missing X-Agent-Key or Authorization header' }, 401)
    }

    const keyHash = await sha256Hex(token)

    const { data: agentKey, error: keyError } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (keyError || !agentKey) {
      return jsonResponse({ error: 'Invalid or inactive API key' }, 401)
    }

    const tenantId: string = agentKey.tenant_id

    // Update last_seen_at on every authenticated request
    await supabase
      .from('agent_keys')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', agentKey.id)

    // --- Routing ---
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      // --------------------------------------------------------
      // poll-jobs  (GET)
      // --------------------------------------------------------
      case 'poll-jobs': {
        // Fetch pending jobs for this tenant, including connector details
        const { data: pendingJobs, error: jobsErr } = await supabase
          .from('jobs')
          .select('*, connectors(*)')
          .eq('tenant_id', tenantId)
          .eq('status', 'pending')

        if (jobsErr) {
          return jsonResponse({ error: jobsErr.message }, 500)
        }

        if (pendingJobs && pendingJobs.length > 0) {
          const jobIds = pendingJobs.map((j: any) => j.id)
          await supabase
            .from('jobs')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .in('id', jobIds)
        }

        return jsonResponse({ jobs: pendingJobs ?? [] })
      }

      // --------------------------------------------------------
      // complete-job  (POST)
      // --------------------------------------------------------
      case 'complete-job': {
        const body = await req.json()
        const { jobId, data, metadata } = body

        if (!jobId) {
          return jsonResponse({ error: 'jobId is required' }, 400)
        }

        // Look up the job to get indicator_id
        const { data: job, error: jobErr } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .eq('tenant_id', tenantId)
          .single()

        if (jobErr || !job) {
          return jsonResponse({ error: 'Job not found' }, 404)
        }

        // Insert results into indicator_results — only when the job is tied
        // to an indicator. Schema-sync jobs have indicator_id = null and only
        // need the job status update below.
        if (job.indicator_id) {
          const { error: insertErr } = await supabase
            .from('indicator_results')
            .insert({
              indicator_id: job.indicator_id,
              tenant_id: tenantId,
              job_id: jobId,
              data,
              metadata,
              fetched_at: new Date().toISOString(),
            })

          if (insertErr) {
            return jsonResponse({ error: insertErr.message }, 500)
          }
        }

        // Mark job as completed
        const { error: updateErr } = await supabase
          .from('jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            row_count: metadata?.rowCount ?? data?.length ?? 0,
          })
          .eq('id', jobId)

        if (updateErr) {
          return jsonResponse({ error: updateErr.message }, 500)
        }

        return jsonResponse({ ok: true })
      }

      // --------------------------------------------------------
      // fail-job  (POST)
      // --------------------------------------------------------
      case 'fail-job': {
        const body = await req.json()
        const { jobId, errorMessage } = body

        if (!jobId) {
          return jsonResponse({ error: 'jobId is required' }, 400)
        }

        const { error: updateErr } = await supabase
          .from('jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage ?? 'Unknown error',
          })
          .eq('id', jobId)
          .eq('tenant_id', tenantId)

        if (updateErr) {
          return jsonResponse({ error: updateErr.message }, 500)
        }

        return jsonResponse({ ok: true })
      }

      // --------------------------------------------------------
      // sync-schema  (POST)
      // --------------------------------------------------------
      case 'sync-schema': {
        const body = await req.json()
        const { connectorId, schemas } = body

        if (!connectorId || !Array.isArray(schemas)) {
          return jsonResponse({ error: 'connectorId and schemas[] are required' }, 400)
        }

        const now = new Date().toISOString()
        const rows = schemas.map((s: any) => ({
          connector_id: connectorId,
          tenant_id: tenantId,
          schema_name: s.schema,
          table_name: s.table,
          columns: s.columns,
          synced_at: now,
        }))

        // Upsert based on (connector_id, tenant_id, schema_name, table_name)
        const { error: upsertErr } = await supabase
          .from('schema_cache')
          .upsert(rows, {
            onConflict: 'connector_id,tenant_id,schema_name,table_name',
          })

        if (upsertErr) {
          return jsonResponse({ error: upsertErr.message }, 500)
        }

        return jsonResponse({ ok: true, upserted: rows.length })
      }

      // --------------------------------------------------------
      // heartbeat  (GET)
      // --------------------------------------------------------
      case 'heartbeat': {
        // last_seen_at is already updated above during auth
        return jsonResponse({ ok: true, tenantId })
      }

      default:
        return jsonResponse(
          { error: `Unknown action: ${action}. Valid actions: poll-jobs, complete-job, fail-job, sync-schema, heartbeat` },
          400,
        )
    }
  } catch (err: any) {
    return jsonResponse({ error: err.message ?? 'Internal server error' }, 500)
  }
})
