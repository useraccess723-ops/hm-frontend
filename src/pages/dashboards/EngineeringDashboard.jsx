import React from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';
import { StatusBadge } from '../../components/Badge';

export default function EngineeringDashboard() {
  const { notify, activeTenant, tenant, user, settings, records, rooms, updateRecord, refresh } = useStore();
  const navigate = useNavigate();
  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || settings?.hotel_name || 'Hotel Management';

  const workOrders = records.filter(r => r.category === 'engineering_work_orders' || (r.category && r.category.startsWith('engineering_')));
  const activeOrders = workOrders.filter(r => !['Completed', 'Resolved', 'Closed'].includes(r.status));
  const oooRooms = rooms.filter(r => r.s === 'ooo');
  const preventiveTasks = records.filter(r => r.category === 'engineering_preventive_maintenance');
  const safetyRecords = records.filter(r => r.category === 'engineering_safety_compliance');

  return (
    <div className="eng-dashboard">
      <PageHead
        title={`${hotelName} – Engineering & Facility Operations`}
        subtitle={`${hotelName} preventive maintenance, open work orders, HVAC & chiller plants, utilities, and safety compliance`}
      >
        <button className="btn ghost" onClick={() => navigate('/engineering/preventive-maintenance')}>
          Maintenance Schedule
        </button>
        <button className="btn" onClick={() => navigate('/engineering/work-orders')}>
          + Log Work Order
        </button>
      </PageHead>

      {/* Engineering Submenus */}
      <SubNav parentPath="/engineering" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/rooms')}>🛏️ Rooms & Out of Order</button>
        <button className="btn sm ghost" onClick={() => navigate('/procurement')}>📦 Procurement Requisitions</button>
      </div>

      {/* Engineering KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Open Work Orders</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{activeOrders.length} Active</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{activeOrders.length === 0 ? 'All work orders resolved' : `${activeOrders.length} pending engineering resolution`}</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--brass)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Out-of-Order Rooms</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{oooRooms.length} Rooms</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{oooRooms.length === 0 ? 'No rooms under repair' : `${oooRooms.map(r => r.n).join(', ')} unavailable`}</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Preventive Tasks</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{preventiveTasks.length} Scheduled</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>PPM maintenance schedules</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--green)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Safety & Compliance Audits</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{safetyRecords.length} Logged</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Audited inspection records</div>
        </div>
      </div>

      {/* Work Orders Queue */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Active Engineering Work Orders</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Reported by Front Desk, Housekeeping, or automated building sensors</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/engineering/work-orders')}>View All Orders</button>
        </div>
        {workOrders.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No engineering work orders recorded in database.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Location / Room</th>
                  <th>Issue Description</th>
                  <th>Severity / Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.slice(0, 6).map((wo) => {
                  const data = wo.data || {};
                  return (
                    <tr key={wo.id}>
                      <td><span className="tag">WO-{wo.id}</span></td>
                      <td><b>{data['Location'] || data['Room Number'] || data['Room'] || '—'}</b></td>
                      <td>{data['Issue Description'] || data['Description'] || wo.title}</td>
                      <td><span className="badge b-brass">{data['Priority'] || data['Severity'] || 'Standard'}</span></td>
                      <td><StatusBadge status={wo.status || 'Pending'} /></td>
                      <td>
                        {wo.status !== 'Completed' && wo.status !== 'Resolved' && (
                          <button
                            className="btn sm"
                            onClick={async () => {
                              if (updateRecord) {
                                await updateRecord(wo.id, { status: 'Resolved' });
                                await refresh();
                                notify(`Work order WO-${wo.id} marked as RESOLVED`);
                              }
                            }}
                          >
                            ✓ Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
