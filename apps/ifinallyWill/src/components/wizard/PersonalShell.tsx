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
import { useStepNavigation } from '../../hooks/useStepNavigation';
import { CATEGORIES, getStepCategory } from '../../lib/wizard';
import type { WizardCategory } from '../../lib/wizard';
import { CelebrationModal } from '../modals/CelebrationModal';
import { LeaveConfirmModal } from '../modals/LeaveConfirmModal';
import { WilfredPanel } from '../wilfred/WilfredPanel';
import { CategoryDetailView } from './CategoryDetailView';
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

  // Derive view from URL stepId
  useEffect(() => {
    if (stepId) {
      const category = getStepCategory(stepId);
      if (category) {
        setCurrentView(category);
        setCurrentStepId(stepId);
      }
    } else {
      // No stepId — redirect to estate planning page
      navigate('/app/estate-planning', { replace: true });
      return;
    }
  }, [stepId, navigate]);

  // Navigate to a step
  const navigateToStep = useCallback(
    (id: string) => {
      navigate(`/app/documents/${docId}/${id}`, { replace: true });
    },
    [navigate, docId]
  );

  // Return to estate planning page
  const returnToDashboard = useCallback(() => {
    navigate('/app/estate-planning', { replace: true });
  }, [navigate]);

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
    <>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Wizard sidebar — hidden on mobile */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r bg-[var(--ifw-neutral-50)] overflow-y-auto">
          <div className="p-3">
            <WizardSidebar
              wizardContext={data.wizardContext}
              currentStepId={currentStepId ?? ''}
              completedSteps={data.completedStepsArray}
              activeCategory={currentView === 'dashboard' ? null : currentView}
              onStepClick={handleSidebarStepClick}
              onCategoryClick={handleSidebarCategoryClick}
            />
          </div>
        </aside>

        {/* Content area — fills remaining space */}
        <div className="flex-1 min-w-0 flex flex-col">
          <CategoryDetailView
            category={currentView === 'dashboard' ? 'aboutYou' : currentView}
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
            allSteps={nav.visibleSteps}
            completedSteps={data.completedSteps}
            onBreadcrumbStepClick={navigateToStep}
          />
        </div>

        {/* Wilfred AI — always visible on lg+ */}
        <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-l bg-[var(--ifw-neutral-50)]">
          <div className="px-4 py-3 border-b border-[var(--ifw-border)] flex items-center gap-2">
            <span className="text-lg">🎩</span>
            <span className="text-sm font-medium" style={{ color: '#0C1F3C' }}>Wilfred</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-600)]">
              AI
            </span>
          </div>
          <WilfredPanel
            estateDocId={docId}
            stepId={currentStepId ?? undefined}
            province={data.doc.province}
            documentType={data.doc.documentType}
            completedSteps={data.completedStepsArray}
            embedded
          />
        </aside>
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
    </>
  );
}
