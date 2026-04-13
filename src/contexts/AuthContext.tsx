import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  user: User | null
  role: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function fetchRoleInBackground(userId: string) {
    console.log('[auth] fetching role for', userId)
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        console.log('[auth] role result:', { data, error })
        if (error) {
          const metaRole = session?.user?.app_metadata?.role as string | undefined
          console.log('[auth] fallback to app_metadata role:', metaRole)
          setRole(metaRole ?? null)
        } else {
          setRole(data?.role ?? null)
        }
      })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        fetchRoleInBackground(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        fetchRoleInBackground(newSession.user.id)
      } else {
        setRole(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    const pathMatch = window.location.pathname.match(/^\/t\/[^/]+/)
    window.location.href = pathMatch ? `${pathMatch[0]}/login` : '/login'
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, role, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
