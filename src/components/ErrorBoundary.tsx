import React from 'react';

interface State { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    try { console.error('[Atlas ErrorBoundary]', error, info); } catch {}
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || 'Unexpected error');
      return (
        <div className="card p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h3>
          <p className="text-sm text-slate-700">{msg}</p>
          <p className="text-xs text-slate-500 mt-2">Open DevTools console for details.</p>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;

