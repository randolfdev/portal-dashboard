type Props = { fullScreen?: boolean }

export default function LoadingSpinner({ fullScreen }: Props) {
  const spinner = (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-primary" />
  )
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        {spinner}
      </div>
    )
  }
  return <div className="flex items-center justify-center py-12">{spinner}</div>
}
