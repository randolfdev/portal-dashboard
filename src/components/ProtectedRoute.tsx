import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './ui/LoadingSpinner'

type Props = {
  children: ReactNode
  requiredRole?: 'platform_admin' | 'tenant_admin'
  loginPath?: string
}

export default function ProtectedRoute({ children, requiredRole, loginPath = '/login' }: Props) {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to={loginPath} replace />
  if (requiredRole === 'platform_admin' && role !== 'platform_admin') {
    return <Navigate to={loginPath} replace />
  }
  if (requiredRole === 'tenant_admin' && !['tenant_admin', 'platform_admin'].includes(role ?? '')) {
    return <Navigate to={loginPath.replace('/login', '') || '/'} replace />
  }
  return <>{children}</>
}
