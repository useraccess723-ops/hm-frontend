import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { api, API_BASE_URL, getApiBaseUrl } from '../../services/api';

const ID_PROOF_TYPES = [
  'Aadhaar Card',
  'Passport',
  'Driving License',
  'Voter ID',
  'PAN Card / Govt ID',
  'Other Photo ID'
];

export default function GuestRegistration() {
  const navigate = useNavigate();
  const { user, refresh, notify } = useStore();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_proof_type: 'Aadhaar Card',
    identification_number: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registeredGuest, setRegisteredGuest] = useState(null);
  const [error, setError] = useState('');

  // Pre-fill user info if available from logged-in customer account
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || user.full_name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('Please enter your full name');
      return;
    }
    const idNum = form.identification_number.trim();
    if (!idNum) {
      setError('ID Number is required.');
      return;
    }
    if (form.id_proof_type === 'Aadhaar Card') {
      const cleanAadhaar = idNum.replace(/[\s-]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        setError('Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const combinedId = idNum ? `${form.id_proof_type}: ${idNum}` : form.id_proof_type;

      let result = null;

      // Primary: Save using existing backend API /api/guests associated with logged-in user
      try {
        result = await api('/api/guests', {
          method: 'POST',
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            identification_number: combinedId,
            notes: form.notes.trim() || ''
          })
        });
      } catch (authErr) {
        // Fallback: public registration endpoint if session token is unauthenticated
        const baseUrl = getApiBaseUrl() || API_BASE_URL;
        const targetUrl = baseUrl ? `${baseUrl}/api/public/register-guest` : '/api/public/register-guest';
        const fallbackRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            id_proof_type: form.id_proof_type,
            identification_number: idNum || null,
            notes: form.notes.trim() || ''
          })
        });
        if (!fallbackRes.ok) {
          const errBody = await fallbackRes.json().catch(() => ({}));
          throw new Error(errBody.detail || errBody.message || 'Failed to submit registration');
        }
        result = await fallbackRes.json();
      }

      const guestDbId = result?.guest_id || result?.id;
      setRegisteredGuest({
        id: guestDbId,
        guest_code: result?.guest_code || (guestDbId ? `GST-${String(guestDbId).padStart(4, '0')}` : undefined),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || '—',
        email: form.email.trim() || '—',
        id_proof: combinedId,
        notes: form.notes.trim() || 'None'
      });
      setSubmitted(true);
      await refresh?.();
      notify?.('Guest registration saved successfully in MySQL');
    } catch (err) {
      setError(err.message || 'An error occurred while saving your details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      full_name: user?.full_name || '',
      phone: '',
      email: user?.email || '',
      id_proof_type: 'Aadhaar Card',
      identification_number: '',
      notes: ''
    });
    setSubmitted(false);
    setRegisteredGuest(null);
    setError('');
  };

  return (
    <div style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '24px 16px 48px',
      fontFamily: 'var(--body, sans-serif)',
      color: 'var(--ink, #16222F)'
    }}>
      {/* Top Header Card */}
      <div className="panel" style={{
        marginBottom: 18,
        borderRadius: 12,
        border: '1px solid var(--line, #DCE2E7)',
        background: 'var(--panel, #FFFFFF)',
        padding: '24px 28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'var(--brass, #B4852F)',
              color: '#13243A',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 20,
              fontFamily: 'var(--head, sans-serif)'
            }}>
              S
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--head, sans-serif)', color: 'var(--ink)' }}>
                StayFlow Hotel
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted, #5E6C7A)' }}>
                Guest Self-Registration & Check-in Portal
              </div>
            </div>
          </div>

          {user && (
            <div style={{
              background: 'var(--teal-soft, #D7EEED)',
              color: 'var(--teal, #0E7C7B)',
              padding: '4px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>👤</span> Logged in as: {user.full_name} ({user.email})
            </div>
          )}
        </div>

        <h1 style={{ fontSize: 24, margin: '14px 0 6px', fontFamily: 'var(--head, sans-serif)' }}>
          Guest Registration
        </h1>
        <p style={{ margin: 0, color: 'var(--muted, #5E6C7A)', fontSize: 14 }}>
          Please complete your registration details below. Your information is securely saved directly to the hotel management database.
        </p>
      </div>

      {/* SUCCESS CONFIRMATION: Displays only the customer's own record (Privacy Protected) */}
      {submitted ? (
        <div className="panel" style={{
          padding: '32px 28px',
          borderRadius: 12,
          border: '1px solid var(--line, #DCE2E7)',
          background: 'var(--panel, #FFFFFF)',
          animation: 'fadeSlideIn .25s ease-out'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 99,
            background: 'var(--green-soft, #DAF0E3)',
            color: 'var(--green, #2E8A57)',
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 16
          }}>
            <span>✓</span> Registration Details Saved Successfully
          </div>

          <h2 style={{ margin: '0 0 10px', fontSize: 20, fontFamily: 'var(--head, sans-serif)' }}>
            Welcome, {registeredGuest?.full_name}!
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            Your registration details have been verified and securely saved to the StayFlow Hotel MySQL database. Please proceed to the reception desk to collect your room keys.
          </p>

          <div style={{
            background: 'var(--bg, #EDF0F2)',
            padding: 18,
            borderRadius: 8,
            border: '1px solid var(--line)',
            fontSize: 13,
            display: 'grid',
            gap: 8,
            marginBottom: 24
          }}>
            <div><strong>Guest ID:</strong> {registeredGuest?.guest_code || (registeredGuest?.id ? `GST-${String(registeredGuest.id).padStart(4, '0')}` : '—')}</div>
            <div><strong>Full Name:</strong> {registeredGuest?.full_name}</div>
            <div><strong>Phone Number:</strong> {registeredGuest?.phone}</div>
            <div><strong>Email Address:</strong> {registeredGuest?.email}</div>
            <div><strong>ID Proof:</strong> {registeredGuest?.id_proof}</div>
            <div><strong>Notes / Preferences:</strong> {registeredGuest?.notes}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              onClick={handleReset}
            >
              + Register Another Guest
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate('/guests')}
            >
              Go to Guest Directory
            </button>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM */
        <form onSubmit={handleSubmit} className="panel" style={{
          padding: '28px',
          borderRadius: 12,
          border: '1px solid var(--line, #DCE2E7)',
          background: 'var(--panel, #FFFFFF)'
        }}>
          {error && (
            <div style={{
              background: 'var(--red-soft, #F7DEDB)',
              color: 'var(--red, #B9433A)',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 18,
              border: '1px solid var(--red)'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 18 }}>
            {/* Field 1: Full Name */}
            <div className="field">
              <label style={{ fontWeight: 600, fontSize: 14 }}>
                Full Name <span style={{ color: 'var(--red, #B9433A)' }}>*</span>
              </label>
              <input
                required
                type="text"
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                placeholder="e.g. Ramesh Patel"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--panel)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Field 2 & 3: Phone and Email */}
            <div className="grid2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 14 }}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 14 }}>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="guest@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Field 4 & 5: ID Proof Type and ID Number */}
            <div className="grid2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 14 }}>ID Proof Type</label>
                <select
                  value={form.id_proof_type}
                  onChange={(e) => setField('id_proof_type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                >
                  {ID_PROOF_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 14 }}>ID Number <span style={{ color: 'var(--red, #ef4444)' }}>*</span></label>
                <input
                  type="text"
                  value={form.identification_number}
                  onChange={(e) => setField('identification_number', e.target.value)}
                  placeholder="e.g. 5432-XXXX-1234"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Field 6: Notes or Preferences */}
            <div className="field">
              <label style={{ fontWeight: 600, fontSize: 14 }}>Notes or Preferences</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Special requests, dietary preferences, room preferences, arrival notes..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--panel)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
              <button
                type="submit"
                className="btn primary"
                disabled={submitting}
                style={{
                  padding: '12px 32px',
                  fontSize: 15,
                  fontWeight: 700
                }}
              >
                {submitting ? 'Saving to Database…' : 'Submit Registration'}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={handleReset}
                disabled={submitting}
              >
                Clear Form
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
