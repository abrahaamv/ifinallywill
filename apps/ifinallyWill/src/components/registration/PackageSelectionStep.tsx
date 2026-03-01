/**
 * Step 11: Package Selection -- choose will package
 *
 * Pixel-perfect clone of the source PackageSelectionStep + PricingCard design.
 * All package data and card rendering is inlined (no external PricingCard component).
 */

import { useState } from 'react';

import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#0A1E86';
const BRAND_NAVY = '#0C1F3C';

// ---------------------------------------------------------------------------
// Secondary-will provinces
// ---------------------------------------------------------------------------

const SECONDARY_WILL_PROVINCES = ['Ontario', 'British Columbia'];

// ---------------------------------------------------------------------------
// Package configuration (mirrors source packagesData.js)
// ---------------------------------------------------------------------------

interface PackageConfig {
  id: string;
  numericId: number; // 1 | 2 | 3 — stored in RegistrationData.selected_package
  category: string;
  title: string;
  price: number;
  was?: number;
  bestFor: string;
  includes: string[];
  notIncluded?: string[];
  whyThisMatters?: string;
  whyCouplesChoose?: string;
  needMoreCoverage?: string;
  ctaLabel: string;
  footerNote?: string;
  variant: 'default' | 'highlighted';
  isBestValue: boolean;
  dbDescription: string;
  hasSecondaryWill: boolean;
}

const ALL_PACKAGES = {
  basicWillNoSecondary: {
    id: 'basic-will',
    numericId: 1,
    category: 'BASIC WILL',
    title: 'Basic Will',
    price: 89,
    bestFor: 'People with a simple estate who want a legally valid will completed correctly.',
    includes: ['Basic will'],
    notIncluded: ['POA for Health', 'POA for Property'],
    needMoreCoverage:
      'Choose Complete Plan if you: want incapacity coverage, own property, have kids/dependents, or run a business.',
    ctaLabel: 'Start Basic Will',
    footerNote: "If you're incapacitated first, a will doesn't help - POAs do.",
    variant: 'default',
    isBestValue: false,
    dbDescription: 'One will only',
    hasSecondaryWill: false,
  },
  basicWillWithSecondary: {
    id: 'basic-will-secondary',
    numericId: 1,
    category: 'BASIC WILL',
    title: 'Basic Will',
    price: 89,
    bestFor: 'People with a simple estate who want a legally valid will completed correctly.',
    includes: ['Basic will', 'Bonus: Free Secondary Will for Business Owners ($100 value)'],
    notIncluded: ['POA for Health', 'POA for Property'],
    needMoreCoverage:
      'Choose Complete Plan if you: want incapacity coverage, own property, have kids/dependents, or run a business.',
    ctaLabel: 'Start Basic Will',
    footerNote: "If you're incapacitated first, a will doesn't help - POAs do.",
    variant: 'default',
    isBestValue: false,
    dbDescription: 'One will and one secondary will',
    hasSecondaryWill: true,
  },
  completePlanWithSecondary: {
    id: 'complete-plan-secondary',
    numericId: 2,
    category: 'BEST FOR INDIVIDUALS',
    title: 'Will + 2 Powers of Attorney',
    price: 159,
    bestFor:
      'Most adults with assets, responsibilities, dependents or anyone who wants "no gaps" planning. Great for: homeowners \u2022 parents \u2022 business owners',
    includes: [
      'Everything in Basic Will',
      "Power of Attorney for Health (if you can't make health decisions)",
      "Power of Attorney for Property (if you can't manage financial/legal decisions)",
      'Bonus: Free Secondary Will for Business Owners ($100 value)',
    ],
    whyThisMatters:
      'This is the minimum responsible setup for most people. Incapacity risk often comes before death.',
    ctaLabel: 'Start Pro Plan',
    variant: 'highlighted',
    isBestValue: false,
    dbDescription: 'One will and one secondary will and two POAs',
    hasSecondaryWill: true,
  },
  completePlanNoSecondary: {
    id: 'complete-plan',
    numericId: 2,
    category: 'BEST FOR INDIVIDUALS',
    title: 'Will + 2 Powers of Attorney',
    price: 159,
    bestFor:
      'Most adults with assets, responsibilities, dependents or anyone who wants "no gaps" planning. Great for: homeowners \u2022 parents \u2022 business owners',
    includes: [
      'Everything in Basic Will',
      "Power of Attorney for Health (if you can't make health decisions)",
      "Power of Attorney for Property (if you can't manage financial/legal decisions)",
    ],
    whyThisMatters:
      'This is the minimum responsible setup for most people. Incapacity risk often comes before death.',
    ctaLabel: 'Start Pro Plan',
    variant: 'highlighted',
    isBestValue: false,
    dbDescription: 'One will and two POAs',
    hasSecondaryWill: false,
  },
  couplesPlanWithSecondary: {
    id: 'couples-plan-secondary',
    numericId: 3,
    category: 'Best for 2 spouses',
    title: '2 Wills + 4 Powers of Attorney',
    price: 249,
    was: 349,
    bestFor:
      'Couples who want coordinated decisions and a bundled price that actually makes sense. Save $69 vs two Complete Plans',
    includes: [
      '2x Wills (one per spouse)',
      '2 POA for Health',
      '2 POA for Property',
      'Bonus: Free Secondary Will for Business Owners ($100 value)',
    ],
    whyCouplesChoose:
      'Two separate wills + guided alignment = less confusion for your executor later.',
    ctaLabel: 'Start Couples Plan',
    variant: 'default',
    isBestValue: true,
    dbDescription: 'Two spousal wills and two secondary wills and four POAs',
    hasSecondaryWill: true,
  },
  couplesPlanNoSecondary: {
    id: 'couples-plan',
    numericId: 3,
    category: 'Best for 2 spouses',
    title: '2 Wills + 4 Powers of Attorney',
    price: 249,
    was: 349,
    bestFor:
      'Couples who want coordinated decisions and a bundled price that actually makes sense. Save $69 vs two Complete Plans',
    includes: ['2x Wills (one per spouse)', '2 POA for Health', '2 POA for Property'],
    whyCouplesChoose:
      'Two separate wills + guided alignment = less confusion for your executor later.',
    ctaLabel: 'Start Couples Plan',
    variant: 'default',
    isBestValue: true,
    dbDescription: 'Two spousal wills and four POAs',
    hasSecondaryWill: false,
  },
} satisfies Record<string, PackageConfig>;

