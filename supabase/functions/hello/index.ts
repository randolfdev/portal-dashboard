// Supabase Edge Function: hello
// Test: curl -i -X POST http://127.0.0.1:54321/functions/v1/hello \
//   -H "Authorization: Bearer <anon-key>" \
//   -H "Content-Type: application/json" \
//   -d '{"name":"world"}'

// deno-lint-ignore-file
// @ts-ignore — Deno runtime resolves this at deploy time
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// @ts-ignore — Deno global is injected by the edge runtime
Deno.serve(async (req: Request) => {
  const body = await req.json().catch(() => ({}))
  const name = body?.name ?? 'world'
  return new Response(JSON.stringify({ message: `hello ${name}` }), {
    headers: { 'content-type': 'application/json' },
  })
})
