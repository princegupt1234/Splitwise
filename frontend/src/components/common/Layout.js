import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from './index';

const NAV = [
  {
    path: '/dashboard', label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    path: '/expenses', label: 'Expenses',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    path: '/settlements', label: 'Settle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M8 7h12M8 12h8M8 17h4"/><circle cx="4" cy="7" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="17" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    path: '/reports', label: 'Reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/>
      </svg>
    ),
  },
  {
    path: '/profile', label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
];

const Layout = ({ children }) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const isActive = (p) => location.pathname.startsWith(p);

  const bg         = 'var(--bg-base)';
  const surface    = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
  const border     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const navBg      = isDark ? 'rgba(9,11,16,0.85)'    : 'rgba(242,243,247,0.9)';
  const activeText = '#6574f3';
  const mutedText  = isDark ? '#4a4d5e' : '#9197a3';
  const labelText  = isDark ? '#e8eaf0'  : '#111318';

  return (
    <div className="min-h-screen flex" style={{ background: bg, color: 'var(--text-base)' }}>

      {/* ── Left Sidebar (desktop) ── */}
      <aside className="hidden sm:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 py-6 px-3"
        style={{ background: surface, borderRight: `1px solid ${border}` }}>

        <Link to="/dashboard" className="flex items-center gap-3 px-3 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f56e8, #6574f3)', boxShadow: '0 4px 12px rgba(101,116,243,0.4)' }}>
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold tracking-tight" style={{ color: labelText }}>FlatSplit</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ path, label, icon }) => {
            const active = isActive(path);
            return (
              <Link key={path} to={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150"
                style={active ? {
                  background: 'rgba(101,116,243,0.15)',
                  color: activeText,
                  border: '1px solid rgba(101,116,243,0.2)',
                } : {
                  color: mutedText,
                  border: '1px solid transparent',
                }}>
                {icon}
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: activeText }} />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          <button onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all w-full text-left"
            style={{ color: mutedText, border: '1px solid transparent' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              {isDark
                ? <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>
                : <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              }
            </svg>
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', border: `1px solid ${border}` }}>
            <Avatar name={user?.name} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: labelText }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: mutedText }}>@{user?.username}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 sm:ml-56 min-h-screen pb-20 sm:pb-0">
        <main className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex"
        style={{ background: navBg, borderTop: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}>
        {NAV.map(({ path, label, icon }) => {
          const active = isActive(path);
          return (
            <Link key={path} to={path}
              className="flex-1 flex flex-col items-center pt-2.5 pb-3 gap-1 transition-colors"
              style={{ color: active ? activeText : mutedText }}>
              {icon}
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
