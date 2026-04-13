import { ColumnDef } from '../../lib/query-ast'
import { CachedTable } from '../../hooks/useSchemaCache'

type Props = {
  tables: CachedTable[]
  sourceAlias: string
  columns: ColumnDef[]
  onChange: (columns: ColumnDef[]) => void
}

const aggregates = ['', 'sum', 'avg', 'count', 'min', 'max'] as const

export default function ColumnPicker({ tables, sourceAlias, columns, onChange }: Props) {
  const allCols = tables.flatMap((t) =>
    ((t.columns ?? []) as Array<{ name: string; type: string }>).map((c) => ({
      table: t.table_name,
      ...c,
    })),
  )

  function isSelected(expr: string) {
    return columns.some((c) => c.expression === expr)
  }

  function toggle(expr: string, alias: string) {
    if (isSelected(expr)) {
      onChange(columns.filter((c) => c.expression !== expr))
    } else {
      onChange([...columns, { expression: expr, alias }])
    }
  }

  function setAggregate(expr: string, agg: string) {
    onChange(
      columns.map((c) =>
        c.expression === expr
          ? { ...c, aggregate: agg ? (agg as ColumnDef['aggregate']) : undefined }
          : c,
      ),
    )
  }

  if (allCols.length === 0) {
    return <p className="text-sm text-slate-400">Selecione uma tabela primeiro.</p>
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 font-medium">Colunas</span>
        <button
          className="text-xs text-primary hover:underline"
          onClick={() => {
            if (columns.length === allCols.length) {
              onChange([])
            } else {
              onChange(allCols.map((c) => ({ expression: `${sourceAlias}.${c.name}`, alias: c.name })))
            }
          }}
        >
          {columns.length === allCols.length ? 'Nenhuma' : 'Todas'}
        </button>
      </div>
      {allCols.map((c) => {
        const expr = `${sourceAlias}.${c.name}`
        const sel = columns.find((col) => col.expression === expr)
        return (
          <div key={expr} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!sel}
              onChange={() => toggle(expr, c.name)}
              className="rounded border-slate-300"
            />
            <span className="flex-1 font-mono text-slate-700">{c.name}</span>
            <span className="text-xs text-slate-400">{c.type}</span>
            {sel && (
              <select
                value={sel.aggregate ?? ''}
                onChange={(e) => setAggregate(expr, e.target.value)}
                className="text-xs border border-slate-200 rounded px-1 py-0.5"
              >
                {aggregates.map((a) => (
                  <option key={a} value={a}>{a ? a.toUpperCase() : '—'}</option>
                ))}
              </select>
            )}
          </div>
        )
      })}
    </div>
  )
}
