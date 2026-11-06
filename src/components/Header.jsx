import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useRbac } from '../context/RbacContext';

export default function Header({ onMenu }) {
  const navigate = useNavigate();
  const { query, setQuery, user, logout, alertCount, loading, notify, tenant, activeTenant, theme, toggleTheme } = useStore();
  const { roles, userRole, effectiveRole, simulatedRole, setSimulatedRole, activeRoleObj } = useRbac();

  const isSuperAdmin = Boolean((user?.is_super_admin || user?.role === 'SUPER_ADMIN') && !user?.tenant_id);
  const isCustomer = Boolean((user?.role || '').toUpperCase() === 'CUSTOMER' || (user?.role || '').toUpperCase() === 'GUEST');





  return (
    <>
      <header className="top">
        {/* ── Row 1 on Mobile: Brand & Nav on Left, Actions on Right ── */}
        <div className="header-top-bar">
          <div className="header-nav-brand">
            <button className="burger" onClick={onMenu} aria-label="Open menu" title="Open navigation menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <div
              className="header-mobile-brand"
              onClick={() => navigate('/')}
              role="button"
              tabIndex={0}
              aria-label="StayFlow Home"
              title="StayFlow Hotel Management System"
            >
              <div className="brand-mark sm" style={isSuperAdmin ? { background: 'linear-gradient(135deg, #c99e4d, #f59e0b)', color: '#000' } : {}}>
                {isSuperAdmin ? '👑' : 'S'}
              </div>
              <b className="header-brand-title">StayFlow</b>
            </div>
          </div>

          <div className="header-actions-group">
            <button
              className="iconbtn header-btn-theme"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span className="btn-text">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>

            <button className="iconbtn header-btn-alerts" onClick={() => navigate('/notifications')} aria-label="Notifications" title="Alerts & Notifications">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="btn-text">Alerts</span>
              {!loading && alertCount > 0 && <span className="badge b-brass header-alert-count">{alertCount}</span>}
            </button>

            <div className="me">
              <div className="me-details" style={{ textAlign: 'right' }}>
                <b>{user?.full_name || user?.email || 'Admin'}</b>
                <small style={{ color: simulatedRole ? 'var(--brass, #c99e4d)' : 'var(--muted)', fontWeight: simulatedRole ? 700 : 400 }}>
                  {isCustomer ? 'In-House Guest' : (activeRoleObj?.name || effectiveRole)}
                </small>
              </div>
              <div className="avatar" title={user?.full_name || user?.email || 'Admin'}>
                {(user?.full_name || user?.email || 'A').slice(0, 1).toUpperCase()}
              </div>
              <button className="iconbtn header-btn-signout" onClick={logout} aria-label="Sign out" title="Sign out of account">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="btn-text">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Global Search Bar (Staff Only) ── */}
        {!isCustomer && (
          <div className="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/bookings')}
              placeholder="Search bookings, guests, rooms"
              aria-label="Search bookings, guests, rooms"
            />
          </div>
        )}

        <div className="sp header-desktop-sp" />

        {/* ── Hotel / SuperAdmin Context & Role Switcher ── */}
        <div className="header-context-controls">
          {isSuperAdmin ? (
            <div className="header-superadmin-badge" title="Platform Super Administration">
              <span style={{ fontSize: 13, flexShrink: 0 }}>👑</span>
              <span className="header-superadmin-text">
                Platform Super Administration
              </span>
            </div>
          ) : (
            <div className="header-hotel-badge">
              <span className="badge b-brass" title={activeTenant?.name || tenant?.name || 'Grand Meridian Chennai'}>
                🏨 {activeTenant?.name || tenant?.name || 'Grand Meridian Chennai'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Banner when actively simulating another role ── */}
      {!isCustomer && simulatedRole && (
        <div style={{
          background: 'rgba(201, 158, 77, 0.15)',
          borderBottom: '1px solid var(--brass, #c99e4d)',
          padding: '6px 14px',
          fontSize: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--ink)',
        }}>
          <div style={{ minWidth: 200, flex: 1 }}>
            <span>👁️ <b>RBAC Testing Mode:</b> Currently simulating <b>{activeRoleObj?.name || simulatedRole}</b>. Menus, tabs, and action buttons reflect this role's permissions.</span>
          </div>
          <button
            type="button"
            className="btn sm brass"
            style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
            onClick={() => setSimulatedRole(null)}
          >
            Exit Simulation (Reset to {userRole})
          </button>
        </div>
      )}
    </>
  );
}
