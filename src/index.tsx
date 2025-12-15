import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import App from './App';
import './index.css'; 

const isDev = (import.meta as any).env?.DEV || 
              window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1';

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#031811] text-white font-sans">
       <div className="bg-[#0a2e1f] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/20 text-red-400">
                <AlertTriangle size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-red-100">應用程式發生錯誤</h2>
                <p className="text-xs text-red-300/70">System Error</p>
             </div>
          </div>
          <div className="bg-black/20 p-3 rounded border border-white/5 mb-4 max-h-40 overflow-y-auto">
             <p className="text-red-300 text-sm font-mono break-words leading-relaxed">
               {error.message || (isDev ? '未知錯誤' : '系統異常，請重新整理。')}
             </p>
          </div>
          <button 
            onClick={resetErrorBoundary}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/20"
          >
            <RefreshCw size={16} /> 重新載入
          </button>
       </div>
    </div>
  );
};

const logError = (error: Error, info: { componentStack: string }) => {
  console.error("Error caught:", error);
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()} onError={logError}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);