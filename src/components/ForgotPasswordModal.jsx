import React, { useState } from 'react';
import { api } from '../services/api';

export default function ForgotPasswordModal({ isOpen, onClose, onPasswordResetSuccess }) {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoCode, setDemoCode] = useState('');

  if (!isOpen) return null;

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email || !email.includes('@')) {
      setError('Please provide a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      setSuccessMsg(res.message || 'Verification code dispatched.');
      if (res.verification_code) {
        setDemoCode(res.verification_code);
        setCode(res.verification_code); // Pre-fill for instant local testing convenience
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to dispatch password reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!code || code.trim().length < 4) {
      setError('Please enter the verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          new_password: newPassword
        })
      });
      setSuccessMsg(res.message || 'Password successfully updated!');
      setTimeout(() => {
        onPasswordResetSuccess?.(email.trim().toLowerCase());
        handleClose();
      }, 1600);
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setDemoCode('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--panel, #18191c)',
          border: '1px solid var(--line, rgba(255,255,255,0.12))',
          borderRadius: 14,
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          color: 'var(--text, #fff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'rgba(201, 158, 77, 0.15)',
              color: 'var(--brass, #c99e4d)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 18
            }}>
              🔑
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Reset Account Password</h3>
              <span style={{ fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                {step === 1 ? 'Step 1: Verify your registered email' : 'Step 2: Choose your new password'}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted, #6b7280)',
              cursor: 'pointer',
              fontSize: 20,
              padding: '4px 8px'
            }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#f87171',
            fontSize: 13,
            marginBottom: 16,
            lineHeight: 1.4
          }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#4ade80',
            fontSize: 13,
            marginBottom: 16,
            lineHeight: 1.4
          }}>
            ✓ {successMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode}>
            <p style={{ fontSize: 13, color: 'var(--sub, #9ca3af)', marginBottom: 16, lineHeight: 1.5 }}>
              Enter the email address associated with your StayFlow account. We will generate a secure one-time verification code to reset your credentials.
            </p>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 6 }}>
                Account Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@hotel.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--line, rgba(255,255,255,0.15))',
                  color: 'inherit',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn primary"
                style={{ padding: '8px 20px', fontSize: 13, minWidth: 140 }}
              >
                {loading ? 'Generating…' : 'Send Reset Code →'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            {demoCode && (
              <div style={{
                background: 'rgba(201, 158, 77, 0.1)',
                border: '1px dashed var(--brass, #c99e4d)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--brass, #c99e4d)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span><b>Verification Code:</b> <code style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em' }}>{demoCode}</code></span>
                <span style={{ fontSize: 11, opacity: 0.8 }}>(Auto-filled for local test)</span>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 6 }}>
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 482910"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--line, rgba(255,255,255,0.15))',
                  color: 'inherit',
                  fontSize: 14,
                  letterSpacing: '0.15em',
                  fontWeight: 600
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 6 }}>
                New Password (minimum 8 characters)
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--line, rgba(255,255,255,0.15))',
                  color: 'inherit',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 6 }}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--line, rgba(255,255,255,0.15))',
                  color: 'inherit',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <input
                type="checkbox"
                id="show-pw-toggle"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="show-pw-toggle" style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', cursor: 'pointer' }}>
                Show password characters
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'none', border: 'none', color: 'var(--sub, #9ca3af)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Back to email
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn"
                  style={{ padding: '8px 14px', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn primary"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                >
                  {loading ? 'Updating…' : 'Update Password ✓'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
