import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, groupAPI, reportAPI, settlementAPI } from '../api';
import { Alert, Spinner, Avatar } from '../components/common';
import Layout from '../components/common/Layout';
import { formatCurrency } from '../utils/helpers';

/* ── tiny shared pieces ──────────────────────────────── */
const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
    {children}
  </p>
);

const Card = ({ children, className = '' }) => (
  <div className={`card overflow-hidden ${className}`}>
    {children}
  </div>
);

const Divider = () => (
  <div className="h-px" style={{ background: 'var(--panel-border)' }} />
);

/* A plain info row — no button, no arrow */
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 px-4 py-3.5">
    <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.05)' }}>{icon}</span>
    <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-base)' }}>{label}</span>
    <span className="text-sm" style={{ color: '#4a4d5e' }}>{value}</span>
  </div>
);

/* A clickable action row */
const ActionRow = ({ icon, label, onClick, danger, right }) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
    style={{ color: danger ? '#ef4444' : 'var(--text-base)' }}
    onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
      style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)' }}>
      {icon}
    </span>
    <span className="text-sm font-medium flex-1">{label}</span>
    {right || (!danger && <span style={{ color: '#3a3d50' }}>›</span>)}
  </button>
);

const StatPill = ({ label, value, color }) => (
  <div className="flex flex-col items-center gap-1 p-3 rounded-2xl flex-1"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <p className="text-lg font-bold tracking-tight" style={{ color: color || 'var(--text-base)' }}>{value}</p>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-center leading-tight" style={{ color: '#4a4d5e' }}>{label}</p>
  </div>
);

const NOTIF_KEYS = [
  { key: 'expenseAdded',        label: 'Expense Alerts',        desc: 'Notifies when expenses are added to your groups.' },
  { key: 'settlementRequest',   label: 'Settlement Requests',   desc: 'When someone requests settlement with you.' },
  { key: 'settlementApproval',  label: 'Approval Notifications', desc: 'When a settlement you requested is approved.' },
  { key: 'settlementRejection', label: 'Rejection Notifications',desc: 'When a settlement you requested is rejected.' },
  { key: 'groupInvitation',     label: 'Group Invitations',     desc: 'When you are invited to join a group.' },
];

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light Mode',  icon: '☀️' },
  { value: 'dark',   label: 'Dark Mode',   icon: '🌙' },
  { value: 'system', label: 'System Default', icon: '💻' },
];

