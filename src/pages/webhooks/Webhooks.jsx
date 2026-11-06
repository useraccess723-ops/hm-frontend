import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';
import { api, API_BASE_URL, getApiBaseUrl } from '../../services/api';
import { useStore } from '../../context/StoreContext';

const AVAILABLE_EVENTS = [
  { id: 'booking.created', label: 'booking.created', desc: 'New booking created by guest or OTA' },
  { id: 'booking.updated', label: 'booking.updated', desc: 'Reservation dates or room updated' },
  { id: 'booking.cancelled', label: 'booking.cancelled', desc: 'Booking cancellation triggered' },
  { id: 'payment.captured', label: 'payment.captured', desc: 'Payment received or captured' },
  { id: 'guest.check_in', label: 'guest.check_in', desc: 'Guest checked in at front desk' },
  { id: 'guest.check_out', label: 'guest.check_out', desc: 'Guest checked out from hotel' },
];

function getInboundReceiverUrl(name) {
  const cleanName = (name || 'generic').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
  const host = getApiBaseUrl() || API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : '');
  return `${host}/api/webhooks/incoming/${cleanName || 'generic'}`;
}

export default function Webhooks() {
  const { notify, activeTenantId, user, tenant } = useStore();
  const effectiveTenantId = activeTenantId || user?.tenant_id || tenant?.id || null;
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('outgoing'); // 'outgoing' | 'incoming'
  const [outgoingUrl, setOutgoingUrl] = useState('');
  const [customSecret, setCustomSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['booking.created', 'booking.cancelled', 'payment.captured']);
  const [formError, setFormError] = useState('');

  // Fetch configured webhooks from MySQL
  const loadWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const url = effectiveTenantId ? `/api/webhooks/subscriptions?hotel_id=${encodeURIComponent(effectiveTenantId)}` : '/api/webhooks/subscriptions';
      const data = await api(url);
      if (Array.isArray(data)) {
        setWebhooks(data);
      } else {
        setWebhooks([]);
      }
    } catch (err) {
      console.warn('Failed to load webhook subscriptions:', err);
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  // Toggle webhook Active / Paused status
  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = (currentStatus || 'Active').toLowerCase() === 'active' ? 'Paused' : 'Active';
    try {
      setTogglingId(id);
      await api(`/api/webhooks/subscriptions/${id}`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
      notify(`✓ Webhook status updated to ${nextStatus}`);
      setWebhooks((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: nextStatus } : w))
      );
    } catch (err) {
      notify(`Error updating webhook: ${err.message || 'Update failed'}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Immediate Test Ping dispatch
  const handleTestPing = async (id, webhookName) => {
    try {
      setTestingId(id);
      const res = await api(`/api/webhooks/subscriptions/${id}/test`, {
        method: 'POST',
      });
      if (res?.status === 'success') {
        notify(`✓ ${res?.message || `Test ping delivered successfully to ${webhookName}`}`);
      } else if (res?.status === 'info') {
        notify(`ℹ️ ${res?.message || `Inbound receiver notice for ${webhookName}`}`);
      } else {
        notify(`❌ ${res?.message || res?.error || `Test ping delivery failed for ${webhookName}`}`);
      }
      await loadWebhooks();
    } catch (err) {
      notify(`Ping error: ${err.message || 'Failed to dispatch test ping'}`);
    } finally {
      setTestingId(null);
    }
  };

  // Open Create Webhook Modal
  const handleOpenCreateModal = () => {
    setName('');
    setType('outgoing');
    setOutgoingUrl('');
    setCustomSecret('');
    setSelectedEvents(['booking.created', 'booking.cancelled', 'payment.captured']);
    setFormError('');
    setModalOpen(true);
  };

  // Close Modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setFormError('');
  };

  // Switch type
  const handleTypeChange = (newType) => {
    setType(newType);
    setFormError('');
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  // Toggle event selection
  const handleToggleEvent = (eventId) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleSelectAllEvents = () => {
    if (selectedEvents.length === AVAILABLE_EVENTS.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(AVAILABLE_EVENTS.map((e) => e.id));
    }
  };

  // Submit Create Webhook form
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Webhook Name is required.');
      return;
    }

    const finalUrl = type === 'outgoing' ? outgoingUrl.trim() : getInboundReceiverUrl(name);
    if (type === 'outgoing') {
      if (!finalUrl) {
        setFormError('Please enter the external destination HTTPS URL for outgoing event delivery.');
        return;
      }
      if (!finalUrl.startsWith('https://') && !finalUrl.startsWith('http://localhost') && !finalUrl.startsWith('http://127.0.0.1')) {
        setFormError('Outgoing destination URL must start with https:// (or http://localhost for local testing).');
        return;
      }
    }

    if (selectedEvents.length === 0) {
      setFormError('Please select at least one event.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        type: type, // 'outgoing' or 'incoming'
        url: finalUrl,
        events: selectedEvents.join(', '),
        secret: customSecret.trim() || undefined,
        status: 'Active',
      };

      await api('/api/webhooks/subscriptions', {
        method: 'POST',
        body: payload,
      });

      notify(`✓ Webhook "${name.trim()}" (${type === 'outgoing' ? 'Outgoing' : 'Incoming'}) configured successfully`);
      handleCloseModal();
      await loadWebhooks();
    } catch (err) {
      setFormError(err.message || 'Failed to save webhook configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (id, webhookName) => {
    if (!window.confirm(`Are you sure you want to delete webhook "${webhookName}"?`)) return;
    try {
      await api(`/api/webhooks/subscriptions/${id}`, { method: 'DELETE' });
      notify(`✓ Webhook "${webhookName}" deleted`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      notify(`Notice: ${err.message || 'Failed to delete webhook'}`);
    }
  };

  // Copy URL Helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify('✓ Webhook URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <PageHead
        title="Webhooks & Developer APIs"
        subtitle="Configure incoming and outgoing webhook integrations, automated events, and real-time data synchronization."
      />

      <SubNav parentPath="/webhooks" />

      {/* Main Content Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Top Summary Banner */}
        <div
          style={{
            background: 'var(--panel, #ffffff)',
            borderRadius: 12,
            border: '1px solid var(--line, #e5e7eb)',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--ink, #111827)' }}>
              Webhook Configurations
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #6b7280)' }}>
              Active incoming receivers and outgoing event dispatchers stored in MySQL ({webhooks.length} configured)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={loadWebhooks}
              title="Refresh webhook list from MySQL database"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={handleOpenCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>＋</span>
              <span>Create Webhook</span>
            </button>
          </div>
        </div>

        {/* Webhooks Table */}
        <div
          style={{
            background: 'var(--panel, #ffffff)',
            borderRadius: 12,
            border: '1px solid var(--line, #e5e7eb)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 850 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 18px', textAlign: 'center', width: 40 }}>#</th>
                  <th style={{ padding: '12px 18px' }}>Name</th>
                  <th style={{ padding: '12px 18px' }}>Type</th>
                  <th style={{ padding: '12px 18px' }}>Endpoint URL</th>
                  <th style={{ padding: '12px 18px' }}>Subscribed Events</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--muted, #6b7280)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>⏳</span>
                        <span>Loading webhooks from MySQL...</span>
                      </div>
                    </td>
                  </tr>
                ) : webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 56, textAlign: 'center', color: 'var(--muted, #6b7280)' }}>
                      <div style={{ maxWidth: 380, margin: '0 auto' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink, #111827)' }}>No Webhooks Configured Yet</div>
                        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted, #6b7280)', lineHeight: 1.5 }}>
                          Create your first webhook to receive events from external OTA platforms or send real-time notifications to external systems.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  webhooks.map((w, idx) => {
                    const isOutgoing = (w.type || 'outgoing').toLowerCase() === 'outgoing';
                    const isActive = (w.status || 'Active').toLowerCase() === 'active';
                    return (
                      <tr
                        key={w.id}
                        style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '14px 18px', textAlign: 'center', color: '#6b7280', fontWeight: 500 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--ink, #1f2937)' }}>
                          {w.name}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              borderRadius: 9999,
                              padding: '3px 12px',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: isOutgoing ? '#e0f2fe' : '#dcfce7',
                              color: isOutgoing ? '#0284c7' : '#15803d',
                            }}
                          >
                            <span>{isOutgoing ? '📤 Outgoing' : '📥 Incoming'}</span>
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', maxWidth: 320 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code
                                style={{
                                  fontFamily: 'Consolas, Monaco, monospace',
                                  fontSize: 12,
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 220,
                                }}
                                title={w.url}
                              >
                                {w.url}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy(w.url, w.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  color: '#2563eb',
                                  padding: 2,
                                }}
                                title="Copy URL"
                              >
                                {copiedId === w.id ? '✓' : '📋'}
                              </button>
                            </div>
                            {isOutgoing && (w.url.includes('127.0.0.1') || w.url.includes('localhost')) && (
                              <span style={{ fontSize: 10, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, width: 'fit-content', fontWeight: 600 }}>
                                ⚠️ Local Loopback Target
                              </span>
                            )}
                            {!isOutgoing && (
                              <span style={{ fontSize: 10, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, width: 'fit-content', fontWeight: 600 }}>
                                Inbound Receiver Endpoint
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 260 }}>
                            {(Array.isArray(w.events) ? w.events : (w.events || '').split(',')).map((ev) => (
                              <span
                                key={ev}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#475569',
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {ev.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(w.id, w.status)}
                            disabled={togglingId === w.id}
                            style={{
                              borderRadius: 9999,
                              padding: '4px 12px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: isActive ? '#dcfce7' : '#fef3c7',
                              color: isActive ? '#15803d' : '#b45309',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Click to switch to ${isActive ? 'Paused' : 'Active'}`}
                          >
                            <span>{isActive ? '🟢 Active' : '⏸️ Paused'}</span>
                          </button>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleTestPing(w.id, w.name)}
                              disabled={testingId === w.id}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                cursor: testingId === w.id ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: 11,
                                padding: '4px 10px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title="Send immediate Test Ping to this webhook endpoint"
                            >
                              <span>{testingId === w.id ? '⏳' : '⚡'}</span>
                              <span>{testingId === w.id ? 'Pinging...' : 'Test Ping'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWebhook(w.id, w.name)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12,
                                padding: '4px 8px',
                                borderRadius: 6,
                              }}
                              title="Delete Webhook"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CREATE WEBHOOK MODAL ── */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 16, 26, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '92vh',
              background: 'var(--panel, #15222f)',
              borderRadius: 16,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--line, #26364a)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--line, #26364a)',
                background: 'var(--panel, #15222f)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink, #f1f5f9)' }}>
                  Create Webhook
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
                  Configure incoming external webhook ingestion or outgoing automated dispatch.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--line, #26364a)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                  cursor: 'pointer',
                  color: 'var(--ink, #cbd5e1)',
                  lineHeight: 1,
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateWebhook} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {formError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: 8,
                      color: '#fca5a5',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Webhook Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                    Webhook Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., MakeMyTrip Inbound Receiver, Agoda Partner Push, Zapier Booking Sync"
                    value={name}
                    onChange={handleNameChange}
                    required
                    style={{
                      height: 40,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1px solid var(--line, #26364a)',
                      background: 'var(--bg, #0d1620)',
                      color: 'var(--ink, #f1f5f9)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* 2. Type Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                    Webhook Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    style={{
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid var(--line, #26364a)',
                      background: 'var(--bg, #0d1620)',
                      color: 'var(--ink, #f1f5f9)',
                      fontSize: 13,
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <option value="outgoing" style={{ background: '#15222f', color: '#f1f5f9' }}>Outgoing (Send data to URL)</option>
                    <option value="incoming" style={{ background: '#15222f', color: '#f1f5f9' }}>Incoming (Receive data here)</option>
                  </select>
                  <span style={{ fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
                    {type === 'outgoing'
                      ? 'StayFlow will dispatch event notifications to an external HTTPS URL you provide.'
                      : 'External platforms will send webhook notifications to StayFlow’s inbound receiver URL.'}
                  </span>
                </div>

                {/* 3. URL Field */}
                {type === 'outgoing' ? (
                  /* OUTGOING: Operator provides external HTTPS destination URL */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                      External Destination URL (HTTPS) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://api.yourdomain.com/webhooks/stayflow-receiver"
                      value={outgoingUrl}
                      onChange={(e) => setOutgoingUrl(e.target.value)}
                      required
                      style={{
                        height: 40,
                        padding: '0 14px',
                        borderRadius: 8,
                        border: '1px solid var(--line, #26364a)',
                        background: 'var(--bg, #0d1620)',
                        color: 'var(--ink, #f1f5f9)',
                        fontSize: 13,
                        fontFamily: 'Consolas, Monaco, monospace',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
                      StayFlow dispatches signed event notifications (POST) to this remote server destination.
                    </span>
                  </div>
                ) : (
                  /* INCOMING: Display StayFlow's immutable inbound receiver endpoint with copy button */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                        StayFlow Inbound Receiver Endpoint URL <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCopy(getInboundReceiverUrl(name), 'modal_in')}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedId === 'modal_in' ? '✓ Copied' : '📋 Copy Receiver URL'}
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={getInboundReceiverUrl(name)}
                      style={{
                        height: 40,
                        padding: '0 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        background: 'rgba(14, 124, 123, 0.12)',
                        color: '#38bdf8',
                        fontSize: 12,
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#38bdf8' }}>
                      Copy and paste this URL into your external provider (MakeMyTrip, Agoda, Razorpay, etc.) as their webhook target.
                    </span>
                  </div>
                )}

                {/* 3b. Optional Custom Signing Secret */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                    Signing Secret / Webhook Token (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate a secure random signing secret"
                    value={customSecret}
                    onChange={(e) => setCustomSecret(e.target.value)}
                    style={{
                      height: 40,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1px solid var(--line, #26364a)',
                      background: 'var(--bg, #0d1620)',
                      color: 'var(--ink, #f1f5f9)',
                      fontSize: 13,
                      fontFamily: 'Consolas, Monaco, monospace',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
                    Shared secret used for HMAC-SHA256 signature verification or provider authentication tokens.
                  </span>
                </div>

                {/* 4. Events Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                      Subscribed Events <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllEvents}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      {selectedEvents.length === AVAILABLE_EVENTS.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {AVAILABLE_EVENTS.map((ev) => {
                      const isSelected = selectedEvents.includes(ev.id);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => handleToggleEvent(ev.id)}
                          style={{
                            padding: '9px 12px',
                            borderRadius: 8,
                            border: `1px solid ${isSelected ? '#38bdf8' : 'var(--line, #26364a)'}`,
                            background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: isSelected ? '#38bdf8' : 'var(--ink, #f1f5f9)' }}>
                              {ev.label}
                            </div>
                            <div style={{ fontSize: 11, color: isSelected ? '#cbd5e1' : 'var(--muted, #94a3b8)' }}>
                              {ev.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer with Create Webhook & Cancel Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  padding: '16px 24px',
                  borderTop: '1px solid var(--line, #26364a)',
                  background: 'var(--panel, #15222f)',
                }}
              >
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleCloseModal}
                  disabled={saving}
                  style={{
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--line, #26364a)',
                    color: 'var(--ink, #e2e8f0)',
                    borderRadius: 8,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving}
                  style={{
                    padding: '8px 22px',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: saving ? 0.75 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 8,
                  }}
                >
                  {saving ? (
                    <>
                      <span>⏳</span>
                      <span>Saving in MySQL...</span>
                    </>
                  ) : (
                    <span>Create Webhook</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
