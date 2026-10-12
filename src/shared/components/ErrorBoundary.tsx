import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          padding: '24px',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}>
          <AlertTriangle size={36} color="var(--color-bear)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 360 }}>
            {this.state.error?.message ?? 'An unexpected rendering error occurred.'}
          </p>
          <button
            className="btn btn-primary row gap-2 center"
            onClick={this.handleReload}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            <RefreshCw size={14} />
            <span>Reload Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
