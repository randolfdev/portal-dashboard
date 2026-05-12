import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTenantBasePath } from '../../lib/use-tenant-base-path'
import WidgetWithIndicator from '../../components/dashboard/WidgetWithIndicator'
import DateFilter, { getDefaultDates } from '../../components/dashboard/DateFilter'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

type Widget = {
  id: string
  kind: string
  title: string
  config: Record<string, unknown>
  indicator_id: string | null
}

type LayoutItem = {
  widgetIndex: number
  x: number
  y: number
  w: number
  h: number
}

type Dashboard = {
  id: string
  title: string
  description: string | null
  layout: LayoutItem[]
}

export default function DashboardView() {
  const { dashboardSlug } = useParams()
  const tenant = useTenantData()
  const { role, canManageDashboards } = useAuth()
  const basePath = useTenantBasePath()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const isAdmin = role === 'tenant_admin' || role === 'platform_admin' || canManageDashboards

  const defaultDates = getDefaultDates()
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)
  const [filterVersion, setFilterVersion] = useState(0)

  const hasIndicators = widgets.some((w) => w.indicator_id)

  useEffect(() => {
    if (!tenant.id || !dashboardSlug) return

    supabase
      .from('dashboards')
      .select('id, title, description, layout')
      .eq('tenant_id', tenant.id)
      .eq('slug', dashboardSlug)
      .single()
      .then(async ({ data: dash }) => {
        if (!dash) {
          setLoading(false)
          return
        }
        setDashboard(dash)
        const { data: w } = await supabase
          .from('widgets')
          .select('id, kind, title, config, indicator_id')
          .eq('dashboard_id', dash.id)
          .order('created_at')
        setWidgets(w ?? [])
        setLoading(false)
      })
  }, [tenant.id, dashboardSlug])

  function handleDateChange(start: string, end: string) {
    setStartDate(start)
    setEndDate(end)
    setFilterVersion((v) => v + 1)
  }

  if (loading) return <LoadingSpinner />

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">Dashboard nao encontrado</p>
        <Link to={basePath || '/'} className="text-primary text-sm mt-3 hover:underline font-medium">
          Voltar aos dashboards
        </Link>
      </div>
    )
  }

  const layout: LayoutItem[] = Array.isArray(dashboard.layout) ? dashboard.layout : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link to={basePath || '/'} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors mb-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Dashboards
          </Link>
          <h2 className="text-xl font-bold text-slate-800">{dashboard.title}</h2>
          {dashboard.description && (
            <p className="text-sm text-slate-500 mt-0.5">{dashboard.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasIndicators && (
            <DateFilter
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
            />
          )}
          {isAdmin && (
            <Button variant="outline" size="sm">
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridAutoRows: '60px',
        }}
      >
        {widgets.map((widget, i) => {
          const pos = layout[i] ?? { x: 0, y: i * 4, w: 12, h: 4 }
          return (
            <div
              key={widget.id}
              style={{
                gridColumn: `${pos.x + 1} / span ${pos.w}`,
                gridRow: `${pos.y + 1} / span ${pos.h}`,
              }}
            >
              <WidgetWithIndicator
                kind={widget.kind}
                title={widget.title}
                config={widget.config}
                indicatorId={widget.indicator_id}
                dateRange={{ start: startDate, end: endDate }}
                filterVersion={filterVersion}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
