import { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import SubNav from '../../components/SubNav';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { DEPARTMENT_NAMES } from '../../components/SubPage';

export default function Staff() {
  const { user, notify, updateUser, deleteUser } = useStore();
  const { canCreate, canEdit, canDelete, roles: rbacRoles } = useRbac();
  const [users, setUsers] = useState([]);
  const [dbRoles, setDbRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'FRONT_DESK' });

  const load = () => api('/api/admin/users').then(setUsers).catch(e => setError(e.message));
  useEffect(() => {
    load();
    api('/api/rbac/roles')
      .then((res) => {
        if (Array.isArray(res)) setDbRoles(res);
      })
      .catch(() => {});
  }, []);

  const staffRoleOptions = useMemo(() => {
    const baseRoles = [
      { value: 'GENERAL_MANAGER', label: 'General Manager' },
      { value: 'MANAGER', label: 'Hotel Manager' },
      { value: 'REVENUE_MANAGER', label: 'Revenue Manager' },
      { value: 'RESERVATION_MANAGER', label: 'Reservation Manager' },
      { value: 'FRONT_DESK', label: 'Front Desk Associate' },
      { value: 'NIGHT_AUDITOR', label: 'Night Auditor' },
      { value: 'HOUSEKEEPING', label: 'Room Attendant' },
      { value: 'FINANCE', label: 'Finance Manager' },
      { value: 'FOOD_BEVERAGE', label: 'Server / Waiter' },
      { value: 'HUMAN_RESOURCES', label: 'HR Manager' },
      { value: 'ENGINEERING', label: 'Chief Engineer' },
      { value: 'PROCUREMENT', label: 'Procurement Officer' },
      { value: 'GUEST_SERVICES', label: 'Concierge' },
      { value: 'SECURITY', label: 'Security Officer' },
      { value: 'SALES_MARKETING', label: 'Sales Manager' },
    ];

    const map = new Map();
    baseRoles.forEach(r => map.set(r.label.toLowerCase(), r));

    // Custom database roles from /api/rbac/roles (excluding department names)
    const allDb = [...(rbacRoles || []), ...dbRoles];
    allDb.forEach(r => {
      if (!r || !r.name) return;
      const cleanName = r.name.trim();
      const lower = cleanName.toLowerCase();
      if (DEPARTMENT_NAMES && DEPARTMENT_NAMES.has(lower)) return;
      if (!map.has(lower)) {
        map.set(lower, { value: r.code || cleanName, label: cleanName });
      }
    });

    return Array.from(map.values());
  }, [rbacRoles, dbRoles]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const name = (form.full_name || '').trim();
    const email = (form.email || '').trim();
    const pwd = form.password || '';
    const role = form.role || '';

    if (!name || ['add staff member', 'add employee', 'staff details'].includes(name.toLowerCase())) {
      notify('Staff Full Name is required and cannot be a form title.');
      return;
    }
    if (name.length < 2) {
      notify('Staff Full Name must be at least 2 characters.');
      return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      notify('A valid staff email address is required.');
      return;
    }
    if (!role) {
      notify('Role is required.');
      return;
    }
    if (!pwd || pwd.length < 6) {
      notify('Password is required (minimum 6 characters).');
      return;
    }

    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          full_name: name,
          email: email.toLowerCase(),
          password: pwd,
          role: role,
        })
      });
      setOpen(false);
      setForm({ full_name: '', email: '', password: '', role: 'FRONT_DESK' });
      await load();
      notify('Staff account created');
    } catch (err) {
      notify(err.message);
    }
  }

  const handleToggleStatus = async (u) => {
    await updateUser(u.id, { is_active: !u.is_active });
    await load();
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete staff account for ${u.full_name} (${u.email})?`)) return;
    await deleteUser(u.id);
    await load();
  };

  const rows = users.map(u => [
    u.full_name,
    u.email,
    u.role,
    u.is_active ? <Badge color="green">Active</Badge> : <Badge color="red">Disabled</Badge>,
    u.created_at ? new Date(u.created_at).toLocaleDateString() : '—',
    (canEdit('/staff') || canDelete('/staff')) ? (
      <div key={`act-${u.id}`} style={{ display: 'flex', gap: 6 }}>
        {canEdit('/staff') && (
          <button
            className={`btn sm ${u.is_active ? 'brass' : 'teal'}`}
            onClick={() => handleToggleStatus(u)}
            disabled={u.id === user?.id}
          >
            {u.is_active ? 'Disable' : 'Enable'}
          </button>
        )}
        {canDelete('/staff') && (
          <button
            className="btn sm danger ghost"
            onClick={() => handleDeleteUser(u)}
            disabled={u.id === user?.id}
          >
            Delete
          </button>
        )}
      </div>
    ) : '—'
  ]);

  return <>
    <PageHead title="Admin & staff" subtitle="People, roles and access">
      {canCreate('/staff') && (
        <button className="btn" onClick={() => setOpen(v=>!v)}>{open?'Close form':'Invite staff'}</button>
      )}
    </PageHead>
    <SubNav parentPath="/staff" />
    {open && <form className="panel" onSubmit={save}>
      <h2>Create staff account</h2>
      <div className="grid2">
        <div className="field"><label>Full name</label><input required minLength="2" value={form.full_name} onChange={set('full_name')} /></div>
        <div className="field"><label>Email</label><input type="email" required value={form.email} onChange={set('email')} /></div>
        <div className="field"><label>Password (minimum 4 characters)</label><input type="password" required minLength="4" value={form.password} onChange={set('password')} /></div>
        <div className="field">
          <label>Role</label>
          <select value={form.role} onChange={set('role')}>
            {staffRoleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn">Create account</button>
    </form>}
    <div className="panel">
      {error && <p className="note">{error}</p>}
      <DataTable columns={['Name','Email','Role','Status','Created','Actions']} rows={rows} />
      {!rows.length && !error && <p className="empty">No staff accounts found.</p>}
    </div>
  </>;
}
