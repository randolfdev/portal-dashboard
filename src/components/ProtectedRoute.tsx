import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './ui/LoadingSpinner'

type Props = {
  children: ReactNode
  requiredRole?: 'platform_admin' | 'tenant_admin'
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole === 'platform_admin' && role !== 'platform_admin') {
    return <Navigate to="/login" replace />
  }
  if (requiredRole === 'tenant_admin' && !['tenant_admin', 'platform_admin'].includes(role ?? '')) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
