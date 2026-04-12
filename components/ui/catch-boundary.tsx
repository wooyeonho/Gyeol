"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { spring } from "@/lib/design/tokens";

interface CatchBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Receives error + reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Called when an error is caught — for logging/telemetry */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface CatchBoundaryState {
  error: Error | null;
}

/**
 * Generic React error boundary that wraps any component tree.
 *
 * Unlike Next.js route-level `error.tsx`, this can be placed around
 * individual widgets (e.g. wrap the 3D scene without crashing the whole page).
 *
 * @example
 * <CatchBoundary fallback={(err, reset) => <p>{err.message} <button onClick={reset}>Retry</button></p>}>
 *   <RiskyComponent />
 * </CatchBoundary>
 */
export class CatchBoundary extends Component<CatchBoundaryProps, CatchBoundaryState> {
  constructor(props: CatchBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): CatchBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return <DefaultFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.apple}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center"
      role="alert"
    >
      <span className="text-3xl">{"⚠️"}</span>
      <p className="text-sm font-medium text-white/80">Something went wrong</p>
      <p className="text-xs text-white/40 max-w-xs break-words">{error.message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-1 rounded-xl bg-white/10 px-5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 transition-colors"
      >
        Try again
      </button>
    </motion.div>
  );
}
