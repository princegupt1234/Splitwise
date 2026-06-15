import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupAPI, reportAPI, settlementAPI } from '../api';
import { formatCurrency } from '../utils/helpers';
import { PageLoader, StatCard, EmptyState, Spinner } from '../components/common';
import Layout from '../components/common/Layout';
import SettlementDetailsModal from '../components/common/SettlementDetailsModal';

const QUICK_ACTIONS = [
  { to: '/expenses/add',  icon: '＋', label: 'Add Expense',  sub: 'Record a new bill'   },
  { to: '/expenses',      icon: '☰',  label: 'History',      sub: 'View all expenses'   },
  { to: '/settlements',   icon: '↔',  label: 'Settle Up',    sub: 'Clear balances'      },
  { to: '/reports',       icon: '↗',  label: 'Reports',      sub: 'Monthly summary'     },
];

/* ── Tiny helpers ─────────────────────────────── */
const glass = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '20px',
  backdropFilter: 'blur(12px)',
};

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3a3d50' }}>{children}</p>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups]               = useState([]);
  const [activeGroup, setActiveGroup]     = useState(null);
  const [summary, setSummary]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [detailsOpen, setDetailsOpen]     = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await groupAPI.getAll();
      setGroups(data.groups);
      if (data.groups.length > 0) {
        const saved = localStorage.getItem('activeGroupId');
        const group = saved ? data.groups.find((g) => g._id === saved) || data.groups[0] : data.groups[0];
        setActiveGroup(group);
        fetchSummary(group._id);
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
  };

  if (loading) return <PageLoader />;

  const bal            = summary?.myBalance ?? 0;
  const balPositive    = bal >= 0;
  const balZero        = bal === 0;

  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Row 1 · Greeting + Actions ──────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#3a3d50' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Hey, {user?.name?.split(' ')[0]} 👋
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {activeGroup && (
              <button onClick={handleSync} disabled={syncing} className="btn-secondary text-xs px-3 py-2 gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}>
                  <path d="M3 12a9 9 0 009 9 9.75 9.75 0 006.74-2.74L21 16"/>
                  <path d="M21 12a9 9 0 00-9-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                  <path d="M8 8H3V3M21 16v5h-5"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
            )}
            <Link to="/groups/create" className="btn-primary text-xs px-3 py-2">+ Group</Link>
          </div>
        </div>

        {/* ── Empty state ──────────────────────────────── */}
        {groups.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🏘️"
              title="No flat groups yet"
              description="Create a group or join one with a code to start tracking expenses with your flatmates."
              action={
                <div className="flex gap-3">
                  <Link to="/groups/create" className="btn-primary text-sm">Create Group</Link>
                  <Link to="/groups/join"   className="btn-secondary text-sm">Join Group</Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* ── Row 2 · Group Overview (full width) ───── */}
            <div>
              {/* Group selector pills */}
              {groups.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                  {groups.map((g) => (
                    <button key={g._id} onClick={() => handleGroupChange(g)}
                      className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                      style={activeGroup?._id === g._id ? {
                        background: 'rgba(101,116,243,0.2)',
                        color: '#8196f8',
                        border: '1px solid rgba(101,116,243,0.35)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        color: '#5a5d70',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Group card */}
              {activeGroup && (
                <div className="card p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: 'rgba(101,116,243,0.12)', border: '1px solid rgba(101,116,243,0.2)' }}>
                      🏘️
                    </div>
                    <div>
                      <p className="font-bold text-white">{activeGroup.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs" style={{ color: '#4a4d5e' }}>
                          Code&nbsp;
                          <span className="font-mono font-bold" style={{ color: '#8196f8' }}>{activeGroup.code}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full" style={{ background: '#2a2d3e' }} />
                        <span className="text-xs" style={{ color: '#4a4d5e' }}>
                          {activeGroup.members?.length} members
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/groups/${activeGroup._id}`}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(101,116,243,0.1)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(101,116,243,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(101,116,243,0.1)'}
                  >
                    View →
                  </Link>
                </div>
              )}
            </div>

            {/* ── Rows 3 & 4 · Main Content ───────────── */}
            {summaryLoading ? (
              <div className="flex justify-center items-center py-24">
                <Spinner size="lg" />
              </div>
            ) : summary ? (
              <div className="space-y-4">

                {/* ── Row 3 · Balance + Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>

                  {/* Balance hero card */}
                  <div className="relative overflow-hidden rounded-[20px] p-5 sm:p-6 flex flex-col justify-between min-h-[180px] sm:min-h-[200px]"
                    style={{
                      background: balZero
                        ? 'linear-gradient(135deg, #0f4c35 0%, #065f46 50%, #047857 100%)'
                        : balPositive
                          ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)'
                          : 'linear-gradient(135deg, #4c0519 0%, #7f1d1d 50%, #991b1b 100%)',
                      boxShadow: balPositive
                        ? '0 0 40px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : '0 0 40px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}>
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

                    <div className="relative">
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Your Balance
                      </p>
                      <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">
                        {balPositive && !balZero ? '+' : ''}{formatCurrency(bal)}
                      </p>
                      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {balZero
                          ? 'All settled up 🎊'
                          : balPositive
                            ? 'Others owe you money 🎉'
                            : 'You owe others'}
                      </p>
                    </div>

                    <div className="relative flex items-center gap-2">
                      <Link to="/settlements"
                        className="relative self-start text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                      >
                        Settle Up →
                      </Link>
                      <button
                        onClick={() => setDetailsOpen(true)}
                        className="relative self-start text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                        style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.32)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Stats 2×2 grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Total Expenses"  value={formatCurrency(summary.totalExpense)}        icon="💰" />
                    <StatCard label="This Month"       value={formatCurrency(summary.currentMonthTotal)} icon="📅" />
                    <StatCard label="You Paid"         value={formatCurrency(summary.myPaid)}             icon="✅" />
                    <StatCard label="Your Share"       value={formatCurrency(summary.myShare)}            icon="📋" />
                  </div>
                </div>

                {/* ── Row 4 · Quick Actions ── */}
                <div>
                  <SectionLabel>Quick Actions</SectionLabel>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUICK_ACTIONS.map((a) => (
                      <Link key={a.to} to={a.to}
                        className="card p-4 flex flex-col gap-3 transition-all duration-200 group"
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        onMouseDown={e  => e.currentTarget.style.transform = 'scale(0.97)'}
                        onMouseUp={e    => e.currentTarget.style.transform = 'translateY(-2px)'}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold"
                          style={{ background: 'rgba(101,116,243,0.12)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.18)' }}>
                          {a.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{a.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#3a3d50' }}>{a.sub}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
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
