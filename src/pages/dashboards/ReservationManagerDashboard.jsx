import React from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { StatusBadge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';

export default function ReservationManagerDashboard() {
  const { bookings, rooms, records, openBookingModal, notify, user, activeTenant, tenant } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const confirmed = bookings.filter((b) => b.st === 'Confirmed').length;
  const pending = bookings.filter((b) => b.st === 'Pending').length;
  const modified = bookings.filter((b) => b.st === 'Modified').length;
  const cancelled = bookings.filter((b) => b.st === 'Cancelled' || b.st === 'No-show').length;

  // Real group blocks from records category 'bookings_group_reservations' or 'bookings_group'
  const groupRecords = records.filter((r) => {
    const cat = (r.category || '').toLowerCase();
    return cat.includes('group') || cat.includes('allotment');
  });

  return (
    <div className="res-mgr-dashboard">
      <PageHead
        title={`${hotelName} · Reservations Hub`}
        subtitle={`${hotelName} central reservations pipeline, block allotments, incoming booking requests and calendar control`}
      >
        <button className="btn ghost" onClick={() => navigate('/bookings/calendar')}>
          Calendar Matrix
        </button>
        <button className="btn" onClick={() => openBookingModal()}>
          + New Reservation
        </button>
      </PageHead>

      {/* KPI Row */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Confirmed Bookings</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{confirmed}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Active reservations confirmed</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending Confirmation</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{pending}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Awaiting deposit or ID</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Modified Bookings</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--blue)', marginTop: 4 }}>{modified}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Date or room adjusted</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Cancellations / No-shows</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{cancelled}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Processed with policy rules</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Group Blocks On Hold</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{groupRecords.length} Blocks</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Registered group allotments</div>
        </div>
      </div>

      {/* Main Reservation Pipeline Table */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Recent Reservation Stream</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Direct, OTA, and corporate booking intake</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm ghost" onClick={() => navigate('/bookings/group')}>+ Group Booking</button>
            <button className="btn sm ghost" onClick={() => navigate('/bookings/history')}>Full Archive</button>
          </div>
        </div>
        {bookings.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No reservations recorded in database.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest Name</th>
                  <th>Room Type</th>
                  <th>Stay Dates</th>
                  <th>Channel Source</th>
                  <th>Total Value</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 7).map((b) => (
                  <tr key={b.id}>
                    <td><span className="tag">{b.id}</span></td>
                    <td><b>{b.guest}</b></td>
                    <td>{b.room}</td>
                    <td>{b.in} – {b.out}</td>
                    <td><span className="badge b-teal">{b.src}</span></td>
                    <td><b>{inr(b.amt)}</b></td>
                    <td><StatusBadge status={b.pay} /></td>
                    <td><StatusBadge status={b.st} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Group Reservations & Corporate Allotment Blocks */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Active Group Blocks & Event Allotments</h2>
          <button className="btn sm ghost" onClick={() => navigate('/bookings/group')}>Manage All Blocks</button>
        </div>
        {groupRecords.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No active group blocks or event allotments found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {groupRecords.map((grp) => (
              <div key={grp.id} style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{grp.title || grp.data?.['Group Name']}</span>
                  <span className="badge b-teal">{grp.status || grp.data?.['Status'] || 'Active'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--brass)', margin: '6px 0 2px', fontWeight: 600 }}>
                  {grp.data?.['Rooms'] ? `${grp.data['Rooms']} Rooms` : 'Group Block'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Stay: {grp.data?.['Check-in'] || '—'} – {grp.data?.['Check-out'] || '—'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 4 }}>
                  Contact: {grp.data?.['Contact Name'] || grp.data?.['Contact'] || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
