/**
 * Contact form submission utility
 *
 * Uses the REST /api/contact endpoint (not tRPC) with CSRF protection
 * and proper credentials handling.
 */

import { CSRFService } from '@platform/auth/client';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ContactFormPayload {
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  message: string;
}

export async function submitContactForm(payload: ContactFormPayload): Promise<void> {
  let csrfToken: string | undefined;
  try {
    const { token } = await CSRFService.getToken();
    csrfToken = token;
  } catch {
    // CSRF token fetch may fail in some environments; proceed anyway
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Contact form submission failed: ${res.status}`);
  }
}
