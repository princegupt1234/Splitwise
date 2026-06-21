import React, { useState, useEffect, useCallback } from 'react';
import { budgetAPI } from '../../api';
import { CATEGORIES, CATEGORY_ICONS, formatCurrency } from '../../utils/helpers';
import { Spinner, Alert } from './index';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const BudgetManager = ({ groupId, groupName }) => {
  const now   = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState('');
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ category: '', limit: '' });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data } = await budgetAPI.getByGroup(groupId, { month, year });
      setBudgets(data.budgets);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [groupId, month, year]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category || !form.limit) return setError('Select a category and enter a limit');
    setSaving('save');
    try {
      await budgetAPI.create(groupId, { ...form, month, year });
      setForm({ category: '', limit: '' });
      setShowForm(false);
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save budget'); }
    finally { setSaving(''); }
  };

  const handleDelete = async (id) => {
    setSaving(id);
    try { await budgetAPI.delete(id); await load(); }
    catch { setError('Failed to delete'); }
    finally { setSaving(''); }
  };

  const usedCategories = budgets.map((b) => b.category);

  return (
    <div className="space-y-4">
      {/* Month/Year selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="input-field py-2 text-sm flex-1 min-w-[120px]">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="input-field py-2 text-sm w-24">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => { setShowForm((s) => !s); setError(''); }}
          className="btn-primary py-2 text-sm px-4 whitespace-nowrap">
          {showForm ? 'Cancel' : '+ Add Budget'}
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSave} className="card p-4 space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>Set Budget Limit</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.filter((c) => !usedCategories.includes(c)).map((cat) => (
              <button key={cat} type="button"
                onClick={() => setForm({ ...form, category: cat })}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={form.category === cat
                  ? { background: 'rgba(101,116,243,0.15)', border: '1.5px solid rgba(101,116,243,0.4)', color: 'var(--text-base)' }
                  : { background: 'var(--surface-overlay)', border: '1.5px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <span>{CATEGORY_ICONS[cat]}</span>{cat}
              </button>
            ))}
          </div>
          {CATEGORIES.filter((c) => !usedCategories.includes(c)).length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>All categories have budgets set for this month.</p>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>₹</span>
              <input type="number" min="1" step="1" placeholder="Monthly limit"
                className="input-field pl-7 text-sm"
                value={form.limit}
                onChange={e => setForm({ ...form, limit: e.target.value })} />
            </div>
            <button type="submit" disabled={saving === 'save'}
              className="btn-primary px-5 text-sm flex items-center gap-1.5">
              {saving === 'save' && <Spinner size="sm" />} Save
            </button>
          </div>
        </form>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No budgets set for {MONTHS[month - 1]} {year}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const pct     = Math.min(100, b.percentage || 0);
            const over    = pct >= 100;
            const warn    = pct >= 80 && !over;
            const barColor = over ? '#ef4444' : warn ? '#f59e0b' : '#10b981';
            return (
              <div key={b._id} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[b.category]}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{b.category}</span>
                    {over && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Exceeded</span>}
                    {warn && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>Near limit</span>}
                  </div>
                  <button onClick={() => handleDelete(b._id)} disabled={saving === b._id}
                    className="text-xs font-semibold px-2 py-1 rounded-lg transition-all disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                    {saving === b._id ? '…' : 'Remove'}
                  </button>
                </div>
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Spent: <strong style={{ color: over ? '#ef4444' : 'var(--text-base)' }}>{formatCurrency(b.spent)}</strong></span>
                  <span>Limit: <strong style={{ color: 'var(--text-base)' }}>{formatCurrency(b.limit)}</strong></span>
                  <span style={{ color: barColor, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: barColor }} />
                </div>
                {over && (
                  <p className="text-xs" style={{ color: '#ef4444' }}>
                    ⚠️ Over by {formatCurrency(b.spent - b.limit)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetManager;
