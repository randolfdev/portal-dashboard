type Props = { onMenuClick: () => void }

export default function Header({ onMenuClick }: Props) {
  return (
    <header className="h-14 flex items-center px-4 md:px-6 bg-white/60 backdrop-blur-md border-b border-slate-100 shrink-0 sticky top-0 z-30 md:hidden">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
    </header>
  )
}
