import { useMemo } from 'react'
import { generatePalette } from '../../../lib/chart-colors'

type Column = { key: string; label: string }

type Props = {
  title: string
  config: {
    columns: Column[]
    rows: Record<string, unknown>[]
  }
}

export default function TableWidget({ title, config }: Props) {
  const { columns = [], rows = [] } = config
  const colors = useMemo(() => generatePalette(rows.length), [rows.length])

  const hasPct = columns.some((c) => c.key === '_percentual')

  function formatCell(key: string, value: unknown): string {
    if (value === null || value === undefined) return '-'
    if (key === '_percentual') return `${value}%`
    if (typeof value === 'number') return value.toLocaleString('pt-BR')
    return String(value)
  }

  function cellAlign(key: string): string {
    if (key === '_percentual') return 'text-right'
    if (rows[0] && typeof rows[0][key] === 'number') return 'text-right'
    return 'text-left'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <div className="flex-1 overflow-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              {columns.map((c) => (
                <th key={c.key} className={`py-2.5 pr-4 font-medium text-xs uppercase tracking-wide ${cellAlign(c.key)}`}>
                  {c.label}
                </th>
              ))}
              {hasPct && <th className="py-2.5 font-medium text-xs uppercase tracking-wide w-28"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={`py-2.5 pr-4 ${cellAlign(c.key)} ${c.key === '_percentual' ? 'font-semibold text-slate-700' : 'text-slate-600'}`}>
                    {formatCell(c.key, row[c.key])}
                  </td>
                ))}
                {hasPct && (
                  <td className="py-2.5">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${row._percentual ?? 0}%`,
                          backgroundColor: colors[i % colors.length],
                        }}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
