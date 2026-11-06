import React from 'react';
import { useStore } from '../../context/StoreContext';
import { inr, todayISO } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { StatusBadge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';

export default function FrontDeskDashboard() {
  const { bookings, rooms, setBookingStatus, notify, user, activeTenant, tenant } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const today = todayISO();
  const arrivals = bookings.filter((b) => ['Confirmed', 'Pending', 'Modified'].includes(b.st));
  const departures = bookings.filter((b) => b.st === 'Checked-in');
  const inHouse = departures.length;
  const vacantCleanRooms = rooms.filter((r) => r.s === 'vac');

  return (
    <div className="front-desk-dashboard">
      <PageHead
        title={`${hotelName} · Front Desk Operations`}
        subtitle={`${hotelName} command center — Real-time arrivals, departures, guest check-in/out, key assignments, and room availability`}
      >
        <button className="btn ghost" onClick={() => navigate('/front-desk/walk-in-checkin')}>
          Walk-in Check-in
        </button>
        <button className="btn" onClick={() => navigate('/front-desk/guest-registration')}>
          Register Guest
        </button>
      </PageHead>

      {/* Front Desk Submenus */}
      <SubNav parentPath="/front-desk" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/bookings')}>📅 Reservations & Bookings</button>
        <button className="btn sm ghost" onClick={() => navigate('/guests')}>👥 Guest Management</button>
        <button className="btn sm ghost" onClick={() => navigate('/rooms')}>🛏️ Rooms & Room Types</button>
        <button className="btn sm ghost" onClick={() => navigate('/guest-services')}>🛎️ Guest Services</button>
      </div>

      {/* Front Desk KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Expected Arrivals</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{arrivals.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Awaiting arrival & keys</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Expected Departures</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{departures.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Check-out & billing ready</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Currently In-House</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{inHouse}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Occupied guest rooms</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Vacant Ready Rooms</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{vacantCleanRooms.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Inspected & clean to assign</div>
        </div>
      </div>

      {/* Quick Action Queue: Arrivals vs Departures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Arrivals Queue */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Today's Check-in Queue</h2>
            <span className="badge b-teal">{arrivals.length} Pending</span>
          </div>
          {arrivals.length === 0 ? (
            <div className="empty" style={{ padding: '24px 16px', textAlign: 'center' }}>No pending arrivals today</div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Room Type</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {arrivals.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <b>{b.guest}</b>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.id}</div>
                      </td>
                      <td>{b.room}</td>
                      <td><StatusBadge status={b.pay} /></td>
                      <td>
                        <button
                          className="btn sm"
                          onClick={async () => {
                            await setBookingStatus(b.id, 'Checked-in');
                            notify(`${b.guest} successfully checked in`);
                          }}
                        >
                          Check In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Departures Queue */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Today's Departures & Settlement</h2>
            <span className="badge b-brass">{departures.length} In-House</span>
          </div>
          {departures.length === 0 ? (
            <div className="empty" style={{ padding: '24px 16px', textAlign: 'center' }}>No guests currently checked in</div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Bill Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {departures.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <b>{b.guest}</b>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.id}</div>
                      </td>
                      <td><span className="tag">{b.room_number ? `Room ${b.room_number}` : b.room}</span></td>
                      <td>{inr(b.amt)}</td>
                      <td>
                        <button
                          className="btn sm brass"
                          onClick={async () => {
                            await setBookingStatus(b.id, 'Checked-out');
                            notify(`${b.guest} checked out and room marked for cleaning`);
                          }}
                        >
                          Check Out
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

      {/* Vacant Rooms Ready for Allocation */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Available Clean Rooms Ready to Assign</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Immediate key issuance available</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/front-desk/room-assignment')}>Room Assignment Matrix</button>
        </div>
        {vacantCleanRooms.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px', textAlign: 'center' }}>
            No vacant clean rooms available at this time.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {vacantCleanRooms.slice(0, 12).map((r) => (
              <div
                key={r.n}
                style={{
                  padding: '12px 10px',
                  background: 'rgba(45, 212, 191, 0.06)',
                  border: '1px solid var(--teal)',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Room {r.n}</div>
                <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>{r.type}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Floor {r.f}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
