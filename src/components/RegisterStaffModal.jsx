import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const HOTEL_STAFF_ROLES = [
  { code: 'FRONT_DESK', label: 'Front Desk Agent & Reception', icon: '🛎️', desc: 'Guest check-in/out, folio billing & key allocation' },
  { code: 'HOUSEKEEPING', label: 'Housekeeping Supervisor & Staff', icon: '🧹', desc: 'Room cleaning, maintenance status & linen logistics' },
  { code: 'RESERVATION_MANAGER', label: 'Reservation Manager', icon: '📅', desc: 'Direct booking orchestration & channel allocation' },
  { code: 'GENERAL_MANAGER', label: 'General Manager / Executive', icon: '👔', desc: 'Complete operational oversight & managerial analytics' },
  { code: 'FOOD_BEVERAGE', label: 'Food & Beverage / Restaurant', icon: '🍽️', desc: 'Restaurant, room service orders & kitchen ticketing' },
  { code: 'FINANCE', label: 'Finance & Accounting Manager', icon: '💰', desc: 'Night audit reconciliation, invoices & ledger accounting' },
  { code: 'ENGINEERING', label: 'Engineering & Maintenance', icon: '🔧', desc: 'Work order resolution, asset tracking & preventative maintenance' },
  { code: 'GUEST_SERVICES', label: 'Concierge & Guest Services', icon: '🛎️', desc: 'VIP services, baggage, tour booking & guest requests' },
  { code: 'REVENUE_MANAGER', label: 'Revenue & Yield Manager', icon: '📈', desc: 'Dynamic pricing tiers, occupancy forecasts & channel margins' },
  { code: 'HUMAN_RESOURCES', label: 'Human Resources Manager', icon: '👥', desc: 'Staff scheduling, payroll profiles & departmental duties' },
  { code: 'SALES_MARKETING', label: 'Sales & Marketing Executive', icon: '📣', desc: 'Corporate packages, promotional codes & campaign metrics' },
  { code: 'SECURITY', label: 'Security & Safety Officer', icon: '🛡️', desc: 'Access security logging, surveillance reports & emergency response' },
  { code: 'NIGHT_AUDITOR', label: 'Night Auditor', icon: '🌙', desc: 'Day-end closure, transaction balancing & rollover audits' },
  { code: 'ADMIN', label: 'Hotel System Administrator', icon: '🔐', desc: 'Hotel-wide settings, user accounts & configuration' },
];

