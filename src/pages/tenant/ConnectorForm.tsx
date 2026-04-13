import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const defaultPorts: Record<string, number> = {
  oracle: 1521,
  mysql: 3306,
  postgres: 5432,
  sqlserver: 1433,
}

const dbNameLabels: Record<string, string> = {
  oracle: 'Service Name / SID',
  mysql: 'Database',
  postgres: 'Database',
  sqlserver: 'Database',
}

export default function ConnectorForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const tenant = useTenantData()

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [dbType, setDbType] = useState('oracle')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(1521)
  const [dbName, setDbName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [extraConfig, setExtraConfig] = useState('')

  useEffect(() => {
    if (!isEdit || !id) return
    supabase
      .from('connectors')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name)
          setDbType(data.db_type)
          setHost(data.host)
          setPort(data.port)
          setDbName(data.database_name)
          setUsername(data.username)
          setExtraConfig(
            data.extra_config && Object.keys(data.extra_config).length > 0
              ? JSON.stringify(data.extra_config, null, 2)
              : '',
          )
        }
        setLoading(false)
      })
  }, [id, isEdit])

  function onDbTypeChange(type: string) {
    setDbType(type)
    setPort(defaultPorts[type] ?? 5432)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tenant.id) return
    setSaving(true)
    setError(null)

    let extra = {}
    if (extraConfig.trim()) {
      try {
        extra = JSON.parse(extraConfig)
      } catch {
        setError('Config extra não é JSON válido')
        setSaving(false)
        return
      }
    }

    const row = {
      tenant_id: tenant.id,
      name,
      db_type: dbType,
      host,
      port,
      database_name: dbName,
      username,
      encrypted_password: password || '***unchanged***',
      extra_config: extra,
    }

    if (isEdit) {
      if (!password) {
        const { encrypted_password: _, ...rest } = row
        void _
        const { error: err } = await supabase.from('connectors').update(rest).eq('id', id)
        if (err) { setError(err.message); setSaving(false); return }
      } else {
        const { error: err } = await supabase.from('connectors').update(row).eq('id', id)
        if (err) { setError(err.message); setSaving(false); return }
      }
    } else {
      if (!password) { setError('Senha é obrigatória'); setSaving(false); return }
      const { error: err } = await supabase.from('connectors').insert(row)
      if (err) { setError(err.message); setSaving(false); return }
    }

    navigate('/connectors')
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <button onClick={() => navigate('/connectors')} className="text-xs text-slate-400 hover:text-primary">
          ← Conectores
        </button>
        <h2 className="text-lg font-semibold text-slate-800">
          {isEdit ? 'Editar conector' : 'Novo conector'}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: ERP Oracle Produção"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-700">Tipo de banco</label>
          <select
            value={dbType}
            onChange={(e) => onDbTypeChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="oracle">Oracle</option>
            <option value="mysql">MySQL</option>
            <option value="postgres">PostgreSQL</option>
            <option value="sqlserver">SQL Server</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm text-slate-700">Host</label>
            <input
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="hostname ou IP"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Porta</label>
            <input
              required
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-700">{dbNameLabels[dbType]}</label>
          <input
            required
            value={dbName}
            onChange={(e) => setDbName(e.target.value)}
            placeholder={dbType === 'oracle' ? 'ORCL ou service name' : 'nome do banco'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Usuário</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-700">
              Senha{isEdit && ' (deixe vazio para manter)'}
            </label>
            <input
              type="password"
              required={!isEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-700">Config extra (JSON, opcional)</label>
          <textarea
            value={extraConfig}
            onChange={(e) => setExtraConfig(e.target.value)}
            rows={3}
            placeholder='{"schema": "HR"}'
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar conector'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/connectors')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
