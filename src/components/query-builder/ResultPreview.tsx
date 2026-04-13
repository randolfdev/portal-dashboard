type Props = {
  data: Record<string, unknown>[] | null
  loading: boolean
  error: string | null
  onExecute: () => void
}

export default function ResultPreview({ data, loading, error, onExecute }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Resultado</span>
        <button
          onClick={onExecute}
          disabled={loading}
          className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Executando...' : 'Executar preview'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && data.length > 0 && (
        <div className="overflow-auto max-h-64 border border-slate-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {Object.keys(data[0]).map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                      {val === null ? <span className="text-slate-400">NULL</span> : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Nenhum resultado.</p>
      )}

      {!data && !loading && !error && (
        <p className="text-sm text-slate-400 text-center py-8">Clique "Executar preview" para ver os dados.</p>
      )}
    </div>
  )
}
