import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches rendering errors anywhere below it so one broken component can't
// blank the entire site. Never shows the actual error/stack to the user —
// just logs it and offers a way back to a known-good page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-6">
          <p className="text-4xl">⚠️</p>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-black/50 text-sm max-w-sm">
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          <a href="/" className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm">
            Back to Dashboard
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
