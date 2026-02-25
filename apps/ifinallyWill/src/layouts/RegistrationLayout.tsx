/**
 * Registration wizard layout — gold header, progress bar, help panel
 * Ported from v6 WizardLayout.jsx
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
    <div className="epilogue-wrapper" style={{ paddingTop: 0 }}>
      {/* Gold header banner */}
      <div style={{ backgroundColor: '#FFBF00' }}>
        <div className="container">
          <div
            className="header"
            style={{
              marginBottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 0',
            }}
          >
            <Link
              to="/"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#0C1F3C',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span style={{ lineHeight: 1 }}>&lsaquo;</span>
              iFinallyWill
            </Link>
            {showProgress && (
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0C1F3C' }}>
                Step {currentStep + 1}
              </span>
            )}
          </div>
        </div>

        {/* Segmented progress bar */}
        {showProgress && (
          <div style={{ maxWidth: '32rem', margin: '0 auto', padding: '0 1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: i === currentStep ? '6px' : '4px',
                    borderRadius: '9999px',
                    backgroundColor: i <= currentStep ? '#0A1E86' : 'rgba(12, 31, 60, 0.2)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="wizard-content" style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
        {children}
      </div>

      {/* Help panel (slide-out) */}
      <div
        className={`help-panel${isHelpOpen ? ' open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          right: isHelpOpen ? 0 : '-420px',
          width: '400px',
          height: '100vh',
          background: '#fff',
          boxShadow: isHelpOpen ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
          transition: 'right 0.3s ease',
          zIndex: 50,
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0C1F3C' }}>FAQ</h2>
            <button
              type="button"
              onClick={onToggleHelp}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#64748B',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              &times;
            </button>
          </div>
          {helpContent}
        </div>
      </div>

      {/* Overlay when help is open */}
      {isHelpOpen && (
        <div
          onClick={onToggleHelp}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 49,
          }}
        />
      )}

      {/* Floating help button */}
      <button
        type="button"
        onClick={onToggleHelp}
        className="help-button"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#0A1E86',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(10, 30, 134, 0.3)',
          zIndex: 48,
        }}
      >
        <svg width="24" height="24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
      </button>
    </div>
  );
}
