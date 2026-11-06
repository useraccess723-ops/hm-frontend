import { useState } from 'react';
import { API_BASE_URL, getApiBaseUrl } from '../../services/api';

const ID_TYPES = ['Aadhaar Card', 'Passport', 'Driving License', 'Voter ID', 'Other Govt ID'];

export default function GuestRegistrationPublic() {
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
  const [savedGuest, setSavedGuest] = useState(null);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ full_name: true });

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
      const baseUrl = getApiBaseUrl() || API_BASE_URL;
      const targetUrl = baseUrl ? `${baseUrl}/api/public/register-guest` : '/api/public/register-guest';
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          id_proof_type: form.id_proof_type,
          identification_number: form.identification_number.trim() || null,
          notes: form.notes.trim() || ''
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || payload.message || 'Failed to submit guest registration');
      }

      const data = await res.json();
      setSavedGuest(data);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'An error occurred while saving your details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      full_name: '',
      phone: '',
      email: '',
      id_proof_type: 'Aadhaar Card',
      identification_number: '',
      notes: ''
    });
    setTouched({});
    setError('');
    setSubmitted(false);
    setSavedGuest(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ede7f6',
      fontFamily: "'Roboto', 'Segoe UI', Arial, sans-serif",
      padding: '24px 16px 64px',
      color: '#202124',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>

        {/* Top Google Form Purple Accent Bar */}
        <div style={{
          height: 10,
          background: 'linear-gradient(90deg, #673ab7 0%, #7e57c2 60%, #512da8 100%)',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          marginBottom: -2
        }} />

        {/* Header / Title Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0 0 8px 8px',
          padding: '28px 24px 22px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          marginBottom: 14,
          borderLeft: '1px solid #dadce0',
          borderRight: '1px solid #dadce0',
          borderBottom: '1px solid #dadce0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              background: '#673ab7',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase'
            }}>
              StayFlow Hotel
            </span>
            <span style={{ fontSize: 13, color: '#5f6368' }}>Guest Self Check-in</span>
          </div>

          <h1 style={{
            margin: '0 0 8px',
            fontSize: 26,
            fontWeight: 700,
            color: '#202124',
            lineHeight: 1.25
          }}>
            Guest Registration Form
          </h1>

          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#3c4043', lineHeight: 1.5 }}>
            Welcome to StayFlow Hotel! Please complete this official guest registration card with your details. Your profile will be automatically saved in our front desk reservation system.
          </p>

          <div style={{ fontSize: 12, color: '#d93025', fontWeight: 500 }}>
            * Indicates required question
          </div>
        </div>

        {/* SUCCESS STATE: Google Form Confirmation Screen */}
        {submitted ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 8,
            padding: '32px 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            border: '1px solid #dadce0',
            textAlign: 'left'
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 22, color: '#202124', fontWeight: 600 }}>
              Guest Registration Form
            </h2>
            <div style={{
              padding: '12px 16px',
              background: '#e6f4ea',
              border: '1px solid #ceead6',
              borderRadius: 6,
              color: '#137333',
              fontSize: 15,
              fontWeight: 500,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ fontSize: 18 }}>✓</span> Your response has been recorded.
            </div>

            <p style={{ fontSize: 14, color: '#3c4043', lineHeight: 1.6, margin: '0 0 18px' }}>
              Thank you, <strong>{savedGuest?.full_name}</strong>! Your registration details have been securely saved to the StayFlow Hotel MySQL database. Please proceed to the front desk reception to collect your room keys.
            </p>

            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#1a73e8',
                fontSize: 14,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Submit another response
            </button>
          </div>
        ) : (
          /* FORM ENTRY: Google Form Style Question Cards */
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>

            {/* Error banner if submission fails */}
            {error && (
              <div style={{
                background: '#fce8e6',
                border: '1px solid #f28b82',
                borderRadius: 8,
                padding: '12px 16px',
                color: '#c5221f',
                fontSize: 14,
                fontWeight: 500
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Question 1: Full Name */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '22px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              border: touched.full_name && !form.full_name.trim() ? '2px solid #d93025' : '1px solid #dadce0',
              transition: 'border 0.2s'
            }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 12 }}>
                Full Name <span style={{ color: '#d93025' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, full_name: true }))}
                placeholder="Your answer"
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: touched.full_name && !form.full_name.trim() ? '2px solid #d93025' : '1px solid #70757a',
                  padding: '8px 0',
                  fontSize: 15,
                  outline: 'none',
                  background: 'transparent',
                  color: '#202124',
                  boxSizing: 'border-box'
                }}
              />
              {touched.full_name && !form.full_name.trim() && (
                <div style={{ color: '#d93025', fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚠️</span> This is a required question
                </div>
              )}
            </div>

            {/* Question 2: Phone Number */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '22px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              border: '1px solid #dadce0'
            }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 6 }}>
                Phone Number
              </label>
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 10 }}>
                e.g. +91 98765 43210 (used for booking updates and room keys)
              </div>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="Your answer"
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #70757a',
                  padding: '8px 0',
                  fontSize: 15,
                  outline: 'none',
                  background: 'transparent',
                  color: '#202124',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Question 3: Email Address */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '22px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              border: '1px solid #dadce0'
            }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 10 }}>
                e.g. guest@example.com (used for invoice and booking confirmation)
              </div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="Your answer"
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #70757a',
                  padding: '8px 0',
                  fontSize: 15,
                  outline: 'none',
                  background: 'transparent',
                  color: '#202124',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Question 4: ID Proof Type and ID Number */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '22px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              border: '1px solid #dadce0'
            }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 6 }}>
                ID Proof Type and ID Number <span style={{ color: '#d93025' }}>*</span>
              </label>
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 14 }}>
                Required by hospitality regulations for guest verification.
              </div>

              {/* ID Proof Type Radio List */}
              <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                {ID_TYPES.map((type) => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#202124'
                    }}
                  >
                    <input
                      type="radio"
                      name="id_proof_type"
                      checked={form.id_proof_type === type}
                      onChange={() => setField('id_proof_type', type)}
                      style={{ accentColor: '#673ab7', width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>

              {/* ID Number Text Input */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#5f6368', marginBottom: 4 }}>
                  Enter {form.id_proof_type} Number:
                </div>
                <input
                  type="text"
                  value={form.identification_number}
                  onChange={(e) => setField('identification_number', e.target.value)}
                  placeholder="Your answer"
                  style={{
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #70757a',
                    padding: '8px 0',
                    fontSize: 15,
                    outline: 'none',
                    background: 'transparent',
                    color: '#202124',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Question 5: Notes and Preferences */}
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '22px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              border: '1px solid #dadce0'
            }}>
              <label style={{ display: 'block', fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 6 }}>
                Notes and Preferences
              </label>
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 10 }}>
                Special requests, dietary needs, preferred room floor, pillow type, or arrival requests
              </div>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Your answer"
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #70757a',
                  padding: '8px 0',
                  fontSize: 15,
                  outline: 'none',
                  background: 'transparent',
                  color: '#202124',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Form Footer Action Bar: Submit & Clear */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10
            }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#673ab7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '11px 28px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                  letterSpacing: 0.25,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'background 0.2s'
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1a73e8',
                  fontSize: 14,
                  cursor: 'pointer',
                  padding: '8px 12px'
                }}
              >
                Clear form
              </button>
            </div>

            {/* Form Footnote */}
            <div style={{
              textAlign: 'center',
              marginTop: 18,
              fontSize: 12,
              color: '#70757a'
            }}>
              StayFlow Hotel • Powered by StayFlow PMS Guest Portal
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
