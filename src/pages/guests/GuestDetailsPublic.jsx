import { useEffect, useState } from 'react';
import { API_BASE_URL, getApiBaseUrl } from '../../services/api';

export default function GuestDetailsPublic() {
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [authorizedData, setAuthorizedData] = useState(null);

  // Extract token from URL path or query params
  // supports /guest-details?token=... or /guest-details/:token
  const getUrlToken = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) return params.get('token');
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 1 && pathParts[0] === 'guest-details') {
      return pathParts[1];
    }
    return null;
  };

  const token = getUrlToken();

  useEffect(() => {
    if (!token) {
      setError('No QR token provided in the link. Please scan a valid Guest QR code.');
      setLoading(false);
      return;
    }

    const baseUrl = getApiBaseUrl() || API_BASE_URL;
    const fetchUrl = baseUrl ? `${baseUrl}/api/public/guest/${encodeURIComponent(token)}` : `/api/public/guest/${encodeURIComponent(token)}`;
    fetch(fetchUrl)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to load guest profile');
        }
        return res.json();
      })
      .then((data) => {
        setGuest(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Unable to retrieve guest information');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      setVerifyError('Please enter verification code');
      return;
    }
    setVerifying(true);
    setVerifyError('');

    try {
      const baseUrl = getApiBaseUrl() || API_BASE_URL;
      const verifyUrl = baseUrl ? `${baseUrl}/api/public/guest/${encodeURIComponent(token)}/verify` : `/api/public/guest/${encodeURIComponent(token)}/verify`;
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_code: verifyCode.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Verification failed');
      }

      const data = await res.json();
      setAuthorizedData(data);
      setVerifyError('');
    } catch (err) {
      setVerifyError(err.message || 'Incorrect verification digits. Please check and try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ede7f6',
      fontFamily: "'Roboto', 'Segoe UI', Arial, sans-serif",
      padding: '24px 16px 60px',
      color: '#202124',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        
        {/* Top Google Form Style Decorative Accent Bar */}
        <div style={{
          height: 10,
          background: 'linear-gradient(90deg, #673ab7 0%, #7e57c2 50%, #512da8 100%)',
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          marginBottom: -2
        }} />

        {/* Header Title Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '0 0 10px 10px',
          padding: '28px 24px 22px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          marginBottom: 16,
          borderLeft: '1px solid #dadce0',
          borderRight: '1px solid #dadce0',
          borderBottom: '1px solid #dadce0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{
              background: '#673ab7',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase'
            }}>
              StayFlow Hotel
            </span>
            <span style={{ fontSize: 13, color: '#5f6368' }}>Official Guest Record</span>
          </div>
          <h1 style={{
            margin: '0 0 8px',
            fontSize: 26,
            fontWeight: 700,
            color: '#202124',
            lineHeight: 1.25
          }}>
            Guest Registration & Stay Profile
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#5f6368', lineHeight: 1.5 }}>
            Verified electronic guest registration slip. Scanned securely via individual Guest QR code.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: 40,
            textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            border: '1px solid #dadce0'
          }}>
            <div style={{
              width: 38,
              height: 38,
              border: '3px solid #ede7f6',
              borderTopColor: '#673ab7',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#3c4043' }}>Retrieving guest record…</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#70757a' }}>Please wait while we fetch the verified details from the hotel database.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{
            background: '#ffffff',
            borderRadius: 10,
            padding: 32,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            border: '1px solid #f28b82',
            borderTop: '6px solid #d93025'
          }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, color: '#d93025' }}>Unable to load guest profile</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#3c4043', lineHeight: 1.5 }}>{error}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#5f6368' }}>
              Please check if the QR code is still valid, or ask the hotel reception desk to re-generate the QR code for you.
            </p>
          </div>
        )}

        {/* Guest Profile Loaded */}
        {!loading && guest && (
          <div style={{ display: 'grid', gap: 16 }}>

            {/* Section 1: Guest Identity Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              border: '1px solid #dadce0',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#673ab7', textTransform: 'uppercase', marginBottom: 4 }}>
                    Full Name
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#202124' }}>
                    {guest.full_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#5f6368', marginTop: 4 }}>
                    Guest ID: #{guest.guest_id}
                  </div>
                </div>
                <div style={{
                  background: guest.tier === 'VIP' ? '#fef3c7' : guest.tier === 'Gold' ? '#fef9c3' : '#e0e7ff',
                  color: guest.tier === 'VIP' ? '#92400e' : guest.tier === 'Gold' ? '#854d0e' : '#3730a3',
                  padding: '6px 14px',
                  borderRadius: 99,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span>★</span>
                  <span>{guest.tier} Guest</span>
                </div>
              </div>
            </div>

            {/* Section 2: Stay Summary Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              border: '1px solid #dadce0'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#673ab7', textTransform: 'uppercase', marginBottom: 12 }}>
                Reservation & Stay History ({guest.total_stays} Recorded)
              </div>
              {guest.stays && guest.stays.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {guest.stays.map((s, idx) => (
                    <div key={idx} style={{
                      padding: 12,
                      background: '#f8f9fa',
                      borderRadius: 8,
                      border: '1px solid #e8eaed',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#202124' }}>
                          {s.room}
                        </div>
                        <div style={{ fontSize: 12, color: '#5f6368', marginTop: 2 }}>
                          {s.check_in} — {s.check_out} • Ref: {s.reference}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                        background: s.status === 'Confirmed' ? '#e6f4ea' : '#feefe3',
                        color: s.status === 'Confirmed' ? '#137333' : '#b06000'
                      }}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '14px 0', color: '#5f6368', fontSize: 14 }}>
                  No active reservations yet. Check-in records will appear here upon booking confirmation.
                </div>
              )}
            </div>

            {/* Section 3: Notes & Guest Preferences */}
            <div style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              border: '1px solid #dadce0'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#673ab7', textTransform: 'uppercase', marginBottom: 6 }}>
                Notes / Special Preferences
              </div>
              <div style={{
                fontSize: 14,
                color: '#3c4043',
                lineHeight: 1.6,
                background: '#f8f9fa',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #e8eaed'
              }}>
                {guest.notes || 'No special dietary, floor, or room preferences recorded.'}
              </div>
            </div>

            {/* Section 4: Privacy-Protected Contact Information (Requirement 11) */}
            <div style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '22px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              border: authorizedData ? '2px solid #34a853' : '1px solid #dadce0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{authorizedData ? '✅' : '🔒'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: authorizedData ? '#137333' : '#673ab7', textTransform: 'uppercase' }}>
                  {authorizedData ? 'Authorized Contact Details' : 'Protected Contact & ID Proof Details'}
                </span>
              </div>

              {/* Notice Banner */}
              {!authorizedData && (
                <div style={{
                  padding: '10px 14px',
                  background: '#f3e8fd',
                  border: '1px solid #d1c4e9',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#4a148c',
                  marginBottom: 16,
                  lineHeight: 1.45
                }}>
                  <strong>Privacy Protected:</strong> Phone number, email address, and ID proof numbers are protected to prevent public exposure.
                </div>
              )}

              {/* Field Rows */}
              <div style={{ display: 'grid', gap: 12, marginBottom: authorizedData ? 0 : 18 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f8f9fa',
                  borderRadius: 6,
                  border: '1px solid #e8eaed',
                  fontSize: 14
                }}>
                  <span style={{ color: '#5f6368', fontWeight: 500 }}>Phone Number</span>
                  <span style={{ fontWeight: 600, color: '#202124', fontFamily: 'monospace' }}>
                    {authorizedData ? (authorizedData.phone || 'Not provided') : guest.masked_phone}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f8f9fa',
                  borderRadius: 6,
                  border: '1px solid #e8eaed',
                  fontSize: 14
                }}>
                  <span style={{ color: '#5f6368', fontWeight: 500 }}>Email Address</span>
                  <span style={{ fontWeight: 600, color: '#202124', fontFamily: 'monospace' }}>
                    {authorizedData ? (authorizedData.email || 'Not provided') : guest.masked_email}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f8f9fa',
                  borderRadius: 6,
                  border: '1px solid #e8eaed',
                  fontSize: 14
                }}>
                  <span style={{ color: '#5f6368', fontWeight: 500 }}>ID Proof / Number</span>
                  <span style={{ fontWeight: 600, color: '#202124', fontFamily: 'monospace' }}>
                    {authorizedData ? (authorizedData.identification_number || 'Not provided') : guest.masked_id_number}
                  </span>
                </div>
              </div>

              {/* Verification Form if not authorized */}
              {!authorizedData && (
                <form onSubmit={handleVerify} style={{
                  marginTop: 14,
                  paddingTop: 16,
                  borderTop: '1px dashed #dadce0'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3c4043', marginBottom: 6 }}>
                    Are you {guest.full_name}? Unlock full details:
                  </div>
                  <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 10 }}>
                    Enter the last 4 digits of your phone number or government ID to verify authorization:
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      maxLength={20}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="e.g. 3210 or ID digits"
                      style={{
                        flex: '1 1 200px',
                        padding: '10px 14px',
                        fontSize: 14,
                        borderRadius: 6,
                        border: '1px solid #dadce0',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={verifying}
                      style={{
                        padding: '10px 20px',
                        background: '#673ab7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: verifying ? 'default' : 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      {verifying ? 'Verifying…' : 'Unlock Details'}
                    </button>
                  </div>
                  {verifyError && (
                    <div style={{ fontSize: 12, color: '#d93025', marginTop: 8, fontWeight: 500 }}>
                      ⚠️ {verifyError}
                    </div>
                  )}
                </form>
              )}

              {authorizedData && (
                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#e6f4ea',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#137333',
                  fontWeight: 600
                }}>
                  ✓ Authorization verified. Full contact & identification details are visible above.
                </div>
              )}
            </div>

            {/* Google Form Style Footer */}
            <div style={{
              textAlign: 'center',
              padding: '16px 0',
              fontSize: 12,
              color: '#70757a'
            }}>
              <div>StayFlow PMS • Hotel Reservation & Guest Profile System</div>
              <div style={{ marginTop: 4 }}>This page was automatically generated for verified guest access.</div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
