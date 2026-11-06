import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';
import { StatusBadge } from '../../components/Badge';

export default function Notifications() {
  const { alerts, loading, loadError, refresh, dismissAlert, addRecord } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Pending');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await addRecord({
        category: 'notifications',
        title: title.trim(),
        status: priority,
        data: { description: description.trim() },
      });
      setTitle('');
      setDescription('');
      setPriority('Pending');
      setModalOpen(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHead title="Notifications & tasks" subtitle="Operational tasks and alerts that need your attention">
        <button className="btn" onClick={() => setModalOpen(true)}>New alert</button>
      </PageHead>
      <SubNav parentPath="/notifications" />
      <div className="panel">
        {loading ? (
          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>Loading alerts…</h3>
            <p className="muted">Fetching real-time notifications and operational alerts from the database.</p>
          </div>
        ) : loadError ? (
          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--red)', fontSize: 16, marginBottom: 6 }}>Failed to load alerts</h3>
            <p className="muted">{loadError}</p>
            <button className="btn sm ghost" onClick={refresh} style={{ marginTop: 12 }}>Retry</button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>All clear</h3>
            <p className="muted">No pending alerts or operational tasks at this time.</p>
          </div>
        ) : (
          <ul className="feed">
            {alerts.map((alert) => (
              <li key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="dot" style={{ background: alert.color, marginTop: 6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b style={{ fontSize: 14 }}>{alert.title}</b>
                      <StatusBadge status={alert.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="muted" style={{ fontSize: 12 }}>{alert.date}</span>
                      <button
                        className="btn sm ghost"
                        onClick={() => dismissAlert(alert)}
                        title="Dismiss or resolve this alert"
                        style={{ padding: '2px 8px', fontSize: 12 }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.4 }}>
                    {alert.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="scrim open" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 480 }}>
            <h2>Create New Alert</h2>
            <form onSubmit={handleCreateAlert}>
              <div className="field">
                <label>Alert Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pool maintenance scheduled"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Description / Details</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide additional details or instructions"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'inherit' }}
                />
              </div>
              <div className="field">
                <label>Priority / Status</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Active">Active</option>
                </select>
              </div>
              <div className="actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
