import React from 'react';

interface FloatingInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'tel';
  error?: string;
  helperText?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  rightElement?: React.ReactNode;
}

export function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  error,
  helperText,
  autoComplete,
  disabled = false,
  required = false,
  rightElement,
}: FloatingInputProps) {
  return (
    <div className="epilogue-floating-label-group">
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          className={`epilogue-floating-input${error ? ' has-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        />
        <label htmlFor={id} className="epilogue-floating-label">
          {label}
        </label>
        {rightElement && (
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="error-text" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${id}-helper`} className="epilogue-helper-text">
          {helperText}
        </p>
      )}
    </div>
  );
}
