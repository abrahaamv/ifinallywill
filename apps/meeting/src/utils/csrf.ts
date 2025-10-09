/**
 * CSRF Utilities for Meeting App (Phase 9)
 * Helper functions for LiveKit API calls with CSRF protection
 */

import { CSRFService } from '@platform/auth/client';

/**
 * Create LiveKit meeting with CSRF protection
 * @param roomName - Meeting room name
 * @param participantName - Participant display name
 * @returns LiveKit token and URL
 */
export async function createMeetingWithCSRF(
  roomName: string,
  participantName: string
): Promise<{ token: string; livekitUrl: string }> {
  const { token: csrfToken } = await CSRFService.getToken();

  const response = await fetch('/api/livekit/join-room', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ roomName, participantName }),
  });

  if (!response.ok) {
    throw new Error('Failed to create meeting');
  }

  return response.json();
}

/**
 * Send meeting message with CSRF protection
 * @param roomId - Meeting room ID
 * @param message - Message text
 * @returns Response from server
 */
export async function sendMessageWithCSRF(roomId: string, message: string): Promise<Response> {
  const { token: csrfToken } = await CSRFService.getToken();

  return fetch('/api/meetings/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ roomId, message }),
  });
}
