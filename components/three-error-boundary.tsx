"use client";

import React, { Component } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary that catches WebGL/Three.js crashes and renders
 * a graceful fallback instead of a blank screen.
 */
export class ThreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn("[ThreeErrorBoundary] 3D render failed:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center text-white/40 text-sm">
            3D rendering unavailable
          </div>
        )
      );
    }
    return this.props.children;
  }
}
