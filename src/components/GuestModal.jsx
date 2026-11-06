import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';

export default function GuestModal({ guest, onClose, onSaved }) {
  const { addGuest, updateGuest, notify, bookings, guests } = useStore();
  const PREDEFINED_ID_TYPES = ['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID'];
  const parseIdProof = (idStr) => {
    if (!idStr) return { type: 'Aadhaar Card', custom: '', number: '' };
    if (idStr.includes(':')) {
      const parts = idStr.split(':');
      const prefix = parts[0].trim();
      const num = parts.slice(1).join(':').trim();
      if (PREDEFINED_ID_TYPES.some(pt => pt.toLowerCase() === prefix.toLowerCase())) {
        return { type: PREDEFINED_ID_TYPES.find(pt => pt.toLowerCase() === prefix.toLowerCase()) || prefix, custom: '', number: num };
      }
      return { type: 'Others', custom: prefix, number: num };
    }
    for (const pt of PREDEFINED_ID_TYPES) {
      if (idStr.toLowerCase().startsWith(pt.toLowerCase())) {
        const num = idStr.slice(pt.length).replace(/^[-:\s]+/, '').trim();
        return { type: pt, custom: '', number: num };
      }
    }
    return { type: 'Aadhaar Card', custom: '', number: idStr };
  };

  const initialIdData = parseIdProof(guest?.identification_number);
  const [selectedIdType, setSelectedIdType] = useState(initialIdData.type);
  const [specifyIdType, setSpecifyIdType] = useState(initialIdData.custom);
  const [idNumber, setIdNumber] = useState(initialIdData.number);

  const [formData, setFormData] = useState(() => ({
    id: guest?.id ? Number(guest.id) : null,
    full_name: guest?.full_name || '',
    phone: guest?.phone || '',
    email: guest?.email || '',
    identification_number: guest?.identification_number || '',
    tier: guest?.tier || 'Silver',
    notes: guest?.notes || '',
    preferences: guest?.preferences || '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // Auto-detected stay and reservation metrics from the hotel database
  const [autoDetectedData, setAutoDetectedData] = useState({
    matched: false,
    guest_id: guest?.id ? Number(guest.id) : null,
    total_stays: guest?.total_stays != null ? Number(guest.total_stays) : 0,
    last_visit: guest?.last_visit && guest.last_visit !== '—' ? guest.last_visit : 'No stays recorded yet',
    room_number: guest?.room_number && guest.room_number !== '—' ? guest.room_number : '—',
    room_type: guest?.room_type && guest.room_type !== '—' ? guest.room_type : '—',
    nights: guest?.nights ? Number(guest.nights) : 0,
    reservation: null,
    existingContact: null,
    message: ''
  });

  const debounceTimerRef = useRef(null);

  // Unique known guest names for dropdown autocomplete
  const knownGuestNames = useMemo(() => {
    const names = new Set();
    (guests || []).forEach((g) => {
      if (g?.full_name?.trim()) names.add(g.full_name.trim());
    });
    (bookings || []).forEach((b) => {
      if (b?.guest?.trim()) names.add(b.guest.trim());
    });
    return Array.from(names);
  }, [guests, bookings]);

  // Lookup guest from SQL database and client state
  const lookupGuest = async (nameQuery, specificGuestId = null) => {
    const trimmed = (nameQuery || '').trim();
    if (!trimmed && !specificGuestId) {
      setAutoDetectedData({
        matched: false,
        guest_id: null,
        total_stays: 0,
        last_visit: 'No stays recorded yet',
        room_number: '—',
        room_type: '—',
        nights: 0,
        reservation: null,
        existingContact: null,
        message: ''
      });
      return;
    }

    // Fast client-side preliminary detection from current tenant state
    const matchedClientGuest = (guests || []).find((g) => {
      if (specificGuestId && Number(g.id) === Number(specificGuestId)) return true;
      return g?.full_name?.trim().toLowerCase() === trimmed.toLowerCase();
    });

    const clientStays = (bookings || []).filter((b) => {
      if (!b) return false;
      if (matchedClientGuest && String(b.guest_id) === String(matchedClientGuest.id)) return true;
      if (b.guest && b.guest.trim().toLowerCase() === trimmed.toLowerCase()) return true;
      return false;
    });

    if (matchedClientGuest || clientStays.length > 0) {
      const latestClientStay = clientStays.at(-1);
      setAutoDetectedData((prev) => ({
        ...prev,
        matched: true,
        guest_id: matchedClientGuest?.id || prev.guest_id,
        total_stays: matchedClientGuest?.total_stays != null ? Number(matchedClientGuest.total_stays) : clientStays.length,
        last_visit: matchedClientGuest?.last_visit && matchedClientGuest.last_visit !== '—'
          ? matchedClientGuest.last_visit
          : (latestClientStay?.check_out || latestClientStay?.out || latestClientStay?.check_in || latestClientStay?.in || prev.last_visit),
        room_number: latestClientStay?.room_number || latestClientStay?.room || matchedClientGuest?.room_number || prev.room_number,
        room_type: latestClientStay?.room_type || matchedClientGuest?.room_type || prev.room_type,
        nights: latestClientStay?.nights ? Number(latestClientStay.nights) : prev.nights,
      }));
    }

    // Authoritative SQL database query via /api/guests/lookup
    setDetecting(true);
    try {
      const url = specificGuestId
        ? `/api/guests/lookup?guest_id=${specificGuestId}`
        : `/api/guests/lookup?name=${encodeURIComponent(trimmed)}`;
      const dbResult = await api(url);

      if (dbResult && dbResult.found) {
        setAutoDetectedData({
          matched: true,
          guest_id: dbResult.guest_id,
          total_stays: dbResult.total_stays,
          last_visit: dbResult.last_visit,
          room_number: dbResult.room_number,
          room_type: dbResult.room_type,
          nights: dbResult.nights,
          reservation: dbResult.reservation,
          existingContact: {
            phone: dbResult.phone || '',
            email: dbResult.email || '',
            identification_number: dbResult.identification_number || '',
            notes: dbResult.notes || '',
            preferences: dbResult.preferences || ''
          },
          message: ''
        });

        // Auto-update tier if available from DB
        if (dbResult.tier) {
          setFormData((prev) => ({ ...prev, tier: dbResult.tier }));
        }
      } else {
        setAutoDetectedData({
          matched: false,
          guest_id: null,
          total_stays: 0,
          last_visit: 'No stays recorded yet',
          room_number: '—',
          room_type: '—',
          nights: 0,
          reservation: null,
          existingContact: null,
          message: 'No active stay or reservation found in this hotel (New Guest)'
        });
      }
    } catch {
      // Retain client-side values if backend query encounters network glitch
    } finally {
      setDetecting(false);
    }
  };

  // Trigger detection on input with debounce
  const handleNameChange = (val) => {
    setFormData((prev) => ({ ...prev, full_name: val }));

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      lookupGuest(val);
    }, 250);
  };

  // Initial detection when modal opens with a guest name
  useEffect(() => {
    if (guest?.full_name || guest?.id) {
      lookupGuest(guest.full_name, guest.id);
    }
  }, [guest?.id, guest?.full_name]);

  // Optional pre-fill for existing contact fields without replacing manual edits
  const handlePrefillExistingContact = () => {
    if (!autoDetectedData.existingContact) return;
    setFormData((prev) => ({
      ...prev,
      phone: prev.phone || autoDetectedData.existingContact.phone || '',
      email: prev.email || autoDetectedData.existingContact.email || '',
      identification_number: prev.identification_number || autoDetectedData.existingContact.identification_number || '',
      notes: prev.notes || autoDetectedData.existingContact.notes || '',
      preferences: prev.preferences || autoDetectedData.existingContact.preferences || ''
    }));
    notify('Loaded existing contact details');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      notify('Please enter guest full name');
      return;
    }
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        notify('Please enter a valid email address.');
        return;
      }
    }
    if (formData.phone && formData.phone.trim()) {
      const digits = formData.phone.replace(/[^\d+]/g, '');
      if (digits.length < 8) {
        notify('Please enter a valid phone number (at least 8 digits).');
        return;
      }
    }
    if (selectedIdType === 'Others' && !specifyIdType.trim()) {
      notify('Specify ID Type is mandatory when Others is selected. Please enter the ID type.');
      return;
    }
    const trimmedId = idNumber.trim();
    if (!trimmedId) {
      notify('ID Number is required.');
      return;
    }
    if (selectedIdType === 'Aadhaar Card') {
      const cleanAadhaar = trimmedId.replace(/[\s-]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        notify('Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.');
        return;
      }
    }
    const finalIdType = selectedIdType === 'Others' ? specifyIdType.trim() : selectedIdType;
    const finalIdStr = idNumber.trim() ? `${finalIdType}: ${idNumber.trim()}` : (idNumber.trim() || null);

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        identification_number: finalIdStr,
        tier: formData.tier || 'Silver',
        notes: formData.notes.trim() || '',
        preferences: formData.preferences || '',
      };

      let ok = false;
      const targetId = formData.id || (autoDetectedData.matched ? autoDetectedData.guest_id : null);
      if (targetId) {
        ok = await updateGuest(targetId, payload);
      } else {
        const res = await addGuest(payload);
        ok = Boolean(res);
      }

      if (ok) {
        onSaved?.();
        onClose();
      }
    } catch (err) {
      notify(err.message || 'Failed to save guest');
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = Boolean(formData.id);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: 16,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--panel)',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {isEditing ? `Edit Guest: ${formData.full_name || ''}` : 'Add Guest'}
            </h2>
            <div className="sub" style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              {isEditing ? 'Update guest contact, loyalty tier, and stay records' : 'Register or link a guest in the hotel SQL database'}
            </div>
          </div>
          <button type="button" className="btn sm ghost" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Guest ID & Tier Row */}
          <div className="grid2" style={{ marginBottom: 14 }}>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Guest ID</span>
                <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500 }}>System Generated</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={
                  formData.id
                    ? `GST-${String(formData.id).padStart(4, '0')}`
                    : (autoDetectedData.matched && autoDetectedData.guest_id
                        ? `GST-${String(autoDetectedData.guest_id).padStart(4, '0')} (Existing)`
                        : 'Auto-generated on save')
                }
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  cursor: 'not-allowed',
                  color: (formData.id || autoDetectedData.matched) ? 'var(--brass, #c99e4d)' : 'var(--muted)',
                  fontWeight: 600,
                  border: '1px dashed var(--border)',
                }}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 600 }}>Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData(prev => ({ ...prev, tier: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="Silver">Silver (Standard)</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          {/* Guest Name Entry with Suggestion Autocomplete */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>Guest Name *</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>Type or select to auto-detect stay records</span>
            </label>
            <input
              required
              list="guest-name-suggestions"
              placeholder="e.g. Balaji V or Akash"
              value={formData.full_name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoComplete="off"
            />
            <datalist id="guest-name-suggestions">
              {knownGuestNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Automatically Detected Stay & History Metrics */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: autoDetectedData.matched ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
              border: autoDetectedData.matched ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border)',
              marginBottom: 14,
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: autoDetectedData.matched ? 'var(--teal)' : 'var(--muted)' }}>
                Stay History & Reservation (Auto-Detected)
              </div>
              {detecting && (
                <span style={{ fontSize: 11, color: 'var(--teal)' }}>Checking database…</span>
              )}
              {!detecting && autoDetectedData.matched && (
                <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600, fontSize: 11, padding: '2px 8px' }}>
                  ⚡ Matched Hotel Record
                </span>
              )}
              {!detecting && !autoDetectedData.matched && formData.full_name.trim().length >= 2 && (
                <span className="tag" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: 11, padding: '2px 8px' }}>
                  ℹ️ No previous stays (New Guest)
                </span>
              )}
            </div>

            {/* Metrics Grid: Total Stays, Last Visit, Room Number, Room Type, Nights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}>
              {/* Total Stays */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Total Stays</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="tag" style={{ background: 'var(--teal-soft)', color: 'var(--teal)', fontWeight: 700, fontSize: 11, padding: '2px 6px' }}>
                    {autoDetectedData.total_stays} {autoDetectedData.total_stays === 1 ? 'Stay' : 'Stays'}
                  </span>
                </div>
              </div>

              {/* Last Visit */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Last Visit</div>
                <div style={{ fontWeight: 600, fontSize: 11, color: autoDetectedData.last_visit !== 'No stays recorded yet' ? 'var(--text)' : 'var(--muted)' }}>
                  {autoDetectedData.last_visit}
                </div>
              </div>

              {/* Current/Latest Room Number */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Room Number</div>
                <div style={{ fontWeight: 700, fontSize: 11, color: autoDetectedData.room_number !== '—' ? 'var(--brass, #c99e4d)' : 'var(--muted)' }}>
                  {autoDetectedData.room_number !== '—' ? (autoDetectedData.room_number.toLowerCase().startsWith('room') ? autoDetectedData.room_number : `Room ${autoDetectedData.room_number}`) : '—'}
                </div>
              </div>

              {/* Room Type */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Room Type</div>
                <div style={{ fontWeight: 600, fontSize: 11, color: autoDetectedData.room_type !== '—' ? 'var(--text)' : 'var(--muted)' }}>
                  {autoDetectedData.room_type}
                </div>
              </div>

              {/* Number of Stay Days / Nights */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Stay Duration</div>
                <div style={{ fontWeight: 600, fontSize: 11, color: autoDetectedData.nights > 0 ? 'var(--text)' : 'var(--muted)' }}>
                  {autoDetectedData.nights > 0 ? `${autoDetectedData.nights} ${autoDetectedData.nights === 1 ? 'Night' : 'Nights'}` : '—'}
                </div>
              </div>
            </div>

            {/* Reservation / Booking Details Card */}
            {autoDetectedData.reservation && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 6,
                  border: '1px dashed var(--border)',
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--brass, #c99e4d)' }}>
                    Ref: {autoDetectedData.reservation.reference}
                  </span>
                  <span className="tag" style={{ fontSize: 10, padding: '1px 5px', fontWeight: 600 }}>
                    {autoDetectedData.reservation.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px 8px', color: 'var(--sub, #aaa)' }}>
                  <div>📅 Check-in: <strong style={{ color: 'var(--text)' }}>{autoDetectedData.reservation.check_in}</strong></div>
                  <div>📅 Check-out: <strong style={{ color: 'var(--text)' }}>{autoDetectedData.reservation.check_out}</strong></div>
                  <div>🏷️ Source: <span style={{ color: 'var(--text)' }}>{autoDetectedData.reservation.source}</span></div>
                  <div>
                    💰 Total: <strong style={{ color: 'var(--text)' }}>₹{Number(autoDetectedData.reservation.total_amount || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Contact Fields */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Guest Contact & Identification (Manual)
            </span>
            {autoDetectedData.existingContact && (autoDetectedData.existingContact.phone || autoDetectedData.existingContact.email) && (!formData.phone || !formData.email) && (
              <button
                type="button"
                className="btn sm ghost"
                style={{ fontSize: 10, padding: '2px 8px', color: 'var(--teal)' }}
                onClick={handlePrefillExistingContact}
              >
                📋 Load existing contact info
              </button>
            )}
          </div>

          <div className="grid2" style={{ marginBottom: 14 }}>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 600 }}>Phone</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
              <input
                type="email"
                placeholder="e.g. guest@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid2" style={{ marginBottom: 14 }}>
            <div className="field">
              <label style={{ fontSize: 12, fontWeight: 600 }}>ID Type</label>
              <select
                value={selectedIdType}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedIdType(val);
                  if (val !== 'Others') setSpecifyIdType('');
                }}
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driving Licence">Driving Licence</option>
                <option value="Passport">Passport</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Others">Others</option>
              </select>
            </div>
            {selectedIdType === 'Others' && (
              <div className="field">
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  Specify ID Type <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PAN Card, Green Card"
                  value={specifyIdType}
                  onChange={(e) => setSpecifyIdType(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="field" style={selectedIdType === 'Others' ? { gridColumn: 'span 2' } : {}}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>ID Number <span style={{ color: 'var(--red, #ef4444)' }}>*</span></label>
              <input
                placeholder="e.g. XXXX-4521 / J84XXXXX"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Notes / Preferences (Manual) */}
          <div className="field" style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Notes / Preferences</label>
            <textarea
              rows={2}
              placeholder="e.g. Quiet room preferred, high floor, allergy requests"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Saving…' : (isEditing ? 'Update Guest' : 'Save Guest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

