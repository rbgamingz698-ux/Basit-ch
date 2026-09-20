import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#131722] text-white">
          <div className="text-center p-6 bg-[#1e222d] rounded-xl border border-[#2a2e39]">
            <h2 className="text-lg font-bold mb-2">Something went wrong.</h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2962FF] rounded-lg text-sm font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
