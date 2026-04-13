type Props = { sql: string }

export default function SqlPreview({ sql }: Props) {
  const keywords = /\b(SELECT|FROM|WHERE|AND|OR|JOIN|INNER|LEFT|RIGHT|ON|AS|GROUP BY|ORDER BY|FETCH FIRST|ROWS ONLY|IN|LIKE|BETWEEN|IS NULL|IS NOT NULL|SUM|AVG|COUNT|MIN|MAX|ASC|DESC)\b/gi

  const highlighted = sql.replace(keywords, (match) =>
    `<span class="text-blue-600 font-semibold">${match.toUpperCase()}</span>`,
  )

  return (
    <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-64">
      <pre
        className="text-sm font-mono text-slate-300 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  )
}
