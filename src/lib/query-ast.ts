export type QueryAST = {
  version: 1
  source: { schema: string; table: string; alias: string }
  joins: JoinClause[]
  columns: ColumnDef[]
  filters: FilterDef[]
  groupBy: string[]
  orderBy: OrderByDef[]
  limit?: number
}

export type JoinClause = {
  type: 'inner' | 'left' | 'right'
  schema: string
  table: string
  alias: string
  on: { left: string; operator: string; right: string }
}

export type ColumnDef = {
  expression: string
  alias: string
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export type FilterDef = {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in' | 'between' | 'is_null' | 'is_not_null'
  value: unknown
  conjunction: 'and' | 'or'
}

export type OrderByDef = {
  column: string
  direction: 'asc' | 'desc'
}

export function emptyAST(): QueryAST {
  return {
    version: 1,
    source: { schema: '', table: '', alias: 't0' },
    joins: [],
    columns: [],
    filters: [],
    groupBy: [],
    orderBy: [],
  }
}
