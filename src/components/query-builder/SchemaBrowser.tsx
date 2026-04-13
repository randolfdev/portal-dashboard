import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CachedTable } from '../../hooks/useSchemaCache'
import Button from '../ui/Button'

type Props = {
  tables: CachedTable[]
  loading: boolean
  connectorId: string | null
  tenantId: string | null
  onSelectTable: (schema: string, table: string) => void
  onSyncComplete?: () => void
}

export default function SchemaBrowser({ tables, loading, connectorId, tenantId, onSelectTable, onSyncComplete }: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const grouped = tables.reduce<Record<string, CachedTable[]>>((acc, t) => {
    const key = t.schema_name || 'default'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const filtered = search
    ? Object.entries(grouped).reduce<Record<string, CachedTable[]>>((acc, [schema, tbls]) => {
        const f = tbls.filter((t) =>
          t.table_name.toLowerCase().includes(search.toLowerCase()),
        )
        if (f.length > 0) acc[schema] = f
        return acc
      }, {})
    : grouped

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function syncSchema() {
    if (!connectorId || !tenantId) return
    setSyncing(true)
    setSyncError(null)

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        connector_id: connectorId,
        indicator_id: null,
        query_ast: { type: 'sync_schema' },
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      setSyncError(`Erro ao criar job: ${error.message}`)
      setSyncing(false)
      return
    }

    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data: updated } = await supabase
        .from('jobs')
        .select('status, error_message')
        .eq('id', job.id)
        .single()

      if (updated?.status === 'completed') {
        clearInterval(poll)
        setSyncing(false)
        onSyncComplete?.()
      } else if (updated?.status === 'failed') {
        clearInterval(poll)
        setSyncError(updated.error_message ?? 'Sincronização falhou')
        setSyncing(false)
      } else if (attempts > 120) {
        clearInterval(poll)
        setSyncError('Timeout: o agent não respondeu em 120s')
        setSyncing(false)
      }
    }, 1000)
  }

  if (loading || syncing) {
    return (
      <div className="p-3 text-sm text-slate-400 flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {syncing ? 'Sincronizando schema...' : 'Carregando schema...'}
      </div>
    )
  }

  if (tables.length === 0) {
    return (
      <div className="p-3 text-sm text-slate-500 space-y-3">
        <p>Nenhum schema em cache.</p>
        <p className="text-xs">O agent precisa sincronizar o dicionário do banco.</p>
        {syncError && (
          <p className="text-xs text-red-500">{syncError}</p>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={syncSchema}
          disabled={!connectorId}
        >
          Sincronizar Schema
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center border-b border-slate-200">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tabela..."
          className="flex-1 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={syncSchema}
          disabled={!connectorId}
          title="Re-sincronizar schema"
          className="px-2 py-2 text-slate-400 hover:text-primary disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto text-sm">
        {Object.entries(filtered).map(([schema, tbls]) => (
          <div key={schema}>
            <button
              onClick={() => toggle(schema)}
              className="w-full flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-medium"
            >
              <span className="text-xs">{expanded.has(schema) ? '▼' : '▶'}</span>
              {schema}
              <span className="text-xs text-slate-400 ml-auto">{tbls.length}</span>
            </button>
            {expanded.has(schema) &&
              tbls.map((t) => (
                <div key={`${schema}.${t.table_name}`}>
                  <button
                    onClick={() => toggle(`${schema}.${t.table_name}`)}
                    className="w-full flex items-center gap-1 pl-6 pr-3 py-1 text-slate-700 hover:bg-slate-50"
                  >
                    <span className="text-xs">{expanded.has(`${schema}.${t.table_name}`) ? '▼' : '▶'}</span>
                    <span className="flex-1 text-left">{t.table_name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectTable(schema, t.table_name) }}
                      className="text-xs text-primary hover:underline"
                    >
                      usar
                    </button>
                  </button>
                  {expanded.has(`${schema}.${t.table_name}`) && (
                    <div className="pl-10 pr-3 py-1 space-y-0.5">
                      {((t.columns ?? []) as Array<{ name: string; type: string; primaryKey?: boolean }>).map((col) => (
                        <div key={col.name} className="flex items-center gap-2 text-xs text-slate-500">
                          {col.primaryKey && <span className="text-amber-500">🔑</span>}
                          <span className="text-slate-700">{col.name}</span>
                          <span className="text-slate-400">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
