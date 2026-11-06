import React, { useState } from 'react';
import { api } from '../services/api';

export default function RegisterTenantModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    country: 'India',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    contact_email: '',
    contact_phone: '',
    subscription_plan: 'Professional',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTenant, setCreatedTenant] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide the Hotel / Organization name.');
      return;
    }
    if (!formData.admin_name.trim()) {
      setError('Please provide the administrator full name.');
      return;
    }
    if (!formData.admin_email.trim() || !formData.admin_email.includes('@')) {
      setError('Please provide a valid administrator email address.');
      return;
    }
    if (formData.admin_password.length < 8) {
      setError('Administrator password must be at least 8 characters long.');
      return;
    }
    if (formData.admin_password !== formData.confirm_password) {
      setError('Administrator passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() ? formData.code.trim().toUpperCase() : null,
        city: formData.city.trim() || '—',
        country: formData.country.trim(),
        currency: formData.currency.trim().toUpperCase(),
        timezone: formData.timezone.trim(),
        contact_email: formData.contact_email.trim().toLowerCase() || formData.admin_email.trim().toLowerCase(),
        contact_phone: formData.contact_phone.trim() || null,
        subscription_plan: formData.subscription_plan,
        admin_name: formData.admin_name.trim(),
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_password: formData.admin_password,
      };

      const res = await api('/api/auth/register-tenant', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedTenant(res);
      onSuccess?.(res);
    } catch (err) {
      setError(err.message || 'Failed to register hotel organization.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedTenant(null);
    setError('');
    setFormData({
      name: '',
      code: '',
      city: '',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      contact_email: '',
      contact_phone: '',
      subscription_plan: 'Professional',
      admin_name: '',
      admin_email: '',
      admin_password: '',
      confirm_password: '',
    });
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
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--panel, #18191c)',
          border: '1px solid var(--line, rgba(255,255,255,0.12))',
          borderRadius: 14,
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          color: 'var(--ink, var(--text, #fff))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'rgba(201, 158, 77, 0.15)',
              color: 'var(--brass, #c99e4d)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 20
            }}>
              🏨
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Register New Hotel Account</h3>
              <span style={{ fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                Multi-Tenant Cloud Onboarding · Dedicated Isolation
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

        {createdTenant ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              display: 'grid',
              placeItems: 'center',
              fontSize: 26,
              margin: '0 auto 16px'
            }}>
              ✓
            </div>
            <h4 style={{ fontSize: 18, margin: '0 0 8px', color: '#fff' }}>Organization Successfully Created!</h4>
            <p style={{ fontSize: 13, color: 'var(--sub, #9ca3af)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Your hotel property <b>{createdTenant.tenant?.name}</b> is ready with its dedicated database partition, starter rooms, and admin credentials.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--line, rgba(255,255,255,0.1))',
              borderRadius: 10,
              padding: '14px 18px',
              textAlign: 'left',
              maxWidth: 440,
              margin: '0 auto 24px',
              fontSize: 13
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--sub, #9ca3af)' }}>Property Code:</span>
                <span style={{ fontWeight: 700, color: 'var(--brass, #c99e4d)' }}>{createdTenant.tenant?.code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--sub, #9ca3af)' }}>Subscription:</span>
                <span style={{ fontWeight: 600 }}>{createdTenant.tenant?.subscription_plan} Tier</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--sub, #9ca3af)' }}>Admin Login:</span>
                <span style={{ fontWeight: 600, color: 'var(--brass, #c99e4d)' }}>{createdTenant.admin?.email}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn primary"
                style={{ padding: '10px 24px', fontSize: 14 }}
              >
                Proceed to Sign In →
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* ── Section 1: Hotel Property Information ── */}
            <div style={{ marginBottom: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brass, #c99e4d)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Property & Organization Details
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Hotel / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Royal Heritage Resort & Spa"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    City / Location
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Jaipur, Rajasthan"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Property Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g. RHR-01 (Auto-generated if blank)"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Operating Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="register-modal-select"
                    style={selectStyle}
                    aria-label="Operating Currency"
                  >
                    <option value="INR" style={optionStyle}>INR (₹) - Indian Rupee</option>
                    <option value="USD" style={optionStyle}>USD ($) - US Dollar</option>
                    <option value="EUR" style={optionStyle}>EUR (€) - Euro</option>
                    <option value="GBP" style={optionStyle}>GBP (£) - British Pound</option>
                    <option value="AED" style={optionStyle}>AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Subscription Plan Tier
                  </label>
                  <select
                    name="subscription_plan"
                    value={formData.subscription_plan}
                    onChange={handleChange}
                    className="register-modal-select"
                    style={selectStyle}
                    aria-label="Subscription Plan Tier"
                  >
                    <option value="Starter" style={optionStyle}>Starter (Up to 50 Rooms)</option>
                    <option value="Professional" style={optionStyle}>Professional (Up to 150 Rooms)</option>
                    <option value="Enterprise" style={optionStyle}>Enterprise (Unlimited Rooms)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Primary Administrator Credentials ── */}
            <div style={{ marginBottom: 18, paddingTop: 14, borderTop: '1px solid var(--line, rgba(255,255,255,0.08))' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brass, #c99e4d)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Hotel Administrator Account (Full Control)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="admin_name"
                    value={formData.admin_name}
                    onChange={handleChange}
                    placeholder="e.g. Vikram Mehra"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Admin Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    name="admin_email"
                    value={formData.admin_email}
                    onChange={handleChange}
                    placeholder="e.g. admin@royalheritage.com"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Admin Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Official Hotel Email
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="e.g. reservations@royalheritage.com"
                    style={inputStyle}
                  />
                </div>
              </div>
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
                style={{ padding: '9px 22px', fontSize: 13, minWidth: 170 }}
              >
                {loading ? 'Creating Hotel Tenant…' : 'Register Hotel Organization ✓'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 7,
  background: 'var(--panel-alt, rgba(255, 255, 255, 0.04))',
  border: '1px solid var(--line, rgba(255,255,255,0.15))',
  color: 'var(--ink, inherit)',
  fontSize: 13,
};

const selectStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 7,
  background: 'var(--panel, #18191c)',
  border: '1px solid var(--line, rgba(255,255,255,0.15))',
  color: 'var(--ink, #ffffff)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  outline: 'none',
};

const optionStyle = {
  backgroundColor: 'var(--panel, #18191c)',
  color: 'var(--ink, #ffffff)',
  fontSize: 13,
  padding: '6px 10px',
};
