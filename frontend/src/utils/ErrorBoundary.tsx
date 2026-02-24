import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * DIETER AND ED AI - Global Error Boundary
 * Catches all React render errors, logs them, and provides recovery UI.
 * Self-learning: tracks error frequency to detect systemic issues.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorLog: { error: Error; timestamp: number }[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for self-learning analysis
    this.errorLog.push({ error, timestamp: Date.now() });
    this.setState({ errorInfo });

    // Report to backend error tracker
    this.reportError(error, errorInfo);

    // Call optional onError handler
    this.props.onError?.(error, errorInfo);

    console.error('[DIETER AND ED AI] Error Boundary caught:', error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          retryCount: this.state.retryCount,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (reportError) {
      console.warn('[ErrorBoundary] Failed to report error:', reportError);
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    if (retryCount < 3) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    } else {
      // Too many retries - reload page
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">&#9888;</div>
            <h2>Something went wrong</h2>
            <p className="error-boundary-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {this.state.retryCount < 3 ? (
              <button className="btn-primary" onClick={this.handleRetry}>
                Try Again ({3 - this.state.retryCount} attempts left)
              </button>
            ) : (
              <button className="btn-primary" onClick={this.handleReload}>
                Reload Application
              </button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Dev Mode)</summary>
                <pre>{this.state.error?.stack}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
