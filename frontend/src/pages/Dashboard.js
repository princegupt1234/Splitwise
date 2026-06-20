import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupAPI, reportAPI, settlementAPI, expenseAPI } from '../api';
import { formatCurrency } from '../utils/helpers';
import { PageLoader, EmptyState, Spinner } from '../components/common';
import Layout from '../components/common/Layout';
import SettlementDetailsModal from '../components/common/SettlementDetailsModal';

/* ── tiny UI primitives ─────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, iconBg }) => (
  <div className="dash-card flex flex-col gap-3 p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: iconBg || 'rgba(101,116,243,0.1)' }}>{icon}</span>
    </div>
    <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-base)' }}>{value}</p>
    {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </div>
);

const ActivityIcon = ({ type }) => {
  if (type === 'settlement') return <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>✓</span>;
  return <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'rgba(101,116,243,0.1)', color: '#6574f3' }}>🧾</span>;
};

/* ── main component ─────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups]                   = useState([]);
  const [activeGroup, setActiveGroup]         = useState(null);
  const [summary, setSummary]                 = useState(null);
  const [activities, setActivities]           = useState([]);
  const [settlementStats, setSettlementStats] = useState({ pendingAmount: 0, settledAmount: 0, pendingCount: 0, settledCount: 0, lastActivity: '' });
  const [loading, setLoading]                 = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [detailsOpen, setDetailsOpen]         = useState(false);
  const [syncing, setSyncing]                 = useState(false);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const formatRelativeDate = (date) => {
    if (!date) return 'Today';
    const d = new Date(date);
    const diff = Math.floor((new Date().setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await groupAPI.getAll();
      setGroups(data.groups);
      if (data.groups.length > 0) {
        const saved = localStorage.getItem('activeGroupId');
        const group = saved ? data.groups.find((g) => g._id === saved) || data.groups[0] : data.groups[0];
        setActiveGroup(group);
        await fetchSummary(group._id);
        loadActivityData(group._id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSummary = async (groupId) => {
    try {
      const { data } = await reportAPI.getSummary(groupId);
      setSummary(data.summary);
    } catch (err) { console.error(err); }
  };

  const loadActivityData = async (groupId) => {
    if (!groupId) return;
    setActivityLoading(true);
    try {
      const [expensesRes, settlementsRes] = await Promise.all([
        expenseAPI.getByGroup(groupId, { month: currentMonth, year: currentYear }),
        settlementAPI.getByGroup(groupId),
      ]);
      const expenseActs = (expensesRes.data.expenses || []).map((e) => ({
        id: `expense-${e._id}`,
        type: 'expense',
        title: `${e.paidBy?.name || 'Someone'} added ${e.title}`,
        amount: e.amount,
        date: e.date,
        subtitle: `₹${e.amount} • ${formatRelativeDate(e.date)}`,
      }));
      const settlementActs = (settlementsRes.data.settlements || [])
        .filter((s) => s.status === 'settled')
        .map((s) => ({
          id: `settlement-${s._id}`,
          type: 'settlement',
          title: `Settlement completed with ${s.to?.name || s.to?.username || 'a member'}`,
          amount: s.amount,
          date: s.settledAt || s.createdAt,
          subtitle: `₹${s.amount} • ${formatRelativeDate(s.settledAt || s.createdAt)}`,
        }));
      const list = [...expenseActs, ...settlementActs]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setActivities(list);

      const pending = settlementsRes.data.settlements.filter((s) => s.status !== 'settled');
      const settled = settlementsRes.data.settlements.filter((s) => s.status === 'settled');
      setSettlementStats({
        pendingAmount: pending.reduce((sum, s) => sum + (s.remainingAmount ?? s.amount), 0),
        settledAmount: settled.reduce((sum, s) => sum + s.amount, 0),
        pendingCount:  pending.length,
        settledCount:  settled.length,
        lastActivity:  list[0]?.subtitle || 'Today',
      });
    } catch (err) { console.error(err); }
    finally { setActivityLoading(false); }
  };

  const handleSettleFromModal = async (settlementId) => {
    if (!window.confirm('Mark this payment as settled?')) return;
    try {
      await settlementAPI.settle(settlementId, {});
      await settlementAPI.generate(activeGroup._id);
      await fetchSummary(activeGroup._id);
      setDetailsOpen(false);
      setTimeout(() => setDetailsOpen(true), 100);
    } catch (err) { console.error(err); }
  };

  const handleSync = async () => {
    if (!activeGroup || syncing) return;
    setSyncing(true);
    try {
      await settlementAPI.generate(activeGroup._id);
      await Promise.all([fetchSummary(activeGroup._id), loadActivityData(activeGroup._id)]);
    } catch (err) { console.error(err); }
    finally { setSyncing(false); }
  };

  const handleGroupChange = (group) => {
    setActiveGroup(group);
    localStorage.setItem('activeGroupId', group._id);
    fetchSummary(group._id);
    loadActivityData(group._id);
  };

  if (loading) return <PageLoader />;

  const isGroupAdmin    = activeGroup && ((activeGroup.createdBy?._id?.toString?.() || activeGroup.createdBy?.toString?.()) === user?._id?.toString());
  const activeGroupRole = isGroupAdmin ? 'Admin' : 'Member';
  const bal             = summary?.myBalance ?? 0;
  const balZero         = bal === 0;
  const balPositive     = bal >= 0;
  const settledPct      = settlementStats.pendingCount === 0 ? 100 : 0;

  const totalExpenses    = summary?.totalExpense ?? 0;
  const monthlyExpenses  = summary?.monthlyExpense ?? summary?.totalExpense ?? 0;
  const myPaid           = summary?.myPaid ?? 0;
  const myShare          = summary?.myShare ?? 0;

  return (
    <Layout>
      {/* ── page wrapper ── */}
      <div className="dash-page">

        {/* ════════════════════════════════════════
            HEADER
        ════════════════════════════════════════ */}
        <div className="dash-header">
          <div className="min-w-0">
            <p className="dash-eyebrow">Dashboard</p>
            <h1 className="dash-title">
              {getGreeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="dash-subtitle">Here's what's happening with your expenses today.</p>
          </div>
          <div className="dash-header-actions">
            <button
              onClick={handleSync}
              disabled={syncing || !activeGroup}
              className="btn-secondary whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
              title="Recalculate balances & settlements">
              <span className={syncing ? 'animate-spin inline-block' : ''}>🔄</span>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
            <Link to="/groups/create" className="btn-primary whitespace-nowrap">+ Create Group</Link>
            <Link to="/groups/join"   className="btn-secondary whitespace-nowrap">Join Group</Link>
          </div>
        </div>

        {/* ════════════════════════════════════════
            EMPTY STATE
        ════════════════════════════════════════ */}
        {groups.length === 0 ? (
          <div className="dash-card p-8">
            <EmptyState
              icon="🏘️"
              title="No flat groups yet"
              description="Create a group or join one with a code to start tracking expenses with your flatmates."
              action={
                <div className="flex gap-3 flex-wrap justify-center mt-2">
                  <Link to="/groups/create" className="btn-primary text-sm">Create Group</Link>
                  <Link to="/groups/join"   className="btn-secondary text-sm">Join Group</Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════
                ROW 1 — BALANCE HERO CARD
            ════════════════════════════════════════ */}
            <div className="dash-balance-card">
              {/* left: balance info */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Your Balance</p>
                <p className="text-5xl font-bold tracking-tight">
                  {balPositive && !balZero ? '+' : ''}{formatCurrency(bal)}
                </p>
                <p className="text-sm font-medium opacity-80">
                  {balZero ? '✅ All settled up' : balPositive ? '🎉 Others owe you money' : '⚠️ You owe others'}
                </p>

                {/* mini stats */}
                <div className="flex gap-3 mt-3 flex-wrap">
                  <div className="dash-balance-mini">
                    <span className="text-[10px] uppercase tracking-widest opacity-60">⏳ Pending Settlements</span>
                    <span className="text-xl font-bold">{settlementStats.pendingCount}</span>
                  </div>
                  <div className="dash-balance-mini">
                    <span className="text-[10px] uppercase tracking-widest opacity-60">📅 Last Activity</span>
                    <span className="text-sm font-semibold truncate max-w-[130px]">{settlementStats.lastActivity || 'Today'}</span>
                  </div>
                </div>
              </div>

              {/* right: actions */}
              <div className="flex flex-row lg:flex-col gap-2 mt-5 lg:mt-0 flex-wrap">
                <Link to="/settlements"
                  className="inline-flex items-center justify-center gap-2 font-semibold text-sm py-2.5 px-5 rounded-2xl transition-all whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#4f56e8', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  Settle Up
                </Link>
                <button
                  onClick={() => setDetailsOpen(true)}
                  className="inline-flex items-center justify-center gap-2 font-semibold text-sm py-2.5 px-5 rounded-2xl transition-all whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  View Details
                </button>
              </div>
            </div>

            {/* ════════════════════════════════════════
                ROW 2 — STAT CARDS
            ════════════════════════════════════════ */}
            <div className="dash-stats-grid">
              <StatCard
                icon="💰"
                label="Total Expenses"
                value={formatCurrency(totalExpenses)}
                sub="All time total"
                iconBg="rgba(101,116,243,0.1)"
              />
              <StatCard
                icon="📅"
                label={currentMonthName}
                value={formatCurrency(monthlyExpenses)}
                sub="This month"
                iconBg="rgba(59,130,246,0.1)"
              />
              <StatCard
                icon="✅"
                label="You Paid"
                value={formatCurrency(myPaid)}
                sub="Total paid"
                iconBg="rgba(16,185,129,0.1)"
              />
              <StatCard
                icon="📋"
                label="Your Share"
                value={formatCurrency(myShare)}
                sub="Total share"
                iconBg="rgba(245,158,11,0.1)"
              />
            </div>

            {/* ════════════════════════════════════════
                ROW 3 — QUICK ACTIONS + ACTIVE GROUP
            ════════════════════════════════════════ */}
            <div className="dash-two-col">

              {/* Quick Actions */}
              <div className="dash-card p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Quick Actions</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--text-base)' }}>What would you like to do?</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { to: '/expenses/add', icon: '➕', label: 'Add Expense',      sub: 'Record new expense' },
                    { to: '/expenses',     icon: '🧾', label: 'Expense History',  sub: 'View all expenses' },
                    { to: '/settlements',  icon: '💸', label: 'Settle Up',        sub: 'Clear outstanding' },
                    { to: '/reports',      icon: '📊', label: 'Reports',          sub: 'View analytics' },
                  ].map(({ to, icon, label, sub }) => (
                    <Link key={to} to={to} className="dash-action-tile">
                      <span className="text-xl leading-none">{icon}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* All Groups */}
              <div className="dash-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>My Groups</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--text-base)' }}>{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Link to="/groups/create" className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(101,116,243,0.08)', color: '#6574f3' }}>+ New</Link>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '260px' }}>
                  {groups.map((g) => {
                    const isActive = g._id === activeGroup?._id;
                    const gIsAdmin = (g.createdBy?._id?.toString?.() || g.createdBy?.toString?.()) === user?._id?.toString();
                    return (
                      <button
                        key={g._id}
                        onClick={() => handleGroupChange(g)}
                        className="flex items-center gap-3 w-full text-left rounded-2xl px-3 py-2.5 transition-all"
                        style={isActive
                          ? { background: 'rgba(101,116,243,0.12)', border: '1.5px solid rgba(101,116,243,0.35)' }
                          : { background: 'var(--surface-overlay)', border: '1.5px solid transparent' }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: isActive ? 'rgba(101,116,243,0.18)' : 'rgba(101,116,243,0.07)' }}>🏠</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-base)' }}>{g.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {g.members?.length || 0} members • {gIsAdmin ? 'Admin' : 'Member'}
                          </p>
                        </div>
                        {isActive && <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(101,116,243,0.15)', color: '#6574f3' }}>Active</span>}
                      </button>
                    );
                  })}
                </div>

                <Link to={`/groups/${activeGroup._id}`} className="dash-view-btn mt-auto">
                  View Active Group →
                </Link>
              </div>
            </div>

            {/* ════════════════════════════════════════
                ROW 4 — RECENT ACTIVITY + MONTHLY OVERVIEW
            ════════════════════════════════════════ */}
            <div className="dash-two-col">

              {/* Recent Activity */}
              <div className="dash-card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Activity</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--text-base)' }}>Recent Activity</p>
                  </div>
                  <Link to="/expenses" className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(101,116,243,0.08)', color: '#6574f3' }}>
                    View All
                  </Link>
                </div>

                {activityLoading ? (
                  <div className="flex items-center justify-center py-8"><Spinner /></div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent activity yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activities.slice(0, 3).map((item, i) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <ActivityIcon type={item.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-base)' }}>{item.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.subtitle}</p>
                        </div>
                        <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-base)' }}>₹{item.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Monthly Overview */}
              <div className="dash-card p-5 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Overview</p>
                  <p className="text-base font-semibold" style={{ color: 'var(--text-base)' }}>This Month Overview</p>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Total Expenses',  value: formatCurrency(monthlyExpenses),               color: 'var(--text-base)' },
                    { label: 'Total Paid',       value: formatCurrency(myPaid),                        color: '#10b981' },
                    { label: 'Pending Amount',   value: formatCurrency(settlementStats.pendingAmount), color: '#f59e0b' },
                    { label: 'Settled Amount',   value: formatCurrency(settlementStats.settledAmount), color: '#6574f3' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="dash-info-row py-2.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-auto pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Settlement Progress</span>
                    <span className="text-xs font-bold" style={{ color: '#10b981' }}>{settledPct}% Settled</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${settledPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <SettlementDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        groupId={activeGroup?._id}
        currentUserId={user?._id}
        onSettleAction={handleSettleFromModal}
      />
    </Layout>
  );
};

export default Dashboard;
