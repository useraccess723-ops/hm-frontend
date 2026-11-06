import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { switchTenant, notify } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api('/api/superadmin/dashboard');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load platform dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleInspect = async (tenant) => {
    await switchTenant(tenant.id);
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: 'var(--muted)' }}>Loading Platform Overview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
          <button className="btn primary" onClick={fetchDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  const { overview = {}, tenants = [], recent_audit_logs = [] } = data || {};

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏢</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
              Platform Super Administration
            </h1>
            <span className="badge b-brass" style={{ fontSize: 11, padding: '3px 8px' }}>
              Master Platform
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
            Multi-tenant orchestration, tenant isolation control, platform KPI metrics and system health.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn ghost sm" 
            onClick={fetchDashboard}
            disabled={loading}
            style={{ height: 34, padding: '0 14px' }}
          >
            <Icon name="refresh" className={loading ? 'spin' : ''} style={{ width: 14, height: 14 }} />
            <span>Refresh Metrics</span>
          </button>
          <button 
            type="button" 
            className="btn primary sm" 
            onClick={() => navigate('/superadmin/tenants')}
            style={{ height: 34, padding: '0 14px' }}
          >
            <Icon name="plus" style={{ width: 14, height: 14 }} />
            <span>Onboard Hotel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Active Hotels</span>
            <span style={{ fontSize: 18 }}>🏨</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: 'var(--head-color, #fff)' }}>
            {overview.active_tenants || 0}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginLeft: 6 }}>
              / {overview.total_tenants || 0} total
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--green, #10b981)', marginTop: 4 }}>
            ● 100% tenant isolation active
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Managed Rooms</span>
            <span style={{ fontSize: 18 }}>🛏️</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: 'var(--head-color, #fff)' }}>
            {overview.total_rooms || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Across all hotel properties
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Platform Bookings</span>
            <span style={{ fontSize: 18 }}>📅</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: 'var(--head-color, #fff)' }}>
            {overview.total_bookings || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--brass, #c99e4d)', marginTop: 4 }}>
            Multi-tenant isolated records
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Platform Revenue</span>
            <span style={{ fontSize: 18 }}>💰</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: 'var(--head-color, #fff)' }}>
            ₹{(overview.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--green, #10b981)', marginTop: 4 }}>
            Settled hotel transactions
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>System Health</span>
            <span style={{ fontSize: 18 }}>⚡</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12, color: 'var(--green, #10b981)' }}>
            Operational
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {overview.active_users || 0} staff accounts online
          </div>
        </div>
      </div>

      {/* Tenants Table & Quick Switch */}
      <div className="panel" style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)'
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
              Hotel Properties & Tenants
            </h2>
            <p style={{ margin: '2px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 12 }}>
              Inspect any hotel in real-time or manage subscription quotas
            </p>
          </div>
          <button className="btn sm outline" onClick={() => navigate('/superadmin/tenants')}>
            View All ({tenants.length})
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '12px 20px' }}>Hotel / Property</th>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>Plan</th>
                <th style={{ padding: '12px 16px' }}>Rooms / Users</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--muted)' }}>
                    No hotel properties or tenants registered yet.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(201, 158, 77, 0.15)',
                        border: '1px solid var(--brass, #c99e4d)',
                        color: 'var(--brass, #c99e4d)',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.contact_email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--panel)', borderRadius: 4 }}>
                      {t.code}
                    </code>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--sub)' }}>
                    {t.city ? `${t.city}, ${t.country}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge" style={{
                      background: t.subscription_plan === 'Enterprise' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: t.subscription_plan === 'Enterprise' ? '#c084fc' : '#60a5fa',
                      border: '1px solid currentColor'
                    }}>
                      {t.subscription_plan}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{t.rooms_count}</span>
                    <span style={{ color: 'var(--muted)' }}> / {t.max_rooms} rooms</span>
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.users_count} users</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${t.status === 'Active' ? 'b-teal' : 'b-red'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        className="btn sm primary"
                        onClick={() => handleInspect(t)}
                        title="Inspect live operations of this hotel"
                      >
                        Inspect Operations
                      </button>
                      <button
                        className="btn sm secondary"
                        onClick={() => navigate('/superadmin/tenants')}
                        title="Configure tenant settings"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Platform Audit Logs */}
      <div className="panel">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)'
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
              Recent Security & Platform Activity
            </h2>
            <p style={{ margin: '2px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 12 }}>
              Audit stream across all tenants and administrative actions
            </p>
          </div>
          <button className="btn sm outline" onClick={() => navigate('/superadmin/monitoring')}>
            Full Audit Logs
          </button>
        </div>

        <div style={{ padding: '12px 20px' }}>
          {recent_audit_logs.length === 0 ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No recent audit events.</p>
          ) : (
            recent_audit_logs.map((log) => (
              <div key={log.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--line)',
                fontSize: 13
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>{log.actor_email}</span>
                  <span style={{ margin: '0 8px', color: 'var(--muted)' }}>•</span>
                  <code style={{ fontSize: 12, color: 'var(--brass)' }}>{log.action}</code>
                  {log.detail && <span style={{ marginLeft: 8, color: 'var(--sub)' }}>({log.detail})</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
