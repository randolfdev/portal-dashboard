import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useTenantData } from '../contexts/TenantContext'

export default function TenantLogin({ slug }: { slug: string }) {
  const tenant = useTenantData()
  const displayName = tenant.name && tenant.name !== slug ? tenant.name : slug
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    console.log('[login] starting signIn...')
    supabase.auth.signInWithPassword({ email, password }).then(
      (result) => {
        console.log('[login] resolved', result)
        if (result.error) {
          setError(result.error.message)
          setLoading(false)
        } else {
          console.log('[login] success, redirecting...')
          // Redirect to tenant root (works for both path-based and subdomain)
          const pathMatch = window.location.pathname.match(/^\/t\/[^/]+/)
          window.location.href = pathMatch ? pathMatch[0] : '/'
        }
      },
      (err) => {
        console.error('[login] rejected', err)
        setError(String(err))
        setLoading(false)
      },
    )
    console.log('[login] signIn called (promise pending)')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
      >
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Portal</p>
          <h1 className="text-2xl font-bold text-slate-800">{displayName}</h1>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary text-white py-2 font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
