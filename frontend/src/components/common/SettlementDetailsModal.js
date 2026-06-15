import React, { useState, useEffect, useMemo } from 'react';
import { settlementAPI } from '../../api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { Spinner, Avatar } from './index';

/* ── Helpers ──────────────────────────────────────────────── */
const c = {
  bg:       '#0f1117',
  surface:  '#141720',
  surface2: '#1a1d27',
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.05)',
  text:     '#e8eaf0',
  muted:    '#4a4d5e',
  accent:   '#6574f3',
  accentBg: 'rgba(101,116,243,0.12)',
  green:    '#10b981',
  greenBg:  'rgba(16,185,129,0.12)',
  red:      '#ef4444',
  redBg:    'rgba(239,68,68,0.12)',
  amber:    '#f59e0b',
  amberBg:  'rgba(245,158,11,0.12)',
};

const Badge = ({ status }) => {
  const map = {
    pending:  { label: 'Pending',  bg: c.amberBg, color: c.amber  },
    settled:  { label: 'Settled',  bg: c.greenBg, color: c.green  },
  };
  const s = map[status] || map.pending;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: s.color }} />
      {s.label}
    </span>
  );
};

const StatPill = ({ label, value, color }) => (
  <div className="flex flex-col gap-1 px-4 py-3 rounded-2xl flex-1"
    style={{ background: c.surface2, border: `1px solid ${c.border}` }}>
    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: c.muted }}>{label}</p>
    <p className="text-lg font-bold tracking-tight" style={{ color: color || c.text }}>{value}</p>
  </div>
);

const FILTERS = ['All', 'Pending', 'Settled', 'This Month'];

/* ── CSV export ───────────────────────────────────────────── */
const exportCSV = (rows, userId) => {
  const headers = ['From', 'To', 'Amount (₹)', 'Status', 'Date'];
  const lines = rows.map((s) => [
    s.from?._id === userId ? 'You' : s.from?.name,
    s.to?._id   === userId ? 'You' : s.to?.name,
    s.amount,
    s.status,
    s.settledAt ? new Date(s.settledAt).toLocaleString('en-IN') : '—',
  ]);
  const csv = [headers, ...lines].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'settlements.csv';
  a.click();
  URL.revokeObjectURL(url);
};

