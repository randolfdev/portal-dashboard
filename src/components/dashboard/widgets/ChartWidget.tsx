import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { generatePalette } from '../../../lib/chart-colors'

type ChartKind = 'chart_bar' | 'chart_line' | 'chart_pie'

type Props = {
  kind: ChartKind
  title: string
  config: Record<string, unknown>
}

export default function ChartWidget({ kind, title, config }: Props) {
  const data = (config.data as Record<string, unknown>[]) ?? []
  const showPercent = config.showPercent as boolean
  const colors = useMemo(() => generatePalette(Math.max(data.length, 6)), [data.length])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'chart_bar' ? (
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={config.xKey as string}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={showPercent ? <PercentTooltip colors={colors} /> : undefined} />
              <Bar dataKey={config.yKey as string} radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : kind === 'chart_line' ? (
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={config.xKey as string}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={showPercent ? <PercentTooltip colors={colors} /> : undefined} />
              <Line
                type="monotone"
                dataKey={config.yKey as string}
                stroke={colors[0]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: colors[0], stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey={config.valueKey as string}
                nameKey={config.nameKey as string}
                cx="50%" cy="50%"
                innerRadius="45%"
                outerRadius="78%"
                strokeWidth={0}
                paddingAngle={2}
                label={showPercent
                  ? ({ name, _percentual }) => `${truncate(String(name), 12)} ${_percentual}%`
                  : undefined
                }
                labelLine={showPercent ? { strokeWidth: 1, stroke: '#94a3b8' } : undefined}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<PercentTooltip colors={colors} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#64748b' }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PercentTooltip({ active, payload, label, colors = [] }: {
  active?: boolean
  payload?: Array<{ value: number; payload: Record<string, unknown>; name: string; dataKey: string }>
  label?: string
  colors?: string[]
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const pct = entry.payload._percentual
  const name = label || entry.payload.name || entry.name || entry.payload.ds_convenio
  const color = colors[0] || 'var(--color-primary)'
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="text-slate-500 text-xs mb-1">{String(name)}</p>
      <p className="font-semibold text-slate-800 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
        {Number(entry.value).toLocaleString('pt-BR')}
        {pct !== undefined && <span className="text-slate-400 font-normal">({pct}%)</span>}
      </p>
    </div>
  )
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}
