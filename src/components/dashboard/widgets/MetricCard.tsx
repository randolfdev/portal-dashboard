import { useMemo } from 'react'
import { generatePalette } from '../../../lib/chart-colors'

type Top3Item = { label: string; value: number; percent: number }

type Props = {
  title: string
  config: {
    value: number
    prefix?: string
    suffix?: string
    delta?: number
    label?: string
    _top3?: Top3Item[]
  }
}

export default function MetricCard({ title, config }: Props) {
  const { value, prefix = '', suffix = '', delta, label, _top3 } = config
  const colors = useMemo(() => generatePalette(3), [])

  // Modo top3 list
  if (_top3 && _top3.length > 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{title}</p>
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          {_top3.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colors[i] }}
              />
              <span className="text-sm text-slate-700 font-medium flex-1 truncate">
                {item.label}
              </span>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                {item.value.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Modo padrao
  const formatted = typeof value === 'number'
    ? value.toLocaleString('pt-BR')
    : value

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col justify-between">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
      <div className="mt-2">
        <p className="text-3xl font-bold text-slate-800 tracking-tight">
          {prefix}{formatted}{suffix}
        </p>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {delta >= 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              )}
            </svg>
            {Math.abs(delta)}%
            {label && <span className="text-slate-400 font-normal ml-1">{label}</span>}
          </div>
        )}
        {!delta && label && (
          <p className="text-xs text-slate-400 mt-1.5">{label}</p>
        )}
      </div>
    </div>
  )
}
