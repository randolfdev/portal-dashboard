import { JoinClause } from '../../lib/query-ast'
import Button from '../ui/Button'

type Props = {
  joins: JoinClause[]
  onChange: (joins: JoinClause[]) => void
}

export default function JoinBuilder({ joins, onChange }: Props) {
  function add() {
    const idx = joins.length + 1
    onChange([
      ...joins,
      { type: 'inner', schema: '', table: '', alias: `t${idx}`, on: { left: '', operator: '=', right: '' } },
    ])
  }

  function update(index: number, patch: Partial<JoinClause>) {
    onChange(joins.map((j, i) => (i === index ? { ...j, ...patch } : j)))
  }

  function updateOn(index: number, patch: Partial<JoinClause['on']>) {
    onChange(joins.map((j, i) => (i === index ? { ...j, on: { ...j.on, ...patch } } : j)))
  }

  function remove(index: number) {
    onChange(joins.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Joins</span>
        <Button variant="ghost" size="sm" onClick={add}>+ Join</Button>
      </div>
      {joins.map((j, i) => (
        <div key={i} className="p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <select
              value={j.type}
              onChange={(e) => update(i, { type: e.target.value as JoinClause['type'] })}
              className="border border-slate-200 rounded px-1 py-1 text-sm"
            >
              <option value="inner">INNER</option>
              <option value="left">LEFT</option>
              <option value="right">RIGHT</option>
            </select>
            <span className="text-slate-500">JOIN</span>
            <input
              value={j.table}
              onChange={(e) => update(i, { table: e.target.value })}
              placeholder="tabela"
              className="flex-1 font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-slate-500">AS</span>
            <input
              value={j.alias}
              onChange={(e) => update(i, { alias: e.target.value })}
              className="w-14 font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={() => remove(i)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
          </div>
          <div className="flex items-center gap-2 text-sm pl-4">
            <span className="text-slate-500">ON</span>
            <input
              value={j.on.left}
              onChange={(e) => updateOn(i, { left: e.target.value })}
              placeholder="t0.id"
              className="flex-1 font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-slate-600">=</span>
            <input
              value={j.on.right}
              onChange={(e) => updateOn(i, { right: e.target.value })}
              placeholder={`t${i + 1}.id`}
              className="flex-1 font-mono rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
