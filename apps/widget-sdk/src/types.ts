/**
 * Platform Widget SDK Types
 * Phase 7 - Week 1
 */

export interface WidgetConfig {
  /**
   * API key for authentication (required for production)
   */
  apiKey?: string;

  /**
   * Tenant ID for multi-tenant isolation
   */
  tenantId?: string;

  /**
   * Widget position on screen
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  /**
   * Theme mode
   * @default 'auto'
   */
  theme?: 'light' | 'dark' | 'auto';

  /**
   * Primary color for branding (hex color)
   * @default '#6366f1'
   */
  primaryColor?: string;

  /**
   * Widget title displayed in header
   * @default 'AI Assistant'
   */
  title?: string;

  /**
   * Input placeholder text
   * @default 'Type your message...'
   */
  placeholder?: string;

  /**
   * Initial greeting message
   * @default 'Hello! How can I help you today?'
   */
  greeting?: string;

  /**
   * Shadow DOM mode
   * - 'open': Allows access to shadow root (debugging)
   * - 'closed': Complete encapsulation (production)
   * @default 'open'
   */
  shadowMode?: 'open' | 'closed';

  /**
   * Backend API URL for chat
   * @default 'https://api.platform.com'
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Custom CSS class for container
   */
  className?: string;

  /**
   * Maximum message history to keep in memory
   * @default 50
   */
  maxMessages?: number;

  /**
   * Enable offline support
   * @default false
   */
  offline?: boolean;

  /**
   * Analytics tracking enabled
   * @default false
   */
  analytics?: boolean;

  /**
   * GDPR/Privacy mode (no tracking, no persistent storage)
   * @default false
   */
  privacyMode?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    costUsd?: number;
    latencyMs?: number;
  };
}

export interface WidgetAPI {
  /**
   * Update widget configuration
   */
  updateConfig(config: Partial<WidgetConfig>): void;

  /**
   * Open the widget programmatically
   */
  open(): void;

  /**
   * Close the widget programmatically
   */
  close(): void;

  /**
   * Check if widget is open
   */
  isOpen(): boolean;

  /**
   * Send a message programmatically
   */
  sendMessage(content: string): Promise<void>;

  /**
   * Get message history
   */
  getMessages(): Message[];

  /**
   * Clear message history
   */
  clearMessages(): void;

  /**
   * Destroy widget and clean up
   */
  destroy(): void;

  /**
   * Get Shadow DOM reference (for debugging)
   */
  getShadowRoot(): ShadowRoot;
}