// ---------------------------------------------------------------------------
// Package selection logic (mirrors source getPackagesForUser)
// ---------------------------------------------------------------------------

function getPackagesForUser(
  province: string,
  _wantsSecondaryWill: boolean | null,
  hasPartner: string,
  wantsPoa: boolean | null
): PackageConfig[] {
  const canHaveSecondaryWill = SECONDARY_WILL_PROVINCES.includes(province);
  const withSW = canHaveSecondaryWill;

  const packages: PackageConfig[] = [];

  // Basic Will
  packages.push(withSW ? ALL_PACKAGES.basicWillWithSecondary : ALL_PACKAGES.basicWillNoSecondary);

  if (hasPartner === 'yes') {
    // Show all 3 when user has partner
    packages.push(
      withSW ? ALL_PACKAGES.completePlanWithSecondary : ALL_PACKAGES.completePlanNoSecondary
    );
    packages.push(
      withSW ? ALL_PACKAGES.couplesPlanWithSecondary : ALL_PACKAGES.couplesPlanNoSecondary
    );
  } else {
    // No partner: show complete plan if wants POA or secondary will province
    const shouldShowComplete = wantsPoa === true || canHaveSecondaryWill;
    if (shouldShowComplete) {
      packages.push(
        withSW ? ALL_PACKAGES.completePlanWithSecondary : ALL_PACKAGES.completePlanNoSecondary
      );
    }
    // Always show couples plan
    packages.push(
      withSW ? ALL_PACKAGES.couplesPlanWithSecondary : ALL_PACKAGES.couplesPlanNoSecondary
    );
  }

  return packages;
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      style={{
        width: '16px',
        height: '16px',
        flexShrink: 0,
        marginTop: '2px',
        color: '#22c55e',
      }}
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      style={{
        width: '16px',
        height: '16px',
        flexShrink: 0,
        marginTop: '2px',
        color: '#ef4444',
      }}
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PricingCard (inlined, no framer-motion)
// ---------------------------------------------------------------------------

interface PricingCardProps {
  pkg: PackageConfig;
  isSelected: boolean;
  onSelect: () => void;
}

function PricingCard({ pkg, isSelected, onSelect }: PricingCardProps) {
  const isHighlight = pkg.variant === 'highlighted';

  // Card wrapper classes
  let wrapperBg: string;
  let wrapperExtra: React.CSSProperties;
  if (isHighlight) {
    wrapperBg = 'bg-gradient-to-b from-[#FFD54F] to-[#F7C72D] shadow-lg ring-2 ring-[#FFBF00]';
    wrapperExtra = {};
  } else if (pkg.isBestValue) {
    wrapperBg = 'bg-white shadow-lg';
    wrapperExtra = { border: `3px solid ${BRAND_BLUE}` };
  } else {
    wrapperBg = 'bg-white shadow-card ring-1 ring-black/5';
    wrapperExtra = {};
  }

  const selectedRing = isSelected ? 'ring-4 ring-[#0A1E86]/30' : '';

  return (
    <div
      className={`relative rounded-[24px] p-4 sm:p-5 md:p-6 flex flex-col min-h-[580px] ${wrapperBg} ${selectedRing} transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer`}
      style={wrapperExtra}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
    >
      {/* Category badge */}
      {pkg.isBestValue ? (
        <div className="absolute -top-3 left-0 right-0 flex justify-center z-30">
          <span
            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-white rounded-t-[12px] shadow-lg uppercase"
            style={{
              backgroundColor: BRAND_BLUE,
              boxShadow: '0 4px 12px rgba(10, 30, 134, 0.4)',
            }}
          >
            {pkg.category}
          </span>
        </div>
      ) : (
        <div className="absolute -top-3 left-0 right-0 flex justify-center z-20">
          <span
            className={`flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold tracking-wide shadow-sm uppercase text-center whitespace-nowrap ${
              pkg.category === 'BASIC WILL'
                ? 'bg-gray-100 text-gray-600 ring-1 ring-black/5'
                : 'text-white shadow-md'
            }`}
            style={pkg.category !== 'BASIC WILL' ? { backgroundColor: BRAND_BLUE } : undefined}
          >
            {pkg.category}
          </span>
        </div>
      )}

      {/* Price block */}
      <div className="text-center flex items-center justify-center mt-8 sm:mt-10 min-h-[80px]">
        <div className="flex items-baseline justify-center gap-2 flex-wrap">
          {pkg.was != null && (
            <span
              className="text-xl sm:text-2xl text-gray-400 line-through"
              style={{ fontFamily: 'sans-serif' }}
            >
              ${pkg.was}
            </span>
          )}
          <span
            style={{
              fontSize: '44px',
              fontWeight: 'bold',
              color: BRAND_BLUE,
              fontFamily: 'sans-serif',
            }}
          >
            ${pkg.price}
          </span>
        </div>
      </div>

      {/* Tagline (bestFor) */}
      <div className="mt-3 min-h-[44px] flex items-center justify-center">
        {pkg.bestFor && (
          <p className="text-sm sm:text-base text-center font-medium text-black">
            {/* Strip "Great for: ..." suffix for tagline */}
            {pkg.bestFor.includes('Great for:')
              ? pkg.bestFor.split('Great for:')[0]?.trim()
              : pkg.bestFor}
          </p>
        )}
      </div>

      {/* Middle content */}
      <div className="flex-1 flex flex-col min-h-0 mt-0">
        {/* Includes section */}
        <div className="mt-6 flex flex-col min-h-[200px] sm:min-h-[220px] text-left">
          <p className="text-base sm:text-lg font-bold uppercase tracking-wide mb-3 text-black">
            Includes
          </p>
          <ul className="space-y-2.5 sm:space-y-3 text-lg sm:text-xl text-left text-black">
            {pkg.includes.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
                <CheckIcon />
                <span className="leading-snug break-words">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Not included */}
          {pkg.notIncluded && pkg.notIncluded.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold uppercase tracking-wide mb-2 text-gray-500">
                Not Included
              </p>
              <ul className="space-y-2">
                {pkg.notIncluded.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 sm:gap-2 text-gray-400">
                    <XIcon />
                    <span className="leading-snug line-through">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* CTA button */}
      <div className="mt-auto pt-4 sm:pt-5">
        {pkg.footerNote && (
          <p className="mb-2 text-xs sm:text-sm text-center text-black">{pkg.footerNote}</p>
        )}
        <button
          type="button"
          className="block w-full text-center rounded-full px-5 sm:px-6 py-2.5 sm:py-3 min-h-[52px] sm:min-h-[56px] text-white text-lg sm:text-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ backgroundColor: BRAND_BLUE }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? '\u2713 Selected' : pkg.ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spouse Modal
// ---------------------------------------------------------------------------

interface SpouseModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function SpouseModal({ show, onConfirm, onCancel }: SpouseModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(12, 31, 60, 0.7)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[90%] max-w-[500px] animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Spouse Information Required</h3>
          <p className="text-gray-600">
            You&apos;ve selected a couples plan, but we need information about your spouse or
            partner to proceed.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold mt-0.5 mr-3 flex-shrink-0">
              i
            </span>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>&bull; We&apos;ll guide you through selecting your relationship status</li>
                <li>&bull; You&apos;ll need to enter your partner&apos;s basic information</li>
                <li>
                  &bull; If your partner lives at a different address, we&apos;ll collect that too
                </li>
                <li>&bull; Once completed, you&apos;ll proceed directly to checkout</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Choose Different Package
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-6 py-3 text-white rounded-full font-medium transition-colors"
            style={{ backgroundColor: BRAND_BLUE }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_NAVY;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_BLUE;
            }}
          >
            Continue with Couples Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PackageSelectionStep({ data, onUpdate, onNext, onBack }: Props) {
  const [showSpouseModal, setShowSpouseModal] = useState(false);
  const [pendingCouplesPackage, setPendingCouplesPackage] = useState<PackageConfig | null>(null);

  // Derive packages based on user selections (defaults match source)
  const province = data.province || 'Ontario';
  const hasPartner = data.has_partner || 'yes';
  const wantsPoa = data.wants_poa ?? true;
  const wantsSecondaryWill = data.wants_secondary_will ?? true;

  const packagesForUser = getPackagesForUser(province, wantsSecondaryWill, hasPartner, wantsPoa);

  const packageCount = packagesForUser.length;

  // Grid column classes
  let gridCols = 'grid-cols-1';
  let containerClass = '';
  if (packageCount === 2) {
    gridCols = 'grid-cols-1 md:grid-cols-2';
  } else if (packageCount >= 3) {
    gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  } else if (packageCount === 1) {
    containerClass = 'max-w-md mx-auto';
  }

  const handleSelectPackage = (pkg: PackageConfig) => {
    const isCouplesPackage =
      pkg.category === 'BEST FOR 2 ADULTS' || pkg.category === 'Best for 2 spouses';
    const hasNoPartner = data.has_partner === 'no' || !data.has_partner;

    if (isCouplesPackage && hasNoPartner) {
      setPendingCouplesPackage(pkg);
      setShowSpouseModal(true);
      return;
    }

    onUpdate({
      selected_package: pkg.numericId,
      package_price: pkg.price,
      package_name: pkg.dbDescription,
    });
    onNext();
  };

  const handleSpouseModalConfirm = () => {
    setShowSpouseModal(false);
    if (pendingCouplesPackage) {
      onUpdate({
        selected_package: pendingCouplesPackage.numericId,
        package_price: pendingCouplesPackage.price,
        package_name: pendingCouplesPackage.dbDescription,
        skip_package_selection: true,
        has_partner: 'yes',
        from_couples_plan_selection: true,
      });
    }
    onBack();
  };

  const handleSpouseModalCancel = () => {
    setShowSpouseModal(false);
    setPendingCouplesPackage(null);
    onUpdate({
      selected_package: null,
      package_price: 0,
      package_name: '',
    });
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-220px)] pt-6 sm:pt-8 pb-12 sm:pb-16 overflow-auto">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-slide-in-right">
          {/* Header */}
          <div className="text-center mb-4">
            <SectionTitle>Choose Your Package</SectionTitle>
            <StepSubtitle>
              Start free, review everything, and pay only when you&apos;re ready to finalize.
            </StepSubtitle>
          </div>

          {/* Package Cards Grid */}
          <div
            className={`mt-6 sm:mt-8 grid gap-5 sm:gap-6 ${gridCols} items-stretch ${containerClass}`}
          >
            {packagesForUser.map((pkg) => {
              const isSelected = data.selected_package === pkg.numericId;
              return (
                <div key={pkg.id} data-testid={`package-${pkg.id}`}>
                  <PricingCard
                    pkg={pkg}
                    isSelected={isSelected}
                    onSelect={() => handleSelectPackage(pkg)}
                  />
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-12 mb-6">
            <button type="button" className="btn-back" onClick={onBack}>
              &larr; Back
            </button>
            <button
              type="button"
              className="btn-primary min-w-[200px]"
              onClick={onNext}
              disabled={data.selected_package === null}
              data-testid="continue-package-button"
            >
              Proceed &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Spouse Requirement Modal */}
      <SpouseModal
        show={showSpouseModal}
        onConfirm={handleSpouseModalConfirm}
        onCancel={handleSpouseModalCancel}
      />
    </div>
  );
}
