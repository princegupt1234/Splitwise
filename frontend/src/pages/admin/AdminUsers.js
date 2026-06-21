import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';

const Badge = ({ label, color, bg }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
    style={{ background: bg, color }}>{label}</span>
);

const AdminUsers = () => {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [actionId, setActionId] = useState('');
  const [msg, setMsg]           = useState({ text: '', type: '' });
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  const load = useCallback(async (p = page, q = search) => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page: p, limit: 15, search: q });
      setUsers(data.users); setTotal(data.total); setPages(data.pages);
    } catch { flash('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(1, search); }, []); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleBan = async (user) => {
    if (!window.confirm(`${user.isBanned ? 'Unban' : 'Ban'} ${user.name}?`)) return;
    setActionId(user._id);
    try {
      const fn = user.isBanned ? adminAPI.unbanUser : adminAPI.banUser;
      await fn(user._id);
      flash(`${user.name} ${user.isBanned ? 'unbanned' : 'banned'}`);
      load(page, search);
    } catch (err) { flash(err.response?.data?.message || 'Action failed', 'error'); }
    finally { setActionId(''); }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    setActionId(user._id);
    try {
      await adminAPI.deleteUser(user._id);
      flash(`${user.name} deleted`);
      load(page, search);
    } catch (err) { flash(err.response?.data?.message || 'Delete failed', 'error'); }
    finally { setActionId(''); }
  };

  const openEdit = (user) => { setEditUser(user); setEditForm({ name: user.name, email: user.email || '' }); };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateUser(editUser._id, editForm);
      flash('User updated');
      setEditUser(null);
      load(page, search);
    } catch (err) { flash(err.response?.data?.message || 'Update failed', 'error'); }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Users</h1>
            <p className="text-sm mt-0.5" style={{ color: '#4a4d5e' }}>{total} total users</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, username, email…"
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
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-widest"
            style={{ background: '#0f1117', color: '#4a4d5e', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Username / Email</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16" style={{ background: '#0a0b0f' }}>
              <div className="w-8 h-8 rounded-full animate-spin border-2" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#ef4444' }} />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center" style={{ background: '#0a0b0f', color: '#4a4d5e' }}>No users found.</div>
          ) : (
            <div style={{ background: '#0a0b0f' }}>
              {users.map((u, i) => (
                <div key={u._id}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-3.5 text-sm"
                  style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  {/* Name */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)' }}>{u.name?.[0]?.toUpperCase()}</div>
                    <span className="font-medium text-white truncate">{u.name}</span>
                  </div>
                  {/* Username/email */}
                  <div className="col-span-3" style={{ color: '#6b7280' }}>
                    <p className="truncate">@{u.username}</p>
                    <p className="truncate text-xs">{u.email || '—'}</p>
                  </div>
                  {/* Joined */}
                  <div className="col-span-2 flex items-center" style={{ color: '#4a4d5e' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  {/* Status */}
                  <div className="col-span-2 flex items-center">
                    {u.isBanned
                      ? <Badge label="Banned"  color="#f87171" bg="rgba(239,68,68,0.12)" />
                      : <Badge label="Active"  color="#34d399" bg="rgba(16,185,129,0.12)" />}
                  </div>
                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(101,116,243,0.1)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.2)' }}>
                      Edit
                    </button>
                    <button onClick={() => handleBan(u)} disabled={actionId === u._id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={u.isBanned
                        ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
                        : { background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                      {u.isBanned ? 'Unban' : 'Ban'}
                    </button>
                    <button onClick={() => handleDelete(u)} disabled={actionId === u._id}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1, search); }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>← Prev</button>
            <span className="text-sm" style={{ color: '#4a4d5e' }}>Page {page} of {pages}</span>
            <button disabled={page === pages} onClick={() => { setPage(p => p + 1); load(page + 1, search); }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>Next →</button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditUser(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-semibold text-white">Edit User — @{editUser.username}</p>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#4a4d5e' }}>Name</label>
                <input className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#4a4d5e' }}>Email</label>
                <input type="email" className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>Save</button>
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
