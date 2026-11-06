import React from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';
import { StatusBadge } from '../../components/Badge';

export default function SecurityDashboard() {
  const { notify, activeTenant, tenant, user, settings, records } = useStore();
  const navigate = useNavigate();
  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || settings?.hotel_name || 'Hotel Management';

  const secRecords = records.filter(r => r.category && r.category.startsWith('security'));
  const incidents = records.filter(r => r.category === 'security_incident_reports');
  const visitorPasses = records.filter(r => r.category === 'security_visitor_passes');
  const activeAlerts = incidents.filter(r => r.status !== 'Resolved' && r.status !== 'Closed');

  return (
    <div className="security-dashboard">
      <PageHead
        title={`${hotelName} – Security & Loss Prevention Command Center`}
        subtitle={`${hotelName} CCTV surveillance status, gate passes, perimeter alarms, keycard audit trail, and emergency readiness`}
      >
        <button className="btn ghost" onClick={() => navigate('/security/surveillance-log')}>
          Surveillance Logs
        </button>
        <button className="btn" onClick={() => navigate('/security/incident-reports')}>
          + Log Incident Report
        </button>
      </PageHead>

      {/* Security Submenus */}
      <SubNav parentPath="/security" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/guests')}>👥 Guests Access & Logs</button>
        <button className="btn sm ghost" onClick={() => navigate('/audit-logs')}>📋 Audit Logs</button>
      </div>

      {/* Security KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Incident Reports</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{activeAlerts.length} Active</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{activeAlerts.length === 0 ? 'No open security incidents' : 'Pending resolution'}</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Visitor Gate Passes</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{visitorPasses.length} Logged</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Contractors, vendor deliveries & visitors</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Security Logs</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{secRecords.length} Records</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Recorded security & checkpoint logs</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--green)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Resolved Incidents</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{incidents.filter(r => r.status === 'Resolved' || r.status === 'Closed').length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Closed cases with full reports</div>
        </div>
      </div>

      {/* Security Incident & Gate Log Table */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Recent Security & Gate Logs</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Live checkpoint scans and visitor badges</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/security/visitor-passes')}>Export Gate Pass Log</button>
        </div>

        {secRecords.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No security logs or incident reports recorded in database.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Category</th>
                  <th>Subject / Description</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {secRecords.slice(0, 6).map((rec) => {
                  const data = rec.data || {};
                  return (
                    <tr key={rec.id}>
                      <td><span className="tag">SEC-{rec.id}</span></td>
                      <td><b>{rec.category.replace('security_', '').replace(/_/g, ' ')}</b></td>
                      <td>{data['Subject'] || data['Description'] || rec.title}</td>
                      <td>{data['Location'] || data['Checkpoint'] || '—'}</td>
                      <td><StatusBadge status={rec.status || 'Active'} /></td>
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
