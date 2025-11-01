/**
 * Message Input Component (Phase 6 - Real-time Chat)
 *
 * Text input with typing indicator and send functionality.
 */

import { Button } from '@platform/ui';
import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

export interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
  maxLength = 5000,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping && onTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && onTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 3000);
  }, [isTyping, onTyping]);

  // Handle input change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;

      // Enforce max length
      if (newContent.length <= maxLength) {
        setContent(newContent);
        handleTyping();
      }
    },
    [maxLength, handleTyping]
  );

  // Handle send
  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    // Send message
    onSendMessage(trimmed);

    // Clear input
    setContent('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping && onTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    // Focus textarea
    textareaRef.current?.focus();
  }, [content, disabled, onSendMessage, onTyping, isTyping]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  const handleTextareaResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  // Resize on content change
  const handleContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      handleChange(e);
      handleTextareaResize();
    },
    [handleChange, handleTextareaResize]
  );

  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const showCharCount = remainingChars < 100;

  return (
    <div className="border-t border bg-card p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full resize-none rounded-lg border border px-4 py-2 pr-16 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:cursor-not-allowed"
            style={{
              minHeight: '44px',
              maxHeight: '200px',
            }}
            rows={1}
          />
          {showCharCount && (
            <div
              className={`absolute bottom-2 right-2 text-xs ${
                isOverLimit ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {remainingChars}
            </div>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={disabled || !content.trim() || isOverLimit}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </Button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
