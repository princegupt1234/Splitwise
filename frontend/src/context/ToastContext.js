import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const cfg = {
    success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  color: '#10b981', icon: '✓' },
    error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444', icon: '✕' },
    info:    { bg: 'rgba(101,116,243,0.12)', border: 'rgba(101,116,243,0.3)', color: '#8196f8', icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none" style={{ minWidth: '280px', maxWidth: '90vw' }}>
        {toasts.map(({ id, message, type }) => {
          const { bg, border, color, icon } = cfg[type] || cfg.info;
          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg pointer-events-auto"
              style={{ background: 'var(--panel-bg)', border: `1px solid ${border}`, color: 'var(--text-base)', backdropFilter: 'blur(12px)', animation: 'fadeSlideUp 0.25s ease' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: bg, color }}>{icon}</span>
              <span>{message}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
};
