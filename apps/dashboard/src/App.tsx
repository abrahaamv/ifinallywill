/**
 * Dashboard App - Main Component
 * Multi-page React application with routing and authentication
 *
 * URL Convention:
 * - Development: http://localhost:5174
 * - Production: https://dashboard.visualkit.live
 *
 * Route Structure (per plan.md):
 * - MAIN: /dashboard, /conversations, /knowledge
 * - AGENTS: /personalities, /deployments
 * - MEETINGS: /rooms, /schedule, /recordings
 * - PLATFORM: /integrations, /api-keys, /team, /settings
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Main section pages
import { HomePage } from './pages/HomePage';
import { KnowledgePage } from './pages/KnowledgePage';
import { SupportPage } from './pages/SupportPage';
import { TranscriptsPage } from './pages/TranscriptsPage';

// Agents section pages
import { DeploymentsPage } from './pages/DeploymentsPage';
import { PersonalitiesPage } from './pages/PersonalitiesPage';

// Meetings section pages
import { RecordingsPage } from './pages/RecordingsPage';
import { RoomsPage } from './pages/RoomsPage';
import { SchedulePage } from './pages/SchedulePage';

// Platform section pages
import { ApiKeysPage } from './pages/ApiKeysPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';

// Auth pages
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

// Legacy pages (kept for backwards compatibility)
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CostsPage } from './pages/CostsPage';
import { DeployPage } from './pages/DeployPage';
import { EscalationsPage } from './pages/EscalationsPage';
import { OptimizePage } from './pages/OptimizePage';
import { WidgetConfigPage } from './pages/WidgetConfigPage';

// Providers
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
                {/* Default redirect to dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />

                {/* MAIN section */}
                <Route path="dashboard" element={<HomePage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="transcripts" element={<TranscriptsPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />

                {/* AGENTS section */}
                <Route path="personalities" element={<PersonalitiesPage />} />
                <Route path="deployments" element={<DeploymentsPage />} />

                {/* MEETINGS section */}
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="recordings" element={<RecordingsPage />} />

                {/* PLATFORM section */}
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="api-keys" element={<ApiKeysPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Legacy routes (kept for backwards compatibility) */}
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="costs" element={<CostsPage />} />
                <Route path="escalations" element={<EscalationsPage />} />
                <Route path="optimize" element={<OptimizePage />} />
                <Route path="deploy" element={<DeployPage />} />
                <Route path="widget-config" element={<WidgetConfigPage />} />
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
