/**
 * PersonalShell — category-based dashboard shell for will documents
 *
 * Two view modes:
 *   - 'dashboard': Category card grid with completion tracking
 *   - category key: Category detail view with sidebar + step content
 *
 * Replaces WizardShell as the main will document view.
 */

import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePersonalData } from '../../hooks/usePersonalData';
import { useSidebarState } from '../../hooks/useSidebarState';
import { useStepNavigation } from '../../hooks/useStepNavigation';
import { CATEGORIES, getStepCategory } from '../../lib/wizard';
import type { WizardCategory } from '../../lib/wizard';
import { CelebrationModal } from '../modals/CelebrationModal';
import { LeaveConfirmModal } from '../modals/LeaveConfirmModal';
import { WilfredPanel } from '../wilfred/WilfredPanel';
import { CategoryDetailView } from './CategoryDetailView';
import { DashboardView } from './DashboardView';
import { ProfileBanner } from './ProfileBanner';
import { WizardSidebar } from './WizardSidebar';

type ViewMode = 'dashboard' | WizardCategory;

export function PersonalShell() {
  const { docId, stepId } = useParams<{ docId: string; stepId?: string }>();
  const navigate = useNavigate();

  // Data loading
  const data = usePersonalData(docId);

  // View state — derive from URL
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);

  // Modal state
  const [celebrationCategory, setCelebrationCategory] = useState<WizardCategory | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Sidebar state
  const sidebar = useSidebarState();

  // Derive view from URL stepId
  useEffect(() => {
    if (stepId) {
      const category = getStepCategory(stepId);
      if (category) {
        setCurrentView(category);
        setCurrentStepId(stepId);
        sidebar.autoCollapse(stepId);
      }
    } else {
      setCurrentView('dashboard');
      setCurrentStepId(null);
    }
  }, [stepId]);

  // Navigate to a step
  const navigateToStep = useCallback(
    (id: string) => {
      navigate(`/app/documents/${docId}/${id}`, { replace: true });
    },
    [navigate, docId]
  );

  // Return to dashboard
  const returnToDashboard = useCallback(() => {
    navigate(`/app/documents/${docId}`, { replace: true });
  }, [navigate, docId]);

  // Dashboard button from step view — confirm if needed
  const handleDashboardClick = useCallback(() => {
    setShowLeaveConfirm(true);
  }, []);

  // Category completion handler
  const handleCategoryComplete = useCallback((category: WizardCategory) => {
    setCelebrationCategory(category);
  }, []);

  // Step navigation
  const nav = useStepNavigation({
    wizardContext: data.wizardContext,
    currentCategory: currentView === 'dashboard' ? null : currentView,
    currentStepId,
    completedSteps: data.completedSteps,
    onNavigate: navigateToStep,
    onReturnToDashboard: returnToDashboard,
    onCategoryComplete: handleCategoryComplete,
  });

  // Enter a category from dashboard
  const handleCategoryClick = useCallback(
    (category: WizardCategory) => {
      const firstStep = nav.getFirstIncompleteStep(category);
      if (firstStep) {
        navigateToStep(firstStep.id);
      }
    },
    [nav, navigateToStep]
  );

  // Handle step click from sidebar
  const handleSidebarStepClick = useCallback(
    (id: string) => {
      navigateToStep(id);
    },
    [navigateToStep]
  );

  // Handle sidebar category click — enter that category
  const handleSidebarCategoryClick = useCallback(
    (category: WizardCategory) => {
      handleCategoryClick(category);
    },
    [handleCategoryClick]
  );

  // Loading state
  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--ifw-neutral-500)]">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!data.doc || !docId) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const categoryLabel =
    currentView !== 'dashboard' ? (CATEGORIES.find((c) => c.key === currentView)?.label ?? '') : '';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Yellow welcome banner */}
      <div
        className="px-6 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #FFBF00, #FFD54F)' }}
      >
        <div className="flex items-center gap-3">
          {currentView !== 'dashboard' && (
            <button
              type="button"
              onClick={handleDashboardClick}
              className="text-sm font-medium text-amber-900 hover:text-amber-800 flex items-center gap-1"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </button>
          )}
          <span className="text-sm font-medium text-amber-900">
            {data.ownerName}&apos;s Estate Plan
          </span>
        </div>

        <ProfileBanner
          ownerName={data.ownerName}
          isCouple={data.isCouple}
          coupleDocId={data.doc.coupleDocId}
          onSwitch={() =>
            data.doc?.coupleDocId && navigate(`/app/documents/${data.doc.coupleDocId}`)
          }
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — shown in category detail view on desktop */}
        {currentView !== 'dashboard' && (
          <aside
            className={`hidden lg:flex flex-col border-r bg-[var(--ifw-neutral-50)] overflow-y-auto transition-all duration-200 ${
              sidebar.collapsed ? 'w-16' : 'w-64'
            }`}
          >
            <div className="p-3 border-b border-[var(--ifw-neutral-100)] flex justify-end">
              <button
                type="button"
                onClick={sidebar.toggle}
                className="w-7 h-7 rounded flex items-center justify-center text-[var(--ifw-neutral-400)] hover:bg-[var(--ifw-neutral-100)]"
                title={sidebar.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: sidebar.collapsed ? 'rotate(180deg)' : 'none',
                    transition: 'transform 200ms',
                  }}
                >
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
            </div>

            {!sidebar.collapsed && (
              <div className="p-4">
                <WizardSidebar
                  wizardContext={data.wizardContext}
                  currentStepId={currentStepId ?? ''}
                  completedSteps={data.completedStepsArray}
                  activeCategory={currentView}
                  onStepClick={handleSidebarStepClick}
                  onCategoryClick={handleSidebarCategoryClick}
                />
              </div>
            )}
          </aside>
        )}

        {/* Content area */}
        {currentView === 'dashboard' ? (
          <main className="flex-1 p-6 overflow-y-auto">
            <DashboardView
              ownerName={data.ownerName}
              categoryCompletions={data.categoryCompletions}
              overallProgress={data.overallProgress}
              recommendedStep={nav.getRecommendedStep()}
              onCategoryClick={handleCategoryClick}
              onStepClick={navigateToStep}
            />
          </main>
        ) : (
          <CategoryDetailView
            category={currentView}
            categoryLabel={categoryLabel}
            currentStep={nav.currentStep}
            currentIndex={nav.currentIndex}
            totalSteps={nav.categorySteps.length}
            estateDocId={docId}
            willData={data.willData}
            isFirstStep={nav.isFirstStep}
            isLastStep={nav.isLastStep}
            onNext={nav.nextStep}
            onPrev={nav.prevStep}
            onDashboard={handleDashboardClick}
          />
        )}

        {/* Wilfred AI sidechat — only in category detail view */}
        {currentView !== 'dashboard' && (
          <WilfredPanel
            estateDocId={docId}
            stepId={currentStepId ?? undefined}
            province={data.doc.province}
            documentType={data.doc.documentType}
            completedSteps={data.completedStepsArray}
          />
        )}
      </div>

      {/* Modals */}
      <CelebrationModal
        open={!!celebrationCategory}
        category={celebrationCategory}
        onClose={() => {
          setCelebrationCategory(null);
          returnToDashboard();
        }}
      />

      <LeaveConfirmModal
        open={showLeaveConfirm}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          returnToDashboard();
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
}
