/**
 * Wilfred chat message list — displays conversation history
 */

import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string | Date;
}

interface Props {
  messages: Message[];
  isLoading?: boolean;
}

export function WilfredMessages({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-4">
        <div>
          <div className="text-3xl mb-3">👋</div>
          <p className="text-sm font-medium text-[var(--ifw-primary-700)]">Hi, I&apos;m Wilfred!</p>
          <p className="text-xs text-[var(--ifw-text-muted)] mt-1">
            I can help you understand each section of your document. Ask me anything about estate
            planning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[var(--ifw-primary-700)] text-white'
                : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-neutral-800)]'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-[var(--ifw-neutral-100)] rounded-lg px-3 py-2 text-xs">
            <span className="inline-flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-[var(--ifw-neutral-400)] rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-[var(--ifw-neutral-400)] rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-[var(--ifw-neutral-400)] rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
