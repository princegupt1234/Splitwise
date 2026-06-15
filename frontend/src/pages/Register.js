import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components/common';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(101,116,243,0.08)' }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(139,92,246,0.06)' }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)', boxShadow: '0 8px 24px rgba(101,116,243,0.4)' }}>
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-theme-primary tracking-tight">FlatSplit</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Join your flatmates</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-5">Create account</h2>

          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Prince Gupta"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-ZÀ-ɏ '.-]/g, '') })}
                required
              />
            </div>
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="prince_gupta"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                required
              />
              <p className="text-xs mt-1.5" style={{ color: '#4a4d5e' }}>Letters, numbers, underscores only</p>
            </div>
            <div>
              <label className="label">Email <span style={{ color: '#4a4d5e' }} className="font-normal">(optional)</span></label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-1">
              {loading ? <Spinner size="sm" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: '#4a4d5e' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
