import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

export default function TenantManagement() {
  const navigate = useNavigate();
  const { switchTenant, notify } = useStore();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    country: 'India',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    subscription_plan: 'Standard',
    max_rooms: 50,
    max_users: 15,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api('/api/superadmin/tenants');
      setTenants(res);
    } catch (err) {
      setError(err.message || 'Failed to load tenants list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    if (window.location.search.includes('action=new')) {
      handleOpenAdd();
    }
  }, []);

  const handleOpenAdd = () => {
    setEditTenant(null);
    setFormData({
      name: '',
      code: '',
      contact_email: '',
      contact_phone: '',
      city: '',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscription_plan: 'Standard',
      max_rooms: 50,
      max_users: 15,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditTenant(t);
    setFormData({
      name: t.name,
      code: t.code,
      contact_email: t.contact_email || '',
      contact_phone: t.contact_phone || '',
      city: t.city || '',
      country: t.country || 'India',
      currency: t.currency || 'INR',
      timezone: t.timezone || 'Asia/Kolkata',
      subscription_plan: t.subscription_plan || 'Standard',
      max_rooms: t.max_rooms || 50,
      max_users: t.max_users || 15,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editTenant) {
        await api(`/api/superadmin/tenants/${editTenant.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        notify(`Updated hotel: ${formData.name}`);
      } else {
        await api('/api/superadmin/tenants', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        notify(`Successfully onboarded hotel: ${formData.name}`);
      }
      setShowAddModal(false);
      fetchTenants();
    } catch (err) {
      notify(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant) => {
    const newStatus = tenant.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await api(`/api/superadmin/tenants/${tenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      notify(`Hotel ${tenant.name} is now ${newStatus}`);
      fetchTenants();
    } catch (err) {
      notify(err.message || 'Failed to update status');
    }
  };

  const handleInspect = async (tenant) => {
    await switchTenant(tenant.id);
    navigate('/');
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      (t.city && t.city.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏨</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
              Hotel Tenant Management
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
            Create and maintain independent hotel tenants with isolated data silos, rooms, users, and billing quotas.
          </p>
        </div>
        <button 
          type="button" 
          className="btn primary sm" 
          onClick={handleOpenAdd}
          style={{ height: 34, padding: '0 16px' }}
        >
          <Icon name="plus" style={{ width: 14, height: 14 }} />
          <span>Onboard New Hotel</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by hotel name, code (e.g. HOTEL-001) or city…"
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
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 13,
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="panel">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '14px 20px' }}>Hotel / Code</th>
                <th style={{ padding: '14px 16px' }}>Location</th>
                <th style={{ padding: '14px 16px' }}>Plan</th>
                <th style={{ padding: '14px 16px' }}>Rooms Quota</th>
                <th style={{ padding: '14px 16px' }}>Staff Quota</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    Loading hotels…
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No hotels match the current search filters.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--head-color, #fff)' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <code>{t.code}</code>
                        <span>•</span>
                        <span>{t.contact_email || 'No email registered'}</span>
                      </div>
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
                      <span style={{ color: 'var(--muted)' }}> / {t.max_rooms}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{t.users_count}</span>
                      <span style={{ color: 'var(--muted)' }}> / {t.max_users}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${t.status === 'Active' ? 'b-teal' : 'b-red'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn sm primary"
                          onClick={() => handleInspect(t)}
                          title="Inspect live operations"
                        >
                          Inspect View
                        </button>
                        <button
                          className="btn sm secondary"
                          onClick={() => handleOpenEdit(t)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn sm ${t.status === 'Active' ? 'outline' : 'outline-teal'}`}
                          onClick={() => handleToggleStatus(t)}
                          style={{ color: t.status === 'Active' ? 'var(--red)' : 'var(--teal)' }}
                        >
                          {t.status === 'Active' ? 'Suspend' : 'Activate'}
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

      {/* Onboard / Edit Modal */}
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
          <div className="panel" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--head-color, #fff)' }}>
                {editTenant ? `Edit Hotel: ${editTenant.name}` : 'Onboard New Hotel Property'}
              </h2>
              <button
                className="btn sm outline"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Hotel Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Grand Meridian Chennai"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Hotel Code * (Identifier)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                    placeholder="e.g. HOTEL-003"
                    disabled={Boolean(editTenant)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Mumbai, Chennai"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="admin@newhotel.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Subscription Plan
                  </label>
                  <select
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    className="register-modal-select"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)' }}
                  >
                    <option value="Starter" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>Starter</option>
                    <option value="Standard" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>Standard</option>
                    <option value="Enterprise" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>Enterprise</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="register-modal-select"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)' }}
                  >
                    <option value="INR" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>INR (₹)</option>
                    <option value="USD" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>USD ($)</option>
                    <option value="EUR" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>EUR (€)</option>
                    <option value="GBP" style={{ backgroundColor: 'var(--panel)', color: 'var(--ink)' }}>GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Max Room Quota
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.max_rooms}
                    onChange={(e) => setFormData({ ...formData, max_rooms: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Max Staff Users
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
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
                  {submitting ? 'Saving…' : editTenant ? 'Save Changes' : 'Confirm Onboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
