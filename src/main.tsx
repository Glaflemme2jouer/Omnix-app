import React from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
    registerSW({immediate: true});
  }
} catch {
  // Service worker registration is non-blocking
}

class AppErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean; message: string}
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, message: ''};
  }

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, message: error?.message || 'Erreur inattendue'};
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-6">
          <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center space-y-3">
            <h1 className="text-sm font-semibold text-red-700">
              Impossible d’afficher Omnix
            </h1>
            <p className="text-xs text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
