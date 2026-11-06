import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import SubNav from '../../components/SubNav';

export default function Offers() {
  const { offers, refresh, notify, toggleOffer, deleteOffer } = useStore();
  const { canCreate, canEdit, canDelete } = useRbac();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', discount_type: 'percent', discount_value: '10', starts_on: new Date().toISOString().slice(0,10), ends_on: new Date(Date.now()+30*86400000).toISOString().slice(0,10), usage_limit: '' });
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, offer: null });

  async function save(e) {
    e.preventDefault();
    const val = Number(form.discount_value);
    if (isNaN(val) || val <= 0) {
      notify('Discount value must be greater than 0');
      return;
    }
    if (form.discount_type === 'percent' && val > 100) {
      notify('Percentage discount cannot exceed 100%');
      return;
    }
    try {
      await api('/api/offers', { method: 'POST', body: JSON.stringify({ ...form, code: form.code.toUpperCase(), discount_value: val, usage_limit: form.usage_limit ? Number(form.usage_limit) : null, active: true }) });
      setOpen(false); await refresh(); notify('Offer saved');
    } catch (err) { notify(err.message); }
  }

  const handleDeleteOffer = (o) => {
    setDeleteConfirm({ open: true, offer: o });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.offer) return;
    const o = deleteConfirm.offer;
    setDeleteConfirm({ open: false, offer: null });
    await deleteOffer(o.id);
  };

  const rows = offers.map(o => [
    o.name,
    o.code,
    o.discount_type === 'percent' ? `${o.discount_value}%` : `₹${o.discount_value}`,
    o.ends_on,
    `${o.usage_count}${o.usage_limit ? ` / ${o.usage_limit}` : ''}`,
    o.active ? <Badge color="green">Active</Badge> : <Badge>Inactive</Badge>,
    <div key={`act-${o.id}`} style={{ display: 'flex', gap: 6 }}>
      {canEdit('/offers') && (
        <button
          className={`btn sm ${o.active ? 'brass' : 'teal'}`}
          onClick={() => toggleOffer(o.id, !o.active)}
        >
          {o.active ? 'Deactivate' : 'Activate'}
        </button>
      )}
      {canDelete('/offers') && (
        <button
          className="btn sm danger ghost"
          onClick={() => handleDeleteOffer(o)}
        >
          Delete
        </button>
      )}
      {!canEdit('/offers') && !canDelete('/offers') && (
        <span style={{ color: 'var(--sub, #888)', fontSize: 13 }}>—</span>
      )}
    </div>
  ]);
  return <>
    <PageHead title="Offers & promotions" subtitle="Coupons, seasonal packages and corporate rates">
      {canCreate('/offers') && (
        <button className="btn" onClick={() => setOpen(v => !v)}>{open ? 'Close form' : 'Create offer'}</button>
      )}
    </PageHead>
    <SubNav parentPath="/offers" />
    {open && <form className="panel" onSubmit={save}>
      <h2>Create offer</h2>
      <div className="grid2">
        <div className="field"><label>Offer name</label><input required value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>Code</label><input required minLength={3} value={form.code} onChange={set('code')} /></div>
        <div className="field">
          <label>Discount type</label>
          <select value={form.discount_type} onChange={set('discount_type')}>
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </div>
        <div className="field">
          <label>Discount value ({form.discount_type === 'percent' ? '%' : '₹'})</label>
          <input
            type="number"
            min="0.01"
            max={form.discount_type === 'percent' ? "100" : undefined}
            step="0.01"
            required
            placeholder={form.discount_type === 'percent' ? 'Enter percentage (e.g. 15)' : 'Enter amount in ₹ (e.g. 500)'}
            value={form.discount_value}
            onChange={set('discount_value')}
          />
        </div>
        <div className="field"><label>Starts on</label><input type="date" required value={form.starts_on} onChange={set('starts_on')} /></div>
        <div className="field"><label>Ends on</label><input type="date" required value={form.ends_on} onChange={set('ends_on')} /></div>
        <div className="field"><label>Usage limit (optional)</label><input type="number" min="1" value={form.usage_limit} onChange={set('usage_limit')} /></div>
      </div>
      <button className="btn" type="submit">Save offer</button>
    </form>}
    <div className="panel">
      <DataTable columns={['Offer', 'Code', 'Discount', 'Valid until', 'Used', 'Status', 'Actions']} rows={rows} />
      {!rows.length && <p className="empty">No offers created yet.</p>}
    </div>

    {deleteConfirm.open && (
      <div
        className="modal-backdrop"
        onClick={() => setDeleteConfirm({ open: false, offer: null })}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-panel, #1e222d)',
            padding: 24,
            borderRadius: 12,
            width: '90%',
            maxWidth: 420,
            border: '1px solid var(--border, #333)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}
        >
          <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--head-color, #fff)' }}>Confirm Deletion</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.5 }}>
            Are you sure you want to delete offer "{deleteConfirm.offer?.name}" ({deleteConfirm.offer?.code})? This record will be permanently removed.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setDeleteConfirm({ open: false, offer: null })}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              style={{ background: 'var(--red, #e53e3e)', color: '#fff', border: 'none' }}
              onClick={confirmDeleteAction}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </>;
}
