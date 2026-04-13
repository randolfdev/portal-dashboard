import { QueryAST } from './query-ast'

export function queryToSql(ast: QueryAST): string {
  if (!ast.source.table) return '-- Selecione uma tabela'

  const parts: string[] = []

  // SELECT
  if (ast.columns.length === 0) {
    parts.push(`SELECT ${ast.source.alias}.*`)
  } else {
    const cols = ast.columns.map((c) => {
      const expr = c.aggregate ? `${c.aggregate.toUpperCase()}(${c.expression})` : c.expression
      return c.alias && c.alias !== c.expression ? `${expr} AS "${c.alias}"` : expr
    })
    parts.push(`SELECT ${cols.join(',\n       ')}`)
  }

  // FROM
  const src = ast.source.schema
    ? `${ast.source.schema}.${ast.source.table}`
    : ast.source.table
  parts.push(`FROM ${src} ${ast.source.alias}`)

  // JOINS
  for (const j of ast.joins) {
    const tbl = j.schema ? `${j.schema}.${j.table}` : j.table
    const type = j.type.toUpperCase()
    parts.push(`${type} JOIN ${tbl} ${j.alias} ON ${j.on.left} ${j.on.operator} ${j.on.right}`)
  }

  // WHERE
  if (ast.filters.length > 0) {
    const conds = ast.filters.map((f, i) => {
      const prefix = i === 0 ? 'WHERE' : f.conjunction.toUpperCase()
      if (f.operator === 'is_null') return `${prefix} ${f.column} IS NULL`
      if (f.operator === 'is_not_null') return `${prefix} ${f.column} IS NOT NULL`
      if (f.operator === 'in') {
        const vals = Array.isArray(f.value) ? f.value.map((v: unknown) => `'${v}'`).join(', ') : `'${f.value}'`
        return `${prefix} ${f.column} IN (${vals})`
      }
      if (f.operator === 'between') {
        const [min, max] = Array.isArray(f.value) ? f.value : [f.value, f.value]
        return `${prefix} ${f.column} BETWEEN '${min}' AND '${max}'`
      }
      if (f.operator === 'like') return `${prefix} ${f.column} LIKE '${f.value}'`
      return `${prefix} ${f.column} ${f.operator} '${f.value}'`
    })
    parts.push(conds.join('\n  '))
  }

  // GROUP BY
  if (ast.groupBy.length > 0) {
    parts.push(`GROUP BY ${ast.groupBy.join(', ')}`)
  }

  // ORDER BY
  if (ast.orderBy.length > 0) {
    const ords = ast.orderBy.map((o) => `${o.column} ${o.direction.toUpperCase()}`)
    parts.push(`ORDER BY ${ords.join(', ')}`)
  }

  // LIMIT
  if (ast.limit) {
    parts.push(`FETCH FIRST ${ast.limit} ROWS ONLY`)
  }

  return parts.join('\n')
}
