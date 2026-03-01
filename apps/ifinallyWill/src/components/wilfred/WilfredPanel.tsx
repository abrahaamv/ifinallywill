/**
 * Wilfred AI Panel — right sidebar (desktop) / bottom sheet (mobile)
 *
 * Uses the local-first useWilfredChat hook for demo mode.
 * When a real backend is available, swap to tRPC-backed hook.
 */

import { useState } from 'react';
import { useWilfredChat } from '../../hooks/useWilfredChat';
import { WilfredInput } from './WilfredInput';
import { WilfredMessages } from './WilfredMessages';

interface Props {
  estateDocId: string;
  stepId?: string;
  province?: string;
  documentType?: string;
  completedSteps?: string[];
  /** When true, renders just messages + input (parent provides container) */
  embedded?: boolean;
}

export function WilfredPanel({
  stepId,
  province,
  documentType,
  completedSteps,
  embedded,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const { messages, isLoading, send, suggestions } = useWilfredChat({
    stepId,
    province,
    documentType,
    completedSteps,
  });

  // Embedded mode: parent provides the aside container + header
  if (embedded) {
    return (
      <>
        <WilfredMessages messages={messages} isLoading={isLoading} />
        <WilfredInput onSend={send} disabled={isLoading} suggestions={suggestions} />
      </>
    );
  }

  // Standalone mode: mobile floating button + bottom sheet
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ backgroundColor: 'var(--ifw-primary-700)' }}
      >
        {isOpen ? '✕' : '🎩'}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-[var(--ifw-border)] rounded-t-xl shadow-xl flex flex-col"
          style={{ maxHeight: '60vh' }}
        >
          <div className="px-4 py-3 border-b border-[var(--ifw-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎩</span>
              <span className="text-sm font-medium" style={{ color: '#0C1F3C' }}>Wilfred</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[var(--ifw-text-muted)]"
            >
              Close
            </button>
          </div>

          <WilfredMessages messages={messages} isLoading={isLoading} />
          <WilfredInput onSend={send} disabled={isLoading} suggestions={suggestions} />
        </div>
      )}
    </>
  );
}
