type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral'

const styles: Record<Variant, string> = {
  primary: 'bg-primary-light text-primary',
  secondary: 'bg-secondary-light text-secondary',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
}

type Props = { children: string; variant?: Variant }

export default function Badge({ children, variant = 'neutral' }: Props) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  )
}
