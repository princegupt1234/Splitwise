import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { groupAPI } from '../api';
import { Alert, Spinner, Avatar, EmptyState, Modal } from '../components/common';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────
// Create Group Page
// ─────────────────────────────────────────
export const CreateGroup = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Group name is required');
    setLoading(true);
    try {
      const { data } = await groupAPI.create({ name });
      localStorage.setItem('activeGroupId', data.group._id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="py-5">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-2xl font-bold text-theme-primary">Create Group</h1>
        </div>

        <div className="card p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🏘️</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create a flat group and share the code with your flatmates</p>          </div>

          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Group Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Royal Residency, Flat 4B..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Spinner size="sm" />}
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Already have a code? </span>
            <Link to="/groups/join" className="text-sm font-semibold" style={{ color: '#8196f8' }}>Join a group</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────
// Join Group Page
// ─────────────────────────────────────────
export const JoinGroup = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { data } = await groupAPI.join({ code: code.toUpperCase() });
      localStorage.setItem('activeGroupId', data.group._id);
      setSuccess(`Joined "${data.group.name}" successfully!`);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="py-5">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-2xl font-bold text-theme-primary">Join Group</h1>
        </div>

        <div className="card p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🔑</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter the 8-character code shared by your flatmate</p>
          </div>

          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
          {success && <div className="mb-4"><Alert type="success" message={success} /></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Group Code</label>
              <input
                type="text"
                className="input-field text-center text-2xl font-mono tracking-[0.5em] uppercase"
                placeholder="FLAT7X92"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                maxLength={8}
                required
              />
            </div>
            <button type="submit" disabled={loading || code.length < 8} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Spinner size="sm" />}
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

// ─────────────────────────────────────────
// Group Detail Page
// ─────────────────────────────────────────
export const GroupDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => { fetchGroup(); }, [id]);

  const fetchGroup = async () => {
    try {
      const { data } = await groupAPI.getById(id);
      setGroup(data.group);
    } catch (err) {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError(''); setInviteSuccess('');
    try {
      const { data } = await groupAPI.invite(id, { username: inviteUsername });
      setInviteSuccess(data.message);
      setGroup(data.group);
      setInviteUsername('');
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite user');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return;
    setRemovingId(memberId);
    try {
      const { data } = await groupAPI.removeMember(id, memberId);
      setGroup(data.group);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const isAdmin = group?.createdBy?._id === user?._id;

  if (loading) return <Layout><div className="flex justify-center py-20"><Spinner size="lg" /></div></Layout>;

  return (
    <Layout>
      <div className="py-5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-2xl font-bold" style={{ color: '#4a4d5e' }}>←</button>
          <h1 className="text-2xl font-bold text-theme-primary break-words">{group?.name}</h1>
        </div>

        {/* Group code card */}
        <div className="card p-5">
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Share this code with your flatmates</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-xl p-4 gap-3" style={{ background: 'var(--surface-overlay)' }}>
            <span className="text-2xl sm:text-3xl font-mono font-bold tracking-widest break-all" style={{ color: 'var(--accent)' }}>{group?.code}</span>
            <button onClick={handleCopyCode} className="btn-secondary text-sm px-4 py-2 w-full sm:w-auto">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Members */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h2 className="font-semibold text-theme-primary">Members ({group?.members?.length})</h2>
              <button onClick={() => setInviteModal(true)}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(101,116,243,0.1)', color: 'var(--accent)', border: '1px solid rgba(101,116,243,0.18)' }}
            >
              + Invite
            </button>
          </div>
          <div className="space-y-3">
            {group?.members?.map((member) => (
              <div key={member._id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Avatar name={member.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-theme-primary text-sm truncate">{member.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{member.username}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {group.createdBy._id === member._id && (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(101,116,243,0.15)', color: 'var(--accent)' }}>Admin</span>
                  )}
                {member._id === user._id && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>You</span>
                )}
                {isAdmin && member._id !== user._id && member._id !== group.createdBy._id && (
                  <button
                    onClick={() => handleRemoveMember(member._id, member.name)}
                    disabled={removingId === member._id}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all disabled:opacity-50 flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {removingId === member._id ? '…' : 'Remove'}
                  </button>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/expenses/add" className="btn-primary text-center text-sm py-3">Add Expense</Link>
              <Link to="/settlements" className="btn-secondary text-center text-sm py-3">Settlements</Link>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={inviteModal} onClose={() => { setInviteModal(false); setInviteError(''); setInviteSuccess(''); }} title="Invite Member">
        <form onSubmit={handleInvite} className="space-y-4">
          {inviteError && <Alert type="error" message={inviteError} />}
          {inviteSuccess && <Alert type="success" message={inviteSuccess} />}
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter username to invite"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value.toLowerCase())}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">Send Invite</button>
        </form>
      </Modal>
    </Layout>
  );
};
