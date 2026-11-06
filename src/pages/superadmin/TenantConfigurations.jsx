import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function TenantConfigurations() {
  const { notify } = useStore();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const res = await api('/api/superadmin/configurations');
      setConfigs(res);
      if (res.length > 0 && !selectedTenant) {
        setSelectedTenant(res[0]);
        setEditConfig(res[0]);
      } else if (selectedTenant) {
        const found = res.find((c) => c.tenant_id === selectedTenant.tenant_id);
        if (found) {
          setSelectedTenant(found);
          setEditConfig(found);
        }
      }
    } catch (err) {
      notify(err.message || 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const handleSelect = (cfg) => {
    setSelectedTenant(cfg);
    setEditConfig(JSON.parse(JSON.stringify(cfg)));
  };

  const handleToggleFeature = (featureKey) => {
    if (!editConfig) return;
    const currentFeatures = editConfig.features || {};
    setEditConfig({
      ...editConfig,
      features: {
        ...currentFeatures,
        [featureKey]: !currentFeatures[featureKey],
      },
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editConfig) return;
    try {
      setSubmitting(true);
      await api(`/api/superadmin/configurations/${editConfig.tenant_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          max_rooms: parseInt(editConfig.max_rooms, 10),
          max_users: parseInt(editConfig.max_users, 10),
          subscription_plan: editConfig.subscription_plan,
          features: editConfig.features,
        }),
      });
      notify(`Configuration updated for ${editConfig.tenant_name}`);
      fetchConfigurations();
    } catch (err) {
      notify(err.message || 'Failed to update configuration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>⚙️</span>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
            Tenant Configuration Matrix
          </h1>
        </div>
        <p style={{ margin: '4px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
          Configure operational quotas, subscription entitlement limits, and platform feature toggles per tenant.
        </p>
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: 'var(--muted)' }}>Loading tenant configurations…</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 20 }}>
          {/* Tenant Selector List */}
          <div className="panel" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: 'var(--head-color, #fff)', textTransform: 'uppercase' }}>
              Select Hotel Property
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {configs.map((c) => {
                const isSelected = selectedTenant?.tenant_id === c.tenant_id;
                return (
                  <div
                    key={c.tenant_id}
                    onClick={() => handleSelect(c)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(201, 158, 77, 0.15)' : 'var(--bg)',
                      border: isSelected ? '1px solid var(--brass, #c99e4d)' : '1px solid var(--line)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, color: isSelected ? 'var(--brass)' : 'var(--head-color, #fff)', fontSize: 14 }}>
                        {c.tenant_name}
                      </div>
                      <span className={`badge ${c.status === 'Active' ? 'b-teal' : 'b-red'}`} style={{ fontSize: 10 }}>
                        {c.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8 }}>
                      <code>{c.tenant_code}</code>
                      <span>•</span>
                      <span>{c.subscription_plan}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration Form for Selected Tenant */}
          {editConfig && (
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
                    {editConfig.tenant_name} Settings
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Property Code: <code>{editConfig.tenant_code}</code> • Slug: <code>{editConfig.tenant_slug}</code>
                  </span>
                </div>
                <span className="badge b-brass">{editConfig.subscription_plan} Tier</span>
              </div>

              <form onSubmit={handleSave}>
                {/* Quota Settings */}
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'var(--brass, #c99e4d)', textTransform: 'uppercase' }}>
                  1. Operational Entitlements & Resource Limits
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      Subscription Plan
                    </label>
                    <select
                      value={editConfig.subscription_plan}
                      onChange={(e) => setEditConfig({ ...editConfig, subscription_plan: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      <option value="Starter">Starter (Small boutique)</option>
                      <option value="Standard">Standard (Full hotel)</option>
                      <option value="Enterprise">Enterprise (Multi-facility resort)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      Maximum Rooms Allowed
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={editConfig.max_rooms}
                      onChange={(e) => setEditConfig({ ...editConfig, max_rooms: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <small style={{ color: 'var(--muted)', fontSize: 11 }}>Currently configured: {selectedTenant.rooms_count} rooms</small>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      Maximum Staff Accounts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={editConfig.max_users}
                      onChange={(e) => setEditConfig({ ...editConfig, max_users: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <small style={{ color: 'var(--muted)', fontSize: 11 }}>Currently active: {selectedTenant.users_count} accounts</small>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      Primary Operating Currency
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${editConfig.currency || 'INR'} (Base hotel ledger)`}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--muted)' }}
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: 'var(--brass, #c99e4d)', textTransform: 'uppercase' }}>
                  2. Platform Features & Module Entitlements
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                  {[
                    { key: 'self_checkin', label: 'Guest Self Check-In / QR Portal', desc: 'Allows guests to self-check-in and upload selfies' },
                    { key: 'ota_channels', label: 'OTA Channel Manager Integration', desc: 'Agoda, Booking.com, MakeMyTrip syncing' },
                    { key: 'finance_reports', label: 'Advanced Financial Auditing', desc: 'Detailed occupancy and revenue exports' },
                    { key: 'housekeeping', label: 'Digital Housekeeping Matrix', desc: 'Housekeeping floor dispatch & real-time room status' },
                    { key: 'offers_promotions', label: 'Offers & Promo Codes Engine', desc: 'Custom promotion discount management' },
                    { key: 'billing_policy', label: 'Custom Half-Day Stay Policies', desc: 'Configurable hourly stay & late checkout fees' },
                  ].map((f) => {
                    const isEnabled = Boolean(editConfig.features?.[f.key]);
                    return (
                      <div
                        key={f.key}
                        onClick={() => handleToggleFeature(f.key)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: isEnabled ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
                          border: isEnabled ? '1px solid var(--teal, #10b981)' : '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => {}}
                          style={{ marginTop: 3, cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--head-color, #fff)' }}>{f.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{f.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setEditConfig(JSON.parse(JSON.stringify(selectedTenant)))}
                  >
                    Reset Changes
                  </button>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Applying…' : 'Save Tenant Configuration'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
