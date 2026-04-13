import { useState } from 'react'

type Props = {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getDefaultDates(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start: toInputDate(start), end: toInputDate(end) }
}

export default function DateFilter({ startDate, endDate, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [tmpStart, setTmpStart] = useState(startDate)
  const [tmpEnd, setTmpEnd] = useState(endDate)

  function handleApply() {
    onChange(tmpStart, tmpEnd)
    setOpen(false)
  }

  function handleReset() {
    const d = getDefaultDates()
    setTmpStart(d.start)
    setTmpEnd(d.end)
    onChange(d.start, d.end)
    setOpen(false)
  }

  const formatDisplay = (iso: string) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); setTmpStart(startDate); setTmpEnd(endDate) }}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 shadow-sm"
      >
        <CalendarIcon />
        <span className="font-medium">
          {formatDisplay(startDate)} — {formatDisplay(endDate)}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 w-80 animate-in fade-in slide-in-from-top-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Filtrar por periodo</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Data inicial</label>
                <input
                  type="date"
                  value={tmpStart}
                  onChange={(e) => setTmpStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Data final</label>
                <input
                  type="date"
                  value={tmpEnd}
                  onChange={(e) => setTmpEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleReset}
                className="flex-1 text-sm font-medium px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Ultimos 30 dias
              </button>
              <button
                onClick={handleApply}
                className="flex-1 text-sm font-medium px-3 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-all shadow-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
