type Props = {
  schema: string
  table: string
  alias: string
  onChange: (source: { schema: string; table: string; alias: string }) => void
}

export default function TableSelector({ schema, table, alias, onChange }: Props) {
  if (!table) {
    return (
      <p className="text-sm text-slate-400 italic">Selecione uma tabela no browser à esquerda.</p>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-500">FROM</span>
      <span className="font-mono text-slate-800">
        {schema ? `${schema}.` : ''}{table}
      </span>
      <span className="text-slate-500">AS</span>
      <input
        value={alias}
        onChange={(e) => onChange({ schema, table, alias: e.target.value })}
        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}
