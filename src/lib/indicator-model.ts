/**
 * Modelo padronizado de retorno de indicadores.
 *
 * Toda query de indicador retorna dados brutos (rows).
 * As funções abaixo transformam esses dados em um formato
 * padronizado com totais e porcentagens pronto para
 * consumo pelos widgets do dashboard.
 */

export type IndicatorRow = Record<string, unknown>

/** Uma linha enriquecida com porcentagem calculada */
export type IndicatorRowWithPercent<T extends IndicatorRow = IndicatorRow> = T & {
  _percentual: number
}

/** Resultado padronizado de um indicador de agrupamento */
export type GroupedIndicatorResult<T extends IndicatorRow = IndicatorRow> = {
  rows: IndicatorRowWithPercent<T>[]
  total: number
  labelKey: string
  valueKey: string
  fetchedAt: string | null
}

/**
 * Recebe dados brutos de um indicador que agrupa por uma dimensão
 * e retorna o resultado padronizado com porcentagem em cada linha.
 */
export function buildGroupedResult<T extends IndicatorRow>(
  rows: T[],
  labelKey: string,
  valueKey: string,
  fetchedAt: string | null = null,
): GroupedIndicatorResult<T> {
  const total = rows.reduce((sum, r) => {
    const v = Number(r[valueKey]) || 0
    return sum + v
  }, 0)

  const enriched = rows.map((r) => ({
    ...r,
    _percentual: total > 0 ? Number(((Number(r[valueKey]) / total) * 100).toFixed(2)) : 0,
  }))

  return { rows: enriched, total, labelKey, valueKey, fetchedAt }
}

/**
 * Helper: formata data para o padrão Oracle DD/MM/YYYY.
 */
export function formatDateOracle(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
