import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

type AgentKey = {
  id: string
  label: string
  is_active: boolean
  last_seen_at: string | null
  created_at: string
}

type Job = {
  id: string
  status: string
  error_message: string | null
  row_count: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  indicators: { name: string } | null
}

function agentStatus(lastSeen: string | null): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (!lastSeen) return { label: 'Nunca conectado', variant: 'neutral' }
  const diff = Date.now() - new Date(lastSeen).getTime()
  if (diff < 30_000) return { label: 'Online', variant: 'success' }
  if (diff < 300_000) return { label: 'Recente', variant: 'warning' }
  return { label: 'Offline', variant: 'danger' }
}

const jobStatusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'primary' }> = {
  pending: { label: 'Pendente', variant: 'neutral' },
  running: { label: 'Executando', variant: 'primary' },
  completed: { label: 'Concluído', variant: 'success' },
  failed: { label: 'Falhou', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'warning' },
}

export default function AgentStatusPage() {
  const tenant = useTenantData()
  const [keys, setKeys] = useState<AgentKey[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant.id) return
    Promise.all([
      supabase
        .from('agent_keys')
        .select('id, label, is_active, last_seen_at, created_at')
        .eq('tenant_id', tenant.id)
        .order('created_at'),
      supabase
        .from('jobs')
        .select('id, status, error_message, row_count, started_at, completed_at, created_at, indicators(name)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]).then(([keysRes, jobsRes]) => {
      setKeys((keysRes.data as AgentKey[]) ?? [])
      setJobs((jobsRes.data as Job[]) ?? [])
      setLoading(false)
    })
  }, [tenant.id])

  async function createKey() {
    if (!tenant.id || !newKeyLabel.trim()) return
    const raw = `dk_${crypto.randomUUID().replace(/-/g, '')}`
    const encoded = new TextEncoder().encode(raw)
    const hashBuf = await crypto.subtle.digest('SHA-256', encoded)
    const hashHex = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('')

    const { data } = await supabase
      .from('agent_keys')
      .insert({ tenant_id: tenant.id, key_hash: hashHex, label: newKeyLabel.trim() })
      .select()
      .single()

    if (data) {
      setKeys((prev) => [...prev, data as AgentKey])
      setGeneratedKey(raw)
      setNewKeyLabel('')
    }
  }

  async function toggleKey(id: string, current: boolean) {
    await supabase.from('agent_keys').update({ is_active: !current }).eq('id', id)
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: !current } : k)))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800">Status do Agent</h2>

      {/* Agent Keys */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Chaves de API</h3>

        {generatedKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
            <p className="text-sm text-green-800 font-medium">Chave criada! Copie agora — não será exibida novamente.</p>
            <code className="block text-xs font-mono bg-green-100 p-2 rounded select-all break-all">{generatedKey}</code>
            <Button variant="ghost" size="sm" onClick={() => setGeneratedKey(null)}>Fechar</Button>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma chave. Crie uma para conectar o agent.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Última conexão</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const st = agentStatus(k.last_seen_at)
                  return (
                    <tr key={k.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium">{k.label}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={k.is_active ? st.variant : 'neutral'}>
                          {k.is_active ? st.label : 'Desativada'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-slate-500">
                        {k.last_seen_at ? new Date(k.last_seen_at).toLocaleString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" onClick={() => toggleKey(k.id, k.is_active)}>
                          {k.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <input
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            placeholder="Nome da chave (ex: servidor-erp)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button size="sm" onClick={createKey} disabled={!newKeyLabel.trim()}>Criar chave</Button>
        </div>
      </section>

      {/* Recent Jobs */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Jobs Recentes</h3>
        {jobs.length === 0 ? (
          <EmptyState title="Nenhum job" description="Jobs aparecerão aqui quando indicadores forem executados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-3">Indicador</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Linhas</th>
                  <th className="py-2 pr-3">Início</th>
                  <th className="py-2 pr-3">Duração</th>
                  <th className="py-2 pr-3">Erro</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const badge = jobStatusBadge[j.status] ?? jobStatusBadge.pending
                  const duration = j.started_at && j.completed_at
                    ? `${((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000).toFixed(1)}s`
                    : '—'
                  return (
                    <tr key={j.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3">{j.indicators?.name ?? '(preview)'}</td>
                      <td className="py-2 pr-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                      <td className="py-2 pr-3 text-slate-600">{j.row_count ?? '—'}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        {j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">{duration}</td>
                      <td className="py-2 pr-3 text-red-500 text-xs max-w-xs truncate">{j.error_message ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
