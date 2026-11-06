import { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { inr, todayISO, addDaysISO } from '../../utils/format';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import { StatusBadge } from '../../components/Badge';
import SubNav from '../../components/SubNav';

const TABS = ['All', 'Confirmed', 'Pending', 'Modified', 'Cancelled', 'No-show'];
const SOURCES = ['All sources', 'Direct', 'Walk-in', 'Group', 'MakeMyTrip', 'Agoda', 'Booking.com'];

export default function Bookings() {
  const { bookings, rooms, query, setQuery, setBookingStatus, updateBooking, deleteBooking, openBookingModal, notify, refresh } = useStore();
  const { canCreate, canEdit, canDelete, canApprove } = useRbac();
  const [tab, setTab] = useState('All');
  const [source, setSource] = useState('All sources');
  const [editingBooking, setEditingBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return bookings.filter(
      (b) =>
        (tab === 'All' || b.st === tab) &&
        (source === 'All sources' || b.src === source || b.reservation_type === source) &&
        (!q ||
          b.guest?.toLowerCase().includes(q) ||
          b.id?.toLowerCase().includes(q) ||
          (b.group_name && b.group_name.toLowerCase().includes(q)) ||
          (b.room && b.room.toLowerCase().includes(q)) ||
          (b.reservation_type && b.reservation_type.toLowerCase().includes(q)))
    );
  }, [bookings, tab, source, query]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    const cin = editingBooking.check_in_raw || editingBooking.check_in || editingBooking.in;
    const cout = editingBooking.check_out_raw || editingBooking.check_out || editingBooking.out;
    if (cout <= cin) {
      notify('Check-out date must be after check-in date');
      return;
    }

    const origIn = String(editingBooking.check_in || '').slice(0, 10);
    const origOut = String(editingBooking.check_out || '').slice(0, 10);
    if (editingBooking.check_in_raw !== origIn && editingBooking.check_in_raw < todayISO()) {
      notify('Check-in date cannot be in the past. Choose today or a future date.'); return;
    }
    if (editingBooking.check_out_raw !== origOut && editingBooking.check_out_raw < todayISO()) {
      notify('Check-out date cannot be in the past. Choose a future date.'); return;
    }
    if (editingBooking.check_out_raw <= editingBooking.check_in_raw) {
      notify('Check-out must be after check-in'); return;

    }
    setSubmitting(true);
    try {
      await updateBooking(editingBooking.id, {
        room_id: editingBooking.room_id,
        check_in: cin,
        check_out: cout,
        total_amount: Number(editingBooking.amt),
        status: editingBooking.st,
        source: editingBooking.src,
        num_guests: parseInt(editingBooking.num_guests, 10) || 1,
        group_name: editingBooking.group_name || null,
      });
      setEditingBooking(null);
      await refresh();
      notify(`Booking ${editingBooking.id} updated successfully`);
    } catch (err) {
      notify(err.message || 'Failed to update booking');
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, booking: null });

  const handleDelete = (b) => {
    setDeleteConfirm({ open: true, booking: b });
  };

  const confirmDeleteBooking = async () => {
    if (!deleteConfirm.booking) return;
    const b = deleteConfirm.booking;
    setDeleteConfirm({ open: false, booking: null });
    await deleteBooking(b.id);
  };

  const action = (b) => {
    return (
      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
        {b.st === 'Pending' && canApprove('/bookings') && (
          <button
            type="button"
            className="btn sm"
            onClick={() => { setBookingStatus(b.id, 'Confirmed'); notify('Booking confirmed'); }}
            style={{ borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>✓</span> Confirm
          </button>
        )}
        {b.st === 'Confirmed' && (canEdit('/bookings') || canApprove('/bookings')) && (
          <button
            type="button"
            className="btn sm"
            onClick={() => { setBookingStatus(b.id, 'Checked-in'); notify(`${b.guest} checked in`); }}
            style={{
              background: 'var(--teal-soft)',
              color: 'var(--teal)',
              border: '1px solid var(--teal)',
              borderRadius: 7,
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>🏨</span> Check in
          </button>
        )}
        {b.st === 'Checked-in' && (canEdit('/bookings') || canApprove('/bookings')) && (
          <button
            type="button"
            className="btn sm brass"
            onClick={() => { setBookingStatus(b.id, 'Checked-out'); notify(`${b.guest} checked out`); }}
            style={{ borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>📤</span> Check out
          </button>
        )}
        {canEdit('/bookings') && (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              const r = rooms.find(rm => rm.type === b.room);
              setEditingBooking({
                ...b,
                room_id: b.room_id || r?.id,
                check_in_raw: b.check_in ? (b.check_in.includes('-') ? b.check_in : todayISO()) : todayISO(),
                check_out_raw: b.check_out ? (b.check_out.includes('-') ? b.check_out : addDaysISO(todayISO(), 1)) : addDaysISO(todayISO(), 1),
                num_guests: b.num_guests || 1,
                group_name: b.group_name || '',
              });
            }}
            title="Edit reservation"
            style={{ borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>✏️</span> Edit
          </button>
        )}
        {canDelete('/bookings') && (
          <button
            type="button"
            className="btn sm danger"
            onClick={() => handleDelete(b)}
            title="Delete reservation"
            style={{ borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span>🗑️</span> Delete
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHead title="Reservations & bookings" subtitle="Manage every reservation from request to check-out">
        {canCreate('/bookings') && <button className="btn" onClick={() => openBookingModal()}>New booking</button>}
      </PageHead>
      <SubNav parentPath="/bookings" />
      <div className="panel">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by guest, group, or booking ID" aria-label="Search bookings" />
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <DataTable
          className="table-wide"
          columns={['Booking', 'Guest', 'Type', 'Room', 'Source', 'Stay', 'Amount', 'Payment', 'Status', 'Action']}
          emptyMessage="No bookings found."
          rows={rows.map((b) => [
            <span className="tag" key={b.id}>{b.id}</span>,
            <div key={`g-${b.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
              <strong>{b.guest}</strong>
              {b.group_name && (
                <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>
                  👥 {b.group_name} {b.associated_rooms && b.associated_rooms.length > 1 ? `(${b.associated_rooms.length} rms)` : ''}
                </span>
              )}
            </div>,
            <span
              key={`type-${b.id}`}
              className="tag"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: (b.reservation_type === 'Walk-in' || b.src === 'Walk-in') ? '#EFF6FF' : (b.reservation_type === 'Group' || b.src === 'Group') ? '#FDF4FF' : '#F1F5F9',
                color: (b.reservation_type === 'Walk-in' || b.src === 'Walk-in') ? '#1D4ED8' : (b.reservation_type === 'Group' || b.src === 'Group') ? '#86198F' : '#334155'
              }}
            >
              {b.reservation_type || b.src || 'Direct'}
            </span>,
            <div key={`rm-${b.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{b.room}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {b.room_number ? `Rm ${b.room_number}` : ''} {b.num_guests > 1 ? `• ${b.num_guests} guests` : ''}
              </span>
            </div>,
            b.src,
            `${b.in} – ${b.out}`,
            inr(b.amt),
            <StatusBadge key={`p-${b.id}`} status={b.pay} />,
            <StatusBadge key={`s-${b.id}`} status={b.st} />,
            action(b),
          ])}
        />
      </div>

      {editingBooking && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 16, overflowY: 'auto' }}>
          <div className="panel edit-reservation-panel" style={{ width: '100%', maxWidth: 540, background: 'var(--panel)', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Edit Reservation: {editingBooking.id}</h2>
              <button type="button" className="btn sm ghost" onClick={() => setEditingBooking(null)} aria-label="Close edit reservation">✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="grid2">
                <div className="field">
                  <label>Guest Name</label>
                  <input disabled value={editingBooking.guest} />
                </div>
                <div className="field">
                  <label>Room Allocation</label>
                  <select
                    value={editingBooking.room_id || ''}
                    onChange={(e) => {
                      const selRoom = rooms.find(r => String(r.id) === e.target.value);
                      setEditingBooking(prev => ({ ...prev, room_id: e.target.value, room: selRoom ? selRoom.type : prev.room }));
                    }}
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.n} ({r.type})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={typeof editingBooking.check_in_raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(editingBooking.check_in_raw) ? editingBooking.check_in_raw : todayISO()}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      setEditingBooking(prev => {
                        const next = { ...prev, check_in_raw: newIn };
                        if (prev.check_out_raw <= newIn) {
                          const nextDay = new Date(new Date(newIn).getTime() + 86400000).toISOString().slice(0, 10);
                          next.check_out_raw = nextDay;
                        }
                        return next;
                      });
                    }}
                  />
                </div>
                <div className="field">
                  <label>Check-out Date</label>
                  <input
                    type="date"
                    required
                    min={addDaysISO(editingBooking.check_in_raw || todayISO(), 1)}
                    value={typeof editingBooking.check_out_raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(editingBooking.check_out_raw) ? editingBooking.check_out_raw : addDaysISO(todayISO(), 1)}
                    onChange={(e) => setEditingBooking(prev => ({ ...prev, check_out_raw: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Total Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editingBooking.amt}
                    onChange={(e) => setEditingBooking(prev => ({ ...prev, amt: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    value={editingBooking.st}
                    onChange={(e) => setEditingBooking(prev => ({ ...prev, st: e.target.value }))}
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Checked-in">Checked-in</option>
                    <option value="Checked-out">Checked-out</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Modified">Modified</option>
                    <option value="No-show">No-show</option>
                  </select>
                </div>
                <div className="field">
                  <label>Source</label>
                  <select
                    value={editingBooking.src}
                    onChange={(e) => setEditingBooking(prev => ({ ...prev, src: e.target.value }))}
                  >
                    <option value="Direct">Direct</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Group">Group</option>
                    <option value="MakeMyTrip">MakeMyTrip</option>
                    <option value="Agoda">Agoda</option>
                    <option value="Booking.com">Booking.com</option>
                  </select>
                </div>
                <div className="field">
                  <label>Guests Count</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editingBooking.num_guests || 1}
                    onChange={(e) => setEditingBooking(prev => ({ ...prev, num_guests: e.target.value }))}
                  />
                </div>
              </div>
              <div className="actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setEditingBooking(null)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteConfirm({ open: false, booking: null })}
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
              Are you sure you want to delete reservation {deleteConfirm.booking?.id} for {deleteConfirm.booking?.guest}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeleteConfirm({ open: false, booking: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                style={{ background: 'var(--red, #e53e3e)', color: '#fff', border: 'none' }}
                onClick={confirmDeleteBooking}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
