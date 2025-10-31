/**
 * CSRF Protection for Widget SDK (Phase 9)
 * Handles CSRF tokens for embeddable widget API calls
 */

import { CSRFService } from '@platform/auth/client';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('WidgetCSRF');

/**
 * Singleton CSRF token manager for widget
 */
class WidgetCSRFManager {
  private token: string | null = null;
  private tokenExpiry = 0;
  private refreshing: Promise<void> | null = null;

  /**
   * Get current CSRF token, refreshing if expired
   */
  async getToken(): Promise<string> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.token && this.tokenExpiry > Date.now() + 5 * 60 * 1000) {
      return this.token;
    }

    // Wait for ongoing refresh if any
    if (this.refreshing) {
      await this.refreshing;
      return this.token!;
    }

    // Refresh token
    this.refreshing = this.refreshToken();
    await this.refreshing;
    this.refreshing = null;

    return this.token!;
  }

  private async refreshToken(): Promise<void> {
    try {
      const { token, expiresAt } = await CSRFService.getToken();
      this.token = token;
      this.tokenExpiry = expiresAt;
    } catch (error) {
      logger.error('Widget: Failed to fetch CSRF token', { error });
      throw new Error('CSRF token fetch failed');
    }
  }

  /**
   * Clear stored token (for logout)
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = 0;
  }
}

// Singleton instance
const csrfManager = new WidgetCSRFManager();

/**
 * Send authenticated API request with CSRF protection
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response from server
 */
export async function widgetFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Get CSRF token
  const csrfToken = await csrfManager.getToken();

  // Make request with CSRF token
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...options.headers,
    },
    credentials: 'include',
  });
}

/**
 * Send widget message with CSRF protection
 * @param message - Message text
 * @param tenantId - Tenant ID
 * @param apiKey - API key
 * @returns API response
 */
export async function sendWidgetMessage(
  message: string,
  tenantId: string,
  apiKey: string
): Promise<{ reply: string; conversationId: string }> {
  const response = await widgetFetch('/api/widget/message', {
    method: 'POST',
    body: JSON.stringify({ message, tenantId, apiKey }),
  });

  if (!response.ok) {
    throw new Error(`Widget message failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Clear CSRF token on logout
 */
export function widgetLogout(): void {
  csrfManager.clearToken();
}
