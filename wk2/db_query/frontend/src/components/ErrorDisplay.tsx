/**
 * ErrorDisplay Component
 *
 * Displays error messages in a user-friendly format using Ant Design Alert component.
 */

import React from 'react';
import { Alert } from 'antd';
import { getErrorMessage } from '@/services/api';

interface ErrorDisplayProps {
  error: unknown;
  title?: string;
  className?: string;
  showIcon?: boolean;
  closable?: boolean;
  onClose?: () => void;
}

export function ErrorDisplay({
  error,
  title = 'Error',
  className,
  showIcon = true,
  closable = false,
  onClose,
}: ErrorDisplayProps) {
  const message = getErrorMessage(error);

  return (
    <Alert
      type="error"
      message={title}
      description={message}
      showIcon={showIcon}
      closable={closable}
      onClose={onClose}
      className={className}
      style={{ marginBottom: '16px' }}
    />
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ErrorBoundary Component
 *
 * Catches React errors and displays them gracefully.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '24px' }}>
          <ErrorDisplay
            error={this.state.error}
            title="Something went wrong"
            closable
            onClose={() => this.setState({ hasError: false, error: null })}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
