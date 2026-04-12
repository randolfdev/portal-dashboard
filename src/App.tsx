import { Routes, Route, Navigate } from 'react-router-dom'
import { useTenant } from './lib/tenant'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import TenantLogin from './pages/TenantLogin'
import TenantDashboard from './pages/TenantDashboard'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  const tenant = useTenant()

  if (tenant.kind === 'admin') {
    return (
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute requiredRole="platform_admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    )
  }

  if (tenant.kind === 'tenant') {
    return (
      <Routes>
        <Route path="/login" element={<TenantLogin slug={tenant.slug} />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <TenantDashboard slug={tenant.slug} />
            </ProtectedRoute>
          }
        />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
