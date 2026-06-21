import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

const AdminLogin = () => {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0a0b0f' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.35)' }}>S</div>
          <h1 className="text-2xl font-bold text-white">SuperAdmin</h1>
          <p className="text-sm mt-1" style={{ color: '#4a4d5e' }}>FlatSplit Control Panel</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-base font-semibold text-white mb-5">Sign in to continue</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: '#4a4d5e' }}>Username</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="superadmin"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: '#4a4d5e' }}>Password</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 mt-1"
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#3a3d50' }}>
          This panel is restricted to authorized personnel only.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
