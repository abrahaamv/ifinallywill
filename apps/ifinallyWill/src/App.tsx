/**
 * IFinallyWill App — Main routing setup
 *
 * Public routes: /, /login, /register, /how-it-works, /pricing, /about
 * Protected routes: /app/* (dashboard, documents, wizard, checkout, admin)
 */

import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PersonalShell } from './components/wizard/PersonalShell';
import { PoaWizardShell } from './components/wizard/PoaWizardShell';
import { AppLayout } from './layouts/AppLayout';
import { LandingLayout } from './layouts/LandingLayout';
// Public pages
import { WelcomePage } from './pages/WelcomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { PricingPage } from './pages/PricingPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
// App pages
import { DashboardPage } from './pages/app/DashboardPage';
import { CheckoutPage } from './pages/app/CheckoutPage';
import { CheckoutSuccessPage } from './pages/app/CheckoutSuccessPage';
import { PartnerDashboardPage } from './pages/app/PartnerDashboardPage';
// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminTemplatesPage } from './pages/admin/AdminTemplatesPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
// Providers
import { AuthProvider } from './providers/AuthProvider';
import { TRPCProvider } from './providers/TRPCProvider';

export function App() {
  return (
    <ErrorBoundary>
      <TRPCProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<LandingLayout />}>
                <Route index element={<WelcomePage />} />
                <Route path="how-it-works" element={<HowItWorksPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
              </Route>

              {/* Protected app routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="checkout" element={<ErrorBoundary section="Checkout"><CheckoutPage /></ErrorBoundary>} />
                <Route path="checkout/success" element={<ErrorBoundary section="Checkout"><CheckoutSuccessPage /></ErrorBoundary>} />
                <Route path="partners" element={<PartnerDashboardPage />} />
                {/* Admin routes (role guard in each page) */}
                <Route path="admin" element={<AdminDashboardPage />} />
                <Route path="admin/users" element={<AdminUsersPage />} />
                <Route path="admin/templates" element={<AdminTemplatesPage />} />
                <Route path="admin/payments" element={<AdminPaymentsPage />} />
              </Route>

              {/* Will wizard — category-based dashboard shell */}
              <Route
                path="/app/documents/:docId"
                element={
                  <ProtectedRoute>
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ErrorBoundary section="Will Wizard"><PersonalShell /></ErrorBoundary>} />
                <Route path=":stepId" element={<ErrorBoundary section="Will Wizard"><PersonalShell /></ErrorBoundary>} />
              </Route>

              {/* POA wizard — full-width layout */}
              <Route
                path="/app/poa/:docId"
                element={
                  <ProtectedRoute>
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ErrorBoundary section="POA Wizard"><PoaWizardShell /></ErrorBoundary>} />
                <Route path=":stepId" element={<ErrorBoundary section="POA Wizard"><PoaWizardShell /></ErrorBoundary>} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TRPCProvider>
    </ErrorBoundary>
  );
}
