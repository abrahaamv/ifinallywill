/**
 * useSession Hook Tests
 * Tests Auth.js session fetching, loading states, and error handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Session, useSession } from '../useSession';

// Mock logger
vi.mock('@platform/shared', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Session Fetch', () => {
    it('fetches and returns valid session', async () => {
      const mockSession: Session = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          tenantId: 'tenant-1',
          role: 'admin',
        },
        expires: '2025-12-31T23:59:59.999Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const { result } = renderHook(() => useSession());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for session to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/session', {
        credentials: 'include',
      });
    });

    it('includes credentials in fetch request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com' },
          expires: '2025-12-31',
        }),
      });

      renderHook(() => useSession());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/session', {
          credentials: 'include',
        });
      });
    });
  });

  describe('No Session (Unauthenticated)', () => {
    it('handles empty session object from Auth.js', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Auth.js returns {} when no session
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('handles non-OK response (no session)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull(); // Non-OK doesn't set error, just no session
    });

    it('handles session without user field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expires: '2025-12-31' }), // Missing user
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBe('Network error');
    });

    it('handles fetch exceptions', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch');
    });

    it('handles non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch session');
    });
  });

  describe('Component Lifecycle', () => {
    it('fetches session on mount', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com' },
          expires: '2025-12-31',
        }),
      });

      renderHook(() => useSession());

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('prevents state updates after unmount', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                user: { id: '1', email: 'test@example.com' },
                expires: '2025-12-31',
              }),
            });
          }, 100);
        });
      });

      const { result, unmount } = renderHook(() => useSession());

      expect(result.current.loading).toBe(true);

      // Unmount before fetch completes
      unmount();

      // Wait for fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should not cause any errors (cleanup prevents state update)
    });

    it('only fetches session once on mount', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com' },
          expires: '2025-12-31',
        }),
      });

      const { rerender } = renderHook(() => useSession());

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Re-render should not trigger new fetch
      rerender();
      rerender();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Data Variations', () => {
    it('handles session with all user fields', async () => {
      const fullSession: Session = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          tenantId: 'tenant-1',
          role: 'owner',
        },
        expires: '2025-12-31T23:59:59.999Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => fullSession,
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(fullSession);
    });

    it('handles session with minimal user fields', async () => {
      const minimalSession: Session = {
        user: {
          id: '123',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => minimalSession,
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(minimalSession);
    });
  });
});
