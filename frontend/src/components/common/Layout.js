import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from './index';
import NotificationBell from './NotificationBell';

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

const HamburgerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
    <path d="M3 6h18M3 12h18M3 18h18"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const Layout = ({ children }) => {
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const isActive = (p) => location.pathname.startsWith(p);

  const bg         = 'var(--bg-base)';
  const surface    = 'var(--bg-surface)';
  const border     = 'var(--surface-border)';
  const navBg      = 'var(--nav-bg)';
  const activeText = 'var(--accent)';
  const mutedText  = 'var(--text-muted)';
  const labelText  = 'var(--text-base)';

  const SidebarContent = ({ compact }) => (
    <>
      {/* Logo */}
      <Link to="/dashboard" className={`flex items-center gap-3 mb-8 ${compact ? 'justify-center' : 'px-2'}`}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)', boxShadow: '0 4px 12px rgba(101,116,243,0.4)' }}>
          <span className="text-white font-bold text-sm">F</span>
        </div>
        {!compact && (
          <span className="font-bold text-base tracking-tight" style={{ color: labelText }}>FlatSplit</span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ path, label, icon }) => {
          const active = isActive(path);
          return (
            <Link key={path} to={path}
              className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${compact ? 'justify-center px-2' : 'px-3'}`}
              title={compact ? label : undefined}
              style={active ? {
                background: 'rgba(101,116,243,0.12)',
                color: '#6574f3',
              } : {
                color: mutedText,
              }}>
              <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
              {!compact && <span>{label}</span>}
              {!compact && active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6574f3' }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={`mt-auto flex flex-col gap-2 ${compact ? 'items-center' : ''}`}>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all ${compact ? 'justify-center px-2 w-10' : 'px-3 w-full'}`}
          title={compact ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
          style={{ color: mutedText }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] flex-shrink-0 opacity-70">
            {isDark
              ? <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>
              : <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            }
          </svg>
          {!compact && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* User profile card */}
        {!compact && (
          <Link to="/profile"
            className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
            style={{ background: 'var(--surface-overlay)', border: `1px solid ${border}` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(101,116,243,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = border}>
            <Avatar name={user?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate" style={{ color: labelText }}>{user?.name}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: mutedText }}>@{user?.username}</p>
              {user?.email && <p className="text-[10px] truncate mt-0.5" style={{ color: mutedText }}>{user.email}</p>}
            </div>
          </Link>
        )}
        {compact && <Avatar name={user?.name} size="sm" />}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: bg, color: 'var(--text-base)' }}>

      {/* ── Desktop Sidebar (lg+) ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 py-6 px-3"
        style={{ background: surface, borderRight: `1px solid ${border}` }}>
        <SidebarContent compact={false} />
      </aside>

      {/* ── Tablet Icon Sidebar (md–lg) ── */}
      <aside className="hidden md:flex lg:hidden flex-col fixed left-0 top-0 bottom-0 w-16 z-40 py-6 px-2 items-center"
        style={{ background: surface, borderRight: `1px solid ${border}` }}>
        <SidebarContent compact={true} />
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-64 z-50 py-6 px-3 flex flex-col md:hidden transition-transform duration-300"
        style={{
          background: surface,
          borderRight: `1px solid ${border}`,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface-overlay)', color: mutedText }}
        >
          <CloseIcon />
        </button>
        <SidebarContent compact={false} />
      </aside>

      {/* ── Mobile Top Bar ── */}
        <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14"
          style={{ background: navBg, borderBottom: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-overlay)', color: mutedText }}
        >
          <HamburgerIcon />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f56e8, #6574f3)' }}>
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: labelText }}>FlatSplit</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Avatar name={user?.name} size="sm" />
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 min-h-screen md:ml-16 lg:ml-56">
        {/* spacer for mobile top bar */}
        <div className="h-14 md:hidden" />
        <main className="px-4 md:px-6 lg:px-8 py-5 max-w-6xl mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex"
        style={{ background: navBg, borderTop: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}>
        {NAV.map(({ path, label, icon }) => {
          const active = isActive(path);
          return (
            <Link key={path} to={path}
              className="flex-1 flex flex-col items-center pt-2.5 pb-3 gap-1 transition-colors min-h-[56px]"
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
