import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';

const AdminGroups = () => {
  const [groups, setGroups]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [actionId, setActionId] = useState('');
  const [msg, setMsg]           = useState({ text: '', type: '' });

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getGroups({ page: p, limit: 15, search: q });
      setGroups(data.groups); setTotal(data.total); setPages(data.pages);
    } catch { flash('Failed to load groups', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(1, search); };

  const handleDelete = async (group) => {
    if (!window.confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    setActionId(group._id);
    try {
      await adminAPI.deleteGroup(group._id);
      flash(`Group "${group.name}" deleted`);
      load(page, search);
    } catch (err) { flash(err.response?.data?.message || 'Delete failed', 'error'); }
    finally { setActionId(''); }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Groups</h1>
            <p className="text-sm mt-0.5" style={{ color: '#4a4d5e' }}>{total} total groups</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search group name…"
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
            <div className="col-span-3">Group Name</div>
            <div className="col-span-2">Code</div>
            <div className="col-span-3">Admin</div>
            <div className="col-span-2">Members</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16" style={{ background: '#0a0b0f' }}>
              <div className="w-8 h-8 rounded-full animate-spin border-2" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#ef4444' }} />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center" style={{ background: '#0a0b0f', color: '#4a4d5e' }}>No groups found.</div>
          ) : (
            <div style={{ background: '#0a0b0f' }}>
              {groups.map((g, i) => (
                <div key={g._id}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-3.5 text-sm"
                  style={{ borderBottom: i < groups.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>{g.name?.[0]?.toUpperCase()}</div>
                    <span className="font-medium text-white truncate">{g.name}</span>
                  </div>
                  <div className="col-span-2 flex items-center font-mono text-xs" style={{ color: '#8196f8' }}>{g.code}</div>
                  <div className="col-span-3 flex items-center" style={{ color: '#6b7280' }}>
                    <span className="truncate">{g.createdBy?.name || '—'} <span className="text-xs">(@{g.createdBy?.username})</span></span>
                  </div>
                  <div className="col-span-2 flex items-center" style={{ color: '#4a4d5e' }}>{g.members?.length || 0} members</div>
                  <div className="col-span-2 flex items-center justify-end">
                    <button onClick={() => handleDelete(g)} disabled={actionId === g._id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {actionId === g._id ? '…' : 'Delete'}
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

export default AdminGroups;
