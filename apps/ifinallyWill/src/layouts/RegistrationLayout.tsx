/**
 * Registration wizard layout — gold header, progress bar, help panel
 * Uses class names from register.css (.epilogue-wrapper, .wizard-content,
 * .help-panel, .help-button) for scoped styling under .register-scope.
 */

import { Link } from 'react-router-dom';

interface RegistrationLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  showProgress: boolean;
  helpContent?: React.ReactNode;
  isHelpOpen: boolean;
  onToggleHelp: () => void;
}

export function RegistrationLayout({
  children,
  currentStep,
  totalSteps,
  showProgress,
  helpContent,
  isHelpOpen,
  onToggleHelp,
}: RegistrationLayoutProps) {
  return (
    <div className="epilogue-wrapper pt-0">
      {/* Gold header banner */}
      <div className="bg-[#FFBF00]">
        <div className="container">
          <div className="header mb-0 justify-between">
            <div>
              <Link
                to="/"
                className="text-sm font-semibold text-[#0C1F3C] no-underline flex items-center gap-1"
              >
                <span className="leading-none">&lsaquo;</span>
                iFinallyWill
              </Link>
            </div>
            <div className="flex items-center gap-6">
              {showProgress && (
                <span className="text-sm font-medium text-[#0C1F3C]">Step {currentStep + 1}</span>
              )}
            </div>
          </div>
        </div>

        {/* Segmented progress bar inside gold header */}
        {showProgress && (
          <div className="max-w-lg mx-auto px-4 pb-5">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    i <= currentStep ? 'bg-[#0A1E86]' : 'bg-[rgba(12,31,60,0.2)]'
                  } ${i === currentStep ? 'h-1.5' : 'h-1'}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content — uses .wizard-content from register.css */}
      <div className="wizard-content">{children}</div>

      {/* Help panel (slide-in from right) — uses .help-panel from register.css */}
      <div className={`help-panel${isHelpOpen ? ' open' : ''}`}>
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-[#0C1F3C]">FAQ</h2>
            <button
              type="button"
              onClick={onToggleHelp}
              className="bg-transparent border-none text-2xl cursor-pointer font-bold text-[#64748B] w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[#f1f5f9]"
            >
              &times;
            </button>
          </div>
          {helpContent || (
            <div>
              <div className="faq-item">
                <div className="faq-question">
                  <span>Why do I need an account?</span>
                  <span className="text-[#0A1E86]">&darr;</span>
                </div>
                <div className="faq-answer">
                  Creating an account allows you to save your progress and return anytime to
                  complete your will. Your information is securely stored and encrypted.
                </div>
              </div>

              <div className="faq-item">
                <div className="faq-question">
                  <span>Is my data secure?</span>
                  <span className="text-[#0A1E86]">&darr;</span>
                </div>
                <div className="faq-answer">
                  Yes, we use bank-level encryption and security measures to protect your personal
                  information. We never share your data with third parties.
                </div>
              </div>

              <div className="mt-12 p-6 bg-[rgba(10,30,134,0.04)] rounded-xl border border-[rgba(10,30,134,0.08)]">
                <h3 className="font-bold mb-3 text-[#0C1F3C]">We&rsquo;re here to help</h3>
                <p className="text-[#1E3A5F] text-base mb-0 font-medium">
                  Contact our team via chat or call us at{' '}
                  <span className="text-[#0A1E86] font-semibold">(289) 678-1689</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help button (floating circle) — uses .help-button from register.css */}
      <div className="help-button bg-[#0A1E86]" onClick={onToggleHelp}>
        <svg width="24" height="24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
      </div>
    </div>
  );
}
