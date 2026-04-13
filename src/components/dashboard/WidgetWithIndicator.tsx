import { useEffect } from 'react'
import { useTenantData } from '../../contexts/TenantContext'
import { useIndicatorQuery } from '../../hooks/useIndicatorQuery'
import { useIndicatorData } from '../../hooks/useIndicatorData'
import { buildGroupedResult } from '../../lib/indicator-model'
import WidgetRenderer from './WidgetRenderer'
import LoadingSpinner from '../ui/LoadingSpinner'

type Props = {
  kind: string
  title: string
  config: Record<string, unknown>
  indicatorId: string | null
  dateRange?: { start: string; end: string }
  filterVersion?: number
}

export default function WidgetWithIndicator({
  kind, title, config, indicatorId, dateRange, filterVersion,
}: Props) {
  const tenant = useTenantData()
  // Se tem dateRange, usa execucao dinamica via job
  const useDynamic = !!dateRange && !!indicatorId

  const { result: queryResult, loading: queryLoading, error, execute } = useIndicatorQuery()
  const { result: cachedResult, loading: cachedLoading } = useIndicatorData(indicatorId, !useDynamic)

  useEffect(() => {
    if (!useDynamic || !tenant.id || !indicatorId) return
    execute(indicatorId, tenant.id, dateRange!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorId, tenant.id, filterVersion])

  if (!indicatorId) {
    return <WidgetRenderer kind={kind} title={title} config={config} />
  }

  const loading = useDynamic ? queryLoading : cachedLoading

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  // Montar dados para o widget
  const mapping = (config.indicatorMapping ?? {}) as Record<string, string>
  let rows: Record<string, unknown>[] = []
  let mergedConfig = { ...config }

  if (useDynamic && queryResult) {
    // Resultado dinamico com porcentagem ja calculada
    rows = queryResult.rows
    mergedConfig = buildDynamicConfig(kind, config, mapping, queryResult.rows, queryResult.total, queryResult.labelKey, queryResult.valueKey)
  } else if (cachedResult) {
    // Resultado cacheado - calcular porcentagem se necessario
    rows = cachedResult.data ?? []
    const labelKey = mapping.nameKey ?? mapping.xKey ?? Object.keys(rows[0] ?? {})[0]
    const valueKey = mapping.valueKey ?? mapping.yKey ?? Object.keys(rows[0] ?? {})[1]

    if (rows.length > 0 && labelKey && valueKey) {
      const grouped = buildGroupedResult(rows, labelKey, valueKey, cachedResult.fetched_at)
      mergedConfig = buildDynamicConfig(kind, config, mapping, grouped.rows, grouped.total, grouped.labelKey, grouped.valueKey)
    } else {
      mergedConfig = buildFallbackConfig(kind, config, mapping, rows)
    }
  }

  return <WidgetRenderer kind={kind} title={title} config={mergedConfig} />
}

function buildDynamicConfig(
  kind: string,
  config: Record<string, unknown>,
  mapping: Record<string, string>,
  rows: Record<string, unknown>[],
  total: number,
  labelKey: string,
  valueKey: string,
): Record<string, unknown> {
  switch (kind) {
    case 'metric_card': {
      const metricMode = config.metricMode as string | undefined
      const sorted = [...rows].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]))

      if (metricMode === 'top3_list') {
        const top3 = sorted.slice(0, 3)
        return {
          ...config,
          value: 0,
          _top3: top3.map((r) => ({
            label: String(r[labelKey]),
            value: Number(r[valueKey]),
            percent: r._percentual ?? 0,
          })),
        }
      }

      if (metricMode === 'top3_total') {
        const top3Sum = sorted.slice(0, 3).reduce((s, r) => s + Number(r[valueKey]), 0)
        const top3Pct = total > 0 ? ((top3Sum / total) * 100).toFixed(1) : '0'
        return {
          ...config,
          value: top3Sum,
          label: `${top3Pct}% do total`,
        }
      }

      const metricField = mapping.valueKey ?? 'total'
      return {
        ...config,
        value: metricField === 'total' ? total : (rows[0]?.[metricField] ?? total),
        suffix: config.suffix,
        label: config.label ?? `${rows.length} convenios`,
      }
    }
    case 'chart_bar':
    case 'chart_line':
    case 'chart_pie': {
      return {
        ...config,
        data: rows,
        xKey: mapping.xKey ?? labelKey,
        yKey: mapping.yKey ?? valueKey,
        nameKey: mapping.nameKey ?? labelKey,
        valueKey: mapping.valueKey ?? valueKey,
        showPercent: true,
      }
    }
    case 'table': {
      const columns = Object.keys(rows[0] ?? {})
        .filter((k) => !k.startsWith('_'))
        .map((key) => ({ key, label: columnLabel(key) }))
      // Adicionar coluna de percentual
      columns.push({ key: '_percentual', label: '%' })
      return {
        ...config,
        columns,
        rows,
      }
    }
    default:
      return config
  }
}

function buildFallbackConfig(
  kind: string,
  config: Record<string, unknown>,
  mapping: Record<string, string>,
  rows: Record<string, unknown>[],
): Record<string, unknown> {
  switch (kind) {
    case 'metric_card': {
      const firstRow = rows[0]
      if (firstRow) {
        const valueKey = mapping.valueKey ?? Object.keys(firstRow)[0]
        return { ...config, value: firstRow[valueKey] }
      }
      return config
    }
    case 'chart_bar':
    case 'chart_line':
    case 'chart_pie': {
      return {
        ...config,
        data: rows,
        xKey: mapping.xKey ?? config.xKey,
        yKey: mapping.yKey ?? config.yKey,
        nameKey: mapping.nameKey ?? config.nameKey,
        valueKey: mapping.valueKey ?? config.valueKey,
      }
    }
    case 'table': {
      const columns = Object.keys(rows[0] ?? {}).map((key) => ({ key, label: columnLabel(key) }))
      return { ...config, columns, rows }
    }
    default:
      return config
  }
}

function columnLabel(key: string): string {
  if (key === '_percentual') return '%'
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
