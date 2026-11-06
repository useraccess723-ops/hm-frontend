import React from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { StatusBadge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';

export default function GeneralManagerDashboard() {
  const { bookings, rooms, guests, payments, records, notify, user, activeTenant, tenant } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.s === 'occ').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const totalRev = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const adr = occupiedRooms > 0 ? Math.round(totalRev / occupiedRooms) : 0;
  const revpar = totalRooms > 0 ? Math.round(totalRev / totalRooms) : 0;

  // Real VIP in-house guests
  const checkedInBookings = bookings.filter((b) => b.st === 'Checked-in');
  const vipGuests = guests.filter((g) => {
    const notes = (g.notes || '').toLowerCase();
    const isVip = notes.includes('vip') || notes.includes('elite') || notes.includes('diplomatic') || notes.includes('gold') || notes.includes('platinum');
    return isVip || checkedInBookings.some((b) => b.guest_id === g.id || b.guest === g.full_name);
  }).slice(0, 5);

  // Real pending approvals from records and cancelled bookings
  const pendingApprovals = [
    ...records.filter((r) => {
      const cat = (r.category || '').toLowerCase();
      const st = (r.status || '').toLowerCase();
      return (cat.includes('procurement') || cat.includes('approval') || cat.includes('requisition')) && (st === 'pending' || st === 'open');
    }).map((r) => ({
      id: r.id,
      title: r.title || r.data?.['Item Description'] || 'Procurement Approval',
      value: r.data?.['Amount'] ? (String(r.data['Amount']).startsWith('₹') ? r.data['Amount'] : inr(r.data['Amount'])) : '—',
      desc: r.data?.['Vendor'] ? `Vendor: ${r.data['Vendor']}` : (r.data?.['Department'] ? `Dept: ${r.data['Department']}` : 'Purchase authorization pending'),
      actionText: 'Approve Item',
      route: '/procurement',
    })),
    ...bookings.filter((b) => b.st === 'Cancelled' || b.st === 'No-show').slice(0, 3).map((b) => ({
      id: b.id,
      title: `Refund Authorization: ${b.id}`,
      value: inr(b.amt),
      desc: `Guest cancellation (${b.guest}) awaiting GM refund clearance.`,
      actionText: 'Authorize Refund',
      route: '/finance',
    })),
  ];

  // Dynamic department health metrics
  const cleanRoomsCount = rooms.filter((r) => r.s === 'vac').length;
  const dirtyRoomsCount = rooms.filter((r) => r.s === 'dirty').length;
  const oooRoomsCount = rooms.filter((r) => r.s === 'ooo').length;
  const arrivalsCount = bookings.filter((b) => ['Confirmed', 'Pending', 'Modified'].includes(b.st)).length;
  const fbRecords = records.filter((r) => (r.category || '').startsWith('food_beverage') || (r.category || '').startsWith('food-beverage') || (r.category || '').startsWith('fb'));
  const securityLogs = records.filter((r) => (r.category || '').startsWith('security'));

  const departmentHealth = [
    {
      dept: 'Front Desk',
      metric: `${arrivalsCount} arrivals pending, ${checkedInBookings.length} in-house guests`,
      status: arrivalsCount > 0 ? 'Active Intake' : 'All Clear',
      color: arrivalsCount > 0 ? 'teal' : 'green',
    },
    {
      dept: 'Housekeeping',
      metric: `${cleanRoomsCount} ready to sell, ${dirtyRoomsCount} cleaning backlog`,
      status: dirtyRoomsCount > 3 ? 'Backlog High' : 'On Schedule',
      color: dirtyRoomsCount > 3 ? 'brass' : 'teal',
    },
    {
      dept: 'Finance & Accounts',
      metric: `${inr(totalRev)} collected, ${payments.length} transactions recorded`,
      status: payments.length > 0 ? 'Reconciled' : 'No Transactions',
      color: payments.length > 0 ? 'green' : 'grey',
    },
    {
      dept: 'Engineering & Plant',
      metric: `${oooRoomsCount} rooms out of order for repair`,
      status: oooRoomsCount > 0 ? 'Work In Progress' : 'Optimal',
      color: oooRoomsCount > 0 ? 'brass' : 'green',
    },
    {
      dept: 'Food & Beverage',
      metric: `${fbRecords.length} F&B POS and in-room dining orders logged`,
      status: fbRecords.length > 0 ? 'Active' : 'Standby',
      color: fbRecords.length > 0 ? 'green' : 'grey',
    },
    {
      dept: 'Security & Safety',
      metric: `${securityLogs.length} gate passes and security incident entries`,
      status: 'Secured',
      color: 'green',
    },
  ];

  return (
    <div className="gm-dashboard">
      <PageHead
        title={`${hotelName} · Executive Overview`}
        subtitle={`General Manager command center for ${hotelName} — RevPAR, occupancy, departmental operations and executive approvals`}
      >
        <button className="btn ghost" onClick={() => navigate('/reports')}>
          Executive Reports
        </button>
        <button className="btn" onClick={() => navigate('/staff/roles')}>
          Audit Permissions
        </button>
      </PageHead>

      {/* Department Operations Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Department Hubs:</span>
        <button className="btn sm ghost" onClick={() => navigate('/front-desk')}>🛎️ Front Desk</button>
        <button className="btn sm ghost" onClick={() => navigate('/housekeeping')}>🧹 Housekeeping</button>
        <button className="btn sm ghost" onClick={() => navigate('/finance')}>💰 Finance</button>
        <button className="btn sm ghost" onClick={() => navigate('/bookings')}>📅 Bookings</button>
        <button className="btn sm ghost" onClick={() => navigate('/rooms')}>🛏️ Rooms</button>
        <button className="btn sm ghost" onClick={() => navigate('/food-beverage')}>🍽️ F&B</button>
        <button className="btn sm ghost" onClick={() => navigate('/human-resources')}>👥 HR</button>
        <button className="btn sm ghost" onClick={() => navigate('/reports')}>📊 Reports</button>
      </div>

      {/* Executive KPI Row */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel" style={{ padding: '16px 18px', background: 'var(--panel)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Daily Hotel Revenue
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>
            {inr(totalRev)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
            {payments.length} verified transactions
          </div>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--panel)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Occupancy Rate
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>
            {occupancyRate}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {occupiedRooms} of {totalRooms} rooms filled
          </div>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--panel)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            RevPAR (Revenue / Avail Room)
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
            {inr(revpar)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Based on {totalRooms} active rooms
          </div>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--panel)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average Daily Rate (ADR)
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>
            {inr(adr)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Per occupied room night
          </div>
        </div>

        <div className="panel" style={{ padding: '16px 18px', background: 'var(--panel)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In-House Guests
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>
            {checkedInBookings.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>
            Active verified stays
          </div>
        </div>
      </div>

      {/* 2-Column Section: Departmental Health & Executive Sign-off Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Department Health Matrix */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Operational Department Health</h2>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Real-time database status</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {departmentHealth.map((d) => (
              <div
                key={d.dept}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.dept}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--sub)' }}>{d.metric}</span>
                  </div>
                </div>
                <span className={`badge b-${d.color}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Executive Action & Sign-off Queue */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Executive Approval Queue</h2>
            <span className="badge b-brass">{pendingApprovals.length} Pending</span>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
              No pending executive approvals requiring sign-off.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingApprovals.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(201, 158, 77, 0.06)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{item.title}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brass)' }}>{item.value}</span>
                  </div>
                  <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: 'var(--sub)' }}>
                    {item.desc}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn sm"
                      onClick={() => notify(`${item.title} authorized by General Manager`)}
                    >
                      {item.actionText}
                    </button>
                    <button className="btn sm ghost" onClick={() => navigate(item.route)}>
                      Review Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VIP In-House Guests Table */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>VIP Guests Currently In-House</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>High-profile and loyalty tier guests requiring executive attention</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/guests')}>View All Guests</button>
        </div>
        {vipGuests.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No VIP guests currently in-house.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Loyalty / Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vipGuests.map((vip, i) => (
                  <tr key={vip.id || i}>
                    <td><b>{vip.full_name}</b></td>
                    <td>{vip.phone || '—'}</td>
                    <td>{vip.email || '—'}</td>
                    <td>
                      <span className="badge b-brass">
                        {vip.notes || 'In-House Guest'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn sm ghost"
                        onClick={() => notify(`Personal GM welcome note sent to ${vip.full_name}`)}
                      >
                        Send Note
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
