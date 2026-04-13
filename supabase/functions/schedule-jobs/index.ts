// Supabase Edge Function: schedule-jobs
// Designed to be called by pg_cron or external cron every minute.
// Creates pending jobs for indicators whose schedule interval has elapsed.

// deno-lint-ignore-file
// @ts-ignore — Deno runtime resolves this at deploy time
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
// @ts-ignore — esm.sh import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JSON_HEADERS = { 'content-type': 'application/json' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

/** Map schedule labels to their interval in milliseconds. */
const SCHEDULE_INTERVALS: Record<string, number> = {
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
}

// @ts-ignore — Deno global is injected by the edge runtime
Deno.serve(async (req: Request) => {
  try {
    // --- Auth: check X-Cron-Secret header ---
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const provided = req.headers.get('x-cron-secret')
      if (provided !== cronSecret) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Fetch all non-manual indicators
    const { data: indicators, error: indErr } = await supabase
      .from('indicators')
      .select('*')
      .neq('schedule', 'manual')

    if (indErr) {
      return jsonResponse({ error: indErr.message }, 500)
    }

    if (!indicators || indicators.length === 0) {
      return jsonResponse({ created: 0 })
    }

    const now = Date.now()
    let created = 0

    for (const indicator of indicators) {
      const intervalMs = SCHEDULE_INTERVALS[indicator.schedule]
      if (!intervalMs) {
        // Unknown schedule value — skip
        continue
      }

      // 2. Check the most recent job for this indicator
      const { data: recentJobs, error: rjErr } = await supabase
        .from('jobs')
        .select('created_at')
        .eq('indicator_id', indicator.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (rjErr) {
        continue // skip on error, don't block other indicators
      }

      const lastCreatedAt = recentJobs?.[0]?.created_at
        ? new Date(recentJobs[0].created_at).getTime()
        : 0

      // 3. If enough time has elapsed, create a new pending job
      if (now - lastCreatedAt >= intervalMs) {
        const { error: insertErr } = await supabase.from('jobs').insert({
          tenant_id: indicator.tenant_id,
          indicator_id: indicator.id,
          connector_id: indicator.connector_id,
          status: 'pending',
          query_ast: indicator.query_ast,
        })

        if (!insertErr) {
          created++
        }
      }
    }

    return jsonResponse({ created })
  } catch (err: any) {
    return jsonResponse({ error: err.message ?? 'Internal server error' }, 500)
  }
})
