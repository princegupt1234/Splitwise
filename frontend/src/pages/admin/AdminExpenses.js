import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';
import { formatDate } from '../../utils/helpers';

const AdminExpenses = () => {
  const [expenses, setExpenses]  = useState([]);
  const [total, setTotal]        = useState(0);
  const [page, setPage]          = useState(1);
  const [pages, setPages]        = useState(1);
  const [search, setSearch]      = useState('');
  const [loading, setLoading]    = useState(true);
  const [actionId, setActionId]  = useState('');
  const [msg, setMsg]            = useState({ text: '', type: '' });

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getExpenses({ page: p, limit: 15, search: q });
      setExpenses(data.expenses); setTotal(data.total); setPages(data.pages);
    } catch { flash('Failed to load expenses', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(1, search); };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.title}"? This cannot be undone.`)) return;
    setActionId(expense._id);
    try {
      await adminAPI.deleteExpense(expense._id);
      flash(`Expense "${expense.title}" deleted`);
      load(page, search);
    } catch (err) { flash(err.response?.data?.message || 'Delete failed', 'error'); }
    finally { setActionId(''); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Expenses</h1>
            <p className="text-sm mt-0.5" style={{ color: '#4a4d5e' }}>{total} total expenses</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="flex-1 sm:w-64 px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>Search</button>
          </form>
        </div>

        {msg.text && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={msg.type === 'error'
              ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }
              : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
            {msg.text}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ background: '#0f1117', color: '#4a4d5e', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="col-span-3">Title</div>
            <div className="col-span-2">Group</div>
            <div className="col-span-2">Paid By</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16" style={{ background: '#0a0b0f' }}>
              <div className="w-8 h-8 rounded-full animate-spin border-2" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#ef4444' }} />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center" style={{ background: '#0a0b0f', color: '#4a4d5e' }}>No expenses found.</div>
          ) : (
            <div style={{ background: '#0a0b0f' }}>
              {expenses.map((e, i) => (
                <div key={e._id}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-3.5 text-sm"
                  style={{ borderBottom: i < expenses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="col-span-3 font-medium text-white truncate">{e.title}</div>
                  <div className="col-span-2 truncate" style={{ color: '#6b7280' }}>{e.groupId?.name || '—'}</div>
                  <div className="col-span-2 truncate" style={{ color: '#6b7280' }}>{e.paidBy?.name || '—'}</div>
                  <div className="col-span-2 font-semibold" style={{ color: '#10b981' }}>{fmt(e.amount)}</div>
                  <div className="col-span-2" style={{ color: '#4a4d5e' }}>{formatDate(e.date || e.createdAt)}</div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button onClick={() => handleDelete(e)} disabled={actionId === e._id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {actionId === e._id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(p, search); }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>← Prev</button>
            <span className="text-sm" style={{ color: '#4a4d5e' }}>Page {page} of {pages}</span>
            <button disabled={page === pages} onClick={() => { const p = page + 1; setPage(p); load(p, search); }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>Next →</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminExpenses;
