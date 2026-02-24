/**
 * Wilfred AI Panel — right sidebar (desktop) / bottom sheet (mobile)
 *
 * Manages session lifecycle, message sending, and context injection.
 */

import { useState, useCallback, useEffect } from 'react';
import { trpc } from '../../utils/trpc';
import { WilfredMessages } from './WilfredMessages';
import { WilfredInput } from './WilfredInput';

interface Props {
  estateDocId: string;
  stepId?: string;
  province?: string;
  documentType?: string;
  completedSteps?: string[];
}

export function WilfredPanel({ estateDocId, stepId, province, documentType, completedSteps }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const createSession = trpc.wilfred.createSession.useMutation();
  const sendMessage = trpc.wilfred.sendMessage.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.wilfred.getHistory.useQuery(
    { sessionId: sessionId!, limit: 50 },
    { enabled: !!sessionId },
  );
  const { data: suggestionsResult } = trpc.wilfred.getSuggestions.useQuery(
    { stepId: stepId ?? '', documentType: documentType ?? 'primary_will', province },
    { enabled: !!stepId },
  );

  // Auto-create session on first open
  useEffect(() => {
    if (isOpen && !sessionId && !createSession.isPending) {
      createSession.mutate(
        { estateDocId },
        {
          onSuccess: (result) => setSessionId(result.sessionId),
        },
      );
    }
  }, [isOpen, sessionId, estateDocId]);

  const handleSend = useCallback(
    (content: string) => {
      if (!sessionId) return;
      sendMessage.mutate(
        {
          sessionId,
          content,
          wizardContext: {
            stepId,
            province,
            documentType,
            completedSteps,
          },
        },
        {
          onSuccess: () => refetchHistory(),
        },
      );
    },
    [sessionId, stepId, province, documentType, completedSteps, sendMessage, refetchHistory],
  );

  const messages = (history ?? []).map((m) => ({
    id: m.id,
    role: m.role ?? 'user',
    content: m.content,
    timestamp: m.timestamp,
  }));

  // Desktop: always-visible sidebar panel
  // Mobile: toggle-able bottom sheet
  return (
    <>
      {/* Desktop panel */}
      <aside className="w-80 border-l bg-[var(--ifw-neutral-50)] hidden xl:flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--ifw-border)] flex items-center gap-2">
          <span className="text-lg">🎩</span>
          <span className="text-sm font-medium text-[var(--ifw-primary-700)]">Wilfred</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--ifw-primary-50)] text-[var(--ifw-primary-600)]">
            AI
          </span>
        </div>

        <WilfredMessages messages={messages} isLoading={sendMessage.isPending} />
        <WilfredInput
          onSend={handleSend}
          disabled={sendMessage.isPending || !sessionId}
          suggestions={suggestionsResult?.suggestions}
        />
      </aside>

      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="xl:hidden fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ backgroundColor: 'var(--ifw-primary-700)' }}
      >
        {isOpen ? '✕' : '🎩'}
      </button>

      {/* Mobile bottom sheet */}
      {isOpen && (
        <div className="xl:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-[var(--ifw-border)] rounded-t-xl shadow-xl flex flex-col" style={{ maxHeight: '60vh' }}>
          <div className="px-4 py-3 border-b border-[var(--ifw-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎩</span>
              <span className="text-sm font-medium text-[var(--ifw-primary-700)]">Wilfred</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-[var(--ifw-text-muted)]">
              Close
            </button>
          </div>

          <WilfredMessages messages={messages} isLoading={sendMessage.isPending} />
          <WilfredInput
            onSend={handleSend}
            disabled={sendMessage.isPending || !sessionId}
            suggestions={suggestionsResult?.suggestions}
          />
        </div>
      )}
    </>
  );
}
