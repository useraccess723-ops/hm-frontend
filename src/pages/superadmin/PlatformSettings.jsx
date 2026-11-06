import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function PlatformSettings() {
  const { notify } = useStore();
  const [settings, setSettings] = useState({
    platform_name: 'StayFlow Platform',
    maintenance_mode: false,
    default_currency: 'INR',
    default_timezone: 'Asia/Kolkata',
    max_tenants_allowed: 100,
    support_email: 'support@stayflow.com',
    enforce_two_factor: false,
    allow_tenant_registration: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api('/api/superadmin/settings');
      if (res) setSettings(res);
    } catch (err) {
      notify(err.message || 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api('/api/superadmin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setSettings(res);
      notify('Platform settings updated successfully');
    } catch (err) {
      notify(err.message || 'Failed to update platform settings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🌐</span>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
            Platform Global Settings
          </h1>
        </div>
        <p style={{ margin: '4px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
          Master system policies, default tenant quotas, and platform operational parameters.
        </p>
      </div>

      <div className="panel" style={{ padding: 28 }}>
        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>
            Loading platform configuration…
          </p>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.platform_name}
                  onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Platform Support Email
                </label>
                <input
                  type="email"
                  required
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Global Max Tenants
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.max_tenants_allowed}
                  onChange={(e) => setSettings({ ...settings, max_tenants_allowed: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Default Tenant Currency
                </label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Default System Timezone
                </label>
                <select
                  value={settings.default_timezone}
                  onChange={(e) => setSettings({ ...settings, default_timezone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
              </div>
            </div>

            {/* Platform Security & State Switches */}
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: 'var(--brass, #c99e4d)', textTransform: 'uppercase' }}>
              Operational Flags & Security State
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--bg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>
                    Platform Maintenance Mode
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    When enabled, hotel staff will see a temporary maintenance splash page. Super Admins retain full access.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--bg)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>
                    Self-Service Onboarding Gateway
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Allow potential hotel partners to register interest via the landing page portal.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_tenant_registration}
                  onChange={(e) => setSettings({ ...settings, allow_tenant_registration: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="submit"
                className="btn primary"
                disabled={submitting}
                style={{ padding: '10px 24px', fontSize: 14 }}
              >
                {submitting ? 'Saving…' : 'Save Platform Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
