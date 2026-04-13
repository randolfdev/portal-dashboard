import { FilterDef } from '../../lib/query-ast'
import Button from '../ui/Button'

type Props = {
  filters: FilterDef[]
  onChange: (filters: FilterDef[]) => void
}

const operators = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
  { value: 'like', label: 'LIKE' },
  { value: 'in', label: 'IN' },
  { value: 'is_null', label: 'IS NULL' },
  { value: 'is_not_null', label: 'IS NOT NULL' },
]

export default function FilterBuilder({ filters, onChange }: Props) {
  function add() {
    onChange([...filters, { column: '', operator: '=', value: '', conjunction: 'and' }])
  }

  function update(index: number, patch: Partial<FilterDef>) {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function remove(index: number) {
    onChange(filters.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Filtros</span>
        <Button variant="ghost" size="sm" onClick={add}>+ Filtro</Button>
      </div>
      {filters.map((f, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          {i > 0 && (
            <select
              value={f.conjunction}
              onChange={(e) => update(i, { conjunction: e.target.value as 'and' | 'or' })}
              className="w-14 text-xs border border-slate-200 rounded px-1 py-1"
            >
              <option value="and">AND</option>
              <option value="or">OR</option>
            </select>
          )}
          {i === 0 && <span className="w-14 text-xs text-slate-400">WHERE</span>}
          <input
            value={f.column}
            onChange={(e) => update(i, { column: e.target.value })}
            placeholder="coluna"
            className="flex-1 font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={f.operator}
            onChange={(e) => update(i, { operator: e.target.value as FilterDef['operator'] })}
            className="border border-slate-200 rounded px-1 py-1 text-sm"
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          {!['is_null', 'is_not_null'].includes(f.operator) && (
            <input
              value={String(f.value ?? '')}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="valor"
              className="w-32 rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
          <button onClick={() => remove(i)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
        </div>
      ))}
    </div>
  )
}
