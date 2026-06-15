import React from 'react';
import { getInitials, getAvatarColor } from '../../utils/helpers';

export const Avatar = ({ name, size = 'md', className = '' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };
  return (
    <div className={`${sizes[size]} ${getAvatarColor(name)} rounded-full flex items-center justify-center text-theme-primary font-bold flex-shrink-0 ring-2 ring-white/10 ${className}`}>
      {getInitials(name)}
    </div>
  );
};

export const Spinner = ({ size = 'md', className = '' }) => {
  const s = { sm: 'w-4 h-4 border-[1.5px]', md: 'w-5 h-5 border-2', lg: 'w-8 h-8 border-2' };
  return (
    <div className={`${s[size]} rounded-full animate-spin ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: 'var(--accent)' }} />
  );
};

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)', boxShadow: '0 8px 24px rgba(101,116,243,0.4)' }}>
          <span className="text-theme-primary font-bold text-lg">F</span>
      </div>
      <Spinner />
    </div>
  </div>
);

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
      style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)' }}>
      {icon || '○'}
    </div>
      <p className="font-semibold text-gray-900 dark:text-theme-primary text-base mb-2">{title}</p>
    {description && <p className="text-sm leading-relaxed mb-6 max-w-xs text-gray-600 dark:text-gray-300">{description}</p>}
    {action}
  </div>
);

export const Badge = ({ label, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${className}`}>{label}</span>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--surface-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors bg-white/10 dark:bg-white/10 text-gray-600 dark:text-gray-300"
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
          >✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const Alert = ({ type = 'error', message, onClose }) => {
  if (!message) return null;
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   color: '#f87171' },
    success: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  color: '#34d399' },
    info:    { bg: 'rgba(101,116,243,0.08)', border: 'rgba(101,116,243,0.2)', color: '#8196f8' },
  };
  const { bg, border, color } = cfg[type];
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium"
      style={{ background: bg, border: `1px solid ${border}`, color }}>
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="flex-shrink-0 opacity-50 hover:opacity-100 text-xs">✕</button>}
    </div>
  );
};

export const StatCard = ({ label, value, icon, colorClass }) => (
  <div className="card p-4 flex flex-col gap-2">
    <span className="text-xl leading-none">{icon}</span>
      <p className="text-lg font-bold tracking-tight text-gray-900 dark:text-theme-primary">{value}</p>
    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</p>
  </div>
);
