/**
 * Estate Planning — Wizard category accordion with step tracking
 *
 * Moved from DashboardPage.tsx:
 * - 5 numbered category cards (About You, Your Family, Your Estate, Your Arrangements, Your POAs)
 * - Expandable sections showing individual steps with completion status
 * - Left color pill strip (green=done, gold=current, gray=locked)
 * - Sequential gating: categories lock until previous is complete
 * - Step-level completion tracking with check/clock/lock icons
 * - Edit button on completed steps, Start/Continue button per category
 * - Time estimates per category
 *
 * Accepts ?category= query param to auto-expand that category.
 * Data backed by localStorage demo store (no backend required).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import * as demoStore from '../../stores/demoDocumentStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardCategory {
  id: string;
  label: string;
  description: string;
  completeDescription: string;
  time: string;
  steps: WizardStep[];
}

interface WizardStep {
  id: string;
  label: string;
  /** willData section key to check completion */
  dataKey: string;
}

// ---------------------------------------------------------------------------
// Category & Step Configuration (matches source wizardConfig.ts)
// ---------------------------------------------------------------------------

const CATEGORIES: WizardCategory[] = [
  {
    id: 'aboutYou',
    label: 'About You',
    description: 'Your personal information for legal documents',
    completeDescription: 'You already completed this section',
    time: '2 minutes',
    steps: [{ id: 'personal-info', label: 'Personal Information', dataKey: 'personalInfo' }],
  },
  {
    id: 'people',
    label: 'People',
    description: 'Add key names and people to your will',
    completeDescription: 'You already completed this section',
    time: '5+ minutes',
    steps: [
      { id: 'children', label: 'Key Names', dataKey: 'children' },
      { id: 'key-people', label: 'Key People', dataKey: 'keyPeople' },
      { id: 'pet-guardians', label: 'Pet Guardians', dataKey: 'pets' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'List your assets',
    completeDescription: 'You already completed this section',
    time: '10+ minutes',
    steps: [
      { id: 'assets', label: 'My Assets', dataKey: 'assets' },
    ],
  },
  {
    id: 'gifts',
    label: 'Gifts',
    description: 'Assign specific gifts to people or charities',
    completeDescription: 'You already completed this section',
    time: '5+ minutes',
    steps: [
      { id: 'bequests', label: 'Gifts & Bequests', dataKey: 'bequests' },
    ],
  },
  {
    id: 'residue',
    label: 'Residue',
    description: 'Distribute what remains after specific gifts',
    completeDescription: 'You already completed this section',
    time: '5 minutes',
    steps: [
      { id: 'residue', label: "What's Left", dataKey: 'residue' },
    ],
  },
  {
    id: 'children',
    label: 'Children',
    description: 'Trusting and guardianship for minor children',
    completeDescription: 'You already completed this section',
    time: '5 minutes',
    steps: [
      { id: 'inheritance', label: 'Trusting', dataKey: 'trusting' },
      { id: 'guardians', label: 'Guardians', dataKey: 'guardians' },
    ],
  },
  {
    id: 'wipeout',
    label: 'Wipeout',
    description: 'Backup plan if all beneficiaries pass away',
    completeDescription: 'You already completed this section',
    time: '5 minutes',
    steps: [
      { id: 'wipeout', label: 'Wipeout', dataKey: 'wipeout' },
    ],
  },
  {
    id: 'finalArrangements',
    label: 'Final Arrangements',
    description: 'Executors, POAs, additional wishes, and final review',
    completeDescription: 'You already completed this section',
    time: '15 minutes',
    steps: [
      { id: 'executors', label: 'Executors', dataKey: 'executors' },
      { id: 'poa-property', label: 'POA for Property', dataKey: 'poaProperty' },
      { id: 'poa-health', label: 'POA for Health', dataKey: 'poaHealth' },
      { id: 'additional', label: 'Additional Requests', dataKey: 'additional' },
      { id: 'final-details', label: 'Final Details', dataKey: 'finalDetails' },
      { id: 'enhance', label: 'Enhance Your Plan', dataKey: 'enhance' },
      { id: 'review', label: 'Review Documents', dataKey: 'documentDOM' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Icons (inline SVG — no external deps)
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function ChevronDownIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EstatePlanningPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  // Initialize expanded categories — auto-expand from query param
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    if (categoryParam) return new Set([categoryParam]);
    return new Set();
  });

  // Auto-expand category from query param on change
  useEffect(() => {
    if (categoryParam) {
      setExpandedCategories((prev) => {
        if (prev.has(categoryParam)) return prev;
        const next = new Set(prev);
        next.add(categoryParam);
        return next;
      });
    }
  }, [categoryParam]);

  // Ensure a demo document exists
  const doc = useMemo(() => demoStore.ensureDefaultDocument(user?.id), [user?.id]);
  const willData = useMemo(() => demoStore.getWillData(doc.id), [doc.id]);

  const firstName = user?.name?.split(' ')[0] || 'User';

  // Check step completion: a step is complete if its dataKey has non-empty data in willData
  const isStepComplete = useCallback(
    (step: WizardStep): boolean => {
      const completedSteps = willData.completedSteps ?? [];
      if (completedSteps.includes(step.id)) return true;
      const section = (willData as Record<string, unknown>)[step.dataKey];
      if (!section) return false;
      if (typeof section === 'object' && Object.keys(section as object).length > 0) return true;
      return false;
    },
    [willData]
  );

  // Category completion
  const getCategoryProgress = useCallback(
    (category: WizardCategory) => {
      const completed = category.steps.filter(isStepComplete).length;
      return {
        completed,
        total: category.steps.length,
        isComplete: completed === category.steps.length && category.steps.length > 0,
      };
    },
    [isStepComplete]
  );

  // Find first incomplete category (for sequential gating)
  const nextIncompleteIndex = useMemo(() => {
    for (let i = 0; i < CATEGORIES.length; i++) {
      const progress = getCategoryProgress(CATEGORIES[i]!);
      if (!progress.isComplete) return i;
    }
    return CATEGORIES.length; // all complete
  }, [getCategoryProgress]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Navigate to a step in the wizard
  const handleStepClick = (stepId: string) => {
    navigate(`/app/documents/${doc.id}/${stepId}`);
  };

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
      {/* Gold gradient hero */}
      <div
        className="py-6 sm:py-10 px-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6"
        style={{ background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Back to Dashboard link */}
          <button
            type="button"
            onClick={() => navigate('/app/dashboard')}
            className="flex items-center gap-1 text-sm font-medium mb-3 hover:opacity-80 transition-opacity"
            style={{ color: '#0A1E86' }}
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
            Back to Dashboard
          </button>

          <p
            className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2"
            style={{ color: '#0A1E86', opacity: 0.7 }}
          >
            Estate Planning
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
            Complete each section below to build your estate plan.
          </p>
        </div>
      </div>

      {/* Category Cards */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="space-y-3">
          {CATEGORIES.map((category, index) => {
            const progress = getCategoryProgress(category);
            const isComplete = progress.isComplete;
            const isNextStep = index === nextIncompleteIndex;
            const isFutureStep = !isComplete && !isNextStep && index > 0;
            const isExpanded = expandedCategories.has(category.id);

            // First incomplete step in this category
            const firstIncompleteStep = category.steps.find((s) => !isStepComplete(s));

            return (
              <div
                key={category.id}
                className="bg-white rounded-xl overflow-hidden"
                style={{ boxShadow: '0 2px 8px rgba(10, 30, 134, 0.06)' }}
              >
                {/* Category Header */}
                <div className="relative">
                  {/* Left Pill Strip */}
                  <div
                    className="absolute left-0 top-0 bottom-0 flex items-center justify-center transition-all"
                    style={{
                      width: isComplete ? '28px' : '26px',
                      backgroundColor: isComplete
                        ? 'rgba(76, 175, 80, 0.35)'
                        : isNextStep
                          ? 'rgba(255, 191, 0, 0.5)'
                          : 'rgba(156, 163, 175, 0.35)',
                      boxShadow: isNextStep ? '0 0 16px rgba(255, 191, 0, 0.5)' : 'none',
                    }}
                  >
                    {isComplete && (
                      <div style={{ color: '#22c55e' }}>
                        <CheckIcon />
                      </div>
                    )}
                  </div>

                  {/* Header Button */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleCategory(category.id);
                      if (!isFutureStep && firstIncompleteStep) {
                        handleStepClick(firstIncompleteStep.id);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Row 1: Step number + Title + Badge */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Step Number Circle */}
                        <div
                          className="flex items-center justify-center rounded-full flex-shrink-0 transition-all"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: isComplete
                              ? '#4CAF50'
                              : isNextStep
                                ? '#FFBF00'
                                : '#E5E7EB',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            boxShadow: isNextStep ? '0 0 8px rgba(255, 191, 0, 0.4)' : 'none',
                          }}
                        >
                          <span
                            style={{
                              color: isComplete ? '#FFFFFF' : isNextStep ? '#0C1F3C' : '#9CA3AF',
                            }}
                          >
                            {index + 1}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="text-left min-w-0 flex-1">
                          <h3
                            className="text-base sm:text-lg font-bold truncate"
                            style={{ color: '#0C1F3C', fontWeight: 700 }}
                          >
                            {category.label}
                          </h3>
                        </div>

                        {/* Badge */}
                        {!isComplete && (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0"
                            style={{
                              backgroundColor: isFutureStep ? '#E5E7EB' : '#FEF3C7',
                              color: isFutureStep ? '#6B7280' : '#B45309',
                            }}
                          >
                            {isFutureStep ? <LockIcon /> : <BellIcon />}
                            {isFutureStep ? 'Complete previous' : 'Pending'}
                          </span>
                        )}
                      </div>

                      {/* Row 2: Description */}
                      <p
                        className="text-xs sm:text-sm text-left mt-0.5 truncate"
                        style={{ color: '#6B7280' }}
                      >
                        {isComplete ? category.completeDescription : category.description}
                      </p>
                    </div>

                    {/* Chevron */}
                    <div className="flex-shrink-0 ml-4" style={{ color: '#9CA3AF' }}>
                      <ChevronDownIcon isExpanded={isExpanded} />
                    </div>
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className={`border-t-2 border-gray-100 ${isComplete ? 'bg-gray-50' : ''}`}>
                    <div className="p-4 sm:p-6">
                      {/* Steps List */}
                      <div className="space-y-3">
                        {category.steps.map((step) => {
                          const stepComplete = isStepComplete(step);
                          const isGrayStep = isFutureStep && !stepComplete;

                          return (
                            <div
                              key={step.id}
                              onClick={() => !isGrayStep && handleStepClick(step.id)}
                              className={`flex items-center text-base sm:text-lg group ${
                                !stepComplete && !isGrayStep
                                  ? 'cursor-pointer hover:bg-amber-50/50 rounded-lg px-2 py-1 -mx-2 transition-colors'
                                  : ''
                              }`}
                              role={!stepComplete && !isGrayStep ? 'button' : undefined}
                            >
                              {/* Status Circle */}
                              <div
                                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 shadow-md"
                                style={{
                                  backgroundColor: stepComplete
                                    ? '#4CAF50'
                                    : isGrayStep
                                      ? '#9CA3AF'
                                      : '#F59E0B',
                                  color: '#FFFFFF',
                                }}
                              >
                                {stepComplete ? (
                                  <CheckIcon />
                                ) : isGrayStep ? (
                                  <LockIcon />
                                ) : (
                                  <ClockIcon />
                                )}
                              </div>

                              {/* Step Title */}
                              <span
                                className="flex-1"
                                style={{
                                  color: stepComplete ? '#2B2B2B' : isGrayStep ? '#9CA3AF' : '#555555',
                                  fontWeight: stepComplete ? 900 : 700,
                                }}
                              >
                                {step.label}
                              </span>

                              {/* Edit Button for Completed Steps */}
                              {stepComplete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStepClick(step.id);
                                  }}
                                  className="text-slate-400 hover:text-green-600 p-1 transition-all rounded-lg hover:bg-green-50"
                                  title="Edit"
                                >
                                  <EditIcon />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer with Time Estimate */}
                      {index > 0 && (
                        <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-gray-100">
                          <div className="flex items-center text-sm" style={{ color: '#6B7280' }}>
                            <ClockIcon />
                            <span className="ml-2 font-medium">Takes about {category.time}</span>
                          </div>

                          {!isComplete && firstIncompleteStep && (
                            <button
                              type="button"
                              onClick={() => handleStepClick(firstIncompleteStep.id)}
                              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                              style={{
                                backgroundColor: '#FFBF00',
                                color: '#0C1F3C',
                              }}
                            >
                              {progress.completed === 0 ? 'Start Section' : 'Continue'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
