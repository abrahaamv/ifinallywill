import React from 'react';

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
  badge,
  disabled = false,
}: OptionCardProps) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`card-option${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: '-0.625rem',
            right: '1rem',
            background: 'linear-gradient(135deg, #0A1E86, #081668)',
            color: '#fff',
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            lineHeight: 1.4,
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
