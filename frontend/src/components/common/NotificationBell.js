import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../api';

const TYPE_ICON = {
  settlement_request:  '💸',
  settlement_approved: '✅',
  settlement_rejected: '❌',
  expense_added:       '🧾',
  budget_exceeded:     '⚠️',
  group_invitation:    '🏠',
};

const NotificationBell = () => {
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false); // eslint-disable-line no-unused-vars
  const ref                       = useRef(null);
  const navigate                  = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await notificationAPI.getAll();
      setNotifs(data.notifications);
      setUnread(data.unreadCount);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  // close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      setLoading(true);
      try { await notificationAPI.markAllRead(); setUnread(0); setNotifs((p) => p.map((n) => ({ ...n, read: true }))); }
      catch { /* silent */ }
      finally { setLoading(false); }
    }
  };

  const handleClick = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await notificationAPI.markRead(n._id); } catch { /* silent */ }
    }
    navigate(n.link || '/settlements');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifs((p) => p.filter((n) => n._id !== id));
    } catch { /* silent */ }
  };

  const relTime = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background: open ? 'rgba(101,116,243,0.15)' : 'var(--surface-overlay)', color: 'var(--text-muted)' }}
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: '#ef4444' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--panel-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>Notifications</p>
            {notifs.length > 0 && (
              <button onClick={async () => { await notificationAPI.markAllRead(); setUnread(0); setNotifs((p) => p.map((n) => ({ ...n, read: true }))); }}
                className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl">🔔</span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
              </div>
            ) : notifs.map((n, i) => (
              <div key={n._id}
                onClick={() => handleClick(n)}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all"
                style={{
                  background: n.read ? 'transparent' : 'rgba(101,116,243,0.05)',
                  borderBottom: i < notifs.length - 1 ? '1px solid var(--panel-border)' : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(101,116,243,0.05)'}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-base)' }}>{n.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                  <p className="text-[10px] mt-1" style={{ color: '#3a3d50' }}>{relTime(n.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6574f3' }} />}
                  <button onClick={(e) => handleDelete(e, n._id)}
                    className="text-[10px] opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--danger)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
