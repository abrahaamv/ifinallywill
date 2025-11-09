/**
 * ProtectedRoute Component Tests
 * Tests authentication guards, redirects, and loading states
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock useSession hook
const mockUseSession = vi.fn();
vi.mock('../../hooks/useSession', () => ({
  useSession: () => mockUseSession(),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  describe('Authenticated State', () => {
    it('renders children when user is authenticated', () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '1', email: 'test@example.com' } },
        loading: false,
        error: null,
      });

      render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('does not show loading state when session is loaded', () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '1', email: 'test@example.com' } },
        loading: false,
        error: null,
      });

      render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state while fetching session', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
        error: null,
      });

      render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('renders custom loading component when provided', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
        error: null,
      });

      const customLoading = <div>Custom loading state</div>;

      render(
        <ProtectedRoute loadingComponent={customLoading}>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Custom loading state')).toBeInTheDocument();
      expect(screen.queryByText(/^Loading\.\.\.$/i)).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated State', () => {
    it('redirects to login when no session exists', async () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
        error: null,
      });

      render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/login');
      });
    });

    it('redirects to custom URL when provided', async () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
        error: null,
      });

      render(
        <ProtectedRoute redirectTo="/custom-login">
          <div>Protected content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/custom-login');
      });
    });

    it('renders null while redirecting', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
        error: null,
      });

      const { container } = render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      // Should render nothing while redirect is happening
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error State', () => {
    it('shows error message when session fetch fails', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
        error: 'Network error',
      });

      render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText(/Failed to load session: Network error/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('provides retry button on error', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
        error: 'Network error',
      });

      // Mock window.location.reload
      const reloadSpy = vi.fn();
      Object.defineProperty(window.location, 'reload', {
        value: reloadSpy,
        configurable: true,
      });

      render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Session State Changes', () => {
    it('handles transition from loading to authenticated', async () => {
      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      // Initially loading
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
        error: null,
      });
      rerender(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );
      expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

      // Then authenticated
      mockUseSession.mockReturnValue({
        session: { user: { id: '1', email: 'test@example.com' } },
        loading: false,
        error: null,
      });
      rerender(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected content')).toBeInTheDocument();
      });
    });

    it('handles transition from loading to unauthenticated', async () => {
      const { rerender } = render(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      // Initially loading
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
        error: null,
      });
      rerender(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      // Then no session
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
        error: null,
      });
      rerender(
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('/login');
      });
    });
  });
});
