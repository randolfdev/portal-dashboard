import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

type Tenant = {
  id: string
  slug: string
  name: string
  created_at: string
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, slug, name, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTenants(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSpinner />

  if (tenants.length === 0) {
    return <EmptyState title="Nenhum tenant" description="Cadastre o primeiro tenant da plataforma." />
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Tenants</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">Slug</th>
                <th className="px-4 py-3 font-medium text-slate-500">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-500">Criado em</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-slate-800">{t.slug}</td>
                  <td className="px-4 py-3 text-slate-700">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Ativo</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
