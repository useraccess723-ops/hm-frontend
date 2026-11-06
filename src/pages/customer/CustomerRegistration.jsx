import { useState } from 'react';
import { API_BASE_URL, getApiBaseUrl } from '../../services/api';
import '../../styles/CustomerRegistration.css';

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Phone validation regex allowing international formats (+91 9876543210, (123) 456-7890, etc.)
const PHONE_CHARS_REGEX = /^[\+]?[0-9\s\-\(\)\.]{7,30}$/;

export default function CustomerRegistration() {
  // Extract hotel context strictly from the hotel-specific registration URL or path
  const getHotelFromUrl = () => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('hotel') || params.get('property') || params.get('code') || params.get('tenant_id');
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();

    // Check pathname: /customer-registration/:hotelCode
    const pathname = window.location.pathname || '';
    const match = pathname.match(/^\/customer-registration\/([^/?#]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
    return '';
  };

  const hotelContext = getHotelFromUrl();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    preferences: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [registeredData, setRegisteredData] = useState(null);

  // Validation function per field
  const validateField = (name, value, allValues = form) => {
    const val = (value || '').trim();
    switch (name) {
      case 'full_name':
        if (!val) return 'Customer Name is required.';
        if (val.length < 2) return 'Customer Name must be at least 2 characters long.';
        return '';
      case 'email':
        if (!val) return 'Email Address is required.';
        if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address (e.g. name@domain.com).';
        return '';
      case 'phone':
        if (!val) return 'Phone Number is required.';
        const digitsOnly = val.replace(/\D/g, '');
        if (digitsOnly.length < 7) return 'Phone number must contain at least 7 digits.';
        if (!PHONE_CHARS_REGEX.test(val)) return 'Please enter a valid phone number.';
        return '';
      case 'password':
        if (!val) return 'Password is required.';
        if (val.length < 6) return 'Password must be at least 6 characters long.';
        return '';
      case 'confirm_password':
        if (!val) return 'Please confirm your password.';
        if (val !== (allValues.password || '').trim()) return 'Passwords do not match.';
        return '';
      case 'preferences':
        if (val.length > 2000) return 'Preferences cannot exceed 2000 characters.';
        return '';
      default:
        return '';
    }
  };

  // Run full form validation
  const validateForm = () => {
    const newErrors = {};
    const nameErr = validateField('full_name', form.full_name);
    if (nameErr) newErrors.full_name = nameErr;

    const emailErr = validateField('email', form.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validateField('phone', form.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const pwdErr = validateField('password', form.password);
    if (pwdErr) newErrors.password = pwdErr;

    const cpwdErr = validateField('confirm_password', form.confirm_password, form);
    if (cpwdErr) newErrors.confirm_password = cpwdErr;

    const prefErr = validateField('preferences', form.preferences);
    if (prefErr) newErrors.preferences = prefErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);

    if (serverError) setServerError('');

    // If field was touched, re-validate real-time
    if (touched[name]) {
      const err = validateField(name, value, nextForm);
      setErrors(prev => ({ ...prev, [name]: err }));
    }
    // If updating password, also re-validate confirm_password if touched
    if (name === 'password' && touched.confirm_password) {
      const cpwdErr = validateField('confirm_password', nextForm.confirm_password, nextForm);
      setErrors(prev => ({ ...prev, confirm_password: cpwdErr }));
    }
  };

  // Handle field blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, value, form);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      full_name: true,
      email: true,
      phone: true,
      password: true,
      confirm_password: true,
      preferences: true
    });

    if (!hotelContext) {
      setServerError('A valid hotel registration link is required to create a customer account. Please access this page using the link provided by your hotel.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      const baseUrl = (getApiBaseUrl() || API_BASE_URL || '').replace(/\/$/, '');

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password.trim(),
        confirm_password: form.confirm_password.trim(),
        hotel: hotelContext,
        preferences: form.preferences.trim()
      };

      const res = await fetch(`${baseUrl}/api/public/customer-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let msg = 'Failed to submit registration. Please check your details and try again.';
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            msg = data.detail.map(d => d.msg || d.message).join(' | ');
          } else if (typeof data.detail === 'string') {
            msg = data.detail;
          }
        } else if (data.message) {
          msg = data.message;
        }
        throw new Error(msg);
      }

      setRegisteredData(data.data || {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        hotel_name: data.data?.hotel_name || 'StayFlow Hotel',
        preferences: form.preferences.trim(),
        guest_id: data.guest_id || data.id || 'CONFIRMED'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err.message || 'Network error occurred while connecting to the hotel server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      preferences: ''
    });
    setErrors({});
    setTouched({});
    setServerError('');
    setRegisteredData(null);
  };

  const handleGoToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="cr-container" id="customer-registration-page">
      <div className="cr-wrapper">
        {/* Luxury Hotel Header Branding */}
        <header className="cr-brand-header">
          <div className="cr-crest" aria-hidden="true">S</div>
          <h1 className="cr-hotel-name">StayFlow Hotel & Luxury Suites</h1>
          <p className="cr-hotel-subtitle">Guest Registration & Account Portal</p>
        </header>

        {/* Main Registration Card */}
        <div className="cr-card" id="customer-reg-card">
          {!registeredData ? (
            <>
              {/* Card Title & Instructions */}
              <div className="cr-card-head">
                <h2 className="cr-card-title">
                  <span>🛎️</span> Customer Registration
                </h2>
                <p className="cr-card-desc">
                  Create your personal guest account to manage reservations, view itemized invoices, request hotel amenities, and settle balances seamlessly online.
                </p>
              </div>

              {/* Registration Form */}
              <form className="cr-form" onSubmit={handleSubmit} noValidate>
                {/* Missing Hotel Context Security Alert */}
                {!hotelContext && (
                  <div className="cr-alert cr-alert-error" role="alert" id="customer-reg-missing-hotel">
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                      <strong>Hotel Registration Link Required</strong><br />
                      This registration portal must be accessed using your hotel's official registration link or QR code. Please verify your reservation link or contact your hotel front desk.
                    </div>
                  </div>
                )}

                {/* Server Error Alert */}
                {serverError && (
                  <div className="cr-alert cr-alert-error" role="alert" id="customer-reg-alert-error">
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>{serverError}</div>
                  </div>
                )}

                {/* Field 1: Customer Full Name */}
                <div className="cr-field">
                  <label htmlFor="customer-fullname" className="cr-label">
                    <span>
                      Customer Name <span className="cr-required-star" aria-label="Required">*</span>
                    </span>
                  </label>
                  <div className="cr-input-wrapper">
                    <span className="cr-input-icon" aria-hidden="true">👤</span>
                    <input
                      id="customer-fullname"
                      name="full_name"
                      type="text"
                      className={`cr-input ${touched.full_name && errors.full_name ? 'cr-has-error' : ''}`}
                      placeholder="e.g. Vikram Malhotra"
                      value={form.full_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="name"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(touched.full_name && errors.full_name)}
                    />
                  </div>
                  {touched.full_name && errors.full_name && (
                    <div className="cr-error-msg" id="name-error" role="alert">
                      <span>•</span> {errors.full_name}
                    </div>
                  )}
                </div>

                {/* Field 2: Email Address */}
                <div className="cr-field">
                  <label htmlFor="customer-email" className="cr-label">
                    <span>
                      Email Address <span className="cr-required-star" aria-label="Required">*</span>
                    </span>
                  </label>
                  <div className="cr-input-wrapper">
                    <span className="cr-input-icon" aria-hidden="true">✉️</span>
                    <input
                      id="customer-email"
                      name="email"
                      type="email"
                      className={`cr-input ${touched.email && errors.email ? 'cr-has-error' : ''}`}
                      placeholder="e.g. customer@hotel.com"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="email"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(touched.email && errors.email)}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <div className="cr-error-msg" id="email-error" role="alert">
                      <span>•</span> {errors.email}
                    </div>
                  )}
                </div>

                {/* Field 3: Phone Number */}
                <div className="cr-field">
                  <label htmlFor="customer-phone" className="cr-label">
                    <span>
                      Phone Number <span className="cr-required-star" aria-label="Required">*</span>
                    </span>
                  </label>
                  <div className="cr-input-wrapper">
                    <span className="cr-input-icon" aria-hidden="true">📞</span>
                    <input
                      id="customer-phone"
                      name="phone"
                      type="tel"
                      className={`cr-input ${touched.phone && errors.phone ? 'cr-has-error' : ''}`}
                      placeholder="e.g. +91 98765 43210"
                      value={form.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="tel"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(touched.phone && errors.phone)}
                    />
                  </div>
                  {touched.phone && errors.phone && (
                    <div className="cr-error-msg" id="phone-error" role="alert">
                      <span>•</span> {errors.phone}
                    </div>
                  )}
                </div>

                {/* Field 4: Password */}
                <div className="cr-field">
                  <label htmlFor="customer-password" className="cr-label">
                    <span>
                      Password <span className="cr-required-star" aria-label="Required">*</span>
                    </span>
                  </label>
                  <div className="cr-input-wrapper">
                    <span className="cr-input-icon" aria-hidden="true">🔒</span>
                    <input
                      id="customer-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`cr-input ${touched.password && errors.password ? 'cr-has-error' : ''}`}
                      placeholder="Create a password (min. 6 characters)"
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(touched.password && errors.password)}
                    />
                    <button
                      type="button"
                      className="cr-pw-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <div className="cr-error-msg" id="password-error" role="alert">
                      <span>•</span> {errors.password}
                    </div>
                  )}
                </div>

                {/* Field 5: Confirm Password */}
                <div className="cr-field">
                  <label htmlFor="customer-confirm-password" className="cr-label">
                    <span>
                      Confirm Password <span className="cr-required-star" aria-label="Required">*</span>
                    </span>
                  </label>
                  <div className="cr-input-wrapper">
                    <span className="cr-input-icon" aria-hidden="true">🔒</span>
                    <input
                      id="customer-confirm-password"
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`cr-input ${touched.confirm_password && errors.confirm_password ? 'cr-has-error' : ''}`}
                      placeholder="Re-enter your password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="new-password"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(touched.confirm_password && errors.confirm_password)}
                    />
                    <button
                      type="button"
                      className="cr-pw-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {touched.confirm_password && errors.confirm_password && (
                    <div className="cr-error-msg" id="confirm-password-error" role="alert">
                      <span>•</span> {errors.confirm_password}
                    </div>
                  )}
                </div>

                {/* Field 6: Preferences / Special Requests (Optional) */}
                <div className="cr-field">
                  <label htmlFor="customer-preferences" className="cr-label">
                    <span>Preferences / Special Requests</span>
                    <span className="cr-optional-tag">Optional</span>
                  </label>
                  <div className="cr-input-wrapper" style={{ alignItems: 'flex-start' }}>
                    <span className="cr-textarea-icon" aria-hidden="true">⭐</span>
                    <textarea
                      id="customer-preferences"
                      name="preferences"
                      rows={2}
                      className={`cr-textarea ${touched.preferences && errors.preferences ? 'cr-has-error' : ''}`}
                      placeholder="e.g. High floor, quiet room away from elevator, feather-free pillows..."
                      value={form.preferences}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={2000}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <span className="cr-char-hint">
                      {form.preferences.length}/2000 characters
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Submit & Clear/Reset */}
                <div className="cr-actions">
                  <button
                    type="button"
                    id="btn-customer-reset"
                    className="cr-btn cr-btn-reset"
                    onClick={handleReset}
                    disabled={submitting}
                  >
                    <span>↺</span> Clear / Reset
                  </button>

                  <button
                    type="submit"
                    id="btn-customer-submit"
                    className="cr-btn cr-btn-submit"
                    disabled={submitting || !hotelContext}
                  >
                    {submitting ? (
                      <>
                        <div className="cr-spinner" aria-hidden="true" />
                        <span>Creating Account…</span>
                      </>
                    ) : (
                      <>
                        <span>{hotelContext ? 'Register Account' : 'Registration Link Required'}</span>
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Link to Login */}
                <div className="cr-signin-banner">
                  <span>Already have an account?</span>{' '}
                  <button
                    type="button"
                    className="cr-signin-link"
                    onClick={handleGoToLogin}
                  >
                    Sign In to Portal →
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success Confirmation Screen */
            <div className="cr-success-view" id="customer-reg-success">
              <div className="cr-success-icon" aria-hidden="true">✓</div>
              <h2 className="cr-success-title">Registration Successful!</h2>
              <p className="cr-success-desc">
                Welcome, <strong>{registeredData.full_name}</strong>. Your account has been registered for <strong>{registeredData.hotel_name || 'your hotel property'}</strong> with <strong>ROLE=CUSTOMER</strong>.
              </p>

              {/* Summary Card */}
              <div className="cr-summary-box">
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Guest ID / Ref:</span>
                  <span className="cr-summary-val">
                    <span className="cr-badge-id">
                      #{registeredData.guest_id || registeredData.id || 'G-REG'}
                    </span>
                  </span>
                </div>
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Full Name:</span>
                  <span className="cr-summary-val">{registeredData.full_name}</span>
                </div>
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Email:</span>
                  <span className="cr-summary-val">{registeredData.email}</span>
                </div>
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Phone:</span>
                  <span className="cr-summary-val">{registeredData.phone}</span>
                </div>
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Hotel Property:</span>
                  <span className="cr-summary-val">{registeredData.hotel_name || 'Hotel Property'}</span>
                </div>
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Account Role:</span>
                  <span className="cr-summary-val" style={{ color: 'var(--cr-primary)', fontWeight: 700 }}>
                    CUSTOMER (Guest Portal)
                  </span>
                </div>
                <div className="cr-summary-row">
                  <span className="cr-summary-label">Status:</span>
                  <span className="cr-summary-val" style={{ color: 'var(--cr-success)' }}>
                    ● Active & Verified for Login
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                <button
                  type="button"
                  id="btn-goto-signin"
                  className="cr-btn cr-btn-submit"
                  style={{ minWidth: 220 }}
                  onClick={handleGoToLogin}
                >
                  <span>🔑</span> Sign In to Guest Portal →
                </button>
                <button
                  type="button"
                  id="btn-register-another"
                  className="cr-btn cr-btn-reset"
                  onClick={handleReset}
                >
                  <span>+</span> Register Another Customer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="cr-footer">
          <div className="cr-footer-lock">
            <span>🔒</span> Secure 256-bit Encrypted Customer Portal
          </div>
          <div>© {new Date().getFullYear()} StayFlow Hotel Management System. All rights reserved.</div>
        </footer>
      </div>
    </div>
  );
}
