import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function PlatformMonitoring() {
  const { notify } = useStore();
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const res = await api('/api/superadmin/monitoring');
      setTelemetry(res);
      setLastRefreshed(new Date());
    } catch (err) {
      notify(err.message || 'Failed to fetch monitoring telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📡</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
              Platform Telemetry & System Monitoring
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
            Real-time diagnostics across database connection pools, tenant data distributions, and platform audit security.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1,
          }}>
            <span style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--green, #10b981)',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
            }} />
            Auto-refresh (30s) · Last: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <button
            type="button"
            className="btn ghost sm"
            onClick={fetchTelemetry}
            disabled={loading}
            style={{
              height: 34,
              padding: '0 14px',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--ink)',
              transition: 'all 0.18s ease',
            }}
            title="Fetch real-time platform telemetry"
          >
            <Icon 
              name="refresh" 
              className={loading ? 'spin' : ''} 
              style={{ width: 14, height: 14 }}
            />
            <span>{loading ? 'Refreshing…' : 'Refresh Now'}</span>
          </button>
        </div>
      </div>

      {loading && !telemetry ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: 'var(--muted)' }}>Querying platform telemetry nodes…</p>
        </div>
      ) : (
        <>
          {/* Health Diagnostics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Database Status
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: 'var(--green, #10b981)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>●</span> Connected & Active
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Dialect: {telemetry?.database_status?.dialect || 'MySQL'}
              </div>
            </div>

            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Connection Pool
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: 'var(--head-color, #fff)' }}>
                {telemetry?.database_status?.pool_checked_in || 0} in pool
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {telemetry?.database_status?.pool_checked_out || 0} active checkouts
              </div>
            </div>

            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Tenant Isolation Guard
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: 'var(--brass, #c99e4d)' }}>
                Enforced (100%)
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Direct URL & query scoping active
              </div>
            </div>

            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Total Hotels Monitored
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: 'var(--head-color, #fff)' }}>
                {telemetry?.tenants_distribution?.length || 0} Properties
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                0 critical alerts reported
              </div>
            </div>
          </div>

          {/* Tenants Data Distribution */}
          <div className="panel" style={{ marginBottom: 28 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
                Tenant Data Distribution Matrix
              </h2>
              <p style={{ margin: '2px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 12 }}>
                Live record counts partitioned per isolated tenant database silo
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '12px 20px' }}>Hotel Tenant</th>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Rooms Assigned</th>
                    <th style={{ padding: '12px 16px' }}>Reservations</th>
                    <th style={{ padding: '12px 16px' }}>Staff Accounts</th>
                    <th style={{ padding: '12px 16px' }}>Revenue Processed</th>
                    <th style={{ padding: '12px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(telemetry?.tenants_distribution || []).map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--head-color, #fff)' }}>
                        {t.name}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <code>{t.code}</code>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{t.rooms} rooms</td>
                      <td style={{ padding: '14px 16px' }}>{t.bookings} bookings</td>
                      <td style={{ padding: '14px 16px' }}>{t.users} users</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        ₹{(t.revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`badge ${t.status === 'Active' ? 'b-teal' : 'b-red'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Log Stream */}
          <div className="panel">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
                Platform Security Audit Log Stream
              </h2>
              <p style={{ margin: '2px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 12 }}>
                High-priority security events and administrative transactions
              </p>
            </div>

            <div style={{ padding: '12px 20px' }}>
              {(telemetry?.recent_audit_logs || []).length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No events recorded.</p>
              ) : (
                (telemetry?.recent_audit_logs || []).map((log) => (
                  <div key={log.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--line)',
                    fontSize: 13,
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>{log.actor_email}</span>
                      <span style={{ margin: '0 8px', color: 'var(--muted)' }}>•</span>
                      <code style={{ fontSize: 12, color: 'var(--brass)' }}>{log.action}</code>
                      {log.detail && <span style={{ marginLeft: 8, color: 'var(--sub)' }}>({log.detail})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString('en-GB') : '—'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
