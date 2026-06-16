import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupAPI, reportAPI, settlementAPI, expenseAPI } from '../api';
import { formatCurrency } from '../utils/helpers';
import { PageLoader, EmptyState, Spinner } from '../components/common';
import Layout from '../components/common/Layout';
import SettlementDetailsModal from '../components/common/SettlementDetailsModal';

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

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

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
        const saved  = localStorage.getItem('activeGroupId');
        const group  = saved ? data.groups.find((g) => g._id === saved) || data.groups[0] : data.groups[0];
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
        title: `${e.paidBy?.name || 'Someone'} added ${e.title}`,
        amount: e.amount,
        date: e.date,
        subtitle: `₹${e.amount} • ${formatRelativeDate(e.date)}`,
      }));
      const settlementActs = (settlementsRes.data.settlements || [])
        .filter((s) => s.status === 'settled')
        .map((s) => ({
          id: `settlement-${s._id}`,
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

  const handleGroupChange = (group) => {
    setActiveGroup(group);
    localStorage.setItem('activeGroupId', group._id);
    fetchSummary(group._id);
    loadActivityData(group._id);
  };

  if (loading) return <PageLoader />;

  const isGroupAdmin      = activeGroup && ((activeGroup.createdBy?._id?.toString?.() || activeGroup.createdBy?.toString?.()) === user?._id?.toString());
  const activeGroupRole   = isGroupAdmin ? 'Admin' : 'Member';
  const bal               = summary?.myBalance ?? 0;
  const balPositive       = bal >= 0;
  const balZero           = bal === 0;
  const balanceSummaryLabel = settlementStats.pendingCount === 0 ? 'All Settled Up ✅' : `${settlementStats.pendingCount} Pending`;

  return (
    <Layout>
      <div className="space-y-4 pb-4">

        {/* Header */}
        <div className="rounded-2xl border border-white/10 bg-white/80 dark:bg-surface/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-theme-muted">Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-theme-primary">
                {getGreeting()}, {user?.name?.split(' ')[0]} 👋
              </h1>
            </div>
            <div className="flex gap-2">
              <Link to="/groups/create" className="btn-primary flex-1 sm:flex-none text-center">+ Create</Link>
              <Link to="/groups/join"   className="btn-secondary flex-1 sm:flex-none text-center">Join</Link>
            </div>
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
                  <Link to="/groups/join"   className="btn-secondary text-sm">Join Group</Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* Balance + Active Group */}
            <div className="grid gap-4 md:grid-cols-2">

              {/* Balance Card */}
              <div className="rounded-2xl border border-white/10 bg-white/80 dark:bg-surface/90 p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-widest text-theme-muted">Current Balance</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-theme-primary">
                  {balPositive && !balZero ? '+' : ''}{formatCurrency(bal)}
                </p>
                <p className="mt-1 text-sm text-theme-muted">
                  {balZero ? 'All settled up 🎊' : balPositive ? 'Others owe you 🎉' : 'You owe others'}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-surface p-3 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-theme-muted">Pending</p>
                    <p className="mt-1 text-xl font-semibold text-theme-primary">{settlementStats.pendingCount}</p>
                  </div>
                  <div className="rounded-xl bg-surface p-3 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-theme-muted">Last Activity</p>
                    <p className="mt-1 text-sm font-semibold text-theme-primary truncate">{settlementStats.lastActivity || 'Today'}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link to="/settlements" className="btn-primary flex-1 text-center">Settle Up</Link>
                  <button onClick={() => setDetailsOpen(true)} className="btn-secondary flex-1">Details</button>
                </div>
              </div>

              {/* Active Group Card */}
              <div className="rounded-2xl border border-white/10 bg-white/80 dark:bg-surface/90 p-4 shadow-sm flex flex-col">
                <p className="text-[11px] uppercase tracking-widest text-theme-muted">Active Group</p>
                <p className="mt-2 text-xl font-semibold text-theme-primary truncate">{activeGroup.name}</p>
                <p className="mt-1 text-sm text-theme-muted">
                  {activeGroup.members?.length || 0} members • {activeGroupRole}
                </p>
                <p className="mt-1 text-sm text-theme-muted truncate">
                  Code: <span className="font-mono text-theme-secondary">{activeGroup.code}</span>
                </p>
                <Link
                  to={`/groups/${activeGroup._id}`}
                  className="mt-auto pt-4 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-sm font-semibold text-theme-primary transition hover:bg-white/90"
                >
                  View Group →
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-white/10 bg-white/80 dark:bg-surface/90 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-theme-primary">Recent Activity</p>
                <Link to="/expenses" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>View All</Link>
              </div>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8"><Spinner /></div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-theme-muted py-4">No recent activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-surface p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-theme-primary leading-tight truncate">{item.title}</p>
                        <p className="mt-0.5 text-xs text-theme-muted">{item.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-theme-primary">₹{item.amount}</span>
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
