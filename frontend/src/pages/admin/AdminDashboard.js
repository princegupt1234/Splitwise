import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="rounded-2xl p-5 flex flex-col gap-3"
    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4a4d5e' }}>{label}</span>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
        style={{ background: `${color}18` }}>{icon}</span>
    </div>
    <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
    {sub && <p className="text-xs" style={{ color: '#4a4d5e' }}>{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#4a4d5e' }}>Platform overview at a glance</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full animate-spin border-2" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#ef4444' }} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon="👥" label="Total Users"    value={stats?.totalUsers ?? 0}     sub={`${stats?.newUsersToday ?? 0} joined today`} color="#6574f3" />
              <StatCard icon="🏠" label="Total Groups"   value={stats?.totalGroups ?? 0}    sub="Active groups"                               color="#10b981" />
              <StatCard icon="💸" label="Total Expenses" value={stats?.totalExpenses ?? 0}  sub={fmt(stats?.totalAmount)}                     color="#f59e0b" />
              <StatCard icon="🚫" label="Banned Users"   value={stats?.bannedUsers ?? 0}    sub="Currently banned"                            color="#ef4444" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { to: '/admin/users',    icon: '👥', label: 'Manage Users',    desc: 'View, ban, delete users'       },
                { to: '/admin/groups',   icon: '🏠', label: 'Manage Groups',   desc: 'View and delete groups'        },
                { to: '/admin/expenses', icon: '💸', label: 'Manage Expenses', desc: 'View and remove any expense'   },
              ].map(({ to, icon, label, desc }) => (
                <Link key={to} to={to}
                  className="rounded-2xl p-5 flex items-center gap-4 transition-all"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4a4d5e' }}>{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
