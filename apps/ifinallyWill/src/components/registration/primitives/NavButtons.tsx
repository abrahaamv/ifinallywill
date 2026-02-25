interface NavButtonsProps {
  onBack?: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  loading?: boolean;
}

export function NavButtons({
  onBack,
  onNext,
  backLabel = '\u2190 Back',
  nextLabel = 'Save & Continue \u2192',
  nextDisabled = false,
  showBack = true,
  loading = false,
}: NavButtonsProps) {
  return (
    <div className="navigation-buttons">
      {showBack && onBack ? (
        <button type="button" className="btn-back" onClick={onBack}>
          {backLabel}
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        className="btn-primary"
        onClick={onNext}
        disabled={nextDisabled || loading}
      >
        {loading ? (
          <span
            style={{
              display: 'inline-block',
              width: '1.25rem',
              height: '1.25rem',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'pulse 0.8s linear infinite',
            }}
          />
        ) : (
          nextLabel
        )}
      </button>
    </div>
  );
}
