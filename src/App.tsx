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

function TenantRoutes({ slug, basePath }: { slug: string; basePath: string }) {
  return (
    <Routes>
      <Route path="login" element={<TenantLogin slug={slug} />} />
      <Route
        path="*"
        element={
          <ProtectedRoute loginPath={`${basePath}/login`}>
            <TenantProvider slug={slug}>
              <TenantLayout>
                <Routes>
                  <Route path="/" element={<DashboardList />} />
                  <Route path="/dashboards/:dashboardSlug" element={<DashboardView />} />
                  <Route
                    path="/connectors"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <ConnectorsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/connectors/new"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <ConnectorForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/connectors/:id/edit"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <ConnectorForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/indicators"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <IndicatorsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/indicators/new"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <IndicatorBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/agent-status"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <AgentStatusPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute requiredRole="tenant_admin" loginPath={`${basePath}/login`}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to={basePath} replace />} />
                </Routes>
              </TenantLayout>
            </TenantProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  const tenant = useTenant()

  if (tenant.kind === 'admin') {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute requiredRole="platform_admin" loginPath="/admin/login">
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
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
    // Subdomain-based tenant (dev / custom domain)
    return <TenantRoutes slug={tenant.slug} basePath="" />
  }

  // Root: path-based routing
  return (
    <Routes>
      <Route path="/t/:slug/*" element={<PathTenantRouter />} />
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PathTenantRouter() {
  const slug = window.location.pathname.match(/^\/t\/([^/]+)/)?.[1] ?? ''
  return <TenantRoutes slug={slug} basePath={`/t/${slug}`} />
}
