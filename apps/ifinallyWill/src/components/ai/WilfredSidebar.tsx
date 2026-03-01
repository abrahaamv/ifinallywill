/**
 * WilfredSidebar — AI assistant sidebar for the main app layout
 *
 * Uses the local-first useWilfredChat hook for demo mode.
 * Enhanced with animated avatar, quick actions, and welcome state.
 */

import { useState } from 'react';
import { useWilfredChat } from '../../hooks/useWilfredChat';
import { WilfredInput } from '../wilfred/WilfredInput';
import { WilfredMessages } from '../wilfred/WilfredMessages';
import { WilfredAvatar } from './WilfredAvatar';

interface Props {
  stepId?: string;
  documentType?: string;
  province?: string;
  className?: string;
}

const QUICK_ACTIONS = [
  { label: "What's missing?", icon: '🔍' },
  { label: 'Review progress', icon: '📊' },
  { label: 'Help add family', icon: '👨‍👩‍👧' },
  { label: 'Explain POA', icon: '📋' },
];

export function WilfredSidebar({ stepId, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const { messages, isLoading, send, suggestions } = useWilfredChat({ stepId });

  const showWelcome = messages.length === 0 && !isLoading;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden xl:flex w-80 flex-col border-l border-[var(--ifw-border)] bg-[var(--ifw-neutral-50)] ${className}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--ifw-border)] px-4 py-3">
          <WilfredAvatar
            size="sm"
            isThinking={isLoading}
            isTyping={isUserTyping}
            showGlow={isLoading}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-navy">Wilfred</span>
              <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-medium text-brand-navy">
                AI
              </span>
            </div>
            {stepId && (
              <p className="text-[10px] text-[var(--ifw-text-muted)]">
                Helping with: {stepId.replace(/-/g, ' ')}
              </p>
            )}
          </div>
        </div>

        {/* Welcome state with animated avatar */}
        {showWelcome && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <WilfredAvatar size="lg" showGlow className="mb-4" />
            <p className="text-sm font-semibold text-brand-navy mb-1">Hi, I'm Wilfred!</p>
            <p className="text-xs text-center text-[var(--ifw-text-muted)] mb-5 max-w-[220px]">
              Your estate planning assistant. I can help you understand each section and answer any
              questions.
            </p>

            {/* Quick actions grid */}
            <div className="grid grid-cols-2 gap-2 w-full px-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => send(action.label)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--ifw-neutral-200)] bg-white text-left text-[11px] font-medium text-[var(--ifw-neutral-700)] hover:border-[var(--ifw-primary-300)] hover:bg-[var(--ifw-primary-50)] disabled:opacity-40 transition-all"
                >
                  <span className="text-sm">{action.icon}</span>
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages (only when there are messages) */}
        {!showWelcome && (
          <WilfredMessages messages={messages} isLoading={isLoading} />
        )}

        <WilfredInput
          onSend={send}
          disabled={isLoading}
          suggestions={messages.length === 0 ? suggestions : undefined}
          onTypingChange={setIsUserTyping}
        />
      </aside>

      {/* Mobile floating button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg xl:hidden animate-wilfred-float"
        style={{ backgroundColor: 'var(--tenant-primary, #0A1E86)' }}
      >
        {isOpen ? (
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <WilfredAvatar size="sm" />
        )}
      </button>

      {/* Mobile bottom sheet */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[60vh] flex-col rounded-t-2xl border-t border-[var(--ifw-border)] bg-white shadow-xl xl:hidden">
          <div className="flex items-center justify-between border-b border-[var(--ifw-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <WilfredAvatar
                size="sm"
                isThinking={isLoading}
                showGlow={isLoading}
              />
              <span className="text-sm font-semibold text-brand-navy">Wilfred</span>
              <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-medium text-brand-navy">
                AI
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[var(--ifw-text-muted)] hover:text-[var(--ifw-text)]"
            >
              Close
            </button>
          </div>

          {/* Mobile quick actions when empty */}
          {showWelcome && (
            <div className="px-4 py-3 border-b border-[var(--ifw-neutral-100)]">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => send(action.label)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[var(--ifw-neutral-200)] bg-white text-[10px] font-medium text-[var(--ifw-neutral-700)] hover:border-[var(--ifw-primary-300)] disabled:opacity-40 transition-all"
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showWelcome && (
            <WilfredMessages messages={messages} isLoading={isLoading} />
          )}
          <WilfredInput
            onSend={send}
            disabled={isLoading}
            suggestions={messages.length === 0 ? suggestions : undefined}
            onTypingChange={setIsUserTyping}
          />
        </div>
      )}
    </>
  );
}
