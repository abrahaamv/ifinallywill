/**
 * Wilfred chat input — text field + send button
 */

import { useState, useRef, type KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  suggestions?: string[];
}

export function WilfredInput({ onSend, disabled, suggestions }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[var(--ifw-border)] p-3">
      {/* Quick suggestions */}
      {suggestions && suggestions.length > 0 && !value && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSend(s)}
              disabled={disabled}
              className="text-[10px] px-2 py-1 rounded-full border border-[var(--ifw-primary-200)] text-[var(--ifw-primary-700)] hover:bg-[var(--ifw-primary-50)] disabled:opacity-40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          className="flex-1 text-xs resize-none rounded-lg border border-[var(--ifw-border)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--ifw-primary-500)] disabled:opacity-40"
          placeholder="Ask Wilfred..."
          style={{ maxHeight: '80px' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
