/**
 * Dashboard App - Main Component
 * Multi-page React application with routing and authentication
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { CostsPage } from './pages/CostsPage';
import { DeployPage } from './pages/DeployPage';
import { EscalationsPage } from './pages/EscalationsPage';
import { HomePage } from './pages/HomePage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { LoginPage } from './pages/LoginPage';
import { OptimizePage } from './pages/OptimizePage';
import { PersonalitiesPage } from './pages/PersonalitiesPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoomsPage } from './pages/RoomsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignupPage } from './pages/SignupPage';
import { TeamPage } from './pages/TeamPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { WidgetConfigPage } from './pages/WidgetConfigPage';
import { AuthProvider } from './providers/AuthProvider';
import { TRPCProvider } from './providers/TRPCProvider';

/**
 * Main App Component with routing and authentication
 * Production-ready with layout-level error boundary
 */
export function App() {
  return (
    <ErrorBoundary level="layout">
      <TRPCProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Protected routes with shared DashboardLayout using Outlet pattern */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<HomePage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="conversations" element={<ConversationsPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="escalations" element={<EscalationsPage />} />
                <Route path="costs" element={<CostsPage />} />
                <Route path="optimize" element={<OptimizePage />} />
                <Route path="deploy" element={<DeployPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="api-keys" element={<ApiKeysPage />} />
                <Route path="personalities" element={<PersonalitiesPage />} />
                <Route path="widget-config" element={<WidgetConfigPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* 404 redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TRPCProvider>
    </ErrorBoundary>
  );
}
