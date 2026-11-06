import React from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import Badge, { StatusBadge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';

export default function HousekeepingDashboard() {
  const { rooms, records, markRoomClean, notify, user, activeTenant, tenant } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const dirtyRooms = rooms.filter((r) => r.s === 'dirty');
  const cleanRooms = rooms.filter((r) => r.s === 'vac');
  const occRooms = rooms.filter((r) => r.s === 'occ');
  const oooRooms = rooms.filter((r) => r.s === 'ooo');

  // Real housekeeping records
  const shiftRosters = records.filter((r) => {
    const cat = (r.category || '').toLowerCase();
    return cat.includes('housekeeping') && (cat.includes('staff') || cat.includes('roster') || cat.includes('assignment'));
  });

  const lostFoundItems = records.filter((r) => {
    const cat = (r.category || '').toLowerCase();
    return cat.includes('lost') || (cat.includes('housekeeping') && cat.includes('found'));
  });

  return (
    <div className="hk-dashboard">
      <PageHead
        title={`${hotelName} · Housekeeping Operations Hub`}
        subtitle={`${hotelName} room turnaround board, maid assignments, inspection approvals, and lost & found inventory`}
      >
        <button
          className="btn ghost"
          onClick={async () => {
            for (const r of dirtyRooms) {
              await markRoomClean(r.n);
            }
            notify(`All ${dirtyRooms.length} rooms marked clean & ready!`);
          }}
        >
          Mark All Clean
        </button>
        <button className="btn" onClick={() => navigate('/housekeeping/staff-assignment')}>
          Staff Task Sheet
        </button>
      </PageHead>

      {/* Housekeeping Submenus */}
      <SubNav parentPath="/housekeeping" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/rooms')}>🛏️ Rooms & Availability</button>
        <button className="btn sm ghost" onClick={() => navigate('/guest-services')}>🛎️ Guest Services</button>
        <button className="btn sm ghost" onClick={() => navigate('/engineering')}>🔧 Maintenance Requests</button>
      </div>

      {/* Housekeeping Status KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Dirty / Needs Cleaning</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{dirtyRooms.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Departure turnover backlog</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--green)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Clean & Ready to Sell</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{cleanRooms.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Inspected & sanitised</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>In-House Occupied</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{occRooms.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Daily stayover service required</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--brass)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Out-of-Order / Repair</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{oooRooms.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Under engineering work</div>
        </div>
      </div>

      {/* Dirty Rooms Cleaning Queue */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Priority Room Turnover Queue</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Checked-out rooms awaiting cleaning for today's arriving guests</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/housekeeping/dirty-rooms')}>View All Dirty Rooms</button>
        </div>
        {dirtyRooms.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            🎉 Excellent work! All rooms are currently cleaned and turned over.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Floor</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dirtyRooms.map((r, i) => (
                  <tr key={r.n}>
                    <td><b>Room {r.n}</b></td>
                    <td>Floor {r.f}</td>
                    <td>{r.type}</td>
                    <td>
                      <span className={`badge b-${i === 0 ? 'red' : 'brass'}`}>
                        {i === 0 ? 'High Priority' : 'Normal Priority'}
                      </span>
                    </td>
                    <td>Needs cleaning</td>
                    <td>
                      <button
                        className="btn sm"
                        onClick={async () => {
                          await markRoomClean(r.n);
                          notify(`Room ${r.n} marked clean and ready!`);
                        }}
                      >
                        ✓ Mark Clean
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Duty & Lost and Found */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Attendant Shift Roster</h2>
            <button className="btn sm ghost" onClick={() => navigate('/housekeeping/staff-assignment')}>Assign Task</button>
          </div>
          {shiftRosters.length === 0 ? (
            <div className="empty" style={{ padding: '28px 16px', textAlign: 'center' }}>
              No attendant shift assignments recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shiftRosters.map((st) => (
                <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{st.title || st.data?.['Attendant Name'] || st.data?.['Staff Name']}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Zone: {st.data?.['Zone'] || st.data?.['Floor'] || 'General'} • {st.data?.['Rooms Assigned'] ? `${st.data['Rooms Assigned']} Rooms` : 'Assigned'}
                    </div>
                  </div>
                  <span className="badge b-teal">{st.status || st.data?.['Status'] || 'Active'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Lost & Found Custody</h2>
            <button className="btn sm ghost" onClick={() => navigate('/housekeeping/lost-found')}>Full Registry</button>
          </div>
          {lostFoundItems.length === 0 ? (
            <div className="empty" style={{ padding: '28px 16px', textAlign: 'center' }}>
              No lost & found items logged in registry.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lostFoundItems.map((lf) => (
                <div key={lf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{lf.title || lf.data?.['Item'] || lf.data?.['Item Description']}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Location: {lf.data?.['Room Number'] || lf.data?.['Room'] || 'Hotel Premises'} • Date: {lf.data?.['Date Found'] || 'Logged'}
                    </div>
                  </div>
                  <span className="badge b-brass">{lf.status || lf.data?.['Status'] || 'Safekeeping'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
