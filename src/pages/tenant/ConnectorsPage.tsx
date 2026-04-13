import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

type Connector = {
  id: string
  name: string
  db_type: string
  host: string
  port: number
  database_name: string
  username: string
  is_active: boolean
  created_at: string
}

const dbLabels: Record<string, string> = {
  oracle: 'Oracle',
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
  sqlserver: 'SQL Server',
}

const dbColors: Record<string, 'primary' | 'success' | 'secondary' | 'warning'> = {
  oracle: 'warning',
  mysql: 'primary',
  postgres: 'secondary',
  sqlserver: 'success',
}

export default function ConnectorsPage() {
  const tenant = useTenantData()
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant.id) return
    supabase
      .from('connectors')
      .select('id, name, db_type, host, port, database_name, username, is_active, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at')
      .then(({ data }) => {
        setConnectors(data ?? [])
        setLoading(false)
      })
  }, [tenant.id])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('connectors').update({ is_active: !current }).eq('id', id)
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c)),
    )
  }

  async function deleteConnector(id: string) {
    if (!confirm('Tem certeza que deseja excluir este conector?')) return
    await supabase.from('connectors').delete().eq('id', id)
    setConnectors((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) return <LoadingSpinner />

  if (connectors.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        }
        title="Nenhum conector configurado"
        description="Conecte o banco de dados do seu ERP para alimentar os dashboards."
        action={
          <Link to="/connectors/new">
            <Button>Novo conector</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Conectores</h2>
        <Link to="/connectors/new">
          <Button size="sm">+ Novo conector</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{c.name}</h3>
                <Badge variant={dbColors[c.db_type] ?? 'neutral'}>
                  {dbLabels[c.db_type] ?? c.db_type}
                </Badge>
              </div>
              <Badge variant={c.is_active ? 'success' : 'neutral'}>
                {c.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="text-sm text-slate-500 space-y-1">
              <p>{c.host}:{c.port}</p>
              <p>{c.database_name}</p>
              <p>Usuário: {c.username}</p>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Link to={`/connectors/${c.id}/edit`}>
                <Button variant="ghost" size="sm">Editar</Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleActive(c.id, c.is_active)}
              >
                {c.is_active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteConnector(c.id)}>
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
