import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { buildGroupedResult, type GroupedIndicatorResult } from '../lib/indicator-model'
import type { QueryAST } from '../lib/query-ast'

type DateRange = { start: string; end: string }

/**
 * Hook que executa um indicador com filtros dinâmicos.
 *
 * Fluxo:
 * 1. Carrega o indicador (query_ast) do banco
 * 2. Aplica filtros de data substituindo o valor do filtro "between" no AST
 * 3. Cria um job para o agent executar
 * 4. Faz polling até o resultado chegar
 * 5. Retorna dados com porcentagem calculada
 */
export function useIndicatorQuery() {
  const [result, setResult] = useState<GroupedIndicatorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (
    indicatorId: string,
    tenantId: string,
    dateRange: DateRange,
  ) => {
    setLoading(true)
    setError(null)
    setResult(null)

    // 1. Buscar o indicador
    const { data: indicator, error: indErr } = await supabase
      .from('indicators')
      .select('query_ast, connector_id')
      .eq('id', indicatorId)
      .single()

    if (indErr || !indicator) {
      setError('Indicador nao encontrado')
      setLoading(false)
      return
    }

    // 2. Clonar AST e aplicar filtro de data
    const ast = structuredClone(indicator.query_ast) as QueryAST
    const betweenFilter = ast.filters.find((f) => f.operator === 'between')
    if (betweenFilter) {
      // Converter ISO (YYYY-MM-DD) para DD/MM/YYYY (Oracle)
      const toOracle = (iso: string) => {
        const [y, m, d] = iso.split('-')
        return `${d}/${m}/${y}`
      }
      betweenFilter.value = [toOracle(dateRange.start), toOracle(dateRange.end)]
    }

    // 3. Criar job
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        indicator_id: indicatorId,
        connector_id: indicator.connector_id,
        query_ast: ast,
        status: 'pending',
      })
      .select()
      .single()

    if (jobErr || !job) {
      setError(`Erro ao criar job: ${jobErr?.message ?? 'desconhecido'}`)
      setLoading(false)
      return
    }

    // 4. Polling
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
        const { data: resultData } = await supabase
          .from('indicator_results')
          .select('data, fetched_at')
          .eq('job_id', job.id)
          .single()

        const rows = (resultData?.data as Record<string, unknown>[]) ?? []

        // Detectar labelKey e valueKey a partir das colunas do AST
        const cols = ast.columns ?? []
        const aggCol = cols.find((c) => c.aggregate)
        const labelCol = cols.find((c) => !c.aggregate)
        const valueKey = aggCol?.alias ?? aggCol?.expression ?? 'qtd'
        const labelKey = labelCol?.alias ?? labelCol?.expression ?? 'label'

        const grouped = buildGroupedResult(rows, labelKey, valueKey, resultData?.fetched_at)
        setResult(grouped)
        setLoading(false)
      } else if (updated?.status === 'failed') {
        clearInterval(poll)
        setError(updated.error_message ?? 'Job falhou')
        setLoading(false)
      } else if (attempts > 60) {
        clearInterval(poll)
        setError('Timeout: o agent nao respondeu em 60s')
        setLoading(false)
      }
    }, 1000)
  }, [])

  return { result, loading, error, execute }
}
