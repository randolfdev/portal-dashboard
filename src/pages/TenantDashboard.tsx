import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TenantDashboard({ slug }: { slug: string }) {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Tenant</p>
            <h1 className="text-xl font-bold text-slate-800">{slug}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:inline">{email}</span>
            <button
              onClick={signOut}
              className="text-sm rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800">Bem-vindo</h2>
          <p className="text-slate-600 mt-1">
            Este é o portal do tenant. Personalize a partir daqui.
          </p>
        </div>
      </main>
    </div>
  )
}
