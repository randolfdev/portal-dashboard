import { useEffect, useState, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Props = {
  children: ReactNode
  requiredRole?: 'platform_admin' | 'tenant_admin' | 'member'
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      setAuthed(!!session)
      const metaRole = session?.user.app_metadata?.role as string | undefined
      setRole(metaRole ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
      setRole((session?.user.app_metadata?.role as string | undefined) ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Carregando...
      </div>
    )
  }
  if (!authed) return <Navigate to="/login" replace />
  if (requiredRole === 'platform_admin' && role !== 'platform_admin') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
