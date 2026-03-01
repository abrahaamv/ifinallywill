/**
 * AssistantProvider — wraps the app with @assistant-ui/react runtime
 *
 * Configures the AI runtime using the existing tRPC Wilfred backend.
 * Provides AssistantRuntimeProvider context so all form steps can
 * use useAssistantForm for AI-driven field filling.
 */

import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  useLocalRuntime,
} from '@assistant-ui/react';
import { type ReactNode, useMemo } from 'react';
import { useAuth } from './AuthProvider';

/**
 * ChatModelAdapter that connects to the tRPC Wilfred backend.
 * Falls back to a simple echo if no backend is available (dev mode).
 */
function useWilfredAdapter(): ChatModelAdapter {
  return useMemo<ChatModelAdapter>(
    () => ({
      async run({ messages, abortSignal }: ChatModelRunOptions) {
        const lastMessage = messages[messages.length - 1];
        const userContent =
          lastMessage?.role === 'user'
            ? lastMessage.content
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('')
            : '';

        // Call the tRPC Wilfred endpoint via fetch
        // The actual AI processing happens server-side
        const apiUrl = import.meta.env.VITE_API_URL || '';
        try {
          const response = await fetch(`${apiUrl}/trpc/wilfred.sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              json: {
                sessionId: 'assistant-ui-session',
                content: userContent,
              },
            }),
            signal: abortSignal,
          });

          if (!response.ok) {
            throw new Error(`Wilfred API error: ${response.status}`);
          }

          const data = await response.json();
          const assistantText =
            data?.result?.data?.json?.assistantMessage?.content ??
            "I'm here to help with your estate planning. What would you like to know?";

          return {
            content: [{ type: 'text' as const, text: assistantText }],
          };
        } catch {
          return {
            content: [
              {
                type: 'text' as const,
                text: "I'm having trouble connecting right now. Please try again in a moment.",
              },
            ],
          };
        }
      },
    }),
    []
  );
}

interface AssistantProviderProps {
  children: ReactNode;
}

export function AssistantProvider({ children }: AssistantProviderProps) {
  const { isAuthenticated } = useAuth();
  const adapter = useWilfredAdapter();

  const runtime = useLocalRuntime(adapter, {
    initialMessages: [],
  });

  // Only provide the runtime when authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
