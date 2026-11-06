import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function TenantAdministrators() {
  const { notify } = useStore();
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    email: '',
    full_name: '',
    password: '',
    role: 'ADMIN',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adminList, tenantList] = await Promise.all([
        api('/api/superadmin/administrators'),
        api('/api/superadmin/tenants'),
      ]);
      setAdmins(adminList);
      setTenants(tenantList);
      if (tenantList.length > 0 && !formData.tenant_id) {
        setFormData((prev) => ({ ...prev, tenant_id: tenantList[0].id }));
      }
    } catch (err) {
      notify(err.message || 'Failed to load tenant administrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (window.location.search.includes('action=new')) {
      setShowAddModal(true);
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api('/api/superadmin/administrators', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          tenant_id: parseInt(formData.tenant_id, 10),
        }),
      });
      notify(`Administrator created for ${formData.email}`);
      setShowAddModal(false);
      setFormData({
        tenant_id: tenants[0]?.id || '',
        email: '',
        full_name: '',
        password: '',
        role: 'ADMIN',
      });
      fetchData();
    } catch (err) {
      notify(err.message || 'Failed to create administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await api(`/api/superadmin/administrators/${user.id}/status`, {
        method: 'PATCH',
      });
      notify(`User ${user.email} is now ${res.is_active ? 'Active' : 'Suspended'}`);
      fetchData();
    } catch (err) {
      notify(err.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    try {
      setSubmitting(true);
      await api(`/api/superadmin/administrators/${resetModalUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword }),
      });
      notify(`Password updated successfully for ${resetModalUser.email}`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err) {
      notify(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAdmins = admins.filter((a) => {
    const matchesSearch =
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.tenant_name && a.tenant_name.toLowerCase().includes(search.toLowerCase()));
    const matchesTenant = tenantFilter === 'ALL' || String(a.tenant_id) === String(tenantFilter);
    return matchesSearch && matchesTenant;
  });

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
              Tenant Hotel Administrators
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
            Manage hotel executive accounts, provision hotel administrators, and manage authentication credentials.
          </p>
        </div>
        <button 
          type="button" 
          className="btn primary sm" 
          onClick={() => setShowAddModal(true)}
          style={{ height: 34, padding: '0 16px' }}
        >
          <Icon name="plus" style={{ width: 14, height: 14 }} />
          <span>Provision Hotel Admin</span>
        </button>
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search by admin name, email, or hotel name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 13,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Filter Hotel:</span>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 13,
              }}
            >
              <option value="ALL">All Hotel Properties</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '14px 20px' }}>Administrator</th>
                <th style={{ padding: '14px 16px' }}>Hotel / Property</th>
                <th style={{ padding: '14px 16px' }}>Role</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Created</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    Loading administrators…
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No administrators found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {u.tenant_name || `Tenant #${u.tenant_id}`}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ background: 'rgba(201, 158, 77, 0.15)', color: 'var(--brass, #c99e4d)', border: '1px solid var(--brass)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${u.is_active ? 'b-teal' : 'b-red'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn sm secondary"
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPassword('');
                          }}
                        >
                          Reset Password
                        </button>
                        <button
                          className={`btn sm ${u.is_active ? 'outline' : 'outline-teal'}`}
                          onClick={() => handleToggleStatus(u)}
                          style={{ color: u.is_active ? 'var(--red)' : 'var(--teal)' }}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Provision Administrator Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
                Provision Hotel Administrator
              </h2>
              <button
                className="btn sm outline"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Assign To Hotel / Tenant *
                  </label>
                  <select
                    required
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@hotel.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Temporary Password * (Min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Password@123"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Role Assignment
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  >
                    <option value="ADMIN">Hotel Administrator (Full Tenant Control)</option>
                    <option value="GENERAL_MANAGER">General Manager</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating…' : 'Create Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
                Reset Password: {resetModalUser.email}
              </h2>
              <button
                className="btn sm outline"
                onClick={() => setResetModalUser(null)}
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  New Secure Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password…"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setResetModalUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting || !newPassword}
                >
                  {submitting ? 'Updating…' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
