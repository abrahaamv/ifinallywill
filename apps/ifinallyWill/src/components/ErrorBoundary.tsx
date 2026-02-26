/**
 * Error boundary for catching React render errors
 * Supports retry, section-level boundaries, and custom fallbacks.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Friendly label for what this boundary wraps (e.g., "Will Wizard") */
  section?: string;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[IFW:ErrorBoundary]', this.props.section ?? 'unknown', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isMinor = !!this.props.section;

      // Section-level error (non-fatal)
      if (isMinor) {
        return (
          <div className="border border-[var(--ifw-error)]/20 bg-red-50 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-red-800 mb-1">
              Something went wrong in {this.props.section}
            </p>
            <p className="text-xs text-red-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              className="px-4 py-1.5 text-xs font-medium bg-white border border-red-200 text-red-700 rounded-md hover:bg-red-50"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
          </div>
        );
      }

      // Page-level error (full screen)
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--ifw-text-muted)] mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium bg-[var(--ifw-primary-700)] text-white rounded-md"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-[var(--ifw-neutral-100)]"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
