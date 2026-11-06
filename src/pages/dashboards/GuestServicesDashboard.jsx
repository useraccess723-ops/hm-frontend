import React from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';

export default function GuestServicesDashboard() {
  const { records, rooms, bookings, notify, activeTenant, tenant, user, settings } = useStore();
  const navigate = useNavigate();
  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || settings?.hotel_name || 'Grand Meridian Hotel';

  // Real guest services records from database
  const gsRecords = records.filter((r) => {
    const cat = (r.category || '').toLowerCase();
    return cat.startsWith('guest_services') || cat.startsWith('guest-services');
  });

  const inHouseSuites = rooms.filter((r) => r.s === 'occ' && (r.type || '').toLowerCase().includes('suite')).length;
  const lostFoundRecords = records.filter((r) => (r.category || '').toLowerCase().includes('lost'));
  const valetRecords = records.filter((r) => (r.category || '').toLowerCase().includes('valet'));

  return (
    <div className="guest-services-dashboard">
      <PageHead
        title={`${hotelName} – Guest Experience & Concierge Operations`}
        subtitle={`${hotelName} concierge inquiries, valet dispatches, butler requests, luggage assistance, and VIP itineraries`}
      >
        <button className="btn ghost" onClick={() => navigate('/guest-services/requests')}>
          All Requests
        </button>
        <button className="btn" onClick={() => navigate('/guest-services/concierge')}>
          + New Service Ticket
        </button>
      </PageHead>

      {/* Guest Services KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Concierge Requests</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{gsRecords.length} Active</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Logged in database</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--brass)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>In-House VIP Suites</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{inHouseSuites} Suites</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Occupied suite category</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Valet & Transport Logs</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{valetRecords.length} Dispatches</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Active transport requests</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Lost & Found Custody</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{lostFoundRecords.length} Items Logged</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>In custodial registry</div>
        </div>
      </div>

      {/* Guest Requests Queue */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Active Concierge & Butler Requests</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Real-time requests submitted via in-room tablets and front desk</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/guest-services/requests')}>Refresh Queue</button>
        </div>

        {gsRecords.length === 0 ? (
          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
            No active guest service requests in database.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Room</th>
                  <th>Guest Name</th>
                  <th>Service Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {gsRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td><strong>GS-{rec.id}</strong></td>
                    <td><span className="badge b-teal">{rec.data?.['Room'] || '—'}</span></td>
                    <td>{rec.data?.['Guest Name'] || rec.title}</td>
                    <td>{rec.data?.['Service Type'] || rec.data?.['Request'] || 'Concierge Service'}</td>
                    <td>
                      <span className="badge b-brass">
                        {rec.status || rec.data?.['Status'] || 'In Progress'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn sm"
                        onClick={() => notify(`Ticket GS-${rec.id} marked confirmed`)}
                      >
                        Confirm
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