/* ── Main ────────────────────────────────────────────── */
const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { mode, setThemeMode }       = useTheme();
  const navigate = useNavigate();

  // edit name
  const [editName, setEditName]     = useState(false);
  const [name, setName]             = useState(user?.name || '');

  // change password
  const [showPwd, setShowPwd]       = useState(false);
  const [pwdForm, setPwdForm]       = useState({ current: '', newPwd: '', confirm: '' });

  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [loading, setLoading]       = useState(false);

  // data
  const [groups, setGroups]         = useState([]);
  const [stats, setStats]           = useState(null);
  const [settleStats, setSettleStats] = useState({ pending: 0, settled: 0, pendingAmt: 0, settledAmt: 0 });
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  // notifications (local only)
  const [notifs, setNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notifPrefs')) || {}; } catch { return {}; }
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: gd } = await groupAPI.getAll();
      setGroups(gd.groups);
      let myPaid = 0, myShare = 0;
      let pendingCount = 0, settledCount = 0, pendingAmt = 0, settledAmt = 0;
      await Promise.all(gd.groups.map(async (g) => {
        try {
          const { data: sd }  = await reportAPI.getSummary(g._id);
          myPaid  += sd.summary.myPaid  || 0;
          myShare += sd.summary.myShare || 0;
          const { data: stl } = await settlementAPI.getByGroup(g._id);
          stl.settlements.forEach((s) => {
            if (s.status === 'settled') { settledCount++; settledAmt += s.amount; }
            else { pendingCount++; pendingAmt += (s.remainingAmount ?? s.amount); }
          });
        } catch { /* skip */ }
      }));
      setStats({ groups: gd.groups.length, myPaid, myShare });
      setSettleStats({ pending: pendingCount, settled: settledCount, pendingAmt, settledAmt });
    } catch { /* silent */ }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name cannot be empty');
    setLoading(true); setError('');
    try {
      const { data } = await authAPI.updateProfile({ name });
      updateUser(data.user);
      setSuccess('Name updated!');
      setEditName(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (pwdForm.newPwd.length < 6) return setError('New password must be at least 6 characters');
    if (pwdForm.newPwd !== pwdForm.confirm) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      await authAPI.updateProfile({ currentPassword: pwdForm.current, newPassword: pwdForm.newPwd });
      setSuccess('Password changed!');
      setShowPwd(false);
      setPwdForm({ current: '', newPwd: '', confirm: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? This cannot be undone.`)) return;
    setDeletingGroupId(groupId);
    try {
      await groupAPI.deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      setSuccess(`Group "${groupName}" deleted.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete group');
    } finally { setDeletingGroupId(null); }
  };

  const toggleNotif = (key) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    localStorage.setItem('notifPrefs', JSON.stringify(next));
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  const totalGroups = stats?.groups || 0;

  const profileCompletion = (() => {
    let score = 0; const fields = ['name', 'username', 'email'];
    fields.forEach(f => { if (user?.[f]) score += 1; });
    return Math.round((score / fields.length) * 100);
  })();

  const uid = user?._id?.toString();

  return (
    <Layout>
      <div className="py-5 space-y-5 max-w-xl mx-auto">

        {error   && <Alert type="error"   message={error}   onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} />}

        {/* ── Profile Card ────────────────────────────── */}
        <Card className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Avatar name={user?.name} size="xl" />
              <div className="min-w-0">
                <p className="font-bold text-xl leading-tight truncate" style={{ color: 'var(--text-base)' }}>{user?.name}</p>
                <p className="text-sm mt-0.5" style={{ color: '#4a4d5e' }}>@{user?.username}</p>
                <p className="text-sm mt-1 flex items-center gap-2" style={{ color: '#3a3d50' }}>
                  {user?.email ? (
                    <a href={`mailto:${user.email}`} className="text-sm" style={{ color: '#3a3d50' }}>{user.email}</a>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>No email on record</span>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.12)' }}>
                    {user?.isActive === false ? '🔴 Inactive' : '🟢 Active'}
                  </span>
                  {(user?.emailVerified || user?.verified) ? (
                    <span className="text-[12px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.12)' }}>✅ Verified</span>
                  ) : user?.email ? (
                    <span className="text-[12px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.06)', color: '#f59e0b', border: '1px solid rgba(249,115,22,0.12)' }}>⚠️ Unverified</span>
                  ) : null}
                </div>
                <button onClick={() => { setEditName(true); setShowPwd(false); }}
                  className="mt-3 text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(101,116,243,0.1)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.18)' }}>
                  Edit Name
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 w-full">
              {memberSince && <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Member since</p><p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{memberSince}</p></div>}
              <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Groups</p><p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{totalGroups}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Profile</p><p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{profileCompletion}% complete</p></div>
            </div>

          </div>

          {/* Inline edit name */}
          {editName && (
            <form onSubmit={handleSaveName} className="mt-4 space-y-2">
              <input type="text" className="input-field text-sm" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoFocus />
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5">
                  {loading && <Spinner size="sm" />} Save
                </button>
                <button type="button" className="btn-secondary flex-1 text-sm py-2"
                  onClick={() => { setEditName(false); setName(user?.name); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* ── Overview ─────────────────────────────────── */}
        {stats && (
          <div>
            <SectionLabel>Overview</SectionLabel>
            <Card className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatPill label="Groups" value={stats.groups} color="#8196f8" />
                <StatPill label="Total Paid" value={formatCurrency(stats.myPaid)} color="#10b981" />
                <StatPill label="Pending" value={settleStats.pending} color="#f59e0b" />
                <StatPill label="Settled" value={settleStats.settled} color="#10b981" />
              </div>
            </Card>
          </div>
        )}

        {/* ── Financial Summary ───────────────────────── */}
        <div>
          <SectionLabel>Financial Summary</SectionLabel>
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-xs" style={{ color: '#4a4d5e' }}>Outstanding Balance</p>
                <p className="text-lg font-bold mt-1" style={{ color: '#ef4444' }}>{formatCurrency(settleStats.pendingAmt)}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-xs" style={{ color: '#4a4d5e' }}>Total Settled</p>
                <p className="text-lg font-bold mt-1" style={{ color: '#10b981' }}>{formatCurrency(settleStats.settledAmt)}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-xs" style={{ color: '#4a4d5e' }}>Success Rate</p>
                <p className="text-lg font-bold mt-1" style={{ color: '#6574f3' }}>
                  {(() => {
                    const total = (settleStats.settled || 0) + (settleStats.pending || 0);
                    return total === 0 ? '—' : `${Math.round((settleStats.settled / total) * 100)}%`;
                  })()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Groups ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <SectionLabel>Groups</SectionLabel>
            <div className="flex gap-2">
              <Link to="/groups/create" className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ background: 'rgba(101,116,243,0.1)', color: '#8196f8', border: '1px solid rgba(101,116,243,0.18)' }}>
                + Create
              </Link>
              <Link to="/groups/join" className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#4a4d5e', border: '1px solid rgba(255,255,255,0.07)' }}>
                Join
              </Link>
            </div>
          </div>
          <Card>
            {groups.length === 0 ? (
              <p className="px-4 py-5 text-sm text-center" style={{ color: '#4a4d5e' }}>No groups yet.</p>
            ) : (
              groups.map((g, i) => {
                const isAdmin = g.createdBy?._id?.toString() === uid || g.createdBy?.toString() === uid;
                const created = g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '—';
                return (
                  <React.Fragment key={g._id}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#f3f4ff,#eef2ff)', color: '#4f46e5' }}>{(g.name || '').charAt(0).toUpperCase()}</div>
                      <Link to={`/groups/${g._id}`} className="flex-1 min-w-0" style={{ color: 'var(--text-base)' }}>
                        <p className="text-sm font-medium truncate">{g.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#3a3d50' }}>
                          {g.members?.length || 0} members · <span className="font-mono">{g.code}</span>
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>
                          Role: <span style={{ color: isAdmin ? '#6574f3' : '#3a3d50', fontWeight: 600 }}>{isAdmin ? 'Admin' : 'Member'}</span>
                          {' · '}Created {created}
                        </p>
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteGroup(g._id, g.name)}
                          disabled={deletingGroupId === g._id}
                          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        >
                          {deletingGroupId === g._id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </Card>
        </div>

        {/* ── Account Details ─────────────────────────── */}
        <div>
          <SectionLabel>Account Details</SectionLabel>
          <Card>
            <InfoRow icon="👤" label="Full Name" value={user?.name || '—'} />
            <Divider />
            <InfoRow icon="🔖" label="Username" value={`@${user?.username}`} />
            <Divider />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>📧</span>
              <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-base)' }}>Email</span>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: '#4a4d5e' }}>{user?.email || '—'}</span>
                {!user?.email && <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>⚠ Email missing</span>}
              </div>
            </div>
            <Divider />
            <InfoRow icon="🔒" label="Password Status" value={user?.hasPassword ? 'Configured' : '—'} />
            <Divider />
            <div className="px-4 py-3.5">
              <button onClick={() => { setShowPwd((p) => !p); setEditName(false); setError(''); }}
                className="w-full text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: '#4a4d5e', border: '1px solid rgba(255,255,255,0.06)' }}>
                Change Password
              </button>
            </div>
            {showPwd && (
              <form onSubmit={handleChangePwd} className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <input type="password" className="input-field text-sm" placeholder="Current password" value={pwdForm.current}
                  onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} required />
                <input type="password" className="input-field text-sm" placeholder="New password (min 6 chars)" value={pwdForm.newPwd}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPwd: e.target.value })} required />
                <input type="password" className="input-field text-sm" placeholder="Confirm new password" value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} required />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5">
                    {loading && <Spinner size="sm" />} Update Password
                  </button>
                  <button type="button" className="btn-secondary flex-1 text-sm py-2" onClick={() => { setShowPwd(false); setPwdForm({ current: '', newPwd: '', confirm: '' }); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* ── Preferences ───────────────────────────────── */}
        <div>
          <SectionLabel>Preferences</SectionLabel>
          <Card className="p-4">
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-base)' }}>Theme</p>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, icon }) => (
                <button key={value} onClick={() => setThemeMode(value)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-all"
                  style={mode === value ? {
                    background: 'rgba(101,116,243,0.15)', color: '#8196f8',
                    border: '1px solid rgba(101,116,243,0.3)',
                  } : {
                    background: 'rgba(255,255,255,0.04)', color: '#4a4d5e',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <span className="text-base">{icon}</span>
                  {label}
                  {mode === value && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8196f8' }} />}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Notifications ────────────────────────────── */}
        <div>
          <SectionLabel>Notifications</SectionLabel>
          <Card>
            {NOTIF_KEYS.map(({ key, label, desc }, i) => (
              <React.Fragment key={key}>
                {i > 0 && <Divider />}
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>{label}</p>
                      {desc && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{desc}</p>}
                    </div>
                    <div>
                      <button onClick={() => toggleNotif(key)} className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                        style={{ background: notifs[key] !== false ? '#6574f3' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                          style={{ transform: notifs[key] !== false ? 'translateX(22px)' : 'translateX(2px)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </Card>
        </div>

        {/* ── Application Information ───────────────────── */}
        <div>
          <SectionLabel>Application Information</SectionLabel>
          <Card>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)' }}>F</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>FlatSplit</p>
                <p className="text-xs" style={{ color: '#3a3d50' }}>Version 1.1.0</p>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Manage shared expenses, settlements, and flat finances in one place.</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Sign Out ─────────────────────────────────── */}
        <div>
          <Card>
            <ActionRow icon="🚪" label="Sign Out"
              onClick={() => { logout(); navigate('/login'); }}
              danger right={null} />
          </Card>
        </div>

        <div className="h-4" />
      </div>
    </Layout>
  );
};

export default Profile;
