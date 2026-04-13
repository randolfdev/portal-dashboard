const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const USER_ID = '7df6d60b-fce8-41c0-bf4e-5ee4906e27ac'
const NEW_PASSWORD = 'admin12345'

const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`, {
  method: 'PUT',
  headers: {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password: NEW_PASSWORD }),
})
console.log(res.status, await res.json())
