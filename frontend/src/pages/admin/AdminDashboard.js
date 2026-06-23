import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const relTime = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const StatCard = ({ icon, label, value, sub, color, badge }) => (
  <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4a4d5e' }}>{label}</span>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: `${color}18` }}>{icon}</span>
    </div>
    <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
    <div className="flex items-center justify-between">
      {sub && <p className="text-xs" style={{ color: '#4a4d5e' }}>{sub}</p>}
      {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{badge}</span>}
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#4a4d5e' }}>{children}</h2>
);

const MiniBar = ({ value, max, color }) => (
  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', width: '60px' }}>
    <div className="h-full rounded-full" style={{ width: `${max ? Math.round((value / max) * 100) : 0}%`, background: color }} />
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const load = useCallback(async (isSync = false) => {
    if (isSync) setSyncing(true); else setLoading(true);
    try {
      const { data } = await adminAPI.getDetailedStats();
      setStats(data.stats);
      setLastSync(new Date());
    } catch { /* silent */ }
    finally { setSyncing(false); setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const settleRate = stats
    ? Math.round(((stats.settledSettlements || 0) / Math.max((stats.totalSettlements || 1), 1)) * 100)
    : 0;

  const userGrowthPct = stats?.newUsersLastMonth
    ? Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)
    : null;

  const expenseGrowthPct = stats?.expensesLastMonth
    ? Math.round(((stats.expensesThisMonth - stats.expensesLastMonth) / stats.expensesLastMonth) * 100)
    : null;

  const maxGrowth = stats?.userGrowth ? Math.max(...stats.userGrowth.map(g => g.count), 1) : 1;

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4a4d5e' }}>
              {lastSync ? `Last synced ${relTime(lastSync)}` : 'Platform overview'}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          >
            <span className={syncing ? 'animate-spin inline-block' : ''}>🔄</span>
            {syncing ? 'Syncing…' : 'Sync Data'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full animate-spin border-2" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#ef4444' }} />
          </div>
        ) : (
          <>
            {/* ── Main Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon="👥" label="Total Users"      value={stats?.totalUsers ?? 0}       color="#6574f3" sub={`+${stats?.newUsersToday ?? 0} today`}          badge={userGrowthPct != null ? `${userGrowthPct >= 0 ? '+' : ''}${userGrowthPct}% MoM` : null} />
              <StatCard icon="🏠" label="Total Groups"     value={stats?.totalGroups ?? 0}      color="#10b981" sub="Active groups"                                  />
              <StatCard icon="💸" label="Total Expenses"   value={stats?.totalExpenses ?? 0}    color="#f59e0b" sub={fmt(stats?.totalAmount)}                        badge={expenseGrowthPct != null ? `${expenseGrowthPct >= 0 ? '+' : ''}${expenseGrowthPct}% MoM` : null} />
              <StatCard icon="🚫" label="Banned Users"     value={stats?.bannedUsers ?? 0}      color="#ef4444" sub="Currently banned"                               />
            </div>

            {/* ── Secondary Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon="📅" label="This Month Users"     value={stats?.newUsersThisMonth ?? 0}     color="#6574f3" sub={`${stats?.newUsersLastMonth ?? 0} last month`} />
              <StatCard icon="🧾" label="This Month Expenses"  value={stats?.expensesThisMonth ?? 0}     color="#f59e0b" sub={fmt(stats?.monthlyAmount)}                     />
              <StatCard icon="⏳" label="Pending Settlements"  value={stats?.pendingSettlements ?? 0}    color="#f59e0b" sub={`${settleRate}% settled overall`}               />
              <StatCard icon="✅" label="Settled Payments"     value={stats?.settledSettlements ?? 0}    color="#10b981" sub="All time"                                        />
            </div>

            {/* ── Settlement Progress ── */}
            <div className="rounded-2xl p-5" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Settlement Health</SectionTitle>
                <span className="text-sm font-bold" style={{ color: '#10b981' }}>{settleRate}% Settled</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${settleRate}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs" style={{ color: '#4a4d5e' }}>Pending: {stats?.pendingSettlements ?? 0}</span>
                <span className="text-xs" style={{ color: '#4a4d5e' }}>Settled: {stats?.settledSettlements ?? 0}</span>
              </div>
            </div>

            {/* ── Recent Activity + User Growth ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Recent Users */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <SectionTitle>Recent Users</SectionTitle>
                  <Link to="/admin/users" className="text-xs font-semibold" style={{ color: '#ef4444' }}>View All →</Link>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {(stats?.recentUsers || []).length === 0 ? (
                    <p className="px-5 py-6 text-sm text-center" style={{ color: '#4a4d5e' }}>No users yet</p>
                  ) : (stats?.recentUsers || []).map((u) => (
                    <div key={u._id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6574f3,#4f56e8)' }}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{u.name}</p>
                        <p className="text-xs truncate" style={{ color: '#4a4d5e' }}>@{u.username} · {u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {u.isBanned && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Banned</span>}
                        <span className="text-[10px]" style={{ color: '#3a3d50' }}>{relTime(u.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <SectionTitle>Recent Expenses</SectionTitle>
                  <Link to="/admin/expenses" className="text-xs font-semibold" style={{ color: '#ef4444' }}>View All →</Link>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {(stats?.recentExpenses || []).length === 0 ? (
                    <p className="px-5 py-6 text-sm text-center" style={{ color: '#4a4d5e' }}>No expenses yet</p>
                  ) : (stats?.recentExpenses || []).map((e) => (
                    <div key={e._id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>🧾</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{e.title}</p>
                        <p className="text-xs truncate" style={{ color: '#4a4d5e' }}>
                          {e.paidBy?.name} · {e.groupId?.name}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{fmt(e.amount)}</p>
                        <p className="text-[10px]" style={{ color: '#3a3d50' }}>{relTime(e.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── User Growth + Top Groups ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* User Growth (last 6 months) */}
              <div className="rounded-2xl p-5" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
                <SectionTitle>User Growth (Last 6 Months)</SectionTitle>
                <div className="flex items-end gap-2 h-24">
                  {(stats?.userGrowth || []).map((g, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold" style={{ color: '#6574f3' }}>{g.count}</span>
                      <div className="w-full rounded-t-md transition-all" style={{
                        height: `${maxGrowth ? Math.max((g.count / maxGrowth) * 72, g.count > 0 ? 4 : 0) : 0}px`,
                        background: i === (stats?.userGrowth?.length - 1) ? '#6574f3' : 'rgba(101,116,243,0.3)',
                      }} />
                      <span className="text-[9px]" style={{ color: '#3a3d50' }}>{g.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Groups */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <SectionTitle>Top Groups by Members</SectionTitle>
                  <Link to="/admin/groups" className="text-xs font-semibold" style={{ color: '#ef4444' }}>View All →</Link>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {(stats?.topGroups || []).length === 0 ? (
                    <p className="px-5 py-6 text-sm text-center" style={{ color: '#4a4d5e' }}>No groups yet</p>
                  ) : (stats?.topGroups || []).map((g, i) => {
                    const maxMembers = Math.max(...(stats?.topGroups || []).map(x => x.members?.length || 0), 1);
                    return (
                      <div key={g._id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color: '#3a3d50' }}>#{i + 1}</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                          {g.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{g.name}</p>
                          <p className="text-xs" style={{ color: '#4a4d5e' }}>by {g.createdBy?.name} · code: {g.code}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-white">{g.members?.length || 0}</span>
                          <MiniBar value={g.members?.length || 0} max={maxMembers} color="#10b981" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div>
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { to: '/admin/users',    icon: '👥', label: 'Manage Users',    desc: 'View, ban, delete users',       color: '#6574f3' },
                  { to: '/admin/groups',   icon: '🏠', label: 'Manage Groups',   desc: 'View and delete groups',        color: '#10b981' },
                  { to: '/admin/expenses', icon: '💸', label: 'Manage Expenses', desc: 'View and remove any expense',   color: '#f59e0b' },
                ].map(({ to, icon, label, desc, color }) => (
                  <Link key={to} to={to}
                    className="rounded-2xl p-5 flex items-center gap-4 transition-all"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = `${color}50`}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${color}15` }}>{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#4a4d5e' }}>{desc}</p>
                    </div>
                    <span className="ml-auto text-lg" style={{ color: '#3a3d50' }}>›</span>
                  </Link>
                ))}
              </div>
            </div>

          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
