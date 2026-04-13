import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

type Indicator = {
  id: string
  name: string
  description: string | null
  schedule: string
  connector_id: string
  created_at: string
  connectors: { name: string; db_type: string } | null
}

const scheduleLabels: Record<string, string> = {
  manual: 'Manual',
  '5min': '5 min',
  '15min': '15 min',
  '1h': '1 hora',
  daily: 'Diário',
}

export default function IndicatorsPage() {
  const tenant = useTenantData()
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant.id) return
    supabase
      .from('indicators')
      .select('id, name, description, schedule, connector_id, created_at, connectors(name, db_type)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setIndicators((data as unknown as Indicator[]) ?? [])
        setLoading(false)
      })
  }, [tenant.id])

  async function runNow(indicator: Indicator) {
    if (!tenant.id) return
    await supabase.from('jobs').insert({
      tenant_id: tenant.id,
      indicator_id: indicator.id,
      connector_id: indicator.connector_id,
      query_ast: {},
      status: 'pending',
    })
    alert('Job criado! O agent vai executar na próxima poll.')
  }

  async function deleteIndicator(id: string) {
    if (!confirm('Excluir este indicador?')) return
    await supabase.from('indicators').delete().eq('id', id)
    setIndicators((prev) => prev.filter((i) => i.id !== id))
  }

  if (loading) return <LoadingSpinner />

  if (indicators.length === 0) {
    return (
      <EmptyState
        title="Nenhum indicador"
        description="Crie indicadores para alimentar seus dashboards com dados reais."
        action={
          <Link to="/indicators/new"><Button>Criar indicador</Button></Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Indicadores</h2>
        <Link to="/indicators/new"><Button size="sm">+ Novo indicador</Button></Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-500">Conector</th>
                <th className="px-4 py-3 font-medium text-slate-500">Schedule</th>
                <th className="px-4 py-3 font-medium text-slate-500">Criado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind) => (
                <tr key={ind.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{ind.name}</p>
                    {ind.description && <p className="text-xs text-slate-500">{ind.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {ind.connectors?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ind.schedule === 'manual' ? 'neutral' : 'primary'}>
                      {scheduleLabels[ind.schedule] ?? ind.schedule}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(ind.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => runNow(ind)}>Executar</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteIndicator(ind.id)}>Excluir</Button>
                    </div>
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
