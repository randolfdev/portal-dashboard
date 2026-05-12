import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  user: User | null
  role: string | null
  /** When the user is a `member`, these come from their assigned permission_profile. */
  canManageIndicators: boolean
  canManageDashboards: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  canManageIndicators: false,
  canManageDashboards: false,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [canManageIndicators, setCanManageIndicators] = useState(false)
  const [canManageDashboards, setCanManageDashboards] = useState(false)
  const [loading, setLoading] = useState(true)

  function fetchRoleInBackground(userId: string) {
    console.log('[auth] fetching role for', userId)
    supabase
      .from('profiles')
      .select('role, permission_profile:permission_profile_id ( can_manage_indicators, can_manage_dashboards )')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        console.log('[auth] role result:', { data, error })
        if (error) {
          const metaRole = session?.user?.app_metadata?.role as string | undefined
          console.log('[auth] fallback to app_metadata role:', metaRole)
          setRole(metaRole ?? null)
          setCanManageIndicators(false)
          setCanManageDashboards(false)
        } else {
          const r = data?.role ?? null
          setRole(r)
          // Admin roles always have full management permissions
          if (r === 'tenant_admin' || r === 'platform_admin') {
            setCanManageIndicators(true)
            setCanManageDashboards(true)
          } else {
            const pp = (data as { permission_profile?: { can_manage_indicators?: boolean; can_manage_dashboards?: boolean } | null })?.permission_profile
            setCanManageIndicators(pp?.can_manage_indicators ?? false)
            setCanManageDashboards(pp?.can_manage_dashboards ?? false)
          }
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
        setCanManageIndicators(false)
        setCanManageDashboards(false)
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
      value={{ session, user: session?.user ?? null, role, canManageIndicators, canManageDashboards, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
