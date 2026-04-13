import { Routes, Route, Navigate } from 'react-router-dom'
import { useTenant } from './lib/tenant'
import { TenantProvider } from './contexts/TenantContext'
import ProtectedRoute from './components/ProtectedRoute'
import TenantLayout from './components/layout/TenantLayout'
import AdminLayout from './components/layout/AdminLayout'
import Landing from './pages/Landing'
import TenantLogin from './pages/TenantLogin'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import DashboardList from './pages/tenant/DashboardList'
import DashboardView from './pages/tenant/DashboardView'
import UsersPage from './pages/tenant/UsersPage'
import ConnectorsPage from './pages/tenant/ConnectorsPage'
import ConnectorForm from './pages/tenant/ConnectorForm'
import IndicatorsPage from './pages/tenant/IndicatorsPage'
import IndicatorBuilder from './pages/tenant/IndicatorBuilder'
import AgentStatusPage from './pages/tenant/AgentStatusPage'
import SettingsPage from './pages/tenant/SettingsPage'

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
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AdminLayout>
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
              <TenantProvider slug={tenant.slug}>
                <TenantLayout>
                  <Routes>
                    <Route path="/" element={<DashboardList />} />
                    <Route path="/dashboards/:dashboardSlug" element={<DashboardView />} />
                    <Route
                      path="/connectors"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <ConnectorsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/connectors/new"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <ConnectorForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/connectors/:id/edit"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <ConnectorForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/indicators"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <IndicatorsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/indicators/new"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <IndicatorBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/agent-status"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <AgentStatusPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <UsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute requiredRole="tenant_admin">
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </TenantLayout>
              </TenantProvider>
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
