import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

const NAV = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/users',     icon: '👥', label: 'Users'     },
  { to: '/admin/groups',    icon: '🏠', label: 'Groups'    },
  { to: '/admin/expenses',  icon: '💸', label: 'Expenses'  },
];

const Sidebar = ({ onClose }) => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <aside className="flex flex-col h-full" style={{ background: '#0f1117', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>S</div>
        <div>
          <p className="text-sm font-bold text-white leading-none">SuperAdmin</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#4a4d5e' }}>FlatSplit Control</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={({ isActive }) => isActive
              ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
              : { color: '#6b7280' }}>
            <span>{icon}</span>{label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            {admin?.name?.[0] || 'S'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{admin?.name}</p>
            <p className="text-[10px]" style={{ color: '#4a4d5e' }}>@{admin?.username}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#ef4444' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
};

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin } = useAdmin();

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0b0f', color: '#e5e7eb' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-56 flex-shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar onClose={() => {}} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-56 flex flex-col">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ background: '#0f1117', borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-white text-xl">☰</button>
          <p className="text-sm font-bold text-white">SuperAdmin</p>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>{admin?.name?.[0] || 'S'}</div>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
