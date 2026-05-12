import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTenantBasePath } from '../../lib/use-tenant-base-path'
import { defaultTemplate } from '../../lib/dashboard-templates'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

type Dashboard = {
  id: string
  title: string
  slug: string
  description: string | null
  is_default: boolean
  created_at: string
}

export default function DashboardList() {
  const tenant = useTenantData()
  const { role, canManageDashboards } = useAuth()
  const basePath = useTenantBasePath()
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)
  const canCreate = role === 'tenant_admin' || role === 'platform_admin' || canManageDashboards

  useEffect(() => {
    if (!tenant.id) return
    supabase
      .from('dashboards')
      .select('id, title, slug, description, is_default, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at')
      .then(({ data }) => {
        setDashboards(data ?? [])
        setLoading(false)
      })
  }, [tenant.id])

  async function createFromTemplate() {
    if (!tenant.id) return
    const slug = 'visao-geral'
    const { data: dash } = await supabase
      .from('dashboards')
      .insert({
        tenant_id: tenant.id,
        title: defaultTemplate.title,
        slug,
        description: defaultTemplate.description,
        is_default: true,
        layout: defaultTemplate.widgets.map((w, i) => ({ widgetIndex: i, ...w.layout })),
      })
      .select()
      .single()

    if (dash) {
      const widgetRows = defaultTemplate.widgets.map((w) => ({
        dashboard_id: dash.id,
        kind: w.kind,
        title: w.title,
        config: w.config,
      }))
      await supabase.from('widgets').insert(widgetRows)
      setDashboards((prev) => [...prev, dash])
    }
  }

  if (loading) return <LoadingSpinner />

  if (dashboards.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        }
        title="Nenhum dashboard ainda"
        description="Crie seu primeiro dashboard a partir de um template."
        action={
          canCreate ? (
            <Button onClick={createFromTemplate}>Criar dashboard de exemplo</Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dashboards</h2>
          <p className="text-sm text-slate-400 mt-0.5">{dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={createFromTemplate}>
            + Novo
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {dashboards.map((d) => (
          <Link
            key={d.id}
            to={`${basePath}/dashboards/${d.slug}`}
            className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-primary/20 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              {d.is_default && (
                <span className="bg-primary/8 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-lg">Padrao</span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 group-hover:text-primary transition-colors">{d.title}</h3>
            {d.description && (
              <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{d.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-4">
              {new Date(d.created_at).toLocaleDateString('pt-BR')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
