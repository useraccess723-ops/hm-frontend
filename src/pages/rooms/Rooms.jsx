import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { STATUS_BADGE, STATUS_NAME } from '../../data/mock';
import { inr } from '../../utils/format';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import SubNav from '../../components/SubNav';

export default function Rooms() {
  const { rooms, refresh, notify, updateRoom, updateRoomStatus, deleteRoom, markRoomClean } = useStore();
  const { canCreate, canEdit, canDelete } = useRbac();
  const [types, setTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState({ number: '', floor: '1', room_type_id: '', status: 'vac', description: '' });

  useEffect(() => {
    api('/api/room-types').then(rows => {
      setTypes(rows);
      if (rows.length) setForm(f => ({ ...f, room_type_id: String(rows[0].id) }));
    }).catch(e => notify(e.message));
  }, [notify]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    try {
      await api('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ ...form, floor: Number(form.floor), room_type_id: Number(form.room_type_id) })
      });
      setOpen(false);
      setForm(f => ({ ...f, number: '', description: '' }));
      await refresh();
      notify('Room created');
    } catch (err) {
      notify(err.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      const roomNum = String(editingRoom.number ?? editingRoom.n ?? '').trim();
      const floorNum = Number(editingRoom.floor ?? editingRoom.f ?? 1);
      const roomTypeId = Number(editingRoom.room_type_id);
      const statusVal = String(editingRoom.status ?? editingRoom.s ?? 'vac');
      const descVal = String(editingRoom.description ?? '').trim();

      await updateRoom(editingRoom.id, {
        number: roomNum,
        floor: floorNum,
        room_type_id: roomTypeId,
        status: statusVal,
        description: descVal,
      });
      setEditingRoom(null);
      notify('Room updated successfully');
    } catch (err) {
      notify(err.message || 'Failed to update room');
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, room: null });

  function handleDelete(r) {
    setDeleteConfirm({ open: true, room: r });
  }

  const confirmDeleteRoom = async () => {
    if (!deleteConfirm.room) return;
    const r = deleteConfirm.room;
    setDeleteConfirm({ open: false, room: null });
    await deleteRoom(r.id);
  };

  const typeRows = Object.values(rooms.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = { type: r.type, price: r.price, count: 0 };
    acc[r.type].count++;
    return acc;
  }, {}));

  return <>
    <PageHead title="Rooms & room types" subtitle="Inventory, categories and base prices">
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to="/rooms/types-gallery" className="btn ghost">Manage Room Types</Link>
        {canCreate('/rooms') && (
          <button className="btn" onClick={() => setOpen(v => !v)}>{open ? 'Close form' : 'Add room'}</button>
        )}
      </div>
    </PageHead>
    <SubNav parentPath="/rooms" />
    {open && <form className="panel" onSubmit={save}>
      <h2>Add room</h2>
      <div className="grid2">
        <div className="field"><label>Room number</label><input required value={form.number} onChange={set('number')} /></div>
        <div className="field"><label>Floor</label><input type="number" min="0" required value={form.floor} onChange={set('floor')} /></div>
        <div className="field"><label>Room type</label><select required value={form.room_type_id} onChange={set('room_type_id')}>{types.map(t => <option key={t.id} value={t.id}>{t.name} — {inr(t.base_price)}/night</option>)}</select></div>
        <div className="field"><label>Initial status</label><select value={form.status} onChange={set('status')}><option value="vac">Vacant & clean</option><option value="dirty">Needs cleaning</option><option value="ooo">Out of order</option></select></div>
        <div className="field"><label>Description</label><input value={form.description} onChange={set('description')} /></div>
      </div>
      <button className="btn" disabled={!types.length}>Save room</button>
      {!types.length && <p className="note">Create a room type through the API before adding rooms.</p>}
    </form>}

    {editingRoom && (
      <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 16 }}>
        <div className="panel" style={{ width: '100%', maxWidth: 500, background: 'var(--panel)', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Edit Room {editingRoom.n}</h2>
            <button type="button" className="btn sm ghost" onClick={() => setEditingRoom(null)}>Back</button>
          </div>
          <form onSubmit={saveEdit}>
            <div className="grid2">
              <div className="field">
                <label>Room number</label>
                <input required value={editingRoom.n ?? editingRoom.number ?? ''} onChange={(e) => setEditingRoom(prev => ({ ...prev, n: e.target.value, number: e.target.value }))} />
              </div>
              <div className="field">
                <label>Floor</label>
                <input type="number" min="0" required value={editingRoom.f ?? editingRoom.floor ?? 1} onChange={(e) => setEditingRoom(prev => ({ ...prev, f: e.target.value, floor: e.target.value }))} />
              </div>
              <div className="field">
                <label>Room type</label>
                <select
                  required
                  value={editingRoom.room_type_id ?? ''}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev, room_type_id: e.target.value }))}
                >
                  {types.map(t => <option key={t.id} value={t.id}>{t.name} — {inr(t.base_price)}/night</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={editingRoom.s ?? editingRoom.status ?? 'vac'} onChange={(e) => setEditingRoom(prev => ({ ...prev, s: e.target.value, status: e.target.value }))}>
                  <option value="vac">Vacant & clean</option>
                  <option value="dirty">Needs cleaning</option>
                  <option value="ooo">Out of order</option>
                  <option value="occ">Occupied</option>
                  <option value="res">Reserved</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <input value={editingRoom.description || ''} onChange={(e) => setEditingRoom(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" className="btn ghost" onClick={() => setEditingRoom(null)}>Cancel</button>
              <button type="submit" className="btn">Update Room</button>
            </div>
          </form>
        </div>
      </div>
    )}

    <div className="row r-3">
      {typeRows.map(t => (
        <div className="panel" key={t.type}>
          <h2>{t.type}</h2>
          <div className="sub">{t.count} rooms</div>
          <b style={{ fontFamily: 'var(--head)', fontSize: 24 }}>{inr(t.price)}</b>
          <span className="muted"> / night</span>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge>Wi-Fi</Badge><Badge>AC</Badge><Badge>TV</Badge>{t.type !== 'Standard' && <Badge>Mini bar</Badge>}
          </div>
        </div>
      ))}
    </div>

    <div className="panel">
      <h2>All rooms</h2>
      <div className="sub">Rates and statuses loaded from the database</div>
      <DataTable
        columns={['Room', 'Floor', 'Type', 'Rate / night', 'Status', 'Actions']}
        rows={rooms.map(r => [
          <b key={r.n}>Room {r.n}</b>,
          r.f,
          r.type,
          inr(r.price),
          <Badge key={`b-${r.n}`} color={STATUS_BADGE[r.s]}>{STATUS_NAME[r.s]}</Badge>,
          <div key={`act-${r.n}`} style={{ display: 'flex', gap: 6 }}>
            {r.s === 'dirty' && canEdit('/rooms') && (
              <button className="btn sm teal" onClick={() => markRoomClean(r.n)} title="Mark clean">Clean</button>
            )}
            {canEdit('/rooms') && (
              <button
                className="btn sm ghost"
                onClick={() => {
                  const rt = types.find(t => t.name === r.type);
                  setEditingRoom({ ...r, room_type_id: r.room_type_id || rt?.id || types[0]?.id });
                }}
                title="Edit room"
              >
                Edit
              </button>
            )}
            {canDelete('/rooms') && (
              <button
                className="btn sm danger ghost"
                onClick={() => handleDelete(r)}
                title="Delete room"
              >
                Delete
              </button>
            )}
            {!canEdit('/rooms') && !canDelete('/rooms') && (
              <span style={{ color: 'var(--sub, #888)', fontSize: 13 }}>—</span>
            )}
          </div>
        ])}
      />
      {!rooms.length && <p className="empty">No rooms configured yet.</p>}
    </div>

    {deleteConfirm.open && (
      <div
        className="modal-backdrop"
        onClick={() => setDeleteConfirm({ open: false, room: null })}
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
            maxWidth: 440,
            border: '1px solid var(--border, #333)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}
        >
          <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--head-color, #fff)' }}>Confirm Deletion</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.5 }}>
            Are you sure you want to delete Room {deleteConfirm.room?.n}? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setDeleteConfirm({ open: false, room: null })}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              style={{ background: 'var(--red, #e53e3e)', color: '#fff', border: 'none' }}
              onClick={confirmDeleteRoom}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </>;
}
