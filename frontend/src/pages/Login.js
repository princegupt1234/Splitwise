import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import { Alert, Spinner } from '../components/common';

const BG = (
  <>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(101,116,243,0.08)' }} />
    <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(139,92,246,0.06)' }} />
  </>
);

const Logo = () => (
  <div className="text-center mb-8">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
      style={{ background: 'linear-gradient(135deg,#4f56e8,#6574f3)', boxShadow: '0 8px 24px rgba(101,116,243,0.4)' }}>
      <span className="text-white text-2xl font-bold">F</span>
    </div>
    <h1 className="text-2xl font-bold text-theme-primary tracking-tight">FlatSplit</h1>
    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Shared expenses, simplified</p>
  </div>
);

/* ── Step 1: Enter email ── */
const ForgotStep1 = ({ onNext, onBack }) => {
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      onNext(email);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="card p-6">
      <button onClick={onBack} className="text-xs mb-4 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
        ← Back to login
      </button>
      <h2 className="text-lg font-semibold text-theme-primary mb-1">Forgot Password</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Enter your registered email to receive an OTP.</p>
      {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email Address</label>
          <input type="email" className="input-field" placeholder="your@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Spinner size="sm" /> : null}
          {loading ? 'Sending OTP…' : 'Send OTP'}
        </button>
      </form>
    </div>
  );
};

/* ── Step 2: Verify OTP ── */
const ForgotStep2 = ({ email, onNext, onBack, onResend }) => {
  const [otp, setOtp]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authAPI.verifyOTP({ email, otp });
      onNext(otp);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setResendMsg(''); setError('');
    try {
      await authAPI.forgotPassword({ email });
      setResendMsg('New OTP sent!');
      setTimeout(() => setResendMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend');
    } finally { setResending(false); }
  };

  return (
    <div className="card p-6">
      <button onClick={onBack} className="text-xs mb-4 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
        ← Back
      </button>
      <h2 className="text-lg font-semibold text-theme-primary mb-1">Enter OTP</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        A 6-digit OTP was sent to <strong style={{ color: 'var(--text-base)' }}>{email}</strong>. It expires in 10 minutes.
      </p>
      {error    && <div className="mb-4"><Alert type="error"   message={error}     onClose={() => setError('')} /></div>}
      {resendMsg && <div className="mb-4"><Alert type="success" message={resendMsg} /></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">6-digit OTP</label>
          <input type="text" className="input-field text-center tracking-[0.4em] text-xl font-bold"
            placeholder="••••••" maxLength={6} value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required autoFocus />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Spinner size="sm" /> : null}
          {loading ? 'Verifying…' : 'Verify OTP'}
        </button>
        <button type="button" onClick={handleResend} disabled={resending}
          className="w-full text-sm font-semibold py-2 rounded-xl transition-all disabled:opacity-50"
          style={{ color: 'var(--accent)', background: 'transparent' }}>
          {resending ? 'Resending…' : "Didn't receive it? Resend OTP"}
        </button>
      </form>
    </div>
  );
};

/* ── Step 3: Reset Password ── */
const ForgotStep3 = ({ email, otp, onDone }) => {
  const [form, setForm]       = useState({ newPassword: '', confirm: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (form.newPassword !== form.confirm) return setError('Passwords do not match');
    setError(''); setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword: form.newPassword });
      setSuccess(true);
      setTimeout(onDone, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="card p-6 text-center space-y-3">
      <span className="text-5xl">✅</span>
      <p className="text-lg font-bold text-theme-primary">Password Reset!</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting to login…</p>
    </div>
  );

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-theme-primary mb-1">New Password</h2>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Choose a strong password (min 6 characters).</p>
      {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input-field" placeholder="••••••••"
            value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required autoFocus />
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" className="input-field" placeholder="••••••••"
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Spinner size="sm" /> : null}
          {loading ? 'Saving…' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

/* ── Main Login ── */
const Login = () => {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]   = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // forgot password flow state
  const [view, setView]       = useState('login'); // 'login' | 'forgot1' | 'forgot2' | 'forgot3'
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(!err.response
        ? 'Cannot reach server. Check your internet connection.'
        : err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {BG}
      <div className="w-full max-w-sm relative">
        <Logo />

        {/* ── Login form ── */}
        {view === 'login' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-theme-primary mb-5">Welcome back</h2>
            {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username or Email</label>
                <input type="text" className="input-field" placeholder="username or email@example.com"
                  value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  required autoComplete="username" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  <button type="button" onClick={() => setView('forgot1')}
                    className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    Forgot password?
                  </button>
                </div>
                <input type="password" className="input-field" placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required autoComplete="current-password" />
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
        )}

        {/* ── Forgot: Step 1 — Email ── */}
        {view === 'forgot1' && (
          <ForgotStep1
            onNext={(email) => { setFpEmail(email); setView('forgot2'); }}
            onBack={() => setView('login')}
          />
        )}

        {/* ── Forgot: Step 2 — OTP ── */}
        {view === 'forgot2' && (
          <ForgotStep2
            email={fpEmail}
            onNext={(otp) => { setFpOtp(otp); setView('forgot3'); }}
            onBack={() => setView('forgot1')}
          />
        )}

        {/* ── Forgot: Step 3 — New Password ── */}
        {view === 'forgot3' && (
          <ForgotStep3
            email={fpEmail}
            otp={fpOtp}
            onDone={() => { setView('login'); setFpEmail(''); setFpOtp(''); }}
          />
        )}
      </div>
    </div>
  );
};

export default Login;
