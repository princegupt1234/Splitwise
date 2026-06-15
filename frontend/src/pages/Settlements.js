import React, { useState, useEffect, useCallback } from 'react';
import { settlementAPI, groupAPI } from '../api';
import { Alert, Spinner, Avatar, EmptyState } from '../components/common';
import { formatCurrency, formatDate } from '../utils/helpers';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';
import SettlementDetailsModal from '../components/common/SettlementDetailsModal';
import PayModal from '../components/common/PayModal';

/* ── Style helpers ─────────────────────────────────────────── */
const STATUS_CFG = {
  pending:            { label: 'Pending',             bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  partially_settled:  { label: 'Partially Settled',   bg: 'rgba(101,116,243,0.12)', color: '#8196f8' },
  settled:            { label: 'Settled',             bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
};

const ProgressBar = ({ paid, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: '#4a4d5e' }}>
        <span>{formatCurrency(paid)} paid</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : 'linear-gradient(90deg,#4f56e8,#6574f3)' }} />
      </div>
    </div>
  );
};

/* ── Main component ────────────────────────────────────────── */
const Settlements = () => {
  const { user } = useAuth();
  const uid = user?._id?.toString();

  const [groups, setGroups]             = useState([]);
  const [activeGroup, setActiveGroup]   = useState(null);
  const [settlements, setSettlements]   = useState([]);
  const [pendingReqs, setPendingReqs]   = useState([]);   // requests waiting for ME to approve
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [tab, setTab]                   = useState('pending');
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [detailsOpen, setDetailsOpen]   = useState(false);
  const [payTarget, setPayTarget]       = useState(null); // settlement being paid
  const [rejectModal, setRejectModal]   = useState(null); // { requestId }
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await groupAPI.getAll();
      setGroups(data.groups);
      if (data.groups.length > 0) {
        const savedId = localStorage.getItem('activeGroupId');
        const group = savedId ? data.groups.find((g) => g._id === savedId) || data.groups[0] : data.groups[0];
        setActiveGroup(group);
        await Promise.all([fetchSettlements(group._id), fetchPendingReqs(group._id)]);
      } else {
        setLoading(false);
      }
    } catch { setLoading(false); }
  };

  const fetchSettlements = async (groupId) => {
    setLoading(true);
    try {
      const { data } = await settlementAPI.getByGroup(groupId);
      setSettlements(data.settlements);
    } catch { setError('Failed to load settlements'); }
    finally { setLoading(false); }
  };

  const fetchPendingReqs = async (groupId) => {
    try {
      const { data } = await settlementAPI.getPendingForMe(groupId);
      setPendingReqs(data.requests);
    } catch { /* silent */ }
  };

  const refresh = useCallback(async (groupId) => {
    await Promise.all([fetchSettlements(groupId), fetchPendingReqs(groupId)]);
  }, []);

  const handleGroupSwitch = (g) => {
    setActiveGroup(g);
    localStorage.setItem('activeGroupId', g._id);
    refresh(g._id);
  };

  const handleGenerate = async () => {
    if (!activeGroup) return;
    setGenerating(true); setError('');
    try {
      const { data } = await settlementAPI.generate(activeGroup._id);
      setSettlements(data.settlements);
      setSuccess('Settlements recalculated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate');
    } finally { setGenerating(false); }
  };

  // Legacy instant-settle (kept for backward compat)
  const handleInstantSettle = async (settlementId) => {
    if (!window.confirm('Mark this payment as fully settled (no confirmation needed)?')) return;
    try {
      await settlementAPI.settle(settlementId, {});
      const { data } = await settlementAPI.generate(activeGroup._id);
      setSettlements(data.settlements);
      setSuccess('Marked as settled! 🎉');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to settle');
    }
  };

  const handleDeleteSettled = async (settlementId) => {
    if (!window.confirm('Delete this settlement from history?')) return;
    try {
      await settlementAPI.deleteSettled(settlementId);
      setSettlements((prev) => prev.filter((s) => s._id !== settlementId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      await settlementAPI.approveRequest(requestId);
      setSuccess('Payment approved! ✅');
      setTimeout(() => setSuccess(''), 3000);
      await refresh(activeGroup._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve');
    } finally { setActionLoading(''); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await settlementAPI.rejectRequest(rejectModal, { reason: rejectReason });
      setRejectModal(null); setRejectReason('');
      setSuccess('Request rejected.');
      setTimeout(() => setSuccess(''), 3000);
      await refresh(activeGroup._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject');
    } finally { setActionLoading(''); }
  };

  /* ── Derived lists ── */
  const activeSettlements  = settlements.filter((s) => ['pending', 'partially_settled'].includes(s.status));
  const settledSettlements = settlements.filter((s) => s.status === 'settled');
  const pendingCount       = activeSettlements.length;
  const inboxCount         = pendingReqs.length;

  const tabList = [
    { key: 'pending',  label: 'Active',   count: pendingCount },
    { key: 'inbox',    label: 'Inbox',    count: inboxCount   },
    { key: 'settled',  label: 'History',  count: 0            },
  ];

  const currentList =
    tab === 'pending' ? activeSettlements :
    tab === 'settled' ? settledSettlements : [];

  return (
    <Layout>
      <div className="py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between pt-1 gap-3">
          <h1 className="text-xl font-bold text-white">Settlements</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setDetailsOpen(true)} disabled={!activeGroup} className="btn-secondary text-xs px-3 py-2">
              Details
            </button>
            <button onClick={handleGenerate} disabled={generating || !activeGroup}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
              {generating ? <Spinner size="sm" /> : <span>🔄</span>}
              {generating ? 'Calc…' : 'Recalc'}
            </button>
          </div>
        </div>

        {error   && <Alert type="error"   message={error}   onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} />}

        {/* ── Group selector ── */}
        {groups.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {groups.map((g) => (
              <button key={g._id} onClick={() => handleGroupSwitch(g)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={activeGroup?._id === g._id
                  ? { background: 'rgba(101,116,243,0.2)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#5a5d70', border: '1px solid rgba(255,255,255,0.07)' }}>
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {tabList.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
              style={tab === key
                ? { background: '#1a1d27', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                : { color: '#4a4d5e' }}>
              {label}
              {count > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: key === 'inbox' ? '#ef4444' : '#f59e0b', color: '#fff' }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Empty hint for active tab ── */}
        {tab === 'pending' && activeSettlements.length === 0 && !loading && activeGroup && (
          <div className="card p-4" style={{ background: 'rgba(101,116,243,0.08)', border: '1px solid rgba(101,116,243,0.2)' }}>
            <p className="text-sm" style={{ color: '#8196f8' }}>
              Hit <strong>Recalculate</strong> to generate settlement suggestions from current expenses.
            </p>
          </div>
        )}

        {/* ── INBOX TAB — pending requests waiting for my approval ── */}
        {tab === 'inbox' && (
          <div className="space-y-3">
            {inboxCount === 0 ? (
              <EmptyState icon="📬" title="No pending approvals" description="Payment requests from your flatmates will appear here." />
            ) : pendingReqs.map((req) => (
              <div key={req._id} className="card p-4 space-y-3"
                style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
                <div className="flex items-start gap-3">
                  <Avatar name={req.sender?.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {req.sender?.name} sent a payment request
                    </p>
                    <p className="text-xl font-bold mt-0.5 tracking-tight" style={{ color: '#10b981' }}>
                      {formatCurrency(req.amount)}
                    </p>
                    {req.note && (
                      <p className="text-xs mt-1 italic" style={{ color: '#4a4d5e' }}>
                        "{req.note}"
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: '#3a3d50' }}>
                      {new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Receipt preview */}
                {req.receiptUrl && req.receiptUrl.startsWith('data:image') && (
                  <img src={req.receiptUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                )}
                {req.receiptUrl && req.receiptUrl.startsWith('data:application/pdf') && (
                  <p className="text-xs" style={{ color: '#8196f8' }}>📄 PDF receipt attached</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleApprove(req._id)} disabled={actionLoading === req._id}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}>
                    {actionLoading === req._id ? <Spinner size="sm" /> : '✓'} Confirm
                  </button>
                  <button onClick={() => { setRejectModal(req._id); setRejectReason(''); }}
                    disabled={actionLoading === req._id}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTIVE / HISTORY TABS ── */}
        {tab !== 'inbox' && (
          loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : currentList.length === 0 ? (
            <EmptyState
              icon={tab === 'pending' ? '🎊' : '📭'}
              title={tab === 'pending' ? 'All settled up!' : 'No settled transactions'}
              description={tab === 'pending' ? "No pending payments. Everyone's even." : 'Settled payments appear here.'}
            />
          ) : (
            <div className="space-y-3">
              {currentList.map((s) => {
                const isDebtor   = s.from?._id?.toString() === uid || s.from?._id === uid;
                const isCreditor = s.to?._id?.toString()   === uid || s.to?._id   === uid;
                const paidAmt    = s.paidAmount || 0;
                const remaining  = s.remainingAmount ?? s.amount;

                return (
                  <div key={s._id} className="card p-4 space-y-3"
                    style={{
                      borderLeft: `4px solid ${isDebtor ? '#ef4444' : isCreditor ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    {/* Row 1: avatars + amount + status */}
                    <div className="flex items-start gap-3">
                      <Avatar name={s.from?.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm flex-wrap">
                          <span className="font-semibold text-white">
                            {isDebtor ? 'You' : s.from?.name}
                          </span>
                          <span style={{ color: '#3a3d50' }}>→</span>
                          <span className="font-semibold text-white">
                            {isCreditor ? 'You' : s.to?.name}
                          </span>
                        </div>
                        <p className="text-xl font-bold tracking-tight text-white mt-0.5">
                          {formatCurrency(s.amount)}
                        </p>
                        {isDebtor && s.status !== 'settled' && (
                          <span className="text-xs font-semibold mt-1 inline-block"
                            style={{ color: '#ef4444' }}>You owe this</span>
                        )}
                        {isCreditor && s.status !== 'settled' && (
                          <span className="text-xs font-semibold mt-1 inline-block"
                            style={{ color: '#10b981' }}>You receive this</span>
                        )}
                        {s.status === 'settled' && s.settledAt && (
                          <p className="text-xs mt-1" style={{ color: '#3a3d50' }}>
                            Settled {formatDate(s.settledAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <StatusBadge status={s.status} />
                      </div>
                    </div>

                    {/* Progress bar for partial */}
                    {s.status === 'partially_settled' && (
                      <ProgressBar paid={paidAmt} total={s.amount} />
                    )}
                    {s.status !== 'settled' && paidAmt > 0 && s.status !== 'partially_settled' && (
                      <ProgressBar paid={paidAmt} total={s.amount} />
                    )}

                    {/* Remaining */}
                    {s.status !== 'settled' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#4a4d5e' }}>
                          Remaining: <span className="font-bold" style={{ color: '#f59e0b' }}>
                            {formatCurrency(remaining)}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {s.status !== 'settled' && isDebtor && (
                        <button onClick={() => setPayTarget(s)}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                          style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)', color: '#fff' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          {s.status === 'partially_settled' ? '+ Pay More' : 'Pay Now'}
                        </button>
                      )}
                      {s.status === 'settled' && (
                        <>
                          <span className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            ✓ Settled
                          </span>
                          <button onClick={() => handleDeleteSettled(s._id)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Reject reason modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-semibold text-white">Reject Payment Request</p>
            <input
              className="input-field"
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={actionLoading === rejectModal}
                className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                {actionLoading === rejectModal ? <Spinner size="sm" /> : null} Confirm Reject
              </button>
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pay modal ── */}
      <PayModal
        isOpen={!!payTarget}
        settlement={payTarget}
        onClose={() => setPayTarget(null)}
        onSuccess={(msg) => {
          setSuccess(msg);
          setTimeout(() => setSuccess(''), 4000);
          refresh(activeGroup._id);
        }}
      />

      {/* ── Details modal ── */}
      <SettlementDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        groupId={activeGroup?._id}
        currentUserId={uid}
        onSettleAction={null}
      />
    </Layout>
  );
};

export default Settlements;
