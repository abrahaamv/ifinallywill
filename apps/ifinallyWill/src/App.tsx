/**
 * IFinallyWill App — Complete routing setup
 *
 * Public routes: /, /how-it-works, /pricing, /about, /help-centre, /compare, etc.
 * Guest routes: /login, /forgot-password, /reset-password/:token (redirect if authed)
 * Registration: /register (RegistrationLayout)
 * Protected routes: /app/* (dashboard, documents, wizard, checkout, admin)
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { GuestLayout } from './layouts/GuestLayout';
import { LandingLayout } from './layouts/LandingLayout';

import { AssistantProvider } from './providers/AssistantProvider';
// Providers
import { AuthProvider } from './providers/AuthProvider';
import { TRPCProvider } from './providers/TRPCProvider';

// Loading fallback
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    </div>
  );
}

// Lazy-loaded public pages
const WelcomePage = lazy(() =>
  import('./pages/WelcomePage').then((m) => ({ default: m.WelcomePage }))
);
const HowItWorksPage = lazy(() =>
  import('./pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const HelpCentrePage = lazy(() =>
  import('./pages/HelpCentrePage').then((m) => ({ default: m.HelpCentrePage }))
);
const ComparePage = lazy(() =>
  import('./pages/ComparePage').then((m) => ({ default: m.ComparePage }))
);
const PartnersPublicPage = lazy(() =>
  import('./pages/PartnersPublicPage').then((m) => ({ default: m.PartnersPublicPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const ForCharitiesPage = lazy(() =>
  import('./pages/ForCharitiesPage').then((m) => ({ default: m.ForCharitiesPage }))
);
const AIGuidancePage = lazy(() =>
  import('./pages/AIGuidancePage').then((m) => ({ default: m.AIGuidancePage }))
);
const ProbatePage = lazy(() =>
  import('./pages/ProbatePage').then((m) => ({ default: m.ProbatePage }))
);
const DocumentsShowcasePage = lazy(() =>
  import('./pages/DocumentsShowcasePage').then((m) => ({ default: m.DocumentsShowcasePage }))
);
const PetInformationGuardianPage = lazy(() =>
  import('./pages/PetInformationGuardianPage').then((m) => ({
    default: m.PetInformationGuardianPage,
  }))
);

// Lazy-loaded auth pages
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);

// Lazy-loaded app pages
const DashboardPage = lazy(() =>
  import('./pages/app/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/app/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const CheckoutSuccessPage = lazy(() =>
  import('./pages/app/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage }))
);
const PartnerDashboardPage = lazy(() =>
  import('./pages/app/PartnerDashboardPage').then((m) => ({ default: m.PartnerDashboardPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/app/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const ProfileEditPage = lazy(() =>
  import('./pages/app/ProfileEditPage').then((m) => ({ default: m.ProfileEditPage }))
);
const SupportPage = lazy(() =>
  import('./pages/app/SupportPage').then((m) => ({ default: m.SupportPage }))
);
const FamilyTreePage = lazy(() =>
  import('./pages/app/FamilyTreePage').then((m) => ({ default: m.FamilyTreePage }))
);

// Lazy-loaded admin pages
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminTemplatesPage = lazy(() =>
  import('./pages/admin/AdminTemplatesPage').then((m) => ({ default: m.AdminTemplatesPage }))
);
const AdminPaymentsPage = lazy(() =>
  import('./pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage }))
);
const DocumentsApprovalPage = lazy(() =>
  import('./pages/admin/DocumentsApprovalPage').then((m) => ({ default: m.DocumentsApprovalPage }))
);
const AllFilesPage = lazy(() =>
  import('./pages/admin/AllFilesPage').then((m) => ({ default: m.AllFilesPage }))
);

// Wizard shells
const PersonalShell = lazy(() =>
  import('./components/wizard/PersonalShell').then((m) => ({ default: m.PersonalShell }))
);
const PoaWizardShell = lazy(() =>
  import('./components/wizard/PoaWizardShell').then((m) => ({ default: m.PoaWizardShell }))
);

export function App() {
  return (
    <ErrorBoundary>
      <TRPCProvider>
        <AuthProvider>
          <AssistantProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ======================== */}
                  {/* PUBLIC ROUTES (LandingLayout) */}
                  {/* ======================== */}
                  <Route element={<LandingLayout />}>
                    <Route index element={<WelcomePage />} />
                    <Route path="how-it-works" element={<HowItWorksPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="help-centre" element={<HelpCentrePage />} />
                    <Route path="compare" element={<ComparePage />} />
                    <Route path="partners" element={<PartnersPublicPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="for-charities" element={<ForCharitiesPage />} />
                    <Route path="ai-guidance" element={<AIGuidancePage />} />
                    <Route path="probate" element={<ProbatePage />} />
                    <Route path="documents-showcase" element={<DocumentsShowcasePage />} />
                    <Route
                      path="pet-information-guardian"
                      element={<PetInformationGuardianPage />}
                    />
                  </Route>

                  {/* ======================== */}
                  {/* GUEST ROUTES (GuestLayout) */}
                  {/* ======================== */}
                  <Route element={<GuestLayout />}>
                    <Route path="login" element={<LoginPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="reset-password/:token" element={<ResetPasswordPage />} />
                  </Route>

                  {/* ======================== */}
                  {/* REGISTRATION (standalone) */}
                  {/* ======================== */}
                  <Route path="register" element={<RegisterPage />} />

                  {/* ======================== */}
                  {/* PROTECTED APP ROUTES */}
                  {/* ======================== */}
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
                    <Route path="checkout" element={<CheckoutPage />} />
                    <Route path="checkout/success" element={<CheckoutSuccessPage />} />
                    <Route path="partners" element={<PartnerDashboardPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="profile/edit" element={<ProfileEditPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="support/:id" element={<SupportPage />} />
                    <Route path="family-tree" element={<FamilyTreePage />} />

                    {/* Admin routes (role-guarded) */}
                    <Route
                      path="admin"
                      element={
                        <ProtectedAdminRoute>
                          <AdminDashboardPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="admin/users"
                      element={
                        <ProtectedAdminRoute>
                          <AdminUsersPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="admin/templates"
                      element={
                        <ProtectedAdminRoute>
                          <AdminTemplatesPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="admin/payments"
                      element={
                        <ProtectedAdminRoute>
                          <AdminPaymentsPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="admin/documents"
                      element={
                        <ProtectedAdminRoute>
                          <DocumentsApprovalPage />
                        </ProtectedAdminRoute>
                      }
                    />
                    <Route
                      path="admin/files"
                      element={
                        <ProtectedAdminRoute>
                          <AllFilesPage />
                        </ProtectedAdminRoute>
                      }
                    />
                  </Route>

                  {/* ======================== */}
                  {/* WILL WIZARD */}
                  {/* ======================== */}
                  <Route
                    path="/app/documents/:docId"
                    element={
                      <ProtectedRoute>
                        <Outlet />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<PersonalShell />} />
                    <Route path=":category/:stepId" element={<PersonalShell />} />
                    <Route path=":stepId" element={<PersonalShell />} />
                  </Route>

                  {/* ======================== */}
                  {/* POA WIZARD */}
                  {/* ======================== */}
                  <Route
                    path="/app/poa/:docId"
                    element={
                      <ProtectedRoute>
                        <Outlet />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<PoaWizardShell />} />
                    <Route path=":stepId" element={<PoaWizardShell />} />
                  </Route>

                  {/* ======================== */}
                  {/* CATCH-ALL */}
                  {/* ======================== */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AssistantProvider>
        </AuthProvider>
      </TRPCProvider>
    </ErrorBoundary>
  );
}
