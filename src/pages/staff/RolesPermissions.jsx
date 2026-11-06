import React, { useState, useMemo, useEffect } from 'react';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';
import Badge from '../../components/Badge';
import { useRbac } from '../../context/RbacContext';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';

const PERMISSION_COLUMNS = [
  { key: 'view', label: 'View', color: 'teal', desc: 'Access module & sidebar visibility' },
  { key: 'create', label: 'Create', color: 'green', desc: 'Add new records & create bookings' },
  { key: 'edit', label: 'Edit', color: 'brass', desc: 'Update details, change statuses' },
  { key: 'delete', label: 'Delete', color: 'red', desc: 'Remove records from system' },
  { key: 'approve', label: 'Approve', color: 'blue', desc: 'Sign-off, check-in/out, overrides' },
  { key: 'export', label: 'Export', color: 'purple', desc: 'CSV downloads & printable reports' },
];

export default function RolesPermissions() {
  const {
    roles,
    modulesMeta,
    effectiveRole,
    simulatedRole,
    setSimulatedRole,
    saveRolePermissions,
    createRole,
    deleteRole,
    assignUserRole,
    resetDefaults,
    loadRbacData,
    canEdit,
  } = useRbac();
  const { notify } = useStore();

  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'users'
  const [selectedRoleCode, setSelectedRoleCode] = useState('ADMIN');
  const [localPermissions, setLocalPermissions] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');

  // Users state for assignment tab
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [pendingUserRoles, setPendingUserRoles] = useState({});

  // New Role Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    templateRole: 'FRONT_DESK',
  });
  const [creating, setCreating] = useState(false);

  // Selected role object
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.code === selectedRoleCode) || roles[0];
  }, [roles, selectedRoleCode]);

  // Sync selected role permissions into local editor state
  useEffect(() => {
    if (selectedRole) {
      setLocalPermissions(JSON.parse(JSON.stringify(selectedRole.permissions || {})));
      setIsDirty(false);
    }
  }, [selectedRole]);

  // Load users when entering 'users' tab
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api('/api/rbac/users');
      setUsersList(data || []);
      const mapping = {};
      (data || []).forEach((u) => { mapping[u.id] = u.role; });
      setPendingUserRoles(mapping);
    } catch (err) {
      notify(err.message || 'Failed to load user list');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Flattened modules and submodules list
  const flattenedModules = useMemo(() => {
    const list = [];
    (modulesMeta || []).forEach((mod) => {
      list.push({
        isParent: true,
        id: mod.id,
        name: mod.name,
        path: mod.path,
        group: mod.group,
      });
      (mod.submodules || []).forEach((sub) => {
        list.push({
          isParent: false,
          parentId: mod.id,
          name: sub.name,
          path: sub.path,
          group: mod.group,
        });
      });
    });
    return list;
  }, [modulesMeta]);

  // Filtered module rows based on search and group
  const filteredRows = useMemo(() => {
    return flattenedModules.filter((row) => {
      const matchesSearch =
        !searchTerm.trim() ||
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.path.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = groupFilter === 'All' || row.group === groupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [flattenedModules, searchTerm, groupFilter]);

  // Permission cell toggle
  const togglePermission = (path, permKey) => {
    setLocalPermissions((prev) => {
      const current = prev[path] || { view: false, create: false, edit: false, delete: false, approve: false, export: false };
      const nextVal = !current[permKey];
      const updatedRow = { ...current, [permKey]: nextVal };

      // If view is turned off, turn off all actions
      if (permKey === 'view' && !nextVal) {
        updatedRow.create = false;
        updatedRow.edit = false;
        updatedRow.delete = false;
        updatedRow.approve = false;
        updatedRow.export = false;
      }
      // If any action is turned on, automatically enable view
      if (permKey !== 'view' && nextVal) {
        updatedRow.view = true;
      }

      setIsDirty(true);
      return { ...prev, [path]: updatedRow };
    });
  };

  // Row toggle all
  const toggleRowAll = (path, selectAll) => {
    setLocalPermissions((prev) => {
      const updatedRow = {
        view: selectAll,
        create: selectAll,
        edit: selectAll,
        delete: selectAll,
        approve: selectAll,
        export: selectAll,
      };
      setIsDirty(true);
      return { ...prev, [path]: updatedRow };
    });
  };

  // Column master toggle
  const toggleColumnAll = (permKey) => {
    setLocalPermissions((prev) => {
      const allEnabled = filteredRows.every((r) => prev[r.path]?.[permKey]);
      const nextState = !allEnabled;
      const updated = { ...prev };
      filteredRows.forEach((r) => {
        const cur = updated[r.path] || { view: false, create: false, edit: false, delete: false, approve: false, export: false };
        const rowObj = { ...cur, [permKey]: nextState };
        if (permKey !== 'view' && nextState) {
          rowObj.view = true;
        }
        if (permKey === 'view' && !nextState) {
          rowObj.create = false;
          rowObj.edit = false;
          rowObj.delete = false;
          rowObj.approve = false;
          rowObj.export = false;
        }
        updated[r.path] = rowObj;
      });
      setIsDirty(true);
      return updated;
    });
  };

  // Save changes
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await saveRolePermissions(selectedRole.id, localPermissions);
      setIsDirty(false);
    } catch (err) {
      // Error handled in context
    } finally {
      setSaving(false);
    }
  };

  // Handle user role assignment save
  const handleSaveUserRole = async (userId) => {
    const roleCode = pendingUserRoles[userId];
    if (!roleCode) return;
    try {
      await assignUserRole(userId, roleCode);
      await fetchUsers();
    } catch (err) {
      // Handled in context
    }
  };

  // Handle create custom role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) return;
    setCreating(true);
    try {
      const baseRole = roles.find((r) => r.code === newRoleForm.templateRole);
      const initialPerms = baseRole ? baseRole.permissions : {};
      const code = (newRoleForm.code || newRoleForm.name).toUpperCase().replace(/\s+/g, '_');
      const res = await createRole({
        name: newRoleForm.name.trim(),
        code,
        description: newRoleForm.description.trim(),
        permissions: initialPerms,
      });
      setCreateModalOpen(false);
      setNewRoleForm({ name: '', code: '', description: '', templateRole: 'FRONT_DESK' });
      setSelectedRoleCode(res.code);
    } catch (err) {
      // Handled in context
    } finally {
      setCreating(false);
    }
  };

  // Handle delete custom role
  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete custom role "${role.name}"?`)) return;
    try {
      await deleteRole(role.id);
      setSelectedRoleCode('ADMIN');
    } catch (err) {
      // Handled in context
    }
  };

  const groups = ['All', 'Main Menu', 'Operations', 'Administration'];

  return (
    <>
      <PageHead
        title="Roles & Permissions (RBAC)"
        subtitle="Manage hotel roles, define granular menu and action permissions, and assign staff members"
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn ghost"
            onClick={resetDefaults}
            title="Reset default roles to recommended system settings"
          >
            ↺ Reset Defaults
          </button>
          <button
            type="button"
            className="btn brass"
            onClick={() => setCreateModalOpen(true)}
          >
            + Create New Role
          </button>
        </div>
      </PageHead>

      <SubNav parentPath="/staff" />

      {/* ── Tab Switcher: Permissions Matrix vs User Assignments ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'matrix' ? 'brass' : 'ghost'}`}
          onClick={() => setActiveTab('matrix')}
        >
          🛡️ Roles & Permissions Matrix
        </button>
        <button
          className={`btn ${activeTab === 'users' ? 'brass' : 'ghost'}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Role Assignments ({usersList.length || '...'})
        </button>
      </div>

      {activeTab === 'matrix' && (
        <>
          {/* ── Role Selector Pill Bar ── */}
          <div className="panel" style={{ padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  Select Hotel Role to Configure
                </span>
              </div>
              {selectedRole && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {simulatedRole === selectedRole.code ? (
                    <button
                      className="btn sm brass"
                      onClick={() => setSimulatedRole(null)}
                      title="Currently simulating this role"
                    >
                      ✓ Simulating this Role (Click to Exit)
                    </button>
                  ) : (
                    <button
                      className="btn sm ghost"
                      onClick={() => {
                        setSimulatedRole(selectedRole.code);
                        notify(`Now simulating role: ${selectedRole.name}. Menus & buttons will adapt.`);
                      }}
                      title="Test live interface as this role"
                    >
                      👁️ Test UI as {selectedRole.name}
                    </button>
                  )}
                  {!selectedRole.is_system && (
                    <button
                      className="btn sm ghost"
                      style={{ color: 'var(--red)' }}
                      onClick={() => handleDeleteRole(selectedRole)}
                    >
                      Delete Role
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {roles.map((r) => {
                const isSelected = r.code === selectedRoleCode;
                return (
                  <button
                    key={r.code}
                    className={`btn sm ${isSelected ? 'brass' : 'ghost'}`}
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 8,
                      border: isSelected ? '1px solid var(--brass, #c99e4d)' : '1px solid var(--line)',
                    }}
                    onClick={() => {
                      if (isDirty && !window.confirm('You have unsaved changes. Discard and switch role?')) return;
                      setSelectedRoleCode(r.code);
                    }}
                  >
                    <span>{r.name}</span>
                    {r.is_system && <span style={{ fontSize: 10, opacity: 0.7 }}>🔒</span>}
                    {r.user_count > 0 && (
                      <span className="badge b-teal" style={{ padding: '1px 5px', fontSize: 10 }}>
                        {r.user_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedRole && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{selectedRole.name}</span>
                    <span className="tag">{selectedRole.code}</span>
                    {selectedRole.is_system ? <Badge color="teal">System Role</Badge> : <Badge color="brass">Custom Role</Badge>}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                    {selectedRole.description || 'Configured access policy for hotel management.'}
                  </p>
                </div>
                <div>
                  <button
                    className={`btn ${isDirty ? 'brass' : 'ghost'}`}
                    disabled={!isDirty || saving}
                    onClick={handleSavePermissions}
                  >
                    {saving ? 'Saving Changes…' : isDirty ? '💾 Save Permissions' : '✓ Saved'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Search & Filter Controls ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {groups.map((grp) => (
                <button
                  key={grp}
                  className={`btn sm ${groupFilter === grp ? 'brass' : 'ghost'}`}
                  onClick={() => setGroupFilter(grp)}
                >
                  {grp}
                </button>
              ))}
            </div>
            <div style={{ minWidth: 260 }}>
              <input
                type="text"
                placeholder="Search menus or submenus..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '7px 12px' }}
              />
            </div>
          </div>

          {/* ── Granular Permissions Table ── */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Module & Submenu</th>
                    <th style={{ minWidth: 150 }}>Route Path</th>
                    {PERMISSION_COLUMNS.map((col) => (
                      <th key={col.key} style={{ textAlign: 'center', minWidth: 90 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span>{col.label}</span>
                          <button
                            type="button"
                            className="btn sm ghost"
                            style={{ padding: '1px 6px', fontSize: 10, lineHeight: 1.2 }}
                            onClick={() => toggleColumnAll(col.key)}
                            title={`Toggle ${col.label} for all visible items`}
                          >
                            All
                          </button>
                        </div>
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', minWidth: 100 }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const rowPerms = localPermissions[row.path] || {
                      view: false,
                      create: false,
                      edit: false,
                      delete: false,
                      approve: false,
                      export: false,
                    };
                    const allChecked = PERMISSION_COLUMNS.every((c) => rowPerms[c.key]);

                    return (
                      <tr
                        key={row.path}
                        style={
                          row.isParent
                            ? { background: 'rgba(201, 158, 77, 0.05)', fontWeight: 600 }
                            : { fontSize: 13 }
                        }
                      >
                        <td style={{ paddingLeft: row.isParent ? 16 : 36 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{row.isParent ? '📁' : '↳'}</span>
                            <span>{row.name}</span>
                            {row.isParent && (
                              <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                                {row.group}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: 11, color: 'var(--muted)' }}>{row.path}</code>
                        </td>
                        {PERMISSION_COLUMNS.map((col) => {
                          const checked = Boolean(rowPerms[col.key]);
                          return (
                            <td key={col.key} style={{ textAlign: 'center' }}>
                              <label style={{ display: 'inline-flex', cursor: 'pointer', padding: 4 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(row.path, col.key)}
                                  style={{ width: 16, height: 16, accentColor: 'var(--brass, #c99e4d)', cursor: 'pointer' }}
                                />
                              </label>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn sm ghost"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            onClick={() => toggleRowAll(row.path, !allChecked)}
                          >
                            {allChecked ? 'Clear' : 'Select All'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredRows.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                No menus matching search filter.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── User Role Assignments Tab ── */}
      {activeTab === 'users' && (
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Staff Role Assignments</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                Assign staff members to roles to immediately enforce access privileges.
              </p>
            </div>
            <div style={{ minWidth: 260 }}>
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '8px 12px' }}
              />
            </div>
          </div>

          {loadingUsers ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>Loading staff users…</p>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email Address</th>
                    <th>Status</th>
                    <th>Assigned Role</th>
                    <th>Select New Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList
                    .filter((u) => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        (u.full_name || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    })
                    .map((u) => {
                      const currentSelected = pendingUserRoles[u.id] || u.role;
                      const hasChanged = currentSelected !== u.role;
                      return (
                        <tr key={u.id}>
                          <td><b>{u.full_name}</b></td>
                          <td>{u.email}</td>
                          <td>
                            {u.is_active ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge>}
                          </td>
                          <td>
                            <span className="badge b-brass">{u.role_name || u.role}</span>
                          </td>
                          <td>
                            <select
                              value={currentSelected}
                              onChange={(e) => {
                                setPendingUserRoles((prev) => ({ ...prev, [u.id]: e.target.value }));
                              }}
                              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6 }}
                            >
                              {roles.map((r) => (
                                <option key={r.code} value={r.code}>
                                  {r.name} ({r.code})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className={`btn sm ${hasChanged ? 'brass' : 'ghost'}`}
                              disabled={!hasChanged}
                              onClick={() => handleSaveUserRole(u.id)}
                            >
                              {hasChanged ? 'Apply Role' : 'Up to Date'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Create New Role Modal ── */}
      {createModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 16 }}>
          <div className="panel" style={{ width: '100%', maxWidth: 500, background: 'var(--panel)', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Create Custom Role</h2>
              <button type="button" className="btn sm ghost" onClick={() => setCreateModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRole}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="field">
                  <label>Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Night Auditor, Banquet Captain"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Role Code (Auto-generated if empty)</label>
                  <input
                    type="text"
                    placeholder="e.g. NIGHT_AUDITOR"
                    value={newRoleForm.code}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  />
                </div>
                <div className="field">
                  <label>Base Permission Template</label>
                  <select
                    value={newRoleForm.templateRole}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, templateRole: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        Clone from: {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe duties and system access scope..."
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <button type="button" className="btn ghost" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn brass" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
