// One-shot bootstrap: cria tenant 'acme', vira o usuário em platform_admin
// e vincula ao tenant. Rode com: node scripts/bootstrap.mjs

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
const EMAIL = 'randolfgrassmannfilho@gmail.com'
const TENANT_SLUG = 'acme'
const TENANT_NAME = 'Acme Corp'

const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

async function main() {
  // 1) Acha o user pelo email
  const ures = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers })
  if (!ures.ok) throw new Error(`list users: ${ures.status} ${await ures.text()}`)
  const { users } = await ures.json()
  const user = users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
  if (!user) throw new Error(`Usuário ${EMAIL} não encontrado. Cadastre no Studio primeiro.`)
  console.log('✓ user:', user.id, user.email)

  // 2) Seta app_metadata.role = platform_admin (vai pro JWT)
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

  // 4) Atualiza profile do user: platform_admin + tenant_id
  const pres = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ role: 'platform_admin', tenant_id: tenantId }),
  })
  if (!pres.ok) throw new Error(`update profile: ${pres.status} ${await pres.text()}`)
  const profile = await pres.json()
  console.log('✓ profile:', profile)

  console.log('\n🎉 Pronto. Faça LOGOUT e login de novo para renovar o JWT.')
}

main().catch((e) => {
  console.error('✗', e.message)
  process.exit(1)
})
