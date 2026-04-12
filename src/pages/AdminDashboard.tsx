import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Tenant = {
  id: string
  slug: string
  name: string
  created_at: string
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, slug, name, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setTenants(data ?? [])
        setLoading(false)
      })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Plataforma · Admin</h1>
          <button
            onClick={signOut}
            className="text-sm rounded-lg border border-slate-700 px-3 py-1 hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Tenants</h2>
          {loading && <p className="text-slate-500">Carregando...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && !error && tenants.length === 0 && (
            <p className="text-slate-500">Nenhum tenant cadastrado.</p>
          )}
          {tenants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-mono">{t.slug}</td>
                      <td className="py-2 pr-4">{t.name}</td>
                      <td className="py-2 pr-4 text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
