import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTenantData } from '../../contexts/TenantContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSchemaCache } from '../../hooks/useSchemaCache'
import { QueryAST, emptyAST } from '../../lib/query-ast'
import { queryToSql } from '../../lib/query-to-sql'
import SchemaBrowser from '../../components/query-builder/SchemaBrowser'
import QueryBuilder from '../../components/query-builder/QueryBuilder'
import SqlPreview from '../../components/query-builder/SqlPreview'
import ResultPreview from '../../components/query-builder/ResultPreview'
import SaveIndicatorModal from '../../components/query-builder/SaveIndicatorModal'
import Button from '../../components/ui/Button'

type Connector = { id: string; name: string; db_type: string }

export default function IndicatorBuilder() {
  const tenant = useTenantData()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [connectors, setConnectors] = useState<Connector[]>([])
  const [connectorId, setConnectorId] = useState<string | null>(null)
  const [ast, setAst] = useState<QueryAST>(emptyAST())
  const [showSave, setShowSave] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const { tables, loading: schemaLoading, refresh: refreshSchema } = useSchemaCache(connectorId)
  const sql = queryToSql(ast)

  useEffect(() => {
    if (!tenant.id) return
    supabase
      .from('connectors')
      .select('id, name, db_type')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .then(({ data }) => {
        const list = (data ?? []) as Connector[]
        setConnectors(list)
        if (list.length > 0 && !connectorId) setConnectorId(list[0].id)
      })
  }, [tenant.id, connectorId])

  function onSelectTable(schema: string, table: string) {
    setAst((prev) => ({
      ...prev,
      source: { schema, table, alias: prev.source.alias || 't0' },
      columns: [],
    }))
  }

  async function executePreview() {
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewData(null)

    if (!connectorId || !tenant.id) {
      setPreviewError('Selecione um conector')
      setPreviewLoading(false)
      return
    }

    const previewAst = { ...ast, limit: ast.limit ?? 100 }
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenant.id,
        indicator_id: null,
        connector_id: connectorId,
        query_ast: previewAst,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      setPreviewError(`Erro ao criar job: ${error.message}`)
      setPreviewLoading(false)
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
        const { data: result } = await supabase
          .from('indicator_results')
          .select('data')
          .eq('job_id', job.id)
          .single()
        setPreviewData((result?.data as Record<string, unknown>[]) ?? [])
        setPreviewLoading(false)
      } else if (updated?.status === 'failed') {
        clearInterval(poll)
        setPreviewError(updated.error_message ?? 'Job falhou')
        setPreviewLoading(false)
      } else if (attempts > 60) {
        clearInterval(poll)
        setPreviewError('Timeout: o agent não respondeu em 60s')
        setPreviewLoading(false)
      }
    }, 1000)
  }

  async function saveIndicator(name: string, description: string, schedule: string) {
    if (!connectorId || !tenant.id) return
    await supabase.from('indicators').insert({
      tenant_id: tenant.id,
      connector_id: connectorId,
      name,
      description: description || null,
      query_ast: ast,
      sql_preview: sql,
      schedule,
      created_by: user?.id,
    })
    navigate('/indicators')
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/indicators')} className="text-xs text-slate-400 hover:text-primary">
            ← Indicadores
          </button>
          <h2 className="text-lg font-semibold text-slate-800">Novo Indicador</h2>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={connectorId ?? ''}
            onChange={(e) => setConnectorId(e.target.value || null)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecione o conector</option>
            {connectors.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.db_type})</option>
            ))}
          </select>
          <Button onClick={() => setShowSave(true)} disabled={!ast.source.table}>
            Salvar Indicador
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Schema browser */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase">Schema do Banco</h3>
          </div>
          <SchemaBrowser
            tables={tables}
            loading={schemaLoading}
            connectorId={connectorId}
            tenantId={tenant.id}
            onSelectTable={onSelectTable}
            onSyncComplete={refreshSchema}
          />
        </div>

        {/* Query builder */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto">
          <QueryBuilder ast={ast} onChange={setAst} tables={tables} />
        </div>

        {/* Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">SQL Preview</h3>
            <SqlPreview sql={sql} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1">
            <ResultPreview
              data={previewData}
              loading={previewLoading}
              error={previewError}
              onExecute={executePreview}
            />
          </div>
        </div>
      </div>

      <SaveIndicatorModal
        open={showSave}
        onClose={() => setShowSave(false)}
        onSave={saveIndicator}
      />
    </div>
  )
}
