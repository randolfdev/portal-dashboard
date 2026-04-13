// One-shot bootstrap: cria usuário, tenant, e configura admin.
// Rode com: node scripts/bootstrap.mjs

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const EMAIL = 'randolfgrassmannfilho@gmail.com'
const PASSWORD = 'admin12345'
const TENANT_SLUG = 'acme'
const TENANT_NAME = 'Acme Corp'

const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

async function main() {
  // 1) Cria ou encontra o user
  let user
  const ures = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers })
  if (!ures.ok) throw new Error(`list users: ${ures.status} ${await ures.text()}`)
  const { users } = await ures.json()
  user = users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())

  if (!user) {
    console.log('  Criando usuário...')
    const cres = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        app_metadata: { role: 'platform_admin' },
      }),
    })
    if (!cres.ok) throw new Error(`create user: ${cres.status} ${await cres.text()}`)
    user = await cres.json()
  }
  console.log('✓ user:', user.id, user.email ?? EMAIL)

  // 2) Seta app_metadata.role = platform_admin
  const mres = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ app_metadata: { ...(user.app_metadata || {}), role: 'platform_admin' } }),
  })
  if (!mres.ok) throw new Error(`update app_metadata: ${mres.status} ${await mres.text()}`)
  console.log('✓ app_metadata.role = platform_admin')

  // 3) Upsert tenant
  const tres = await fetch(`${SUPABASE_URL}/rest/v1/tenants?on_conflict=slug`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ slug: TENANT_SLUG, name: TENANT_NAME }),
  })
  if (!tres.ok) throw new Error(`upsert tenant: ${tres.status} ${await tres.text()}`)
  const tenants = await tres.json()
  const tenantId = Array.isArray(tenants) ? tenants[0].id : tenants.id
  console.log('✓ tenant:', TENANT_SLUG, tenantId)

  // 4) Atualiza profile: platform_admin + tenant_id + email
  const pres = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ role: 'platform_admin', tenant_id: tenantId, email: EMAIL }),
  })
  if (!pres.ok) throw new Error(`update profile: ${pres.status} ${await pres.text()}`)
  const profile = await pres.json()
  console.log('✓ profile:', profile)

  // 5) Cria conector Oracle (upsert por name)
  const connectorData = {
    tenant_id: tenantId,
    name: 'ERP Oracle',
    db_type: 'oracle',
    host: 'dbauora.sub06042025400.auoravcn.oraclevcn.com',
    port: 1521,
    database_name: 'ORCL',
    username: 'system',
    encrypted_password: 'U#DZ#5USHmGE',
    extra_config: { connectString: '168.138.146.45:1521/ORCL' },
    is_active: true,
  }

  const cres2 = await fetch(`${SUPABASE_URL}/rest/v1/connectors`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(connectorData),
  })
  if (cres2.ok) {
    const connector = await cres2.json()
    const cid = Array.isArray(connector) ? connector[0]?.id : connector.id
    console.log('✓ connector: ERP Oracle', cid)
  } else {
    const body = await cres2.text()
    if (body.includes('duplicate')) {
      console.log('✓ connector: ERP Oracle (already exists)')
    } else {
      console.warn('⚠ connector error:', cres2.status, body)
    }
  }

  console.log(`\n🎉 Pronto! Login: ${EMAIL} / ${PASSWORD}`)
}

main().catch((e) => {
  console.error('✗', e.message)
  process.exit(1)
})
