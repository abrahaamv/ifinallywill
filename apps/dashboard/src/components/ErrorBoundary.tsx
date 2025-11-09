/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 * Production-ready error handling with logging and user-friendly messaging
 */

import { createModuleLogger } from '../utils/logger';
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent } from '@platform/ui';
import { AlertCircle, AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

const logger = createModuleLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'layout' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Production-ready Error Boundary
 * Catches errors in React component tree and provides fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to error reporting service
    logger.error('Error Boundary caught an error', { error, errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // In production, send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      logger.warn('Error details', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError && error) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI based on error level
      return this.renderDefaultFallback(error, errorInfo, level);
    }

    return children;
  }

  private renderDefaultFallback(
    error: Error,
    errorInfo: ErrorInfo | null,
    level: 'page' | 'layout' | 'component'
  ): ReactNode {
    const isDev = import.meta.env.DEV;

    // Component-level error (minimal disruption)
    if (level === 'component') {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Component Error</AlertTitle>
          <AlertDescription>
            <p className="mb-2">This component encountered an error and could not render.</p>
            {isDev && <p className="text-xs text-[var(--color-error-700)]">{error.message}</p>}
          </AlertDescription>
        </Alert>
      );
    }

    // Page-level error (affects current page)
    if (level === 'page') {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <Card className="max-w-2xl w-full border-[var(--color-error-200)]">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-[var(--color-error-100)] p-4">
                  <AlertTriangle className="h-12 w-12 text-[var(--color-error-600)]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-[var(--color-error-900)]">Page Error</h2>
                  <p className="text-muted-foreground max-w-md">
                    This page encountered an unexpected error and could not load properly.
                  </p>
                  {isDev && (
                    <div className="mt-4 p-4 bg-[var(--color-error-50)] rounded-md text-left">
                      <p className="text-sm font-mono text-[var(--color-error-900)]">
                        {error.message}
                      </p>
                      {errorInfo && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-[var(--color-error-700)]">
                            Error Details
                          </summary>
                          <pre className="mt-2 text-xs overflow-auto max-h-40 text-[var(--color-error-800)]">
                            {error.stack}
                          </pre>
                          <pre className="mt-2 text-xs overflow-auto max-h-40 text-[var(--color-error-800)]">
                            {errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={this.handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleGoHome}>
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Layout-level error (catastrophic, affects entire app)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)] p-6">
        <Card className="max-w-2xl w-full border-[var(--color-error-200)]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-[var(--color-error-100)] p-4">
                <AlertTriangle className="h-16 w-16 text-[var(--color-error-600)]" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[var(--color-error-900)]">
                  Application Error
                </h1>
                <p className="text-muted-foreground max-w-md">
                  The application encountered a critical error. Our team has been notified and is
                  working to resolve the issue.
                </p>
                {isDev && (
                  <div className="mt-4 p-4 bg-[var(--color-error-50)] rounded-md text-left">
                    <p className="text-sm font-mono text-[var(--color-error-900)] mb-2">
                      {error.message}
                    </p>
                    {errorInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-[var(--color-error-700)]">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-60 text-[var(--color-error-800)]">
                          {error.stack}
                        </pre>
                        <pre className="mt-2 text-xs overflow-auto max-h-60 text-[var(--color-error-800)]">
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={this.handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Application
                </Button>
                <Button onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-4">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
