import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components/common';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(101,116,243,0.08)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(139,92,246,0.06)' }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)', boxShadow: '0 8px 24px rgba(101,116,243,0.4)' }}>
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-theme-primary tracking-tight">FlatSplit</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Shared expenses, simplified</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-5">Welcome back</h2>

          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username or Email</label>
              <input
                type="text"
                className="input-field"
                placeholder="username or email@example.com"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-1">
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: '#4a4d5e' }}>
            New here?{' '}
            <Link to="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
