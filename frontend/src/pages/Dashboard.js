import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupAPI, reportAPI, settlementAPI, expenseAPI } from '../api';
import { formatCurrency } from '../utils/helpers';
import { PageLoader, StatCard, EmptyState, Spinner } from '../components/common';
import Layout from '../components/common/Layout';
import SettlementDetailsModal from '../components/common/SettlementDetailsModal';

const QUICK_ACTIONS = [
  { to: '/expenses/add', icon: '＋', label: 'Add Expense', sub: 'Record and split a new expense' },
  { to: '/expenses',     icon: '🧾', label: 'Expense History', sub: 'View all expense records' },
  { to: '/settlements',  icon: '💸', label: 'Settle Up', sub: 'Clear outstanding balances' },
  { to: '/reports',      icon: '📊', label: 'Reports', sub: 'View analytics and summaries' },
];

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3a3d50' }}>{children}</p>
);

const MiniCard = ({ icon, label, value, note, accent }) => (
  <div className="rounded-[18px] border border-white/10 bg-white/5 p-4 shadow-sm min-h-[110px]">
    <div className="flex items-start justify-between gap-3">
      <div className="text-2xl">{icon}</div>
      {accent && <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{note}</span>}
    </div>
    <p className="mt-4 text-xs uppercase tracking-[0.24em] text-theme-muted">{label}</p>
    <p className="mt-2 text-2xl font-bold text-theme-primary tracking-tight">{value}</p>
    {note && !accent && <p className="mt-2 text-xs text-theme-muted">{note}</p>}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups]                 = useState([]);
  const [activeGroup, setActiveGroup]       = useState(null);
  const [summary, setSummary]               = useState(null);
  const [activities, setActivities]         = useState([]);
  const [settlementStats, setSettlementStats] = useState({ pendingAmount: 0, settledAmount: 0, pendingCount: 0, settledCount: 0, lastActivity: '' });
  const [loading, setLoading]               = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [syncing, setSyncing]               = useState(false);
  const [detailsOpen, setDetailsOpen]       = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const formatRelativeDate = (date) => {
    if (!date) return 'Today';
    const d = new Date(date);
    const diffDays = Math.floor((new Date().setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
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
    setSummaryLoading(true);
    try {
      const { data } = await reportAPI.getSummary(groupId);
      setSummary(data.summary);
    } catch (err) { console.error(err); }
    finally { setSummaryLoading(false); }
  };

  const loadActivityData = async (groupId) => {
    if (!groupId) return;
    setActivityLoading(true);
    try {
      const [expensesRes, settlementsRes] = await Promise.all([
        expenseAPI.getByGroup(groupId, { month: currentMonth, year: currentYear }),
        settlementAPI.getByGroup(groupId),
      ]);
      const expenseActivities = (expensesRes.data.expenses || []).map((expense) => ({
        id: `expense-${expense._id}`,
        type: 'expense',
        title: `${expense.paidBy?.name || 'Someone'} added ${expense.title}`,
        amount: expense.amount,
        date: expense.date,
        subtitle: `₹${expense.amount} • ${formatRelativeDate(expense.date)}`,
      }));
      const settlementActivities = (settlementsRes.data.settlements || [])
        .filter((settlement) => settlement.status === 'settled')
        .map((settlement) => ({
          id: `settlement-${settlement._id}`,
          type: 'settlement',
          title: `Settlement completed with ${settlement.to?.name || settlement.to?.username || 'a member'}`,
          amount: settlement.amount,
          date: settlement.settledAt || settlement.createdAt,
          subtitle: `₹${settlement.amount} • ${formatRelativeDate(settlement.settledAt || settlement.createdAt)}`,
        }));
      const activitiesList = [...expenseActivities, ...settlementActivities]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);
      setActivities(activitiesList);

      const pending = settlementsRes.data.settlements.filter((s) => s.status !== 'settled');
      const settled = settlementsRes.data.settlements.filter((s) => s.status === 'settled');
      setSettlementStats({
        pendingAmount: pending.reduce((sum, s) => sum + (s.remainingAmount ?? s.amount), 0),
        settledAmount: settled.reduce((sum, s) => sum + s.amount, 0),
        pendingCount: pending.length,
        settledCount: settled.length,
        lastActivity: activitiesList[0]?.subtitle || 'Today',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSync = async () => {
    if (!activeGroup || syncing) return;
    setSyncing(true);
    try {
      await settlementAPI.generate(activeGroup._id);
      await fetchSummary(activeGroup._id);
    } catch (err) { console.error(err); }
    finally { setSyncing(false); }
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

  const handleGroupChange = (group) => {
    setActiveGroup(group);
    localStorage.setItem('activeGroupId', group._id);
    fetchSummary(group._id);
    loadActivityData(group._id);
  };

  const isGroupAdmin = activeGroup && ((activeGroup.createdBy?._id?.toString?.() || activeGroup.createdBy?.toString?.()) === user?._id?.toString());
  const activeGroupRole = isGroupAdmin ? 'Admin' : 'Member';
  const activeGroupCreated = activeGroup?.createdAt
    ? new Date(activeGroup.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';
  const statusMessage = settlementStats.pendingCount === 0
    ? 'All Settlements Cleared'
    : `${settlementStats.pendingCount} Pending`;

  const activeGroupCountLabel = `${groups.length} Active Group${groups.length === 1 ? '' : 's'}`;
  const balanceSummaryLabel = settlementStats.pendingCount === 0
    ? 'All Settled Up ✅'
    : `${settlementStats.pendingCount} Pending`;
  const recentActivities = activities.slice(0, 5);
  const settlementProgress = settlementStats.pendingCount === 0 ? 100 : 32;

  const greeting = getGreeting();

  if (loading) return <PageLoader />;

  const bal         = summary?.myBalance ?? 0;
  const balPositive = bal >= 0;
  const balZero     = bal === 0;

  return (
    <Layout>
      <div className="space-y-6">

        <div className="rounded-[28px] border border-white/10 bg-white/80 dark:bg-surface/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.26em] text-theme-muted mb-2">Dashboard</p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-theme-primary">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="mt-3 max-w-2xl text-sm text-theme-muted">Manage expenses, track balances, and stay on top of settlements.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-start xl:justify-end">
              <Link to="/groups/create" className="btn-primary">+ Create Group</Link>
              <Link to="/groups/join" className="btn-secondary">Join Group</Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-theme-muted">
              {activeGroupCountLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-theme-muted">
              {balanceSummaryLabel}
            </span>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon="🏘️"
              title="No flat groups yet"
              description="Create a group or join one with a code to start tracking expenses with your flatmates."
              action={
                <div className="flex gap-3 flex-wrap justify-center">
                  <Link to="/groups/create" className="btn-primary text-sm">Create Group</Link>
                  <Link to="/groups/join" className="btn-secondary text-sm">Join Group</Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.5fr_minmax(0,0.9fr)]">
              <div className="rounded-[28px] border border-white/10 bg-white/80 dark:bg-surface/90 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-theme-muted mb-2">Current Balance</p>
                    <p className="text-4xl font-semibold tracking-tight text-theme-primary">{balPositive && !balZero ? '+' : ''}{formatCurrency(bal)}</p>
                    <p className="mt-3 text-sm text-theme-muted">{balZero ? 'All settled up 🎊' : balPositive ? 'Others owe you money 🎉' : 'You owe others'}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                      ✅ {balanceSummaryLabel}
                    </span>
                    <Link to="/settlements" className="btn-primary w-full sm:w-auto">Settle Up</Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] bg-surface p-4 border border-white/10">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-theme-muted">Pending Settlements</p>
                    <p className="mt-3 text-2xl font-semibold text-theme-primary">{settlementStats.pendingCount}</p>
                  </div>
                    <div className="rounded-[22px] bg-surface p-4 border border-white/10">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-theme-muted">Last Activity</p>
                    <p className="mt-3 text-2xl font-semibold text-theme-primary">{settlementStats.lastActivity || 'Today'}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setDetailsOpen(true)}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    View Details
                  </button>
                </div>
              </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/80 dark:bg-surface/90 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-theme-muted">Active Group</p>
                    <p className="mt-2 text-xl font-semibold text-theme-primary truncate">{activeGroup.name}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-theme-muted">
                  <p className="text-theme-muted">{activeGroup.members?.length || 0} members • {activeGroupRole}</p>
                  <p className="truncate"><span className="font-medium text-theme-primary">Invite Code:</span> <span className="font-mono text-sm text-theme-secondary">{activeGroup.code}</span></p>
                </div>

                {/* compact active group card: only essentials shown */}

                <Link to={`/groups/${activeGroup._id}`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm font-semibold text-theme-primary transition hover:bg-white/90"
                >
                  View Group →
                </Link>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_minmax(0,0.8fr)]">
              <div className="rounded-[28px] border border-white/10 bg-white/80 dark:bg-surface/90 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-theme-muted">Quick Actions</p>
                    <p className="mt-2 text-lg font-semibold text-theme-primary">Jump to the most important tasks</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {QUICK_ACTIONS.map((a) => (
                    <Link key={a.to} to={a.to}
                      className="rounded-[22px] border border-white/10 bg-surface p-4 text-center transition card-hover"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl" style={{ color: '#6574f3' }}>
                        {a.icon}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-theme-primary">{a.label}</p>
                      <p className="mt-2 text-xs text-theme-muted">{a.sub}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/80 dark:bg-surface/90 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-theme-muted">Monthly Overview</p>
                    <p className="mt-2 text-lg font-semibold text-theme-primary">This month at a glance</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  <div className="rounded-[22px] bg-surface p-4 border border-white/10">
                    <p className="text-xs text-theme-muted uppercase tracking-[0.24em]">Total Expenses</p>
                    <p className="mt-2 text-xl font-semibold text-theme-primary">{formatCurrency(summary.totalExpense)}</p>
                  </div>
                  <div className="rounded-[22px] bg-surface p-4 border border-white/10">
                    <p className="text-xs text-theme-muted uppercase tracking-[0.24em]">Total Paid</p>
                    <p className="mt-2 text-xl font-semibold text-theme-primary">{formatCurrency(summary.myPaid)}</p>
                  </div>
                  <div className="rounded-[22px] bg-surface p-4 border border-white/10">
                    <p className="text-xs text-theme-muted uppercase tracking-[0.24em]">Pending Amount</p>
                    <p className="mt-2 text-xl font-semibold text-theme-primary">{formatCurrency(settlementStats.pendingAmount)}</p>
                  </div>
                  <div className="rounded-[22px] bg-surface p-4 border border-white/10">
                    <p className="text-xs text-theme-muted uppercase tracking-[0.24em]">Settled Amount</p>
                    <p className="mt-2 text-xl font-semibold text-theme-primary">{formatCurrency(settlementStats.settledAmount)}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="h-2 rounded-full bg-surface border border-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${settlementProgress}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-theme-primary">
                    {settlementStats.pendingCount === 0 ? '100% Settled' : 'Pending Settlements'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/80 dark:bg-surface/90 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-theme-muted">Recent Activity</p>
                  <p className="mt-2 text-lg font-semibold text-theme-primary">Latest updates</p>
                </div>
                <Link to="/expenses" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>View All Activity</Link>
              </div>
              {activityLoading ? (
                <div className="flex items-center justify-center py-10"><Spinner /></div>
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-theme-muted">No recent activity available yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-white/10 bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-theme-primary leading-tight">{item.title}</p>
                          <p className="mt-2 text-xs text-theme-muted">{item.subtitle}</p>
                        </div>
                        <span className="text-sm font-semibold text-theme-primary">₹{item.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
