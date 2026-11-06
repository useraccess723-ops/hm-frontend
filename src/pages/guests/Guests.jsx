import { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { inr } from '../../utils/format';
import { StatusBadge } from '../../components/Badge';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import SubNav from '../../components/SubNav';
import InvoiceModal from '../../components/InvoiceModal';
import GuestModal from '../../components/GuestModal';

export default function Guests() {
  const { guests, bookings, rooms, refresh, refreshGuests, notify, deleteGuest, query, setQuery, loading } = useStore();
  const { canCreate, canEdit, canDelete } = useRbac();
  const [editingGuest, setEditingGuest] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState('All Room Types');
  const [selfieModalImg, setSelfieModalImg] = useState(null);
  const [selectedInvoiceRef, setSelectedInvoiceRef] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, guest: null });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError('');
    try {
      if (typeof refreshGuests === 'function') {
        await refreshGuests();
      } else {
        await refresh();
      }
      notify('Guest list refreshed from database');
    } catch (err) {
      const errMsg = err?.message || 'Failed to refresh guest list from database.';
      setRefreshError(errMsg);
      notify(`Error: ${errMsg}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = (g) => {
    setDeleteConfirm({ open: true, guest: g });
  };

  const confirmDeleteGuest = async () => {
    if (!deleteConfirm.guest) return;
    const g = deleteConfirm.guest;
    setDeleteConfirm({ open: false, guest: null });
    const numericId = Number(g.id ?? g.guest_id);
    await deleteGuest(!isNaN(numericId) && numericId > 0 ? numericId : g.id);
  };

  const roomTypeOptions = useMemo(() => {
    const types = new Set();
    (rooms || []).forEach(r => { if (r.type) types.add(r.type); });
    (guests || []).forEach(g => { if (g.room_type && g.room_type !== '—') types.add(g.room_type); });
    (bookings || []).forEach(b => { if (b.room) types.add(b.room); });
    return ['All Room Types', ...Array.from(types).sort()];
  }, [rooms, guests, bookings]);

  const filteredGuests = useMemo(() => {
    return (Array.isArray(guests) ? guests : []).filter((g) => {
      if (!g) return false;

      const stays = (Array.isArray(bookings) ? bookings : []).filter(
        (b) => b && (String(b.guest_id) === String(g.id) || (b.guest && b.guest === g.full_name))
      );
      const lastStay = stays.at(-1);
      const effectiveRoomType = (g.room_type && g.room_type !== '—') ? g.room_type : (lastStay ? lastStay.room : '');

      if (selectedRoomType !== 'All Room Types') {
        if (!effectiveRoomType || effectiveRoomType.toLowerCase() !== selectedRoomType.toLowerCase()) {
          return false;
        }
      }

      if (!query) return true;
      const q = query.toLowerCase().trim();
      const guestIdStr = g.guest_code || `GST-${String(g.id).padStart(4, '0')}`;
      return (
        (guestIdStr.toLowerCase().includes(q)) ||
        (g.full_name && g.full_name.toLowerCase().includes(q)) ||
        (g.phone && g.phone.toLowerCase().includes(q)) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        (g.booking_reference && g.booking_reference.toLowerCase().includes(q)) ||
        (effectiveRoomType && effectiveRoomType.toLowerCase().includes(q)) ||
        (g.room_number && String(g.room_number).includes(q)) ||
        (g.identification_number && g.identification_number.toLowerCase().includes(q)) ||
        (g.notes && g.notes.toLowerCase().includes(q))
      );
    });
  }, [guests, bookings, selectedRoomType, query]);

  const rows = filteredGuests.map((g) => {
    const guestIdStr = g.guest_code || `GST-${String(g.id).padStart(4, '0')}`;
    const stays = (Array.isArray(bookings) ? bookings : []).filter(
      (b) => b && (String(b.guest_id) === String(g.id) || (b.guest && b.guest === g.full_name))
    );
    const lastStay = stays.at(-1);

    const refId = (g.booking_reference && g.booking_reference !== '—') ? g.booking_reference : (lastStay ? lastStay.id : '—');
    const roomType = (g.room_type && g.room_type !== '—') ? g.room_type : (lastStay ? lastStay.room : '—');
    const roomNum = (g.room_number && g.room_number !== '—') ? g.room_number : (lastStay ? (lastStay.room_number || '—') : '—');
    const checkIn = (g.check_in && g.check_in !== '—') ? g.check_in : (lastStay ? (lastStay.check_in || lastStay.in || '—') : '—');
    const checkOut = (g.check_out && g.check_out !== '—') ? g.check_out : (lastStay ? (lastStay.check_out || lastStay.out || '—') : '—');
    const stayDates = (checkIn !== '—' && checkOut !== '—') ? `${checkIn} to ${checkOut}` : '—';
    const nights = g.nights || (lastStay ? lastStay.nights : (checkIn !== '—' && checkOut !== '—' ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 864e5)) : 0));
    const pricePerNight = g.price_per_night || (nights > 0 && lastStay ? Math.round((lastStay.amt || 0) / nights) : 0);
    const extraCharges = g.additional_charges || 0;
    const taxes = g.taxes || (g.total_bill ? Math.round(g.total_bill * 0.12 / 1.12) : (lastStay ? Math.round(lastStay.amt * 0.12 / 1.12) : 0));
    const totalBill = g.total_bill || (lastStay ? (lastStay.amt || 0) : 0);
    const amtPaid = g.amount_paid != null ? g.amount_paid : (lastStay && lastStay.pay === 'Paid' ? totalBill : 0);
    const balance = g.outstanding_balance != null ? g.outstanding_balance : Math.max(0, totalBill - amtPaid);
    const payStatus = g.payment_status || (lastStay ? lastStay.pay : (totalBill > 0 ? (balance <= 0 ? 'Paid' : 'Pending') : 'Pending'));

    return [
      <span className="tag" key={`gid-${g.id}`} style={{ fontWeight: 600 }}>{guestIdStr}</span>,
      <strong key={`name-${g.id}`}>{g.full_name}</strong>,
      g.phone || g.email || '—',
      g.selfie_url ? (
        <img
          key={`selfie-${g.id}`}
          src={g.selfie_url}
          alt={g.full_name}
          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid var(--teal)' }}
          onClick={() => setSelfieModalImg({ img: g.selfie_url, name: g.full_name })}
          title="Click to view selfie"
        />
      ) : (
        <span key={`no-selfie-${g.id}`} style={{ fontSize: 18, color: 'var(--muted)', display: 'inline-block' }} title="No selfie on file">
          👤
        </span>
      ),
      roomType,
      roomNum !== '—' ? `Room ${roomNum}` : '—',
      stayDates,
      `${nights}n`,
      inr(pricePerNight),
      inr(extraCharges),
      inr(taxes),
      <strong>{inr(totalBill)}</strong>,
      <span key={`paid-${g.id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{inr(amtPaid)}</span>,
      <span key={`bal-${g.id}`} style={{ color: balance > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{inr(balance)}</span>,
      <StatusBadge key={`st-${g.id}`} status={payStatus} />,
      <div
        key={`act-${g.id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap'
        }}
      >
        {refId && refId !== '—' && (
          <button
            type="button"
            className="btn sm"
            onClick={() => setSelectedInvoiceRef(refId)}
            title="View, print, and download detailed invoice"
            style={{
              background: 'var(--teal-soft)',
              color: 'var(--teal)',
              border: '1px solid var(--teal)',
              borderRadius: 7,
              padding: '5px 11px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              lineHeight: 1.2
            }}
          >
            <span>🧾</span>
            <span>Bill / Invoice</span>
          </button>
        )}
        {canEdit('/guests') && (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              const numericId = Number(g.id ?? g.guest_id);
              setEditingGuest({
                ...g,
                id: (!isNaN(numericId) && numericId > 0) ? numericId : null
              });
            }}
            title="Edit guest profile"
            style={{
              borderRadius: 7,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
              lineHeight: 1.2
            }}
          >
            <span>✏️</span>
            <span>Edit</span>
          </button>
        )}
        {canDelete('/guests') && (
          <button
            type="button"
            className="btn sm danger"
            onClick={() => handleDelete(g)}
            title="Delete guest"
            style={{
              borderRadius: 7,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
              lineHeight: 1.2
            }}
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        )}
        {!canEdit('/guests') && !canDelete('/guests') && (
          <span style={{ color: 'var(--sub, #888)', fontSize: 13 }}>—</span>
        )}      </div>
    ];
  });

  return (
    <>
      <PageHead title="Guests" subtitle="Directory, stay history and customer records">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canCreate('/guests') && (
            <button
              className="btn"
              onClick={() => setEditingGuest({
                id: null,
                full_name: '',
                phone: '',
                email: '',
                identification_number: '',
                tier: 'Silver',
                notes: ''
              })}
            >
              + Add guest
            </button>
          )}
          <button
            type="button"
            className="btn ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh guest list from MySQL database"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: isRefreshing ? 0.7 : 1,
              cursor: isRefreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
              }}
            >
              🔄
            </span>
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh List'}</span>
          </button>
        </div>      </PageHead>
      <SubNav parentPath="/guests" />

      {/* Guest Modal (Add & Edit) */}
      {editingGuest && (
        <GuestModal
          guest={editingGuest}
          onClose={() => setEditingGuest(null)}
          onSaved={() => {
            setEditingGuest(null);
            handleRefresh();
          }}
        />
      )}

      {/* Refresh Error Alert */}
      {refreshError && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--red, #ef4444)',
            color: 'var(--red, #ef4444)',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️</span>
            <span>{refreshError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshError('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: 4
            }}
            title="Dismiss error message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Guest Directory DataTable */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>Guest Management & Stay Billing Directory</h2>
            <div className="sub" style={{ margin: 0 }}>
              Live guest records, verified selfies, stay duration, room allocation, and financial balances
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label htmlFor="filter-room-type" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              Filter by Room Type:
            </label>
            <select
              id="filter-room-type"
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              style={{ minWidth: 170 }}
            >
              {roomTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <DataTable
            className="table-wide"
            columns={[
              'Guest ID',
              'Guest Name',
              'Phone Number',
              'Selfie',
              'Room Type',
              'Room #',
              'Check-in / Out',
              'Nights',
              'Price / Night',
              'Extra Charges',
              'Taxes (12%)',
              'Total Bill',
              'Amount Paid',
              'Balance',
              'Payment Status',
              'Actions'
            ]}
            rows={rows}
            emptyMessage={
              loading
                ? 'Loading guest profiles…'
                : selectedRoomType !== 'All Room Types'
                ? `No guests found staying in "${selectedRoomType}".`
                : query
                ? `No guests matching "${query}".`
                : 'No guests recorded yet. Create a new reservation to record guests.'
            }
          />
        </div>
      </div>

      {/* Selfie Preview Lightbox Modal */}
      {selfieModalImg && (
        <div
          className="modal-backdrop"
          onClick={() => setSelfieModalImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-panel, #1e222d)',
              padding: 24,
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              border: '1px solid var(--border, #333)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--head-color, #fff)' }}>
                Verified Guest Selfie: {selfieModalImg.name}
              </h3>
              <button className="btn sm ghost" onClick={() => setSelfieModalImg(null)}>✕</button>
            </div>
            <img
              src={selfieModalImg.img}
              alt={selfieModalImg.name}
              style={{
                width: '100%',
                maxHeight: '380px',
                objectFit: 'contain',
                borderRadius: 12,
                border: '2px solid var(--teal, #0e7c7b)'
              }}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button type="button" className="btn sm" onClick={() => setSelfieModalImg(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteConfirm({ open: false, guest: null })}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-panel, #1e222d)',
              padding: 24,
              borderRadius: 12,
              width: '90%',
              maxWidth: 440,
              border: '1px solid var(--border, #333)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--head-color, #fff)' }}>Confirm Deletion</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.5 }}>
              Are you sure you want to delete guest record for "{deleteConfirm.guest?.full_name}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeleteConfirm({ open: false, guest: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                style={{ background: 'var(--red, #e53e3e)', color: '#fff', border: 'none' }}
                onClick={confirmDeleteGuest}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoiceRef && (
        <InvoiceModal
          bookingReference={selectedInvoiceRef}
          isOpen={Boolean(selectedInvoiceRef)}
          onClose={() => setSelectedInvoiceRef(null)}
          onRefresh={refresh}
        />
      )}
    </>

  );
}
