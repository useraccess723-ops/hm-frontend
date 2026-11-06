import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV, SUPERADMIN_NAV } from '../data/mock';
import Icon from './Icon';
import { useStore } from '../context/StoreContext';
import { useRbac } from '../context/RbacContext';

export default function Sidebar({ open }) {
  const { pathname } = useLocation();
  const { alertCount, loading, user, activeTenant, tenant } = useStore();
  const { canView } = useRbac();

  const isSuperAdmin = user?.is_super_admin || user?.role === 'SUPER_ADMIN';
  const isCustomer = (user?.role || '').toUpperCase() === 'CUSTOMER' || (user?.role || '').toUpperCase() === 'GUEST';

  const CUSTOMER_NAV = [
    {
      group: 'Guest Portal',
      items: [
        { to: '/', label: 'My Reservation & Billing', icon: 'credit-card' },
        { to: '/customer/amenities', label: 'Resort Amenities', icon: 'gift' },
        { to: '/customer/my-requests', label: 'My Service Requests', icon: 'smile' },
      ],
    },
  ];

  /* highlight parent when on a child sub-page */
  const isActive = (it) => {
    if (it.to === '/guest-services' && (pathname === '/customer/amenities' || pathname.startsWith('/customer'))) {
      return false;
    }
    if (pathname === it.to) return true;
    if (it.children && it.children.some((c) => pathname === c.to)) return true;
    return false;
  };

  const navToRender = isSuperAdmin ? SUPERADMIN_NAV : isCustomer ? CUSTOMER_NAV : NAV;

  return (
    <aside className={`side ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark" style={isSuperAdmin ? { background: 'linear-gradient(135deg, #c99e4d, #f59e0b)', color: '#000' } : {}}>
          {isSuperAdmin ? '👑' : 'S'}
        </div>
        <div>
          <b>StayFlow</b>
          <span
            title={isSuperAdmin ? 'Super Admin Portal' : (activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management')}
            style={{
              fontSize: 11,
              color: isSuperAdmin ? 'var(--brass)' : 'var(--muted)',
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 150
            }}
          >
            {isSuperAdmin ? 'Super Admin Portal' : (activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management')}
          </span>
        </div>
      </div>

      <nav className="nav">
        {navToRender.map((g) => {
          const visibleItems = g.items.filter((it) => {
            if (isSuperAdmin) return true;
            if (canView(it.to)) return true;
            if (it.children && it.children.some((c) => canView(c.to))) return true;
            return false;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={g.group}>
              <div className="grp">{g.group}</div>
              {visibleItems.map((it) => {
                const active = isActive(it);
                const count = it.to === '/notifications'
                  ? (!loading && alertCount > 0 ? alertCount : null)
                  : it.count;

                return (
                  <div key={it.to}>
                    <NavLink
                      to={it.to}
                      end={it.to === '/' || it.to === '/superadmin'}
                      className={() => (active ? 'on' : '')}
                    >
                      <Icon name={it.icon} />
                      <span>{it.label}</span>
                      {count ? <span className="count">{count}</span> : null}
                    </NavLink>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="side-foot">
        {isSuperAdmin
          ? 'Super Admin · Master Platform'
          : isCustomer
          ? `Guest Portal · ${activeTenant?.name || tenant?.name || user?.tenant?.name || 'Grand Meridian Chennai'}`
          : `Admin panel · ${activeTenant?.name || tenant?.name || user?.tenant?.name || 'Grand Meridian Chennai'}`}
      </div>
    </aside>
  );
}
