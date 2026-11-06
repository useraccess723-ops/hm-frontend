import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/Badge';

export default function HrDashboard() {
  const { notify, activeTenant, tenant, user, settings, records, updateRecord, refresh } = useStore();
  const navigate = useNavigate();
  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || settings?.hotel_name || 'Hotel Management';

  const [staffUsers, setStaffUsers] = useState([]);
  useEffect(() => {
    api('/api/admin/users').then(data => {
      if (Array.isArray(data)) setStaffUsers(data);
    }).catch(() => {});
  }, []);

  const leaveRecords = records.filter(r => r.category === 'human_resources_leave_management');
  const pendingLeaves = leaveRecords.filter(r => r.status === 'Pending' || r.status === 'Under Review');
  const shiftRecords = records.filter(r => r.category === 'human_resources_shift_rosters');
  const activeStaff = staffUsers.filter(u => u.is_active);

  return (
    <div className="hr-dashboard">
      <PageHead
        title={`${hotelName} – Human Resources & Workforce Management`}
        subtitle={`${hotelName} staff roster, biometric attendance logs, leave management, payroll, and employee onboarding`}
      >
        <button className="btn ghost" onClick={() => navigate('/human-resources/shift-rosters')}>
          Shift Roster
        </button>
        <button className="btn" onClick={() => navigate('/human-resources/employee-directory')}>
          + Add Employee
        </button>
      </PageHead>

      {/* Human Resources Submenus */}
      <SubNav parentPath="/human-resources" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/staff')}>👥 Admin & Staff</button>
        <button className="btn sm ghost" onClick={() => navigate('/reports')}>📊 Reports & Analytics</button>
      </div>

      {/* HR KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Staff Headcount</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{staffUsers.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Registered system accounts</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Staff Accounts</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{activeStaff.length}</div>
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>Enabled for duty login</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Leave Requests Pending</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{pendingLeaves.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Awaiting supervisor sign-off</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Shift Rosters</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{shiftRecords.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Departmental shift templates</div>
        </div>
      </div>

      {/* 2-Column: Department Shift Coverage & Leave Requests */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Department Shifts */}
        <div className="panel">
          <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Active Staff by Role</h2>
          {staffUsers.length === 0 ? (
            <div className="empty" style={{ padding: '24px 16px', textAlign: 'center' }}>
              No staff members registered in database.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staffUsers.slice(0, 6).map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12 }}>{u.role}</div>
                    <span className={`badge b-${u.is_active ? 'green' : 'grey'}`}>{u.is_active ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Pending Leave Applications</h2>
            <button className="btn sm ghost" onClick={() => navigate('/human-resources/leave-management')}>All Leaves</button>
          </div>
          {leaveRecords.length === 0 ? (
            <div className="empty" style={{ padding: '24px 16px', textAlign: 'center' }}>
              No pending leave applications.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaveRecords.slice(0, 4).map((lv) => {
                const data = lv.data || {};
                return (
                  <div key={lv.id} style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{data['Employee Name'] || data['Staff'] || lv.title}</span>
                      <StatusBadge status={lv.status || 'Pending'} />
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--brass)', margin: '4px 0' }}>{data['Dates'] || data['Leave Dates'] || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8 }}>Reason: {data['Reason'] || '—'}</div>
                    {lv.status === 'Pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn sm"
                          onClick={async () => {
                            if (updateRecord) {
                              await updateRecord(lv.id, { status: 'Approved' });
                              await refresh();
                              notify(`Leave request approved`);
                            }
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn sm ghost"
                          onClick={async () => {
                            if (updateRecord) {
                              await updateRecord(lv.id, { status: 'Rejected' });
                              await refresh();
                              notify(`Leave request rejected`);
                            }
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