/* ── Main component ───────────────────────────────────────── */
const SettlementDetailsModal = ({ isOpen, onClose, groupId, currentUserId, onSettleAction }) => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [filter, setFilter]           = useState('All');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    if (!isOpen || !groupId) return;
    setLoading(true);
    settlementAPI.getByGroup(groupId)
      .then(({ data }) => setSettlements(data.settlements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, groupId]);

  /* ── Derived stats ── */
  const pending  = useMemo(() => settlements.filter((s) => s.status === 'pending'),  [settlements]);
  const settled  = useMemo(() => settlements.filter((s) => s.status === 'settled'),  [settlements]);
  const totalPendingAmt  = useMemo(() => pending.reduce((a, s) => a + s.amount, 0),  [pending]);
  const totalSettledAmt  = useMemo(() => settled.reduce((a, s) => a + s.amount, 0),  [settled]);

  /* ── Filtered rows ── */
  const now = new Date();
  const filtered = useMemo(() => {
    let rows = settlements;
    if (filter === 'Pending')    rows = rows.filter((s) => s.status === 'pending');
    if (filter === 'Settled')    rows = rows.filter((s) => s.status === 'settled');
    if (filter === 'This Month') rows = rows.filter((s) => {
      const d = new Date(s.settledAt || s.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((s) =>
        s.from?.name?.toLowerCase().includes(q) ||
        s.to?.name?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [settlements, filter, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: c.surface, border: `1px solid ${c.border}` }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: c.text }}>Settlement Details</h2>
            <p className="text-xs mt-0.5" style={{ color: c.muted }}>Full payment history &amp; pending dues</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(filtered, currentUserId)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={{ background: c.accentBg, color: c.accent, border: `1px solid rgba(101,116,243,0.2)` }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(101,116,243,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = c.accentBg}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: c.muted }}
              onMouseEnter={e => e.currentTarget.style.color = c.text}
              onMouseLeave={e => e.currentTarget.style.color = c.muted}
            >✕</button>
          </div>
        </div>

        {/* ── Summary stats ── */}
        <div className="px-6 py-4 flex gap-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}>
          <StatPill label="Total Settled"    value={formatCurrency(totalSettledAmt)} color={c.green} />
          <StatPill label="Total Pending"    value={formatCurrency(totalPendingAmt)} color={c.amber} />
          <StatPill label="Completed"        value={settled.length}  color={c.green} />
          <StatPill label="Pending"          value={pending.length}  color={c.amber} />
        </div>

        {/* ── Search + Filters ── */}
        <div className="px-6 py-3 flex flex-col sm:flex-row gap-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${c.border}` }}>
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.muted }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, outline: 'none' }}
            />
          </div>
          {/* Filter pills */}
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                style={filter === f ? {
                  background: c.accentBg, color: c.accent, border: `1px solid rgba(101,116,243,0.3)`
                } : {
                  background: 'rgba(255,255,255,0.03)', color: c.muted, border: `1px solid ${c.border2}`
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.border}` }}>🔍</div>
              <p className="font-semibold" style={{ color: c.text }}>No results</p>
              <p className="text-sm mt-1" style={{ color: c.muted }}>Try changing filters or search term</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s, i) => {
                const isDebtor   = s.from?._id === currentUserId;
                const isCreditor = s.to?._id   === currentUserId;
                const accentColor = isDebtor ? c.red : isCreditor ? c.green : c.muted;
                const accentBg    = isDebtor ? c.redBg : isCreditor ? c.greenBg : 'rgba(255,255,255,0.03)';

                return (
                  <div key={s._id}
                    className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                    style={{ background: c.surface2, border: `1px solid ${c.border2}` }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = c.border}
                    onMouseLeave={e => e.currentTarget.style.borderColor = c.border2}
                  >
                    {/* Index */}
                    <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: c.muted }}>
                      {i + 1}
                    </span>

                    {/* Avatars */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Avatar name={s.from?.name} size="sm" />
                      <svg className="w-4 h-4" style={{ color: c.muted }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      <Avatar name={s.to?.name} size="sm" />
                    </div>

                    {/* Names */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: c.text }}>
                        <span style={{ color: isDebtor ? c.red : c.text }}>
                          {s.from?._id === currentUserId ? 'You' : s.from?.name}
                        </span>
                        <span className="mx-1.5" style={{ color: c.muted }}>→</span>
                        <span style={{ color: isCreditor ? c.green : c.text }}>
                          {s.to?._id === currentUserId ? 'You' : s.to?.name}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: c.muted }}>
                        {s.status === 'settled' && s.settledAt
                          ? `Settled on ${new Date(s.settledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                          : `Created ${formatDate(s.createdAt)}`}
                        {s.note && <span className="ml-2 italic">· {s.note}</span>}
                      </p>
                    </div>

                    {/* Amount */}
                    <p className="text-base font-bold flex-shrink-0" style={{ color: accentColor }}>
                      {formatCurrency(s.amount)}
                    </p>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <Badge status={s.status} />
                    </div>

                    {/* Action */}
                    {s.status === 'pending' && onSettleAction && (
                      <button
                        onClick={() => onSettleAction(s._id)}
                        className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                        style={{ background: c.greenBg, color: c.green, border: `1px solid rgba(16,185,129,0.2)` }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = c.greenBg}
                      >
                        Settle Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: `1px solid ${c.border}` }}>
          <p className="text-xs" style={{ color: c.muted }}>
            Showing {filtered.length} of {settlements.length} transactions
          </p>
          <button onClick={onClose}
            className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: c.text, border: `1px solid ${c.border}` }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementDetailsModal;
