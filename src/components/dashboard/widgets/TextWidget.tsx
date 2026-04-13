type Props = {
  title: string
  config: { content: string }
}

export default function TextWidget({ title, config }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col">
      <p className="text-sm font-medium text-slate-700 mb-2">{title}</p>
      <p className="text-sm text-slate-600 whitespace-pre-wrap flex-1">{config.content}</p>
    </div>
  )
}
