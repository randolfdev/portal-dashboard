import MetricCard from './widgets/MetricCard'
import ChartWidget from './widgets/ChartWidget'
import TableWidget from './widgets/TableWidget'
import TextWidget from './widgets/TextWidget'

type Props = {
  kind: string
  title: string
  config: Record<string, unknown>
}

export default function WidgetRenderer({ kind, title, config }: Props) {
  switch (kind) {
    case 'metric_card':
      return <MetricCard title={title} config={config as never} />
    case 'chart_bar':
    case 'chart_line':
    case 'chart_pie':
      return <ChartWidget kind={kind} title={title} config={config} />
    case 'table':
      return <TableWidget title={title} config={config as never} />
    case 'text':
      return <TextWidget title={title} config={config as never} />
    default:
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-400">Widget tipo "{kind}" não suportado.</p>
        </div>
      )
  }
}
