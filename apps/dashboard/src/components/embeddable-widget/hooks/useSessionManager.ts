/**
 * useSessionManager Hook
 *
 * Manages chat session lifecycle.
 * Note: Video transitions removed - Janus Gateway integration coming soon.
 */

import { useState, useCallback } from 'react';
import { trpc } from '../../../utils/trpc';

export function useSessionManager(widgetId: string | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Create session mutation
  const createSessionMutation = trpc.sessions.create.useMutation({
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  // End session mutation
  const endSessionMutation = trpc.sessions.end.useMutation({
    onSuccess: () => {
      setSessionId(null);
    },
  });

  // Create a new session
  const createSession = useCallback(async () => {
    if (!widgetId) return null;

    const result = await createSessionMutation.mutateAsync({
      widgetId,
      mode: 'text',
    });

    return result.id;
  }, [widgetId, createSessionMutation]);

  // End current session
  const endSession = useCallback(async () => {
    if (!sessionId) return;
    await endSessionMutation.mutateAsync({ id: sessionId });
  }, [sessionId, endSessionMutation]);

  return {
    sessionId,
    setSessionId,
    createSession,
    endSession,
    isCreatingSession: createSessionMutation.isPending,
  };
}
