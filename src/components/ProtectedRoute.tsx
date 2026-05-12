import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './ui/LoadingSpinner'

type Props = {
  children: ReactNode
  requiredRole?: 'platform_admin' | 'tenant_admin'
  /** Optional capability gate (additive to requiredRole). Allows members to enter
   *  if their permission_profile grants the capability. */
  requiredPermission?: 'manage_indicators' | 'manage_dashboards'
  loginPath?: string
}

export default function ProtectedRoute({ children, requiredRole, requiredPermission, loginPath = '/login' }: Props) {
  const { user, role, canManageIndicators, canManageDashboards, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to={loginPath} replace />

  const fallback = loginPath.replace('/login', '') || '/'

  if (requiredRole === 'platform_admin' && role !== 'platform_admin') {
    return <Navigate to={loginPath} replace />
  }

  // Capability check: admins always pass; members need the permission flag.
  if (requiredPermission) {
    const granted =
      role === 'tenant_admin' ||
      role === 'platform_admin' ||
      (requiredPermission === 'manage_indicators' && canManageIndicators) ||
      (requiredPermission === 'manage_dashboards' && canManageDashboards)
    if (!granted) {
      return <Navigate to={fallback} replace />
    }
    return <>{children}</>
  }

  if (requiredRole === 'tenant_admin' && !['tenant_admin', 'platform_admin'].includes(role ?? '')) {
    return <Navigate to={fallback} replace />
  }
  return <>{children}</>
}
