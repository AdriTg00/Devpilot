import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen items-center justify-center bg-slate-950 p-8">
            <div className="max-w-md text-center">
              <div className="mb-6 text-5xl">⚠️</div>
              <h1 className="mb-2 text-xl font-bold text-white">Something went wrong</h1>
              <p className="mb-6 text-sm text-slate-400">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <pre className="mb-6 max-h-32 overflow-auto rounded-lg bg-slate-900 p-4 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
