/**
 * WilfredSidebar — AI assistant sidebar for the main app layout
 *
 * Renders as a right sidebar on desktop and a floating button + bottom sheet on mobile.
 * Uses tRPC Wilfred endpoints for a general help session (no specific document context).
 */

import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../../utils/trpc';
import { WilfredInput } from '../wilfred/WilfredInput';
import { WilfredMessages } from '../wilfred/WilfredMessages';
import { WilfredAvatar } from './WilfredAvatar';

interface Props {
  stepId?: string;
  documentType?: string;
  province?: string;
  className?: string;
}

const GENERAL_SUGGESTIONS = ['What is a will?', 'Do I need a POA?', 'How do I get started?'];

export function WilfredSidebar({ stepId, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const createSession = trpc.wilfred.createSession.useMutation();
  const sendMessage = trpc.wilfred.sendMessage.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.wilfred.getHistory.useQuery(
    { sessionId: sessionId!, limit: 50 },
    { enabled: !!sessionId }
  );

  // Create a general session when the sidebar is first opened
  useEffect(() => {
    if (isOpen && !sessionId && !createSession.isPending) {
      createSession.mutate(
        { estateDocId: 'general' },
        {
          onSuccess: (result) => setSessionId(result.sessionId),
          onError: () => {
            // If general session creation fails, still allow the sidebar to render
          },
        }
      );
    }
  }, [isOpen, sessionId]);

  const handleSend = useCallback(
    (content: string) => {
      if (!sessionId) return;
      sendMessage.mutate({ sessionId, content }, { onSuccess: () => refetchHistory() });
    },
    [sessionId, sendMessage, refetchHistory]
  );

  const messages = (history ?? []).map((m) => ({
    id: m.id,
    role: m.role ?? 'user',
    content: m.content,
    timestamp: m.timestamp,
  }));

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden xl:flex w-80 flex-col border-l border-[var(--ifw-border)] bg-[var(--ifw-neutral-50)] ${className}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--ifw-border)] px-4 py-3">
          <WilfredAvatar size="sm" />
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

        {/* Chat area — auto-connect on mount for desktop */}
        <DesktopAutoConnect
          sessionId={sessionId}
          onNeedSession={() => {
            if (!sessionId && !createSession.isPending) {
              createSession.mutate(
                { estateDocId: 'general' },
                { onSuccess: (result) => setSessionId(result.sessionId) }
              );
            }
          }}
        />

        <WilfredMessages messages={messages} isLoading={sendMessage.isPending} />
        <WilfredInput
          onSend={handleSend}
          disabled={sendMessage.isPending || !sessionId}
          suggestions={sessionId && messages.length === 0 ? GENERAL_SUGGESTIONS : undefined}
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
              <WilfredAvatar size="sm" />
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

          <WilfredMessages messages={messages} isLoading={sendMessage.isPending} />
          <WilfredInput
            onSend={handleSend}
            disabled={sendMessage.isPending || !sessionId}
            suggestions={sessionId && messages.length === 0 ? GENERAL_SUGGESTIONS : undefined}
          />
        </div>
      )}
    </>
  );
}

/**
 * Invisible component that auto-creates a session when the desktop sidebar mounts.
 */
function DesktopAutoConnect({
  sessionId,
  onNeedSession,
}: {
  sessionId: string | null;
  onNeedSession: () => void;
}) {
  useEffect(() => {
    if (!sessionId) {
      onNeedSession();
    }
  }, []);

  return null;
}
