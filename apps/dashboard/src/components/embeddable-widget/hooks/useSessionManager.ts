/**
 * useSessionManager Hook
 *
 * Manages chat session lifecycle and video transitions.
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

  // Transition to video mutation
  const transitionToVideoMutation = trpc.sessions.transitionToVideo.useMutation();

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

  // Transition current session to video mode
  const transitionToVideo = useCallback(async () => {
    if (!sessionId) {
      throw new Error('No active session to transition');
    }

    const result = await transitionToVideoMutation.mutateAsync({
      sessionId,
    });

    return {
      roomName: result.roomName,
      livekitUrl: result.livekitUrl,
      personalityId: result.personalityId,
    };
  }, [sessionId, transitionToVideoMutation]);

  // End current session
  const endSession = useCallback(async () => {
    if (!sessionId) return;
    await endSessionMutation.mutateAsync({ id: sessionId });
  }, [sessionId, endSessionMutation]);

  return {
    sessionId,
    setSessionId,
    createSession,
    transitionToVideo,
    endSession,
    isCreatingSession: createSessionMutation.isPending,
    isTransitioning: transitionToVideoMutation.isPending,
  };
}