export default function RegisterStaffModal({ isOpen, onClose, onSuccess }) {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);

  const [formData, setFormData] = useState({
    tenant_id: '',
    full_name: '',
    email: '',
    role: 'FRONT_DESK',
    department: 'Front Office',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchHotels = async () => {
      try {
        setLoadingHotels(true);
        const res = await api('/api/auth/hotels');
        if (Array.isArray(res) && res.length > 0) {
          setHotels(res);
          setFormData((prev) => ({
            ...prev,
            tenant_id: prev.tenant_id || res[0].id,
          }));
        } else {
          // Fallback to default tenant
          setHotels([{ id: 1, name: 'Noiré Coastal Retreat', code: 'HOTEL-001', city: 'Goa' }]);
          setFormData((prev) => ({ ...prev, tenant_id: 1 }));
        }
      } catch (err) {
        // Fallback gracefully
        setHotels([{ id: 1, name: 'Noiré Coastal Retreat', code: 'HOTEL-001', city: 'Goa' }]);
        setFormData((prev) => ({ ...prev, tenant_id: 1 }));
      } finally {
        setLoadingHotels(false);
      }
    };
    fetchHotels();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    let dept = 'Front Office';
    if (newRole === 'HOUSEKEEPING') dept = 'Housekeeping';
    else if (newRole === 'FOOD_BEVERAGE') dept = 'F&B Service';
    else if (newRole === 'FINANCE') dept = 'Finance & Accounts';
    else if (newRole === 'ENGINEERING') dept = 'Engineering & Facilities';
    else if (newRole === 'SECURITY') dept = 'Security';
    else if (newRole === 'HUMAN_RESOURCES') dept = 'Human Resources';
    else if (newRole === 'REVENUE_MANAGER' || newRole === 'RESERVATION_MANAGER') dept = 'Reservations & Revenue';
    else if (newRole === 'SALES_MARKETING') dept = 'Sales & Marketing';
    else if (newRole === 'GENERAL_MANAGER' || newRole === 'ADMIN') dept = 'Executive Management';

    setFormData((prev) => ({
      ...prev,
      role: newRole,
      department: dept,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.tenant_id) {
      setError('Please select your assigned hotel property.');
      return;
    }
    if (!formData.full_name.trim()) {
      setError('Please provide your full employee name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid staff email address.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenant_id: parseInt(formData.tenant_id, 10),
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        department: formData.department.trim() || null,
        password: formData.password,
      };

      const res = await api('/api/auth/register-staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onSuccess?.(res);
      handleClose();
    } catch (err) {
      setError(err.message || 'Staff registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFormData({
      tenant_id: hotels[0]?.id || '',
      full_name: '',
      email: '',
      role: 'FRONT_DESK',
      department: 'Front Office',
      password: '',
      confirm_password: '',
    });
    onClose?.();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 14, 12, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          backgroundColor: '#0c1b18',
          border: '1px solid rgba(201, 158, 77, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#FAF5EE',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#FAF5EE',
                  margin: 0,
                  letterSpacing: '0.02em',
                }}
              >
                Hotel Staff Registration
              </h2>
            </div>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 13,
                color: '#9CA3AF',
                lineHeight: 1.4,
              }}
            >
              Register an employee account for your designated hotel property and operational role.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '22px 28px 26px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(224, 118, 109, 0.12)',
                border: '1px solid rgba(224, 118, 109, 0.35)',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#f87171',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Assigned Hotel Property */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--brass, #c99e4d)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              Assigned Hotel Property *
            </label>
            <select
              name="tenant_id"
              value={formData.tenant_id}
              onChange={handleChange}
              disabled={loadingHotels}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#122622',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#FAF5EE',
                fontSize: 14,
                outline: 'none',
              }}
              required
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id} style={{ background: '#122622', color: '#fff' }}>
                  🏨 {h.name} {h.code ? `(${h.code})` : ''} — {h.city || 'India'}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              Select the hotel property you are employed at.
            </div>
          </div>

          {/* Full Name & Official Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#CBD8D4',
                  marginBottom: 6,
                }}
              >
                Employee Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                placeholder="e.g. Priya Sharma"
                value={formData.full_name}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: '#122622',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FAF5EE',
                  fontSize: 14,
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#CBD8D4',
                  marginBottom: 6,
                }}
              >
                Staff Email Address *
              </label>
              <input
                type="email"
                name="email"
                placeholder="priya.staff@hotel.com"
                value={formData.email}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: '#122622',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FAF5EE',
                  fontSize: 14,
                  outline: 'none',
                }}
                required
              />
            </div>
          </div>

          {/* Hotel Staff Role */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--brass, #c99e4d)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              Hotel Staff Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleRoleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#122622',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#FAF5EE',
                fontSize: 14,
                outline: 'none',
              }}
              required
            >
              {HOTEL_STAFF_ROLES.map((r) => (
                <option key={r.code} value={r.code} style={{ background: '#122622', color: '#fff' }}>
                  {r.icon} {r.label}
                </option>
              ))}
            </select>
            {/* Role explanation */}
            <div
              style={{
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 7,
                backgroundColor: 'rgba(201, 158, 77, 0.08)',
                border: '1px solid rgba(201, 158, 77, 0.2)',
                fontSize: 12,
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>ℹ️</span>
              <span>
                {HOTEL_STAFF_ROLES.find((r) => r.code === formData.role)?.desc ||
                  'Assigned role permissions will apply upon login.'}
              </span>
            </div>
          </div>

          {/* Department (Optional) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#CBD8D4',
                marginBottom: 6,
              }}
            >
              Department / Operational Unit
            </label>
            <input
              type="text"
              name="department"
              placeholder="e.g. Front Office / Operations"
              value={formData.department}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#122622',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#FAF5EE',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          {/* Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#CBD8D4' }}>
                  Password (min 8 chars) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brass, #c99e4d)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create strong password"
                value={formData.password}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: '#122622',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FAF5EE',
                  fontSize: 14,
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#CBD8D4',
                  marginBottom: 6,
                }}
              >
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirm_password"
                placeholder="Re-enter password"
                value={formData.confirm_password}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: '#122622',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FAF5EE',
                  fontSize: 14,
                  outline: 'none',
                }}
                required
              />
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#9CA3AF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #c99e4d 0%, #a87e35 100%)',
                border: 'none',
                color: '#13243a',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(201, 158, 77, 0.35)',
              }}
            >
              {loading ? 'Registering Staff…' : '✓ Create Staff Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
