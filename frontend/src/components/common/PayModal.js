import React, { useState } from 'react';
import { settlementAPI } from '../../api';
import { formatCurrency } from '../../utils/helpers';
import { Spinner, Alert } from './index';

const PayModal = ({ isOpen, onClose, settlement, onSuccess }) => {
  const remaining = settlement
    ? Math.round((settlement.remainingAmount ?? settlement.amount) * 100) / 100
    : 0;

  const [amount, setAmount]     = useState('');
  const [note, setNote]         = useState('');
  const [receipt, setReceipt]   = useState(null);   // base64 string
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const reset = () => { setAmount(''); setNote(''); setReceipt(null); setError(''); };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('File must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setReceipt(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount');
    if (amt > remaining + 0.01) return setError(`Cannot exceed remaining ${formatCurrency(remaining)}`);

    setLoading(true);
    try {
      await settlementAPI.createRequest(settlement._id, {
        amount: amt,
        note: note.trim(),
        receiptUrl: receipt || '',
      });
      reset();
      onClose();
      onSuccess('Payment request sent! Waiting for confirmation 📨');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !settlement) return null;

  const paidAmount  = settlement.paidAmount || 0;
  const totalAmount = settlement.amount;
  const paidPct     = Math.min(100, Math.round((paidAmount / totalAmount) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
           style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <div>
            <p className="font-semibold text-theme-primary text-base">Submit Payment</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              To: {settlement.to?.name}
            </p>
          </div>
          <button onClick={() => { reset(); onClose(); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'var(--surface-overlay)', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Progress */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
           <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: '#4a4d5e' }}>Progress</span>
            <span className="text-xs font-bold" style={{ color: '#10b981' }}>{paidPct}% paid</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${paidPct}%`, background: 'linear-gradient(90deg,#059669,#10b981)' }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: '#4a4d5e' }}>Paid: {formatCurrency(paidAmount)}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
              Remaining: {formatCurrency(remaining)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {/* Amount */}
          <div>
            <label className="label">Payment Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold"
                  style={{ color: 'var(--text-muted)' }}>₹</span>
              <input
                type="number" min="0.01" step="0.01" max={remaining}
                className="input-field pl-8 text-lg font-bold"
                placeholder={`Max ${formatCurrency(remaining)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button key={pct} type="button"
                  onClick={() => setAmount((remaining * pct / 100).toFixed(2))}
                  className="flex-1 text-xs font-semibold py-1 rounded-lg transition-all"
                    style={{ background: 'rgba(101,116,243,0.1)', color: 'var(--accent)', border: '1px solid rgba(101,116,243,0.2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(101,116,243,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(101,116,243,0.1)'}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="label">Payment Note (optional)</label>
            <input
              type="text" className="input-field"
              placeholder="e.g. Paid via GPay, UPI ID: xyz@upi"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Receipt */}
          <div>
            <label className="label">Receipt / Screenshot (optional)</label>
            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl cursor-pointer transition-all text-sm font-medium"
                style={{ background: 'var(--surface-overlay)', border: '1px dashed var(--panel-border)', color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(101,116,243,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              {receipt ? (
                <span style={{ color: 'var(--success)' }}>✓ Receipt attached</span>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload JPG, PNG, PDF (max 2MB)
                </>
              )}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
            </label>
            {receipt && (
              <button type="button" onClick={() => setReceipt(null)}
                className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                Remove receipt
              </button>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff' }}>
            {loading && <Spinner size="sm" />}
            {loading ? 'Sending…' : 'Send Payment Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PayModal;
