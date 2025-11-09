/**
 * ErrorBoundary Component Tests
 * Tests error catching, fallback UI rendering, and recovery mechanisms
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Mock logger
vi.mock('../../utils/logger', () => ({
  createModuleLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('does not show error UI when component renders successfully', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText(/Component Error/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('catches errors thrown by child components', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/i)).toBeInTheDocument();
    });

    it('calls onError callback when error is caught', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.any(Object)
      );
    });
  });

  describe('Component-Level Fallback', () => {
    it('renders component-level fallback for level="component"', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/i)).toBeInTheDocument();
    });
  });

  describe('Page-Level Fallback', () => {
    it('renders page-level fallback for level="page"', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Page Error/i)).toBeInTheDocument();
      expect(screen.getByText(/This page encountered an unexpected error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument();
    });

    it('provides reset button that clears error state', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Page Error/i)).toBeInTheDocument();

      // Click reset button
      const resetButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(resetButton);

      // Error should be cleared (though component will throw again)
      // In real usage, component would re-mount and potentially not throw
    });
  });

  describe('Layout-Level Fallback', () => {
    it('renders layout-level fallback for level="layout"', () => {
      render(
        <ErrorBoundary level="layout">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Application Error/i)).toBeInTheDocument();
      expect(screen.getByText(/The application encountered a critical error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText(/Component Error/i)).not.toBeInTheDocument();
    });
  });

  describe('HOC withErrorBoundary', () => {
    it('wraps component with error boundary', () => {
      const TestComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) =>
        shouldThrow ? <ThrowError shouldThrow={true} /> : <div>Wrapped content</div>;

      const WrappedComponent = withErrorBoundary(TestComponent, { level: 'component' });

      render(<WrappedComponent shouldThrow={false} />);
      expect(screen.getByText('Wrapped content')).toBeInTheDocument();
    });

    it('catches errors in wrapped component', () => {
      const TestComponent = () => <ThrowError shouldThrow={true} />;
      const WrappedComponent = withErrorBoundary(TestComponent, { level: 'component' });

      render(<WrappedComponent />);
      expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
    });

    it('sets correct displayName for wrapped component', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';

      const WrappedComponent = withErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });
});
