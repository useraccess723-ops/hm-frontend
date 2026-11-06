import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import Icon from '../../components/Icon';

const AVAILABLE_SCOPES = [
  { id: 'knowledge:read', label: 'Hotel Knowledge & FAQs', desc: 'Allows AI Receptionist to query hotel amenities, timings, dining, and policies.' },
  { id: 'rooms:read', label: 'Room Inventory & Rates', desc: 'Allows AI Receptionist to query live room availability, types, and night tariffs.' },
  { id: 'reservations:read', label: 'Reservation Inquiries', desc: 'Allows AI Receptionist to query booking status with guest verification.' },
  { id: 'reservations:create', label: 'Booking Creation', desc: 'Allows AI Receptionist to create reservations with concurrency safety and idempotency.' },
  { id: 'escalations:create', label: 'Front Desk Escalations', desc: 'Allows AI Receptionist to create front desk tickets and service requests.' },
];

export default function Integrations() {
  const { notify, user, activeTenant, tenant } = useStore();
  const isAdmin = user?.is_super_admin || (user?.role || '').toUpperCase() === 'ADMIN' || (user?.role || '').toUpperCase() === 'ADMINISTRATOR';

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Current Hotel';

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Filters for Telemetry Logs
  const [logCategory, setLogCategory] = useState('all'); // all, connection, booking, auth, escalation
  const [logStatus, setLogStatus] = useState('all'); // all, success, error

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [newKeyData, setNewKeyData] = useState(null); // { key, message }

  // Form states (Structured by Section)
  const [integrationName, setIntegrationName] = useState('');
  const [integrationDesc, setIntegrationDesc] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([
    'knowledge:read',
    'rooms:read',
    'reservations:read',
    'reservations:create',
    'escalations:create',
  ]);
  const [autoValidate, setAutoValidate] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // UI helpers
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState('');
  const [showDocs, setShowDocs] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api('/api/integrations/ai-receptionist');
      setStatusData(data);
      if (data?.name) setIntegrationName(data.name);
      else setIntegrationName(`${hotelName} – AI Receptionist`);
      if (data?.description) setIntegrationDesc(data.description);
      if (data?.api_base_url) setApiBaseUrl(data.api_base_url);
      if (data?.webhook_url) setWebhookUrl(data.webhook_url);
      if (data?.scopes && Array.isArray(data.scopes) && data.scopes.length > 0) {
        setSelectedScopes(data.scopes);
      }
    } catch (err) {
      console.error('Failed to load integration status:', err);
      notify(err.message || 'Could not load integration status');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      let queryParams = ['limit=50'];
      if (logCategory !== 'all') queryParams.push(`category=${logCategory}`);
      if (logStatus !== 'all') queryParams.push(`status_filter=${logStatus}`);
      const qs = queryParams.join('&');
      const data = await api(`/api/integrations/ai-receptionist/logs?${qs}`);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logCategory, logStatus]);

  const handleScopeToggle = (scopeId) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleSaveIntegration = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const isConnected = statusData?.status === 'connected';

      if (!isConnected) {
        // Create new integration & provision service key
        const resp = await api('/api/integrations/ai-receptionist/connect', {
          method: 'POST',
          body: JSON.stringify({
            name: integrationName || `${hotelName} – AI Receptionist`,
            description: integrationDesc || 'Dedicated AI Voice Receptionist Connector',
            api_base_url: apiBaseUrl ? apiBaseUrl.trim() : null,
            webhook_url: webhookUrl ? webhookUrl.trim() : null,
            scopes: selectedScopes,
            config: {
              hotel_name: hotelName,
              auto_validate: autoValidate,
            },
          }),
        });
        setNewKeyData({
          key: resp.service_key,
          message: resp.message,
        });
        setShowConfigModal(false);
        notify('AI Receptionist connected successfully!');

        if (autoValidate) {
          try {
            const testResp = await api('/api/integrations/ai-receptionist/test-connection', { method: 'POST' });
            setTestResult(testResp);
          } catch {}
        }
      } else {
        // Update existing configuration without key revocation
        await api('/api/integrations/ai-receptionist/config', {
          method: 'PUT',
          body: JSON.stringify({
            name: integrationName || `${hotelName} – AI Receptionist`,
            description: integrationDesc || 'Dedicated AI Voice Receptionist Connector',
            api_base_url: apiBaseUrl ? apiBaseUrl.trim() : null,
            webhook_url: webhookUrl ? webhookUrl.trim() : null,
            scopes: selectedScopes,
          }),
        });
        setShowConfigModal(false);
        notify('Integration settings updated successfully!');
      }

      await fetchStatus();
      await fetchLogs();
    } catch (err) {
      notify(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateKey = async () => {
    try {
      const resp = await api('/api/integrations/ai-receptionist/rotate-key', {
        method: 'POST',
      });
      setNewKeyData({
        key: resp.service_key,
        message: resp.message,
      });
      setShowRotateModal(false);
      notify('API Key rotated successfully');
      fetchStatus();
      fetchLogs();
    } catch (err) {
      notify(err.message || 'Key rotation failed');
    }
  };

  const handleDisconnect = async () => {
    try {
      await api('/api/integrations/ai-receptionist/disconnect', { method: 'POST' });
      setShowDisconnectModal(false);
      notify('AI Receptionist disconnected');
      fetchStatus();
      fetchLogs();
    } catch (err) {
      notify(err.message || 'Disconnect failed');
    }
  };

  const handleToggle = async () => {
    if (!statusData) return;
    const newEnabled = !statusData.is_enabled;
    try {
      await api('/api/integrations/ai-receptionist/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: newEnabled }),
      });
      notify(newEnabled ? 'Integration enabled' : 'Integration paused');
      fetchStatus();
    } catch (err) {
      notify(err.message || 'Toggle failed');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await api('/api/integrations/ai-receptionist/test-connection', {
        method: 'POST',
      });
      setTestResult(resp);
      if (resp.status === 'ok') {
        notify(`Connection verified (${resp.latency_ms}ms)`);
      } else {
        notify(resp.message || 'Connection test failed');
      }
      fetchLogs();
    } catch (err) {
      setTestResult({ status: 'error', message: err.message });
      notify(err.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text, type = 'key') => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      if (type === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 3000);
      } else {
        setCopiedEndpoint(type);
        setTimeout(() => setCopiedEndpoint(''), 2500);
      }
      notify('Copied to clipboard');
    }
  };

  const isConnected = statusData?.status === 'connected';

  return (
    <>
      {/* ── Page Header: Only ONE '+ New Integration' button on the entire page ── */}
      <PageHead
        title="AI Receptionist Integration"
        subtitle="Dedicated, secure connectivity and live telemetry for your external AI Receptionist voice & chat agent."
      >
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (!integrationName) setIntegrationName(`${hotelName} – AI Receptionist`);
            setShowConfigModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600, fontSize: 13 }}
        >
          <Icon name="plus" />
          + New Integration
        </button>
      </PageHead>

      {/* ── Section 1: AI Receptionist Connector Card ─────────────────────────── */}
      <div className="panel" style={{ marginBottom: 20, padding: 24, borderRadius: 12, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: isConnected
                  ? statusData?.is_enabled
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(234, 179, 8, 0.12)'
                  : 'rgba(148, 163, 184, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {statusData?.name || 'StayFlow AI Receptionist Connector'}
                </h2>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: !isConnected
                      ? 'rgba(148, 163, 184, 0.15)'
                      : statusData?.is_enabled
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(234, 179, 8, 0.15)',
                    color: !isConnected
                      ? '#64748b'
                      : statusData?.is_enabled
                      ? '#16a34a'
                      : '#ca8a04',
                  }}
                >
                  {!isConnected ? '⚪ Disconnected' : statusData?.is_enabled ? '🟢 Active & Ready' : '🟡 Paused'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--panel-alt)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
                  Hotel: <b>{hotelName}</b>
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 720 }}>
                {statusData?.description || 'Connect your external AI Receptionist voice agent to live StayFlow reservation engine, room inventories, and guest verification.'}
              </p>
            </div>
          </div>

          {/* Action Buttons inside Card (No duplicate '+ New Integration' button) */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowConfigModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="settings" />
              Configure
            </button>

            <button
              type="button"
              className="btn"
              onClick={handleTestConnection}
              disabled={testing || !isConnected}
              title={!isConnected ? 'Connect integration first to test connection' : 'Test connection health'}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="refresh" />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            {isConnected && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={handleToggle}
                  title="Pause or resume incoming AI Receptionist calls"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {statusData?.is_enabled ? '⏸ Pause' : '▶ Resume'}
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowDisconnectModal(true)}
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Test Connection Result Banner */}
        {testResult && (
          <div
            style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 8,
              background: testResult.status === 'ok' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${testResult.status === 'ok' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: testResult.status === 'ok' ? '#16a34a' : '#ef4444' }}>
                {testResult.status === 'ok' ? '✓ ' : '✕ '}
              </span>
              <span style={{ color: 'var(--ink)' }}>{testResult.message}</span>
              {testResult.latency_ms !== undefined && (
                <span style={{ fontSize: 11, background: 'var(--panel-alt)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)', color: 'var(--muted)' }}>
                  {testResult.latency_ms}ms
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn small"
              onClick={() => setTestResult(null)}
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ── Section 2: Authentication & Service Scopes ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Credentials Card */}
        <div className="panel" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Service Key Authentication</h3>
            {isAdmin && isConnected && (
              <button
                type="button"
                className="btn small"
                onClick={() => setShowRotateModal(true)}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Icon name="key" />
                Rotate Key
              </button>
            )}
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              M2M Integration Key (Masked)
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={statusData?.masked_key || 'No service key active'}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  background: 'var(--panel-alt)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  borderRadius: 7,
                  padding: '9px 12px',
                  cursor: 'default',
                }}
              />
              {statusData?.masked_key && (
                <button
                  type="button"
                  className="btn small"
                  onClick={() => copyToClipboard(statusData.masked_key, 'masked_key')}
                  title="Copy masked key reference"
                >
                  <Icon name="copy" />
                </button>
              )}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: 11, color: 'var(--muted)' }}>
              Full 72-character key is stored strictly as SHA-256 hash. Plaintext is only visible once upon generation.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>Last Connected</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                {statusData?.last_connected_at ? new Date(statusData.last_connected_at).toLocaleString() : 'Never'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>Last Activity</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                {statusData?.last_activity_at ? new Date(statusData.last_activity_at).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Permissions & Scopes Card */}
        <div className="panel" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Granted Service Permissions</h3>
            <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--panel-alt)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--line)' }}>
              Hotel Scoped
            </span>
          </div>

          <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--muted)' }}>
            Enforced on every incoming API call against the authenticated hotel tenant:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(statusData?.scopes || ['knowledge:read', 'rooms:read', 'reservations:read', 'reservations:create', 'escalations:create']).map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <code style={{ background: 'var(--panel-alt)', color: 'var(--ink)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)', fontSize: 11 }}>
                  {s}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Dedicated M2M API Endpoints Documentation ─────────────────── */}
      <div className="panel" style={{ marginBottom: 20, padding: 20, borderRadius: 12, border: '1px solid var(--line)' }}>
        <div
          onClick={() => setShowDocs(!showDocs)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Dedicated M2M API Endpoints</h3>
            <span style={{ fontSize: 11, background: 'var(--teal-soft)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
              AI Receptionist Contract
            </span>
          </div>
          <button type="button" className="btn small" style={{ fontSize: 11 }}>
            {showDocs ? '▲ Collapse' : '▼ View Endpoints'}
          </button>
        </div>

        {showDocs && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px 0' }}>
              All M2M endpoints require HTTP Header <code style={{ background: 'var(--panel-alt)', padding: '2px 4px', borderRadius: 3 }}>X-Integration-Key: &lt;service_key&gt;</code>. Tenant isolation is enforced exclusively from the credential hash.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { method: 'POST', path: '/api/integrations/ai-receptionist/chat', scope: 'knowledge:read', desc: 'Query hotel FAQ, policies, and facilities.' },
                { method: 'GET', path: '/api/integrations/ai-receptionist/availability', scope: 'rooms:read', desc: 'Check room types, tariffs, and date-range availability.' },
                { method: 'POST', path: '/api/integrations/ai-receptionist/bookings', scope: 'reservations:create', desc: 'Concurrency-safe, 2-phase idempotent booking creation (Requires Idempotency-Key).' },
                { method: 'POST', path: '/api/integrations/ai-receptionist/verify-caller', scope: 'reservations:read', desc: 'Uniform anti-enumeration caller challenge & HMAC OTP issuance.' },
                { method: 'POST', path: '/api/integrations/ai-receptionist/verify-otp', scope: 'reservations:read', desc: 'Exchange OTP code for ephemeral single-use verification token.' },
                { method: 'GET', path: '/api/integrations/ai-receptionist/booking/{reference}', scope: 'reservations:read', desc: 'Retrieve reservation details (Masked PII unless verified).' },
                { method: 'POST', path: '/api/integrations/ai-receptionist/escalate', scope: 'escalations:create', desc: 'Create Front Desk / guest service ticket.' },
              ].map((ep) => (
                <div
                  key={ep.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--panel-alt)',
                    border: '1px solid var(--line)',
                    fontSize: 12,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: ep.method === 'POST' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: ep.method === 'POST' ? '#ca8a04' : '#16a34a',
                      }}
                    >
                      {ep.method}
                    </span>
                    <code style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{ep.path}</code>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>— {ep.desc}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{ep.scope}</span>
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => copyToClipboard(ep.path, ep.path)}
                      style={{ fontSize: 11, padding: '2px 8px' }}
                    >
                      {copiedEndpoint === ep.path ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 4: Live Telemetry & Activity Logs ──────────────────────────── */}
      <div className="panel" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Integration Activity & Telemetry Logs</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Real-time audit log of all inbound API requests and handshakes for <b>{hotelName}</b>.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--panel-alt)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              {['all', 'connection', 'booking', 'auth', 'escalation'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLogCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    background: logCategory === cat ? 'var(--panel)' : 'transparent',
                    color: logCategory === cat ? 'var(--ink)' : 'var(--muted)',
                    boxShadow: logCategory === cat ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, background: 'var(--panel-alt)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              {['all', 'success', 'error'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLogStatus(st)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    background: logStatus === st ? 'var(--panel)' : 'transparent',
                    color: logStatus === st ? 'var(--ink)' : 'var(--muted)',
                    boxShadow: logStatus === st ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {st === 'all' ? 'All Status' : st === 'success' ? 'Success' : 'Failed'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn small"
              onClick={fetchLogs}
              disabled={logsLoading}
              title="Refresh logs"
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading telemetry logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--line)', borderRadius: 8 }}>
            No activity logs found for the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)' }}>Timestamp</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)' }}>Event</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)' }}>Direction</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)' }}>Latency</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)' }}>Summary</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: 'var(--muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                      {l.created_at ? new Date(l.created_at).toLocaleTimeString() : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                      <code style={{ background: 'var(--panel-alt)', padding: '2px 5px', borderRadius: 4, color: 'var(--ink)' }}>
                        {l.event_type}
                      </code>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--panel-alt)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                        {l.direction}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: l.status === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: l.status === 'success' ? '#16a34a' : '#ef4444',
                        }}
                      >
                        {l.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--muted)' }}>
                      {l.duration_ms !== null ? `${l.duration_ms}ms` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--ink)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.payload_summary || '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => setSelectedLog(l)}
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Configure / + New Integration Form (Opaque, Theme-Aware) ─── */}
      {showConfigModal && (
        <div
          className="stayflow-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowConfigModal(false);
          }}
        >
          <div className="stayflow-modal-container" role="dialog" aria-modal="true">
            {/* Modal Header */}
            <div className="stayflow-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2>
                  {isConnected ? 'Configure AI Receptionist' : 'New Hotel Integration'}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'var(--teal-soft)',
                    color: 'var(--teal)',
                    letterSpacing: '0.02em',
                  }}
                >
                  AI Receptionist
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowConfigModal(false)}
                disabled={submitting}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveIntegration} style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0 }}>
              <div className="stayflow-modal-body">
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {isConnected
                    ? `Update configuration settings for ${hotelName}. Credentials remain active unless rotated.`
                    : `Connect your separate AI Receptionist voice agent for ${hotelName}. Scoped credentials and hotel-isolated endpoints will be provisioned.`}
                </p>

                {/* Section A: Basic Integration Details */}
                <div className="stayflow-modal-section">
                  <span className="stayflow-modal-section-title">
                    A. Basic Integration Details
                  </span>

                  <div className="stayflow-modal-field">
                    <label>
                      Integration Name <span style={{ color: 'var(--red, #ef4444)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="stayflow-modal-input"
                      placeholder="e.g. Grand Meridian Chennai – AI Receptionist"
                      value={integrationName}
                      onChange={(e) => setIntegrationName(e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>A distinct display label for this hotel's connector.</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="stayflow-modal-field">
                      <label>Integration Type</label>
                      <input
                        type="text"
                        value="AI Receptionist"
                        disabled
                        className="stayflow-modal-input"
                      />
                    </div>
                    <div className="stayflow-modal-field">
                      <label>Target Hotel Property</label>
                      <input
                        type="text"
                        value={hotelName}
                        disabled
                        className="stayflow-modal-input"
                      />
                    </div>
                  </div>

                  <div className="stayflow-modal-field">
                    <label>Integration Description (Optional)</label>
                    <input
                      type="text"
                      className="stayflow-modal-input"
                      placeholder="e.g. Handles telephone reservations and guest service requests."
                      value={integrationDesc}
                      onChange={(e) => setIntegrationDesc(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section B: Connection Configuration */}
                <div className="stayflow-modal-section">
                  <span className="stayflow-modal-section-title">
                    B. Connection Configuration
                  </span>

                  <div className="stayflow-modal-field">
                    <label>AI Receptionist API Base URL (Optional)</label>
                    <input
                      type="url"
                      className="stayflow-modal-input"
                      placeholder="http://localhost:5000 or https://ai-receptionist.yourdomain.com"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Base URL of your separate AI Receptionist server for live health probing.
                    </span>
                  </div>

                  <div className="stayflow-modal-field">
                    <label>Webhook URL (Optional)</label>
                    <input
                      type="url"
                      className="stayflow-modal-input"
                      placeholder="https://ai-receptionist.yourdomain.com/webhook/stayflow"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Destination URL for asynchronous booking event dispatches, if required.
                    </span>
                  </div>

                  <div className="stayflow-modal-field">
                    <label>Authentication Method</label>
                    <input
                      type="text"
                      value="Header: X-Integration-Key (SHA-256 M2M Key)"
                      disabled
                      className="stayflow-modal-input"
                    />
                  </div>
                </div>

                {/* Section C: Service Permissions & Scopes */}
                <div className="stayflow-modal-section">
                  <span className="stayflow-modal-section-title">
                    C. Service Permissions & Scopes
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {AVAILABLE_SCOPES.map((scope) => (
                      <label
                        key={scope.id}
                        className="stayflow-scope-item"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.id)}
                          onChange={() => handleScopeToggle(scope.id)}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{scope.label}</span>
                            <code style={{ fontSize: 10.5, color: 'var(--muted)', background: 'var(--panel-alt)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--line)' }}>
                              {scope.id}
                            </code>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, display: 'block' }}>
                            {scope.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Section D: Connection Validation */}
                {!isConnected && (
                  <div className="stayflow-modal-section" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      id="auto-val-check"
                      type="checkbox"
                      checked={autoValidate}
                      onChange={(e) => setAutoValidate(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
                    />
                    <label htmlFor="auto-val-check" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, cursor: 'pointer', margin: 0 }}>
                      Validate connection health upon creation
                    </label>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="stayflow-modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowConfigModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting}
                  style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {submitting ? 'Saving...' : isConnected ? 'Save Configuration' : 'Create Integration & Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: One-Time Key Generation Display (Opaque) ───────────────────── */}
      {newKeyData && (
        <div
          className="stayflow-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewKeyData(null);
          }}
        >
          <div className="stayflow-modal-container" style={{ maxWidth: 540 }} role="dialog">
            <div className="stayflow-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🔑</span>
                <h3 style={{ margin: 0, color: 'var(--green, #16a34a)' }}>
                  Service Key Generated Successfully
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setNewKeyData(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="stayflow-modal-body">
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Copy your service key now. For maximum security, this key is never stored in plaintext and will <b>never be displayed again</b>.
              </p>

              <div className="stayflow-modal-field" style={{ marginBottom: 16 }}>
                <label>Plaintext Service Key (72 Characters)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={newKeyData.key}
                    className="stayflow-modal-input"
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: 600,
                      borderColor: 'var(--green, #16a34a)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => copyToClipboard(newKeyData.key, 'key')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
                  >
                    <Icon name="copy" />
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--green-soft, rgba(34, 197, 94, 0.08))', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green, #16a34a)', display: 'block', marginBottom: 4 }}>
                  AI Receptionist Configuration:
                </span>
                <code style={{ fontSize: 11, display: 'block', color: 'var(--ink)', wordBreak: 'break-all' }}>
                  STAYFLOW_INTEGRATION_KEY="{newKeyData.key}"
                </code>
              </div>
            </div>

            <div className="stayflow-modal-footer">
              <button
                type="button"
                className="btn primary"
                onClick={() => setNewKeyData(null)}
                style={{ fontWeight: 600 }}
              >
                I Have Saved This Key Securely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Rotate Key (Opaque) ───────────────────────────────────────── */}
      {showRotateModal && (
        <div
          className="stayflow-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRotateModal(false);
          }}
        >
          <div className="stayflow-modal-container" style={{ maxWidth: 460 }} role="dialog">
            <div className="stayflow-modal-header">
              <h3 style={{ margin: 0, color: 'var(--brass, #ca8a04)' }}>Rotate Service Key?</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowRotateModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="stayflow-modal-body">
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
                Rotating the key immediately revokes the current service key. Any external AI Receptionist instances using the old key will be rejected with HTTP 401 until updated with the newly generated key.
              </p>
            </div>

            <div className="stayflow-modal-footer">
              <button type="button" className="btn ghost" onClick={() => setShowRotateModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={handleRotateKey}>
                Confirm & Rotate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Disconnect (Opaque) ───────────────────────────────────────── */}
      {showDisconnectModal && (
        <div
          className="stayflow-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDisconnectModal(false);
          }}
        >
          <div className="stayflow-modal-container" style={{ maxWidth: 460 }} role="dialog">
            <div className="stayflow-modal-header">
              <h3 style={{ margin: 0, color: 'var(--red, #ef4444)' }}>Disconnect AI Receptionist?</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDisconnectModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="stayflow-modal-body">
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
                This will disable inbound AI Receptionist calls and revoke active credentials. You can reconnect at any time from this dashboard.
              </p>
            </div>

            <div className="stayflow-modal-footer">
              <button type="button" className="btn ghost" onClick={() => setShowDisconnectModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDisconnect}
                style={{ background: 'var(--red, #ef4444)', color: '#fff', border: 'none', fontWeight: 600 }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Log Entry Details (Opaque) ─────────────────────────────────── */}
      {selectedLog && (
        <div
          className="stayflow-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
        >
          <div className="stayflow-modal-container" style={{ maxWidth: 520 }} role="dialog">
            <div className="stayflow-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, color: 'var(--ink)' }}>Telemetry Event #{selectedLog.id}</h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: selectedLog.status === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: selectedLog.status === 'success' ? '#16a34a' : '#ef4444',
                  }}
                >
                  {selectedLog.status.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedLog(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="stayflow-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5 }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Event Type:</span>
                  <code style={{ background: 'var(--panel-alt)', color: 'var(--ink)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>
                    {selectedLog.event_type}
                  </code>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Timestamp:</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', marginBottom: 2 }}>Latency / Execution Duration:</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {selectedLog.duration_ms !== null ? `${selectedLog.duration_ms} ms` : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Payload Summary:</span>
                  <p style={{ margin: 0, background: 'var(--panel-alt)', color: 'var(--ink)', padding: 12, borderRadius: 6, border: '1px solid var(--line)', lineHeight: 1.4 }}>
                    {selectedLog.payload_summary || 'No payload summary recorded.'}
                  </p>
                </div>
                {selectedLog.error_details && (
                  <div>
                    <span style={{ color: 'var(--red, #ef4444)', display: 'block', marginBottom: 4 }}>Error Details:</span>
                    <p style={{ margin: 0, background: 'var(--red-soft, rgba(239, 68, 68, 0.08))', padding: 12, borderRadius: 6, border: '1px solid var(--red, #ef4444)', color: 'var(--red, #ef4444)', lineHeight: 1.4 }}>
                      {selectedLog.error_details}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="stayflow-modal-footer">
              <button type="button" className="btn primary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
