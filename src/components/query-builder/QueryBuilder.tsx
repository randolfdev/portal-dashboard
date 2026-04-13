import { QueryAST } from '../../lib/query-ast'
import { CachedTable } from '../../hooks/useSchemaCache'
import TableSelector from './TableSelector'
import ColumnPicker from './ColumnPicker'
import JoinBuilder from './JoinBuilder'
import FilterBuilder from './FilterBuilder'
import Button from '../ui/Button'

type Props = {
  ast: QueryAST
  onChange: (ast: QueryAST) => void
  tables: CachedTable[]
}

export default function QueryBuilder({ ast, onChange, tables }: Props) {
  const selectedTables = tables.filter(
    (t) =>
      (t.schema_name === ast.source.schema && t.table_name === ast.source.table) ||
      ast.joins.some((j) => j.schema === t.schema_name && j.table === t.table_name),
  )

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase">Tabela Principal</h3>
        <TableSelector
          schema={ast.source.schema}
          table={ast.source.table}
          alias={ast.source.alias}
          onChange={(source) => onChange({ ...ast, source })}
        />
      </section>

      <section>
        <JoinBuilder
          joins={ast.joins}
          onChange={(joins) => onChange({ ...ast, joins })}
        />
      </section>

      <section>
        <ColumnPicker
          tables={selectedTables.length > 0 ? selectedTables : []}
          sourceAlias={ast.source.alias}
          columns={ast.columns}
          onChange={(columns) => onChange({ ...ast, columns })}
        />
      </section>

      <section>
        <FilterBuilder
          filters={ast.filters}
          onChange={(filters) => onChange({ ...ast, filters })}
        />
      </section>

      <section className="space-y-2">
        <span className="text-xs text-slate-500 font-medium">Group By</span>
        <input
          value={ast.groupBy.join(', ')}
          onChange={(e) =>
            onChange({ ...ast, groupBy: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
          placeholder="t0.coluna1, t0.coluna2"
          className="w-full font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </section>

      <section className="space-y-2">
        <span className="text-xs text-slate-500 font-medium">Order By</span>
        <div className="flex gap-2">
          <input
            value={ast.orderBy.map((o) => `${o.column} ${o.direction}`).join(', ')}
            onChange={(e) => {
              const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
              const orderBy = parts.map((p) => {
                const [col, dir] = p.split(/\s+/)
                return { column: col, direction: (dir?.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc' }
              })
              onChange({ ...ast, orderBy })
            }}
            placeholder="t0.coluna ASC, t0.outra DESC"
            className="flex-1 font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </section>

      <section className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Limite</span>
        <input
          type="number"
          value={ast.limit ?? ''}
          onChange={(e) => onChange({ ...ast, limit: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="1000"
          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {!ast.limit && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...ast, limit: 1000 })}>
            Definir 1000
          </Button>
        )}
      </section>
    </div>
  )
}
